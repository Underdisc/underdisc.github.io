# Shader Includes and Varkor Projects

This blog post is a bit more prompt than my previous posts and I am hoping to post more frequently about my accomplishments as time moves on. A few exciting things have happened over the past couple of weeks. In summary, models can now have custom shaders, shader files can have their own include preprocessor macros, and Varkor can finally be separated from the projects that are built with it.

## Custom Shaders

After creating the first implementation for my renderer, I knew that I wanted abilitiy to apply custom shaders to objects. Using shaders to get interesting effects is a must have for me, so this was something I wanted to tackle early. To do this, Model components were given a `ShaderId`. This Id references the shader that should be used to draw the Model.

```cpp
struct Model
{
  Model();
  void EditorHook();

  AssetLibrary::ShaderId mShaderId;
  std::string mAsset;
};
```

Now that the Model component stores this data, the renderer can use it to find the appropriate shader asset to be used in the next rendering operation. If the shader asset doesn't exist, a default shader is used instead.

```cpp
const AssetLibrary::Shader* shaderAsset =
  AssetLibrary::GetShader(modelComp.mShaderId);
const Shader* drawShader;
if (shaderAsset != nullptr && shaderAsset->mShader.Live())
{
  drawShader = &shaderAsset->mShader;
} else
{
  drawShader = &nDefaultShader;
}
drawShader->Use();
```

Adding the ShaderId to the Model component and using that ShaderId in the renderer wasn't the bulk of the work here though. That award goes to the `AssetLibrary` and the editor interface for it. Using the AssetLibrary, a user can create a new shader, select its vertex and fragment files, and compile it. The best part is that all of this can be done in the editor without any restarts. Here's a small gif showing what that process looks like.

![shader_pipeline](shader_pipeline.gif)

## Include Statements Are Hard

At the moment, I have one shader that implements phong lighting called phong.fs. It feels limiting not being able to put the functions and structures used to perform that lighting into different files so I can use them in different shaders without having to duplicate code. Considering I have yet to use it, I am not sure if this was worthwhile, but I added the `#include` prepocessor macro to my shader implementation to avoid code duplication. It was really difficult to implement for reasons I did not expect.

Implementing include statements by just copying the content of the included file and replacing the include statement with it is less than half of the battle. The real fight is making sure error reporting is still accurate. I don't want shader errors to display inaccurate file and line information becuase that's the most important information. I often fix errors by just looking at the line an error occurred on without even reading the error message. Sacrificing that would make includes more of a burden than a benefit, so I had to find a solution..

What I ended up doing is keeping track of where certain shader code comes from as the include preprocessing is performed using `SourceChunks`. Once the preprocessing is finished, an IncludeResult is returned from the function that handles the preprocessing and it contains a sorted vector of those SourceChunks.

```cpp
struct SourceChunk
{
  // The file that the chunk comes from.
  std::string mFile;
  // The line numbers that the chunk of source code starts and ends on.
  // [start, end). The start is inclusive and the end is not.
  int mStartLine;
  int mEndLine;
  // The number of lines above this chunk in the original source file that it
  // comes from.
  int mExcludedLines;
};
struct IncludeResult
{
  bool mSuccess;
  std::string mError;
  Ds::Vector<SourceChunk> mChunks;
};
IncludeResult HandleIncludes(const char* shaderFile, std::string& content);
```

Actually creating that sorted list of SourceChunks was the largest challenge I faced here. What made it immensely difficult was considering what happens when an included file includes another file. It's an obvious candidate for recursion, but it's not exactly fibonacci. Here's a little overview of how I accomplished it since it took me a few days to figure out and be reasonably satisfied with my solution.

```cpp
// The first source chunk is the file we are currently in.
SourceChunk chunk;
chunk.mFile = shaderFile;
chunk.mExcludedLines = 0;
chunk.mStartLine = 1;
IncludeResult result;
result.mChunks.Push(chunk);

std::regex expression("#include \"([^\"]*)\"");
std::smatch match;
while (std::regex_search(content.cbegin(), content.cend(), match, expression))
{
  // ...
  // Everything else will be within this scope.
  // ...
}
```

Step one is to create the first SourceChunk and find an include statement. Since all I am doing here is implementing include statements and nothing else, regex is adequate.

