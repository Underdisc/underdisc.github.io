I was thinking while sleeping with a cold. Even though there can be a lot of different materials, that doesn't mean that different materials can't share the same shader. I want to reduce the number of shader binds as much as we can because it is redundant work. I am curious how costly a single shader bind is on the CPU side.

I ended up testing two things. How long shader binds take and how long uniform binds take. On average, these are the numbers I get.
```
UserShader - 2.18us
BindUniforms - 596ns
```
Pretty fast, but would take up a ms if called 400 or so times.

Since that small curiosity has been addressed, I want to continue working on optimizing the scene I am working with.
[!manyPatch.png]

I need a sort now. I am going to add quicksort to Ds::Vector. I have never implemented quicksort, and I am a bit curious as to why. It's a very simple and elegant sort. I want to implement quicksort with both Lomuto's and Hoare's partition schemes.

I used Cormens' Introduction to Algorithms to learn about the implementation of quicksort using Lomuto partition, but I did a slight modification to it. The implementation provided in the book uses an index that is out of bounds as an initialization step, and I found this odd.
```cpp
template<typename T>
void Vector<T>::Quicksort(int start, int end)
{
  if (end <= start) {
    return;
  }
  int pivot = LomutoPartition(start, end);
  Quicksort(start, pivot - 1);
  Quicksort(pivot + 1, end);
}

template<typename T>
int Vector<T>::LomutoPartition(int start, int end)
{
  int lessThanEnd = start;
  for (int i = start; i < end; ++i) {
    if (mData[i] < mData[end]) {
      Swap(lessThanEnd, i);
      ++lessThanEnd;
    }
  }
  Swap(lessThanEnd, end);
  return lessThanEnd;
}
```

Now that I have a Quicksort implementation that appears to be working, I want to test it on some large arrays. Lets' say 1,000,000 elements. I ran Lomuto partition quicksort on 10 arrays with 1,000,000 integers. The average time was `103.58ms`. I also ran the worst case scenario (completely sorted arrays), 10 times. The worst case average for 10 runs is...oops. I just encountered a stack overflow. Looks like I am going to need to increase the stack size.

So I increased the stack with /F and /STACK. I am no longer getting a stack overflow, so that probably means it worked. Here are the timings from the run.
```
sortRandomArray: 98.24ms
sortSortedArray: 1:02.5s
```
Wow, the worst case is awful. What is that? 600 times slower. Well, don't sort already sorted arrays, duh.

Because the worst case performance was so bad for a sorted array. I decided to make another modification to the Lomuto partition. Instead of using the last element of the array as the pivot, I use the element in the middle of the array.
```cpp
template<typename T>
int Vector<T>::LomutoPartition(int start, int end)
{
  // This first line is the important detail.
  Swap(start + (end - start) / 2, end);
  int lessThanEnd = start;
  for (int i = start; i < end; ++i) {
    if (mData[i] < mData[end]) {
      Swap(lessThanEnd, i);
      ++lessThanEnd;
    }
  }
  Swap(lessThanEnd, end);
  return lessThanEnd;
}
```
This improved the timings of running the quicksort on the already sorted array dramatically.
```
sortRandomArray: 107.89ms
sortSortedArray: 58.77ms
```

I just added the Hoare partition as well and I am curious to see the numbers from this partition function. The partition is extra fucking elegant. I am still a bit surprised that it works. After trying to run it, though, it turns out that it doesn't. I wonder what's wrong. I am going to try using smaller arrays to see if the problem arises there.
```cpp
template<typename T>
int Vector<T>::HoarePartition(int start, int end)
{
  T pivot = mData[start];
  int i = start;
  int j = end;
  while (true) {
    while (mData[j] > pivot) {
      --j;
    }
    while (pivot > mData[i]) {
      ++i;
    }
    if (j <= i) {
      return j;
    }
    Swap(i, j);
  }
}
```
Ah, I found the problem. If there are two elements equal to the pivot and they are next to each other, i and j get stuck. I can either decrement j and increment i after the swap or use do while loops and have i and j start outside the bounds of the range being partitioned. I like the former more.
```cpp
template<typename T>
int Vector<T>::HoarePartition(int start, int end)
{
  T pivot = mData[start];
  int i = start;
  int j = end;
  while (true) {
    while (mData[j] > pivot) {
      --j;
    }
    while (pivot > mData[i]) {
      ++i;
    }
    if (j <= i) {
      return j;
    }
    Swap(i, j);
    --j;
    ++i;
  }
}
```

