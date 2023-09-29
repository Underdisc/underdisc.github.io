Now that I have a way to sort things, I need to sort my renderables, so I can render them efficiently. A large concern of mine here is that sorting the renderables will take so long that it will nullify the benefit gained from rendering performance. This concern arises from the current implementation of materials. Materials contain a shader ID. The sort needs to account for material ID and shader ID. So, in order to do a comparison, a lookup for the material in the asset library must be done before the shader ID can be acquired. I am worried about the cost of these lookups. Only one way to find out what it actually is.

Before doing that, my sort function needs to be able to take a generic comparison function. When I implemented quicksort, I made sure to only use one comparison operator type for exactly this reason.
```cpp
template<typename T>
void Vector<T>::Sort()
{
  auto greaterThan = [](const T& a, const T& b) -> bool
  {
    return a > b;
  };
  Quicksort(0, mSize - 1, greaterThan);
}

template<typename T>
void Vector<T>::Sort(const std::function<bool(const T&, const T&)>& greaterThan)
{
  Quicksort(0, mSize - 1, greaterThan);
}
```

I am not 100% if this has any performance implications. I don't believe it does, but I'll do the 1000000 integer test again to see if there is any change in numbers.
```cpp
{
  //...
  srand(34);
  Ds::Vector<int> stress[10];
  for (int i = 0; i < 10; ++i) {
    for (int j = 0; j < 1000000; ++j) {
      stress[i].Push(rand());
    }
  }
  TracyCZone(allSorts, true)
  for (int i = 0; i < 10; ++i) {
    TracyCZone(sort, true);
    stress[i].Sort();
    TracyCZoneEnd(sort);
    static int wut = 0;
    std::cout << wut++ << std::endl;
  }
  TracyCZoneEnd(allSorts);
}
```

This is a bit unfortunate, because I don't have an exact copy of my stress test code from last time. However, if my memory is serving me well, I think this implementation does actually cause a bit of a slow-down. Here is the average after sorting 1000000 integers 10 times. I ran it a couple of times, and it's consistently there.
```
sort: 108.34ms
```

Yep, I just removed the calling `greaterThan` from my quicksort's partition function and the run time is back to down.
```
sort: 74.41ms
```

So std::function appears to introduce enough overhead to make the sort `1.45` times slower. While researching if there is some way to 'inline' a, I came across [this](https://vittorioromeo.info/index/blog/passing_functions_to_functions.html). The idea of 'inlining' a `std::function` seems pretty absurd, but it did lead me to exactly what I want.

From this article, I have gathered that I want to use a function pointer instead of a `std::function`. It's not going to be as fast as using a template parameter, but it should be much faster than `std::function`. I don't want to use a template parameter because it does not allow me to specify the function signature and I am definitely putting way more effort into making sure this is fast than I need to be.
```cpp
template<typename T>
void Vector<T>::Sort(bool (*greaterThan)(const T&, const T&))
{
  Quicksort(0, mSize - 1, greaterThan);
}
```

This may have resulted in a slight improvement, but it's unclear.
```
sort: 100.89ms
```
Now I wonder if it's the fact that I am using a lambda to create the function pointer that's making it slower. I doubt it, but there is only one way to find out.
```cpp
template<typename T>
bool greaterThan(const T& a, const T& b)
{
  return a > b;
};

template<typename T>
void Vector<T>::Sort()
{
  Quicksort(0, mSize - 1, greaterThan);
}
```
Survey says!
```
sort: 102.76ms
```

Nope. There's no real difference. They all perform the same. I am going to go forward with the function pointer impl because I like it more than `std::function` on a surface level. If this proves to be a performance bottleneck, it can be handled once I know it's a problem.

Ew, I had a bug in my sort.
```cpp
while (greaterThan(pivot, mData[i]) && i <= end) {
  ++i;
}
```
The condition `i <= end` needs to come before the array access `mData[i]`. It's probably a good idea to add a test vector that creates this exact problem.

Oh boy. So I ran the sort on renderables before worrying about instancing, and boy was my hunch on point. It's actually worse than I expected.
```cpp
auto greaterThan =
  [](const Renderable::Floater& a, const Renderable::Floater& b) -> bool
{
  const auto* aMaterial = Rsl::TryGetRes<Gfx::Material>(a.mMaterialId);
  const auto* bMaterial = Rsl::TryGetRes<Gfx::Material>(b.mMaterialId);
  if (aMaterial == nullptr && bMaterial == nullptr) {
    return true;
  }
  if (aMaterial == nullptr) {
    return false;
  }
  if (bMaterial == nullptr) {
    return true;
  }
  if (aMaterial->mShaderId.mId > bMaterial->mShaderId.mId) {
    return true;
  }
  if (a.mMaterialId.mId > b.mMaterialId.mId) {
    return true;
  }
  if (a.mMeshId.mId > b.mMeshId.mId) {
    return true;
  }
  return false;
};
```
Just sorting the Floaters is taking around `25ms`. Rendering the floaters was faster than the sort alone. The time I have written down from my old notes is `3.36ms`. The question now is where the bottleneck is. I am relatively certain that it's the material lookups, because that's what I was scared of earlier.
```cpp
TracyCZoneN(materialLookup, "materialLookup", true);
const auto* aMaterial = Rsl::TryGetRes<Gfx::Material>(a.mMaterialId);
const auto* bMaterial = Rsl::TryGetRes<Gfx::Material>(b.mMaterialId);
TracyCZoneEnd(materialLookup);
```
Of that, it looks like the material lookups are taking around `20ms`. That's bad, but multiple milliseconds are being spent just doing string comparisons. Performing the sort on a large scene with a lot of similar objects results in `35,000` material comparisons. Additionally, this sort is redundant work. It's the same sort repeated every frame because renderables are collected in the same order every frame.

I have some new thoughts after this exploration. Though I think instanced rendering is an important optimization, I have a bigger problem right now. The same work is being done every frame. It would be more important to get rid of that redundancy before treating instancing as a priority.

There are multiple problems that need to be solved in order to get rid of that redundant work. Firstly, I should only collect a renderable once when it is first added. Second, I need to update the transform of that renderable every frame if it's a dynamic renderable (it moves). Updating that transform is hard though. I need to somehow connect a mesh component with the renderable that it added to the renderer, and that access needs to be quick.

Also, I am trying to optimize something that is fast enough at the moment. I want to put this optimization work aside and focus on physics now. I should really save this optimization work for when I am actively encountering performance issues that are reducing the framerate, or I am actively optimizing something more than just an experiment.

To further establish why I am working on stupid stuff. I am hoping to dramatically reduce the number of objects in the scene I am currently trying to optimize, but I need a bounding volume hierarchy in order to reduce the number of objects and add the polish that I have in mind. In other words, I am trying to optimize an unrealistic use case.

With that said, and this path explored far enough, I am off to read Real-time Collision Detection.
