# Varkor

I work on this project as a solo developer on a very regular basis, and hence some of the things written here may change or may have already changed. That being said, the gist of what is said here will continue to hold true.

Varkor is a custom game engine written in C++. I hesitate to say "written from scratch", because I believe that statement is thrown around too often without actually being true to the phrase. I didn't design the hardware the engine runs on. I didn't write the C++ compiler. I didn't even write all the C++. I am using libraries to handle the things I don't have an interest in implementing, however, I am cursed with having a serious interest in implementing a lot of things. This project has and continues to act as a way for me to use that interest as fuel for revisiting topics I dearly miss from college, topics I feel I should have studied in college, and topics that I have only dreamed of getting a knack for.

[Varkor on GitHub](https://github.com/Underdisc/Varkor)

## Custom Data Structures
One of the things I am quite passionate about doing is creating my own data structures instead of using those provided by the stl. Data structures are a particularly fascinating and fundamentally useful part of programming. I found it hard to justify my knowledge and understanding of certain data structures when I had not written them myself. So, needless to say, writing my own data structures and actually using them has been an important experience for me. At this time I have implemented a vector, a red black tree, and a map. Next up is likely going to be a list, but I am not absolutely sure of that. There comes a stage where I need a certain data structure to accomplish something. If I don't already have it, I need to write it. So the next structure I write will be whatever I need next.

[Varkor Data Structures](https://github.com/Underdisc/Varkor/tree/master/src/ds)

## Custom Math
Similar to the fundamental nature of data structures, math is fundamental for any game engine and I couldn't imagine using a library to do something I have a keen interest in understanding. At the moment my math library is by no means extensive, but it contains a lot of the core types that are needed for basic transformations. This includes vectors, matrices, and my favorite, quaternions. Just like my approach with data structures, things are added as I need them.

[Varkor Math](https://github.com/Underdisc/Varkor/tree/master/src/math)

## Custom Core
When I say core, I am referring to the system that manages objects and the components attached to those objects. When I first began working on the core of Varkor, I was particularly passionate about data organization after being inspired by ecs systems that focus on putting component data into tightly packed arrays. This allows systems that iterate over a single component type or set of component types while avoiding cache misses, providing a significant performance boost. At the time of this writing, I have only begun to use the core and there are a lot of tasks sitting in my todo list pertaining to the many improvements I need to make to it.

[Varcore?](https://github.com/Underdisc/Varkor/tree/master/src/core)

## Custom Graphics
Similar to the core mentioned above, Varkor's graphics implementation is one of my current focuses. I have already written code that allows me to display models with lighting applied, but it's rather weak because it is not data-driven. In other words, code needs to be written in order to draw things and that's not how it should be for a game engine. Regardless, this is going to change a lot in the time after I write this and I don't want these words to be instantly invalidated, so I am going to shut up.

[Varkor Graphics](https://github.com/Underdisc/Varkor/tree/master/src/gfx)
