I am working on some performance improvements. When a splatch starts to get larger than normal, changing node positions gets pricey. This is because I update all the patches rather than the handful of patches that need to be changed. Not only am I updating all the patches. I am updating the rods and edges that undergo changes multiple times.

I did some profiling on my current crappy implementation.
```
UpdateEverything - This accounts for updating rods, edges, and patches.
UpdateRodsAndEdges - This is just for updating rods and edges.
UpdatePatches - This is just for updating patches.
```
Here is the relevant code for that.
```cpp
{
  //...
  TracyCZoneN(UpdateEverything, "UpdateEverything", true);
  // Apply the motion to all points.
  TracyCZoneN(UpdateRodsAndEdges, "UpdateRodsAndEdges", true);
  for (int i = 0; i < (int)Strength::Count; ++i) {
    const auto& selection = mSelection[i];
    for (int p = 0; p < selection.Size(); ++p) {
      World::MemberId nodeId = selection[p];
      const Node& node = nSpace.Get<Node>(nodeId);
      Vec3& point = splatch->mPoints[node.mPointId].mPosition;
      point = motion(point);
      nSpace.Get<Comp::Transform>(nodeId).SetTranslation(point);

      // Apply the change to all connected rods and edges.
      for (World::MemberId rodId : node.mRods) {
        UpdateRod(*splatch, rodId);
      }
      for (World::MemberId edgeId : node.mEdgeIds) {
        if (edgeId != World::nInvalidMemberId) {
          UpdateLineMesh(*splatch, edgeId);
        }
      }
    }
  }
  TracyCZoneEnd(UpdateRodsAndEdges);


  // Update the affected mesh patches.
  TracyCZoneN(UpdatePatches, "UpdatePatches", true);
  for (int p = 0; p < splatch->mPatches.Size(); ++p) {
    splatch->UpdateMeshPatch(splatch->mPatches.Dense()[p]);
  }
  TracyCZoneEnd(UpdatePatches);
  TracyCZoneEnd(UpdateEverything);
}
```

With four corner nodes selected, 103 patches, and 696 frames, here are the profiling averages.
```
UpdateEverything - 44.56ms
UpdateRodsAndEdges - 663.04us
UpdatePatches - 43.89ms
```
Obviously, this is pretty bad. Now let's improve it.


My new implementation makes use of Ds::RbTree. It's my red black tree structure. I am using it as a set to provide a speed-up. It's important to know that every node/element in the rbtree is a separate allocation with new. I've been concerned about the slow-down caused by that, but it shouldn't be relevant here.

For this next profiling session, I have some new zones.
```
UpdateEverything - Same as before.
CollectDirty - Collection of all the objects/patches that need to be updated.
UpdateDirty - Update of all the collected dirty objects/patches.
```
Here is the relevant code.
```cpp
  // Apply the motion to all points and find all gizmo objects and patches that
  // need to be updated.
  TracyCZoneN(UpdateEverything, "UpdateEverything", true);
  TracyCZoneN(CollectDirty, "CollectDirty", true);
  Ds::RbTree<World::MemberId> dirtyRods;
  Ds::RbTree<World::MemberId> dirtyEdges;
  Ds::RbTree<Ds::PoolId> dirtyPatches;
  for (int i = 0; i < (int)Strength::Count; ++i) {
    const auto& selection = mSelection[i];
    for (int p = 0; p < selection.Size(); ++p) {
      // Apply the motion to the point.
      World::MemberId nodeId = selection[p];
      const Node& node = nSpace.Get<Node>(nodeId);
      Vec3& point = splatch->mPoints[node.mPointId].mPosition;
      point = motion(point);
      nSpace.Get<Comp::Transform>(nodeId).SetTranslation(point);

      // Account for dirty rods, edges, and patches.
      for (World::MemberId rodId : node.mRods) {
        dirtyRods.Insert(rodId);
      }
      for (World::MemberId edgeId : node.mEdgeIds) {
        if (edgeId == World::nInvalidMemberId) {
          continue;
        }
        dirtyEdges.Insert(edgeId);
        const Edge& edge = nSpace.Get<Edge>(edgeId);
        dirtyPatches.Insert(edge.mPatchId);
        Ds::PoolId adjacentPatchId =
          splatch->mPatches[edge.mPatchId].mAdjacentPatchIds[edge.mDirection];
        if (adjacentPatchId != Ds::nInvalidPoolId) {
          dirtyPatches.Insert(adjacentPatchId);
        }
      }
    }
  }
  TracyCZoneEnd(CollectDirty);

  // Update all of the changed gizmo objects and patches.
  TracyCZoneN(UpdateDirty, "UpdateDirty", true);
  for (World::MemberId rodId : dirtyRods) {
    UpdateRod(*splatch, rodId);
  }
  for (World::MemberId edgeId : dirtyEdges) {
    UpdateLineMesh(*splatch, edgeId);
  }
  for (Ds::PoolId patchId : dirtyPatches) {
    splatch->UpdateMeshPatch(patchId);
  }
  TracyCZoneEnd(UpdateDirty);
  TracyCZoneEnd(UpdateEverything);
```

