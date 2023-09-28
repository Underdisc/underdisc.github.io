I have three things going through my mind as things to work on.

- Add instanced rendering.
- Get gizmo transparency working when multiple gizmos are active.
- Have line meshes use three or more points for defining the interior cylinder.

I am most interested in the first two at the moment.

I just did a little bit a digging and it turns out that the two problems are somewhat related. Instanced rendering is going to require sorting the renderables based on material and mesh. Gizmo transparency is going to require some form of OIT. That means we will need to know which renderables are transparent. Simpler, but still another form of sorting because we want to render all the transparent objects in one pass.

So, I am going to start with instanced rendering. I'll get a performance boost for my scenes with many repeated objects and I'll get sorting renderables established, which will help with the gizmo transparency problem later.

In my current rendering structure, there are renderables. All renderables in a scene are grouped together in a Renderable::Collection.
```cpp
struct Collection
{
  Ds::Vector<Renderable::Floater> mFloaters;
  Renderable::Skybox mSkybox;
  Ds::Vector<Renderable::Icon> mIcons;
  UniformVector mUniforms;
  //...
}
```
Floaters are the primary type of Renderable. A Floater represents one of the objects that "float" in the scene. All the objects that make up the environment of the scene can be found here. Think trees, rocks, buildings.
```cpp
struct Floater
{
  World::MemberId mOwner;
  Mat4 mTransform;
  ResId mMaterialId;
  ResId mMeshId;
  UniformVector mUniforms;
};
```
Getting instanced rendering to work is going to involve sorting the vector of floaters by material first and mesh second. That way, we can bind a material once and render all the meshes that use that material. Likewise, we can group together all floaters with the same mesh into a single draw call.

One issue here is the uniform vector. Uniforms can be specified on a per-renderable basis. That also means they must be set on a per-renderable basis. For now, I am going to continue to bind uniforms on a per-renderable basis because that is an extra step. Let's see what kind of performance improvement comes from eliminating the repetitious material binds. It won't be instanced rendering, but it will remove repeated work.

I will be testing performance with the scene I am currently looking to optimize. Let me find some objective stats and numbers to write down.
```
<= Specifics =>
Material: gizmo/splatch:inactive
  Mesh: vres/gizmo:sphere
    Count: 1258
  Mesh: gizmo/splatch:egdeLine[0-315]
    Count: 1
Material: gizmo/splatch:rod
  Mesh: gizmo/spline:Cylinder
    Count: 1454
<= Summary =>
Unique Materials: 3
Unique Meshes: 318
```
While looking at the raw data for this. I was happy to see the `gizmo/splatch:inactive` material show up not grouped together in the output. It justifies that sorting is necessary for this scene.
```
<= Timings =>
CollectRenderables: 2.02ms
RenderFloaters: 11.54ms
```
These are means after 11,833 runs. RenderFloaters is what will be optimized. CollectRenderables is the step that collects all the renderables. All of them are collected every frame. That should ideally become no time at all, since renderables should only be collected when removed when they are created or deleted.

Here is the relevant code (11.54ms) that I will be adding the sort and material grouping too. Let's see what the performance differences are once we start grouping things together.
```cpp
void Collection::RenderFloaters()
{
  for (const Renderable::Floater& floater : mFloaters) {
    // Get all of the resources needed for rendering.
    const auto* material = Rsl::TryGetRes<Gfx::Material>(floater.mMaterialId);
    const auto* mesh = Rsl::TryGetRes<Gfx::Mesh>(floater.mMeshId);
    if (material == nullptr || mesh == nullptr) {
      return;
    }
    Gfx::Shader* shader = Rsl::TryGetRes<Gfx::Shader>(material->mShaderId);
    if (shader == nullptr) {
      return;
    }
    shader->Use();

    // Perform the render.
    int textureIndex = 0;
    mUniforms.Bind(*shader, &textureIndex);
    material->mUniforms.Bind(*shader, &textureIndex);
    floater.mUniforms.Bind(*shader, &textureIndex);
    shader->SetUniform("uModel", floater.mTransform);
    mesh->Render();
  }
}
```
Before worrying about the sort, though, I am going to try something that I am certain will reduce the number of material binds for the test scene. The materials are already grouped up quite well, so I'm just going to ignore the sort for now. I want to see what kind of benefit I get if I don't sort and only bind a new material if the material changes. RenderFloaters becomes this.
```cpp
void Collection::RenderFloaters()
{
  ResId currentMaterialId;
  int currentTextureIndex;
  Shader* currentShader = nullptr;
  for (const Renderable::Floater& floater : mFloaters) {
    if (floater.mMaterialId != currentMaterialId) {
      const auto* nextMaterial =
        Rsl::TryGetRes<Gfx::Material>(floater.mMaterialId);
      if (nextMaterial == nullptr) {
        continue;
      }
      Gfx::Shader* nextShader =
        Rsl::TryGetRes<Gfx::Shader>(nextMaterial->mShaderId);
      if (nextShader == nullptr) {
        continue;
      }
      currentMaterialId = floater.mMaterialId;
      currentTextureIndex = 0;
      currentShader = nextShader;
      currentShader->Use();
      mUniforms.Bind(*currentShader, &currentTextureIndex);
      nextMaterial->mUniforms.Bind(*currentShader, &currentTextureIndex);
    }
    if (currentShader == nullptr) {
      continue;
    }

    const auto* mesh = Rsl::TryGetRes<Gfx::Mesh>(floater.mMeshId);
    if (mesh == nullptr) {
      continue;
    }

    // Perform the render.
    int textureIndex = currentTextureIndex;
    floater.mUniforms.Bind(*currentShader, &textureIndex);
    currentShader->SetUniform("uModel", floater.mTransform);
    mesh->Render();
  }
}
```

Wow. The performance difference is massive. Here are the new averages after 19344 runs.
```
<= Timings =>
CollectRenderables: 2.02ms
RenderFloaters: 3.36ms
```
That's about 3.4 times faster and that's quite a bit when we're dealing with an 11ms starting point.