This new partition function doesn't run indefinitely, however, I am ending up with an unsorted array. I first encountered a problem when testing the 1 million element sort. I tried creating a few test arrays to see if I could create the problem with a smaller array. After cutting things away, I ended up getting a small array that doesn't sort using my implementation of the HoarePartition.
```cpp
// Before Sort
4, 4, 3, 3, 2, 2, 1, 1, 0, 0
// After Sort
0, 0, 1, 2, 2, 3, 3, 1, 4, 4
```
I am going to run my algorithm by hand to see where the problem happens.

So I found the problem, but I am not exactly sure what to do about it. The issue is the pivot index returned from the partition. The pivot is not in its final position. One solution to this is to change the quicksort function.
```cpp

template<typename T>
void Vector<T>::Quicksort(int start, int end)
{
  if (end <= start) {
    return;
  }
  int pivot = HoarePartition(start, end);
  Quicksort(start, pivot);
  Quicksort(pivot + 1, end);
}
```
The change here is the lack of a `pivot - 1`. This guarantees that the out-of-order pivot will still be sorted. Even though it works, it feels like this is "breaking a rule" in some way. I tried returning `i` as the pivot too. That works for my simple cases, but not the large sorts.

I think I figured out what happened. I think I was swapping with elements outside of the Vector because I was not checking whether the incrementer passed the upper bound of the range being sorted. Even though it's outside of the vector, the memory is still allocated because I am indexing directly into the `mData` array in my sort function. This means my Vector's operator[] bounds checking are skipped.

Ok. I think I now have a working quicksort using Hoare partitioning. Here is the next version of the partition function.
```cpp
template<typename T>
int Vector<T>::HoarePartition(int start, int end)
{
  const T& pivot = mData[start];
  int i = start + 1;
  int j = end;
  while (true) {
    while (mData[j] > pivot) {
      --j;
    }
    while (pivot > mData[i] && i <= end) {
      ++i;
    }
    if (j < i) {
      Swap(start, j);
      return j;
    }
    Swap(i, j);
    --j;
    ++i;
  }
}
```
The important detail here is that `i` now starts at `start + 1` and a swap is performed `Swap(start, j)` before exiting the partitioning function. This guarantees that the pivot will be surrounded by elements <= on the left and >= on the right. This was the primary reason my stress sorts were breaking. With that covered, here are some times for sorting 1000000 (1mil) integers.
```
sortRandomArray: 74.48ms
sortSortedArray: 23.01s
```
That's about 1.44 times faster for the random array and twice as fast for the sorted array. Btw, the run on the sorted array did not use the heuristic that I used to dramatically improve the amount of time it took to run quicksort with the Lomuto partition. I am going to add that same heuristic (choose the element in the middle of the array as the pivot) for the Hoare partition.
```cpp
template<typename T>
int Vector<T>::HoarePartition(int start, int end)
{
  Swap(start, start + (end - start) / 2);
  //...
}
```
Let's see the new averages.
```
sortRandomArray: 74.26ms
sortSortedArray: 23.12ms
```
It seems like sortRandomArray hasn't been affected whatsoever. sortSortedArray, on the other hand, has undergone a massive improvement. 23 seconds to 23 milliseconds. Actually 1000 times faster.

Cool, I now have a sort that's fast enough until it isn't. Moving on'.