Ok, let's see the new times using the same setup as before.
```
UpdateEverything - 2.06ms
CollectDirty - 23.14us
UpdateDirty - 2.03ms
```
What is that? 21.6 times faster.

Ah fuck. Wait. There's a bug in here. If I move an interior point, it won't update the patch because it doesn't reference any edges. The fix here should be quite easy. Make a lambda that registers elements attached to a node as dirty. If a node is an interior node, follow the attached rod to the edge node and call the lambda with that node.

This will result in unnecessarily updating patches that didn't change, but at least this is much faster than before. Here is the new code for the relevant section (CollectDirty).
```cpp
{
  //...
  TracyCZoneN(UpdateEverything, "UpdateEverything", true);
  TracyCZoneN(CollectDirty, "CollectDirty", true);
  Ds::RbTree<World::MemberId> dirtyRods;
  Ds::RbTree<World::MemberId> dirtyEdges;
  Ds::RbTree<Ds::PoolId> dirtyPatches;
  // Adds all elements that need to be updated because a relevant node moved.
  auto addDirtiedElements = [&](const Node& node)
  {
    for (World::MemberId rodId : node.mRods) {
      dirtyRods.Insert(rodId);
    }
    for (World::MemberId edgeId : node.mEdgeIds) {
      if (edgeId == World::nInvalidMemberId) {
        continue;
      }
      dirtyEdges.Insert(edgeId);
      const Edge& edge = nSpace.Get<Edge>(edgeId);
      dirtyPatches.Insert(edge.mPatchId);
      Ds::PoolId adjacentPatchId =
        splatch->mPatches[edge.mPatchId].mAdjacentPatchIds[edge.mDirection];
      if (adjacentPatchId != Ds::nInvalidPoolId) {
        dirtyPatches.Insert(adjacentPatchId);
      }
    }
  };

  // Apply the motion to all points and find all gizmo objects and patches
  // (dirty elements) that need to be updated.
  for (int i = 0; i < (int)Strength::Count; ++i) {
    const auto& selection = mSelection[i];
    for (int p = 0; p < selection.Size(); ++p) {
      // Apply the motion to the point.
      World::MemberId nodeId = selection[p];
      const Node& node = nSpace.Get<Node>(nodeId);
      Vec3& point = splatch->mPoints[node.mPointId].mPosition;
      point = motion(point);
      nSpace.Get<Comp::Transform>(nodeId).SetTranslation(point);

      // Add the elements that are now dirtied because of the point motion.
      addDirtiedElements(node);
      // Moving an interior node needs to update the patch it is part of.
      if ((Strength)i == Strength::Interior) {
        const Rod& rod = nSpace.Get<Rod>(node.mRods[0]);
        World::MemberId edgeNodeId = mPointIdToMemberId[rod.mPointIds[0]];
        addDirtiedElements(nSpace.Get<Node>(edgeNodeId));
      }
    }
  }
  TracyCZoneEnd(CollectDirty);
}
```

With this change, here are the new times. These are averages over 22,472 runs.
```
UpdateEverything - 2.17ms
CollectDirty - 29.66us
UpdateDirty - 2.12ms
```
Just a little slower, as expected, but necessary to make things work as they should.

Just because I am curious, I want to add three more zones to see how long it takes to update each of the dirtied elements: rods, edges, and patches. I am certain that edges and patches will take the longest, but just how long is what I am curious about. 20,388 runs.
```
UpdateRods - 12.62us
UpdateEdges - 418.9us
UpdatePatches - 1.62ms
```
So patch updating would certainly be the next thing to target for performance improvements.

