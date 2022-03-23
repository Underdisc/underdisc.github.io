# A Bug Involving References

Y'know those bugs that result in some really strange behavior? You analyze its nature to figure what is happening and you finally find an explanation only to realize the problem was practically sitting in front of your face the entire time. This is about one of those.

First, the premise. I made my own gizmos a while ago [gizmo post](../6_gizmos/index.html). There was a translate, scale, and rotate tool all packed into a single "mega gizmo" called the transform gizmo. Putting these all into a single structure was a blunder and I have tasked myself with separating them into 3 different structures; one for each of the tools. That way I don't need to provide modifiable scale and rotation parameters to a gizmo that will only be used for performing translation.

In the original implementation, the transform gizmo structure held its own Space ([the space I speak of](https://github.com/Underdisc/Varkor/blob/b8fbe655dbb7706a18e80897b341e4b43030b9b0/src/editor/hook/Transform.h#L79)). This is where gizmo handle information is stored: their transformations, model references, etc. The gizmo having its own space like this didn't feel quite right, so I decided to make a general editor Space. A gizmo could then just use that space rather than needing to hold its own. I still don't know if this is a good decision, but it gets rid of some boilerplate, so that's what I am doing. More importantly, this establishes the premise and leads me to what the bug even is. While testing the first separated gizmo, this ended up happening.

<video width="400" height="200" controls>
  <source src="bug.mp4" type="video/mp4">
</video>

The first time I open the `Transform` header, the gizmo handles show up as they should. However, the second time it is opened, only some of the gizmo handles work. The third time is even worse; only the "all axes" handle in the middle shows up as expected. The fourth time, though? Everything is normal again? k.

What's happening here was not obvious to me and my brain lives here. To understand why this happens, we need to talk about what a Space is and how it deals with the things it contains. _Spaces contain members. Members own references to data in component tables._ To make sure we're on the same page, here is a usage example.

```cpp
World::Space space;
World::MemberId newMemberId = space.CreateMember();
```

After we create an instance of a space, we can create a member in it. We get an identifier back from the space that allows us to find all of the information about that member.

```cpp
ComponentType& component = space.AddComponent<ComponentType>(newMemberId);
```

We can now add a component to that member. The member now owns a reference to some data that defines the member's `ComponentType` component.

```cpp
component.mMemberValue = 10;
component.mMemberString = "hahadurdurfunnystring";
```

We can change that data directly by using the returned component reference, or can we? This is where the example ends and an explanation of the bug begins. To understand why the behavoir in the video from earlier occurs, we need to know about some things hidden behind this line.

```cpp
ComponentType& component = space.AddComponent<ComponentType>(newMemberId);
```

Spaces hold onto component data in component tables. A space will have one table for each unique component type it contains.

![component tables](component_tables.png)

So, the members of the above space collectively have 3 `A` components, 5 `B` components, and 1 `C` component. For the sake of clarity, we are completely ignoring the space's members. Just know that members somehow know about all of the components they own.

When a component is added to a member, that member takes ownership of some data in the relevant component table. For example, continuing with the image above, if we made a new member and gave it an `A` component, the `A` table would have one more box and the data represented by that box would be owned by the new member.

Ok. That's nice and all, but why does this explanation of how `AddComponent` works provide insight into the bug? Well, consider this.

```cpp
A& aComponent0 = space.AddComponent<A>(0);
A& aComponent1 = space.AddComponent<A>(1);
A& aComponent2 = space.AddComponent<A>(2);
```

This code represents 3 members receiving `A` components. As we just established, all of these components will be stored within the `A` component table. Those of you that have any familiarity with [insert vector data structure flavor here], might have some alarm bells ringing right now.

Like everything, memory is not infinite, and we typically don't want to waste it needlessly. At some point, the `A` component table isn't going to contain enough memory for a new component and it's going to need to grow. Say this growth happens when the member with the Id `2` receives its `A` component?

![growth](growth.png)

The component data for the `0` and `1` members will be copied, or more accurately, moved, into the table's new allocation and then member `2` will take ownership of some of the newly available data. Since we tossed out the previous allocation for the `A` component table, though, we've invalidated anything referencing that memory. This means that `A& aComponent0` and `A& aComponent1` are no longer valid because they reference memory we have given up control over.

You've already seen the manifestation of this problem. It was the video at the start. What's the offending code then? I now present you with utter trash (some of which has been removed to address unnecessary redundancy).

```cpp
Comp::Model& xM = nSpace.AddComponent<Comp::Model>(mX);
Comp::Model& yM = nSpace.AddComponent<Comp::Model>(mY);
Comp::Model& zM = nSpace.AddComponent<Comp::Model>(mZ);
Comp::Model& xyM = nSpace.AddComponent<Comp::Model>(mXy);
Comp::Model& xzM = nSpace.AddComponent<Comp::Model>(mXz);
Comp::Model& yzM = nSpace.AddComponent<Comp::Model>(mYz);
Comp::Model& xyzM = nSpace.AddComponent<Comp::Model>(mXyz);

xM.mModelId = AssLib::nArrowModelId;
yM.mModelId = AssLib::nArrowModelId;
zM.mModelId = AssLib::nArrowModelId;
xyM.mModelId = AssLib::nCubeModelId;
xzM.mModelId = AssLib::nCubeModelId;
yzM.mModelId = AssLib::nCubeModelId;
xyzM.mModelId = AssLib::nSphereModelId;
xM.mShaderId = AssLib::nColorShaderId;
yM.mShaderId = AssLib::nColorShaderId;
zM.mShaderId = AssLib::nColorShaderId;
xyM.mShaderId = AssLib::nColorShaderId;
xzM.mShaderId = AssLib::nColorShaderId;
yzM.mShaderId = AssLib::nColorShaderId;
xyzM.mShaderId = AssLib::nColorShaderId;
```

At some point, the `Comp::Model` table grows and invalidates any of the references returned from the eariler calls to `AddComponent`. In fact, the video kinda shows when the growth happens. The starting allocation size of a table is large enough to fit 10 of a component type. This is why creating the gizmo the first time works exactly as expected. We only have 7 model components, so the table never grows. The second time, though, only the X, Y, and Z axis handles are missing. This makes perfect sense because those handles are represented with the first 3 model components. Once we add the 4th model component, the references for the first handles are invalidated and the first assignments in the block afterwards occur on unowned memory. The fix to this is to perform the assignments before adding more components to the table, like so.

```cpp
Comp::Model& xM = nSpace.AddComponent<Comp::Model>(mX);
xM.mModelId = AssLib::nArrowModelId;
xM.mShaderId = AssLib::nColorShaderId;

Comp::Model& yM = nSpace.AddComponent<Comp::Model>(mY);
yM.mModelId = AssLib::nArrowModelId;
yM.mShaderId = AssLib::nColorShaderId;

// ...
```

This does raise some concerns about the state of Space's interface. Should it really be returning a reference if it's possible for the reference to become garbage within the same scope? Returing a component reference type would be the utopic solution, but I don't fully know what that would look like and it's not my priority right now.

You may be wondering, "Why didn't you reuse the memory that was made available when you destroyed the gizmo?" That's a great question and the only answer I can give you is, "I haven't needed to yet." I'm not even joking. The implementation for spaces and tables makes next to *0* effort to perform any sort of garbage collection. This is the first time I have used them in a context where members and components are being continuously added and removed. In the beginning, I just needed objects and components, so I wrote a way to do that. I am now at a point where the holes are more opaque, though, so patching them up just becomes more a priority now.

### Unrelated stuff you probably don't care about.

I haven't posted in a while. Part depression. Part not having some complete system to talk about. Part decreased output over the last months. This was just a way for me to write about _something_ and it's pretty liberating. The last posts about Valkor and Gizmos were so large and took quite a long time to put together. Making something bite-sized was much more approachable and doable in reasonably short amount of time.

Looking back through my posts, it feels like nothing happened after and around the last 2. That's definitely not the case, though. Many little steps and challenges have been passed during that time. I guess this serves as a reminder that the things I am working on are worth talking about, even if I feel as though they are too little. _A large thing is nothing but a combination of many small things, right?_

<p style="text-align: center;">
RIP Lucas 'Kaybox' Koester. Thank you for spending time with me. We'll meet again in the Wilderzone.
</p>