```cpp
// Find the backmost chunk's end line, and use it to find the number of
// lines excluded from the next chunk for the current file.
int includeLine = GetLineNumber(match[0].first - content.begin(), content);
result.mChunks.Top().mEndLine = includeLine;
chunk.mExcludedLines += includeLine - result.mChunks.Top().mStartLine + 1;

// Remove the backmost chunk if it doesn't contain content.
if (result.mChunks.Top().mStartLine == result.mChunks.Top().mEndLine)
{
  result.mChunks.Pop();
}

// Open and read the content of the included file.
// ...
```

Once we have found an include statement, we want to find the line number that the inclusion happens on. That line number becomes the end line of our topmost/backmost chunk. Since we know the number of lines the topmost chunk covers, we can add that quantity to the number of lines that are excluded from the next chunk that covers the same source file.

```cpp
// Handle any includes that show up within the included content and replace
// the include statement in the content with the included content.
IncludeResult subResult =
  HandleIncludes(includeFilename.c_str(), includeContent);
if (!subResult.mSuccess)
{
  return subResult;
}
content.replace(
  match[0].first,
  match[0].second,
  includeContent.begin(),
  includeContent.end() - 1);
```

After reading the content of the included file, we need to preform the include preprocessing on that included content before replacing the include statement with it.

```cpp
// Take the returned subchunks and offset both their start and end lines
// by the line the chunk was included on.
for (SourceChunk& subChunk : subResult.mChunks)
{
  result.mChunks.Push(subChunk);
  result.mChunks.Top().mStartLine += includeLine - 1;
  result.mChunks.Top().mEndLine += includeLine - 1;
}
```

After handling the includes within the included content, we expect to get a sorted list of SourceChunks, but there is a problem with that list. The line numbers in the SourceChunks are relative to the content of the included file and not the content of the file that it was included in. To fix it, we take each of the sub SourceChunks and offset their start and end lines by the line number that the file was included on. One is subtracted because line numbers start at one and we need an offset.

```cpp
while (std::regex_search(content.cbegin(), content.cend(), match, expression))
{
  // ...
  // All of the other steps except the first.
  // ...

  // Now that we've handled all the sub chunks, we make the current file the
  // backmost chunk again.
  chunk.mStartLine = result.mChunks.Top().mEndLine;
  result.mChunks.Push(chunk);
}

// All of includes have been handled, so the end line of the topmost chunk
// becomes the total line count of the preprocessed file.
result.mChunks.Top().mEndLine = GetLineNumber(content.size(), content);
result.mSuccess = true;
return result;
```

And that's it. In hindsight, it doesn't seem to complex, but coming to this solution was not straightforward by any means. At one point SourceChunks contained their own vector of subchunks, but I couldn't figure out a way to get it to work and forced myself to rethink about my approach.

All of this work wasn't for nothing either. The goal was to have shader errors accurately display file and line number information. To do this, the error log is parsed and any time a line number is stumbled upon, it is replaced with a file name and a line number within that file by using the data in the SourceChunk vector.

```cpp
for (const SourceChunk& chunk : includeResult.mChunks)
{
  // completeLine is the line number from the prepocessed source code.
  if (completeLine < chunk.mEndLine)
  {
    int chunkLineNumber = (completeLine - chunk.mStartLine) + 1;
    int trueLine = chunk.mExcludedLines + chunkLineNumber;
    error << chunk.mFile << "(" << trueLine << ")";
    break;
  }
}
```

## Varkor Projects

Figuring out how project code and resources will be separated from Varkor has been a long time wonder of mine. Back in college, the engines I worked on went hand in hand with the games that were shipped with them. Even though there may have been a good deal of "engine code", at the end of the day, compiling the project did not spit out an engine, it spit out a game. I am happy to say that I haven finally taken my first stab at addressing this problem. 

When I was considering possible approaches, one of the core goals I had was not having to copy any files from Varkor. Instead, a user could do some form of inclusion and use all of Varkor's features without needing to do anything else. Unfortunately, I did not think of a way to acheive this because there are a few files that Varkor will always expect to exist: a dll and a few default shaders. This will expand to a default model and a default texture in the future to account for missing assets as well.

The method I settled on was making Varkor into a static library. If Varkor is built on its own, it's built into a standalone executable. If Varkor is included within another project, it is built as a static library that a user can then link against. From Varkor's perspective, this process looks like this.

```cmake
if ("${CMAKE_PROJECT_NAME}" STREQUAL "varkor")
  add_executable(varkor)
  add_compile_definitions(VarkorStandalone)
else ()
  add_library(varkor)
endif ()
```

From the perspective of a project that has Varkor as a dependency, it looks like this.
```cmake
project(varkor_sample_project)
add_subdirectory(../varkor varkor)
add_executable(varkor_sample_project)
add_subdirectory(src)
target_link_libraries(varkor_sample_project varkor)
```

So that's cool. Varkor is a static library and a dependant project can link against that static library, but what does using Varkor actually look like for a dependant project? At the moment, this involves setting a few function pointers within some of Varkor's namespaces. With these set, Varkor will call into a project's code and allow a user to perform whatever processing they want within their own callback functions.

```cpp
void CentralUpdate();
void SpaceUpdate(const World::Space& space, World::SpaceRef spaceRef);
void InspectComponents(const World::Object& selected);
void AvailableComponents(const World::Object& selected);

int main(void)
{
  World::CentralUpdate = CentralUpdate;
  World::SpaceUpdate = SpaceUpdate;
  Editor::InspectComponents = InspectComponents;
  Editor::AvailableComponents = AvailableComponents;
  VarkorMain();
}
```

These four function pointers are the ones I am currently providing. Here's an overview of their purpose.

- *CentralUpdate:* This function is called once per frame after all of the Spaces currently in the World have been updated.
- *SpaceUpdate:* This function is called once for every Space in the World per Frame. If there are currently four Spaces in the World, this will be called four times in frame: one call for each space.
- *InspectComponents:* This is used for displaying the widgets of custom component types in the editor.
- *AvailableCopmonents:* This is used to make custom componet types addable to Space members.

The most important of these functions is the `SpaceUpdate` function. This function is where I intend on users placing all of their custom component updates. Varkor provides a template function to make the process of adding a component update easy. The only annoyance is the fact that something has to be written.

```cpp
// From Varkor
template<typename T>
void UpdateComponentType(const Space& space, SpaceRef spaceRef)
{
  Object currentObject;
  currentObject.mSpace = spaceRef;
  Table::Visitor<T> visitor = space.CreateTableVisitor<T>();
  while (!visitor.End())
  {
    currentObject.mMember = visitor.CurrentOwner();
    visitor.CurrentComponent().Update(currentObject);
    visitor.Next();
  }
}

// Project Code
void SpaceUpdate(const World::Space& space, World::SpaceRef spaceRef)
{
  World::UpdateComponentType<ComponentA>(space, spaceRef);
  World::UpdateComponentType<ComponentB>(space, spaceRef);
  World::UpdateComponentType<ComponentC>(space, spaceRef);
}
```

Earlier on, I had wished that if a component defined an Update function, its Update function would get called without having to introduce any other code, but now I am on the fence about that wish. Because I am using an ECS structure for organizing component data, calling `UpdateComponentType<T>` will call the Update function for every component of type T within the current Space. In the example above, ComponentA::Update will be called for every ComponentA stored within the Space before the Update functions for the ComponentB and ComponentC components are called. Because of this, requiring the user to make it known that a component has an Update function and they want it called makes sense because it gives them control of the order their component updates are called in. Is it really neccessary though? Maybe. Maybe not. It depends on whether there is a game out there that would make use of this specificity or not.

Another interesting benefit of this is that if a user adds their component type to this component update queue and that component type does not have an Update function, it won't compile.

I am not 100% sure if this is the solution I will stick with. I'll need to see how it pans out to assess whether I actually like it or not. For now though, this direction achieves my current desires with a few minor downsides, so I am pretty optimistic about it.

## Wrapping Up

Thanks for reading this update. I hope the next one comes soon. My girlfriend is now doing an internship during the day and we live in the same one room apartment. So when she's at work, I will be at work on Varkor and other projects. Even after just the first few days, I am accomplishing quite a bit just because of the lack of distractions. I am hoping to see some big productivity boosts and more discipline on my part because of this. I think Picasso said something about the importance that solitude serves. I think he was right.

Oh, and as a parting gift, here's something I was able to make using this project structure and a ship model I finished making a few days ago.

![icepick](icepick.gif)
