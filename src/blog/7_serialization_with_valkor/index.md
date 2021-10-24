# Serialization With Valkor

After finishing gizmos, the next major task was serialization. There's a few popular options for this. One can use JSON as the file format and use something like [nlohmann/jsoncpp](https://github.com/nlohmann/json) for the cpp side of it. [YAML](https://yaml.org/) is also an option. There are probably plenty of small options out there as well. As has been typical for me, I decided to not use any of those options and instead made my own serialization language that can be read using a small cpp library I cooked up. This language is called Valkor.

Similar to gizmos, my reason for making this is a concoction of control and curiousity. When it comes to control, making my own serialization language gives me the opportunity to make any decisions I want. I can make it look how I want and I can make the processing work how I want. It turns out this is both a blessing and a curse. That will become apparent throughout the post. Curiosity takes the role of main ingredient in this mixture, though. In college, one of the last classes I took was on compilers and interpreters. I learned about everything one would need to make a serialization language from the beginning of that class. It would feel strange not to take a crack at making my own language after having a class that directly discussed the topic and it would really become a missed opportunity. With that thought in mind, I was curious about what hills there were to climb while making a language. Albeit a simple language, but there must be hills nonetheless. It turns out there are many and a lot of it comes down to the "freedom" that comes with making it.

Like my last post, this one will also be split up into a few sections. First, I'll cover the inception of the language and how I got started. After that, I'll give an overview of what using the language's cpp interface looks like for performing data serialization. Then, last but not least, I'll talk about the deserialization process. Along the entire way, I'll be discussing the problems I encountered while developing. The implementation for the language can be found in Varkor's [vlk directory](https://github.com/Underdisc/Varkor/tree/master/src/vlk). Here's [another link](https://github.com/Underdisc/Varkor/tree/9e9ac4eb1b4d9b3a50ab36e2eb2da01042c2c990/src/vlk) for the repo's top commit when this was posted since things may change in the future. Without further ado, let's dive in.

# Shitty Inception

The first step involved in writing Valkor was, well, writing Valkor. Before implementing anything, I started writing down an example of what Valkor might look like after getting to the point where I could reliable save things to file and load them. Unfortunately, I couldn't find a copy of the first draft I made. So, here's my best rendition of what my ridiculously naive version of Valkor looked like.

```text
// A key Value pair.
Key: Value

// A key with an array of key value pairs
> Key
  Key: Value
  Key: Value

// a key with an array of values.
> Key
  Value
  Value
  Value

// A key with a multidimensional array of values.
> > Key
  > Value
    Value
    Value
  > Value
    Value
    Value
```

This dumpster fire is nothing like what Valkor ended up being except for the fact that there are keys, values, and colons. I don't think the above snippet really does justice (or lack thereof) to just how weird the first version was. I remember looking at it and thinking, "There's no way I can get this shit to work.", but I feel like the snippet above represents something actually possible. The devil is in the details, though. Let me explain.

What's a problem with this snippet? Here's one. Look at the key that's an array of values. What happens to the first key after that array?

```text
> Key
  Value
  Value
  Value
Key: Value
```

How does one distinguish the key on the last line as a key? It's important to note that one of my goals for the language was to not have forced formatting standards: no forced indentation, no forced new lines, no adderall, etc. With that in mind, let's rewrite this.

```text
> Key Value Value Value Key: Value
```

From the perspective of a parser, the last key could be mistaken for a value. This forces us to answer a question. *What makes a key a key and a value a value?* We could address this by requiring keys to end with colons. So, a key would look something like `anExampleKey:`. Let's rewrite the example with that in mind.

```text
> Key:
  Value
  Value
  Value
Key: Value
```

The only difference here is that the first key ends with a colon. But what about the arrow that signifies an array? Shouldn't that also mean that the string is treated as a key? One could add that rule, but what happens when we have multidimensional arrays?

```text
> > Key
  > Value
    Value
  > Value
    Value
```

Because values and keys can come after array arrows, we can't bake that into the definition of a key. The fact that two arrows happen in succession makes things even more tricky. To make matters worse, what if we have an array of key value pairs instead of just values? I could have attempted to address these problems during the parsing phase, but no attempt was made since I didn't go forward with this syntax.

My point here is to show that freedom is nice to have, but it doesn't mean everything that comes out of your ass will work out. That fact made finding a usable syntax very difficult and was one of the larger challenges I faced while developing the language. It's nothing like a cs class where you are given a language and expected to process it. I don't want to go into more details about this initial prototype because it is not what Valkor ended up being, but I did want to show the origins of the language because it's part of the story.

# The Writer

After playing around with some initial prototypes of what Valkor files (.vlk) might look like, I didn't feel ready to start making something that deserialized a vlk file. It didn't make sense to do so when I still didn't know exactly what the syntax would look like. To get past that phase, I wrote something called the Writer to shift my focus entirely to serialization. The idea was to find a syntax that could be deserialized by first serializing it programmatically. It would be easier to deal with the process of reading after knowing exactly what to expect from a vlk file.

I didn't have much intent to read the data I was spitting out just yet. I wanted to find something human-readable that I could print before trying to deserialize it. I knew the Writer would be thrown out upon moving to the next step. Since it wouldn't need to scale, I ignored the Writer's issues and focused entirely on getting something working. Ignoring implementation details, the snippet below shows what using the Writer looked like and the comment below shows the output of the snippet. I'll be using this format from now on for showing the output of a snippet.

```cpp
void WriterExample()
{
  writer << Request::Array << "Array1";
  writer << Request::Value << "Float" << 5.5f;
  writer << Request::Array << "Array2";
  writer << Request::ValueArray << "Strings";
  for (int i = 0; i < 5; ++i)
  {
    std::stringstream ss;
    ss << "string " << i;
    writer << ss.str().c_str();
  }
  writer << Request::EndValueArray << Request::EndArray << Request::EndArray;

  const std::stringstream& content = writer.GetCompleteBuffer();
  std::cout << content.str() << std::endl;
}

/*****
Array1: {
  Float: 5.5
  Array2: {
    Strings: [
      "string 0"
      "string 1"
      "string 2"
      "string 3"
      "string 4"
    ]
  }
}
*****/
```

It was cumbersome, but it got the job done. I finally had some output to start thinking about deserilaization with. It also allowed me to experiment with a serialization interface to avoid potential potholes in the future. This god-awful line is a perfect example of a pothole that was filled in upon moving forward: `writer << Request::EndValueArray << Request::EndArray << Request::EndArray;`.

The output created using the Writer was a major leap from the initial versions of Valkor that I was toying with, too. Keys ended up receiving an ending colon to distinguish them from values. Instead of using `>` for arrays, `[]` is used. There is a distinction between value arrrays `[]` and key value pair arrays `{}`, which I just call pair arrays. These changes brought Valkor to a stage where deserializing it seemed much more feasible and thus I was ready to address the most exciting part: loading.

# Serialization Overview

Unfortunately, discussing the next chronological step wouldn't flow nicely from the previous section about the Writer, because it would force the post to go back and forth between serialization and deserialization. Thus, before talking about deserialization, I want to go over the interface that Valkor ended up with for serialization. Just be aware that this is not the order things were done in.

The primary interface for serializing data into Valkor text is the Vlk::Value. New Values can be encapsulated within others, they can be saved to file, and loaded from file. Let's start digging into what that looks like. To start serializing data, there must always be a root Value. This Value will hold everything we care about.

```cpp
Vlk::Value rootVal;
rootVal.Write("filename.vlk");
/*****
{}
*****/
```

If you're a user of the mighty JSON, this should look very familiar to you. The first thing to know about Vlk::Value is that everything is a Vlk::Value. They are a bit like shapeshifters, though. In particular, they can take three different forms. The most useful form they can take is a PairArray.

In the snippet above, rootVal is an unused (uninitialized) Value. When a Value is uninitialized like this, it becomes an empty PairArrary `{}` when written to file. Instead of just keeping it empty, we can fill up that PairArray with Pairs. Pairs are no different than Values except for the fact that they have an extra key string, making them key value pairs. Let's add some empty PairArrays to our root Value.

```cpp
Vlk::Value rootVal;
rootVal("SubVal1");
rootVal("SubVal2");
rootVal.Write("filename.vlk");
/*****
{
  :SubVal1: {}
  :SubVal2: {}
}
*****/
```

This `rootVal("SubVal");` syntax creates the new Value within the PairArray. We can keep track of that new Value because the Value's `()` operator returns it. With access to that Value, we can start adding elements to our sub PairArrays like so: *For snippets after this one, you can assume that the `Vlk::Value rootVal;` and `rootVal.Write("filename.vlk");` lines are at the beginning and end of the serialization code, respectively.*


```cpp
Vlk::Value rootVal;
Vlk::Value& subVal = rootVal("SubVal");
subVal("SubSubVal");
rootVal.Write("filename.vlk");
/******
{
  :SubVal: {
    :SubSubVal: {}
  }
}
******/
```

Value would be useless if it could only be a PairArray. Anything added would boil down to empty PairArrays. That's why Value can take other forms though. The next most important form it takes that we should talk about is a TrueValue.

TrueValues are as true a Value that any Value can be. They are used to store a number or string. In general, they are used for storing literals. We can make a Value take this form by assigning to it.

```cpp
Vlk::Value& trueVal = rootVal(trueVal);
trueVal = "A true Value within Valkor."
/******
{
  :TrueVal: "A TrueValue within Valkor."
}
******/
```

I kept it separate for clarity, but in case it wasn't obvious, we don't need to keep a reference to the new Value before assigning to it. We can instead just assign to it directly on the same line where the new Value is added to a PairArray. Imo, this offers some pretty nice-looking code.

```cpp
rootVal("Integer") = 10;
rootVal("Float") = 1.0f;
rootVal("String") = "Hello String"
/******
{
  :Integer: 10
  :Float: 1.0
  :String: "Hello String"
}
******/
```

Though important, and really the center of Valkor's existence, there is not so much to talk about with TrueValues, and that's on purpose. They should be simple, since that's the thing we care about most: real data.

Before discussing the last type of Value, I want to address one core detail to make sure it wasn't missed: *How is the initialization of a PairArray Value different from the initialization of a TrueValue Value?* The answer lies in the usage of the Value. Take a look at the following snippet:

```cpp
Vlk::Value& willBecomePairArry = root("PairArray");
Vlk::Value& willBecomeTrueValue = root("TrueValue");
willBecomePairArray("NewElement");
willBecomeTrueValue = "NewValue";
/*****
{
  :PairArray: {
    :NewElement: {}
  }
  :TrueValue: "NewValue"
}
*****/
```

The `root("PairArray")` and `root("TrueValue")` statements only create new Values. They have yet to be initialized. The way they are initialized depends on how they are used for the first time. When we say `willBecomePairArray("NewValue")` the Value becomes a PairArray because we are using it like one by adding a new Value to it. `willBecomeTrueValue = "NewValue"` initializes that Value's type as TrueValue because we assigned a value to it. Essentially, the operator used on a Value defines its type. Once you use one operator on a Value, using another is an error.

```cpp
Vlk::Value& crashValue = root("PairArray");
crashValue("PairArray");
crashValue = "Crash";
```

After `crashValue` is used like a PairArray on the second line, it is then used like a TrueValue on the third line and this will result in a crash at runtime. Once a Value takes a form, it may never switch forms.

With that covered, we can finally talk about the last form of a Value, the ValueArray. It is used to store an array of Values with no key strings attached.

```cpp
Vlk::Value& integerArray = root("IntegerArray");
integerArray[{3}];
integerArray[0] = 10;
integerArray[1] = 11;
integerArray[2] = 12;
/*****
{
  :IntegerArray: [10, 11, 12]
}
*****/
```

Just like a Value's type becomes PairArray after using the `()` operator or TrueValue after using the `=` operator, it becomes ValueArray after using the `[]` operator. In particular, an initializer list must be used as an argument to the first use of the `[]` operator to specify the ValueArray's size, e.g. `[{sizeOfArray}]`. Not specifying the size in this fashion will result in a crash because the Value still won't have a type.

Single dimensional arrays are nice, but it wouldn't be complete without multiple dimensions. Multidimensional arrays can be created by adding arguments to the initializer list like so. In this instance, the array contains two arrays that each contain two arrays with three elements:

```cpp
Vlk::Pair& intArrays = root("intArrays")[{2,2,3}];
for (int i = 0; i < 2; ++i)
{
  for (int j = 0; j < 2; ++j)
  {
    intArrays[i][j][0] = i + j;
    intArrays[i][j][1] = i + j + 1;
    intArrays[i][j][2] = i + j + 2;
  }
}
/*****
{
  :intArrays: [
    [
      [0, 1, 2],
      [1, 2, 3],
    ],
    [
      [1, 2, 3],
      [2, 3, 4],
    ],
  ]
}
*****/
```

This leaves only one thing left to be desired: what if we want a multidimensional array where the subarrays have different sizes? I am happy to say that it's possible. To do it, we split up the initializer list specifying the length of each dimension into smaller initializer lists. In the example below, the first subarray is initialized with a length of 2 and the second subarray is initialized with a length of 3.

```cpp
Vlk::Pair& intArrays = root("intArrays")[{2}];
intArrays[0][{2}];
intArrays[0][0] = 1;
intArrays[0][1] = 2;
intArrays[1][{3}];
intArrays[1][0] = 3;
intArrays[1][1] = 4;
intArrays[1][2] = 5;
/*****
{
  :intArrays: [[1, 2], [3, 4, 5]]
}
*****/
```

That's all there is to serialization with Valkor. Overall, I am pleased with the interface. It gets the job done and it does so without being obtuse or overly cumbersome to use. Just getting those qualities was a major challenge, because along the way I encountered many problems and the solution to the largest of those issues and the crux of many others only showed up while writing this post.

# Serialization Problems

Early on in the development of Valkor, my thoughts about what the center of the language was were not clear. At the time, serialization and deserialization work was happening more or less in tandem and the first versions of the grammar were being iterated on (more on that in the next section). During this time, Values were not on my mind as the center of everything in Valkor. It was Pairs. Everything was a Pair to me, not a Value. I don't know exactly why this was the case, but it must have had to with the fact that Pairs were extremely important not for storing data, but for finding specific data. This is the purpose of Pairs. Without it, we would just be putting numbers in a file without any other context. Because some sort of label is a core requirement for something like Valkor, it's not all too surprising that I gave it so much weight.

When I had this mindset, I made the decision to let the root Value be a Pair. That way the root Value could also have a key string. This would allow someone to bake a string into the root key. The benefit I saw is that the name of the serialized thing or any other fitting string could be stored in the key. This is no longer working code, but as an example, here's what I mean. I am using `Vlk::Pair` instead of `Vlk::Value` because that's how it used to be.

```cpp
Vlk::Pair rootPair("rootKey");
/*****
:RootKey: {
}
*****/
```

Doing this seemed harmless. It wasn't at all difficult to add, essentially effortless. It lined up with the thoughts I was having about the library. It just looked like an easy win. However, because specifying this key was only possible through Pair's constructor, it was an indication of the significant mistake that giving the limelight to Pair was. In the current implemenation, Vlk::Pair inherits from Vlk::Value, but a while back, it looked like this:

```cpp
struct Pair
{
  //...
  std::string mKey;
  Value mValue;
};
```

Just like Value, Pair made use of the same operators discussed in the previous section in largely the same way and that resulted in some large swaths of unnecessary and repitious code. Pair was forced to contain a bunch of functions that would just call the equivalent Value function. The snippet below is one of many examples of this atrocious pattern.

```cpp
struct Value
{
  //...
  Pair& operator()(const char* key);
};

struct Pair
{
  //...
  Pair& operator()(const char* key)
  {
    return mValue(key);
  }
};
```

I didn't like this code and knew it was a problem, but I wasn't entirely sure how to mend it. I debated merging Pair and Value, but I never did that because I knew the Values within a ValueArray would not need key strings. It was this multitude of single line functions that made me realize Pair should inherit from Value. That way Pair could do everything that Value could do, ValueArrays would not contain unnecessary memory for key strings, and Pairs could still have keys by having another member.

```cpp
struct Pair: public Value
{
  //...
  std::string mKey;
};
```

It was a step in the right direction, but I was still a bit oblivious to the fact that Value would be better than Pair as Valkor's driving interface. It was only while writing this post and attempting to justify the fact that the root Value could be a Pair did I realize why I had not fully converted. Like I said and provided an example of just a bit ago, giving the root Value a key was a matter of passing a string into the Pair's constructor. This was the only functionality that Pair provided that Value did not. Because of that, all of my serialization code was still using Vlk::Pair instead of Vlk::Value. Well, the very last thing I did to Valkor was remove this feature which I initially thought was an "easy win". I finally felt at peace once the tension between Pair and Value had finally been resolved.

At the beginning of the post, I said that a lot of problems can arise from having the freedom of doing what you want and thinking what you want. This is the biggest example I have of that from Valkor's development. From the freedumb of thinking that Pairs were the center, to the freedumb of adding an easy and seemingly harmless feature. It's great to learn from mistakes like this, but it shows that when there is nothing acting as a guide, it's shockingly easy to lead oneself astray.

# Tokenization, Parsing, and Syntax

With serialization covered, we can now start to discuss deserialization. Deserialization became the major focus directly after I finished the Writer because there was finally something that needed to be deserialized. In the beginning, my goal was to take the output from the Writer and figure out how to read it. Step one in that process is tokenization. Tokenization involves taking an array of characters and translating it into an array of Tokens. It will make sure that every group of characters in the text is a valid token. As an example, here is a Valkor snippet and its resulting tokens. The type of token is on the left and the string it represents is on the right. This example in particular makes use of every token type.

```text
{
  :IntegerArray: [10, 11]
}

   OpenBrace: "{"
  Whitespace: "\n  "
         Key: ":IntergerArray:"
  Whitespace: " "
 OpenBracket: "["
   TrueValue: "10"
       Comma: ","
  Whitespace: " "
   TrueValue: "11"
CloseBracket: "]"
  Whitespace: "\n"
  CloseBrace: "}"
```

Once a piece of text is represented as a list of tokens, we move on to parsing. Parsing will garauntee that the order of tokens is correct. More simply, tokenization verifies proper spelling and parsing verifies proper grammar. In fact, the set of rules representing the parsing phase is called a grammar because it's exactly that. Valkor's grammar began very simple and was slowly fleshed out. Here's the first version of the Valkor grammar that was used to parse the Writer's output.

```text
Pair = <Key> <Colon> (<TrueValue> | ValueArray | PairArray)
PairArray = <OpenBrace> Pair* <CloseBrace>
ValueArray = <OpenBracket> (<TrueValue>* | ValueArray*) <OpenBracket>
```

Reading into what this means is not exactly straightfoward and I hope these posts can be followed by more people than just programmers, so here's an explanation. Every line represents a rule. The above grammar has three rules: `Pair`, `PairArray`, and `ValueArray`. Every time there is something of the form `<TokenType>`, it represents one of the token types from the tokenization phase. If there are no angle brackets, that represents another grammar rule. With that knowledge, let's break down the fist rule in the original Valkor grammar:

```text
Pair = <Key> <Colon> (<Value> | ValueArray | PairArray)
```

This is saying that the Pair rule requires a Key followed by a Colon token at the beginning. After that, one of three things is required: a TrueValue token, whatever is specified by the ValueArray rule, or whatever is specified by the PairArray rule. This rule will handle the parsing of Pairs. Here are some examples of where this rule applies.

```text
AKeyName: 10
<Key> <Colon> <Value>

AKeyName: [1 2]
<Key> <Colon> ValueArray
```

While developing Valkor, the grammar was in constant flux. Some of the modifications made to the grammar added functionality. Other changes had nothing to do with functionality and everything to do with syntax. This was the grammar that came out at the end:

```text
Value = PairArray | ValueArray | <TrueValue>
PairArray = <OpenBrace> Pair* <CloseBrace>
ValueArray = <OpenBracket> (ValueList | ValueArrayList)? <CloseBracket>
Pair = <Key> (Value)
ValueList = Value (<Comma> Value)* <Comma>?
ValueArrayList = ValueArray (<Comma> ValueArray)* <Comma>?
```

There isn't so much to say about this grammar. Don't mistake that as a bad thing. It means it's in a state where I don't see any problems with it. This was not the case for the grammar that came just before it. It contained some strange rules that I am glad to be rid of.

```text
Root = Pair | PairArray
```

This was one of the rules in the last grammar. It was introduced pretty early on when I had the bad idea to allow the root Value to have a key string. There's not much to say since this has already been discussed, but the rule is a nice incarnation of the trouble I had in shifting my view from Pairs to Values. This rule was at the top of the grammar too. The biggest problem in my interface was staring directly at me from the top of my grammar.

If you looked closely at the latest grammar, you probably noticed the inclusion of commas. In the early versions, commas were not necessary for separating Values in a ValueArray. The reason they were included surprised me. It wasn't because they were needed to separate elements. Whitespace can take care of that. They were only added for the sake of readability. In particular, for single line ValueArrays. Consider the following example:

```text
:ArrayWithoutCommas: [1 2 3 4 5]

:ArrayWithCommas: [1, 2, 3, 4, 5]
```

Both of these can work, but the first one is uncanny because the values aren't clearly separated. Maybe the fact that commas are always used as array delimeters made this an issue for me, but the problem becomes more pronounced when using something more complex than single digit values.

```text
:Scale: [19.0446 0.425312 19.0446]
:Rotation: [0.766958 0.0543292 0.639127 -0.0184262]
:Translation: [0.967143 -3.55576 -2.28235]

:CommaScale: [19.0446, 0.425312, 19.0446]
:CommaRotation: [0.766958, 0.0543292, 0.639127, -0.0184262]
:CommaTranslation: [0.967143, -3.55576, -2.28235]
```

# Deserialization

At this point, I had nearly made it full circle. Data could be written to file and that file could be read back into the Vlk::Value structure. The last step in completing the deserialization process is getting the data stored in the Vlk::Value back to where it started. When I arrived at this step, some complications arose that I did not at all expect. To fully explain, I need to provide some context.

Value makes extensive use of three operators: `()`, `[]`, and `=`. The type of operator used on a Value directly correlates to the Value's type. Using `()` means the Value's type is `PairArray`. Using `[]` means the Value's type is `ValueArray`. Using `=` means the Value's type is `TrueValue`. Of these three, the most awkward is the `()` operator because it doesn't represent something analogous to what it would usually be used for. This is not the case for the `[]` and `=` operators, because their function is extremely similar to the norm. `[]` indexes into arrays and `=` assigns a value. Fortunately, a bit of documentation can explain the purpose of the `()` operator.

These were and still are effective uses of operator overloading, but issues occured when accounting for deserialization. Early on, I attempted to have both serialization and deserialization happen through the Value structure, but this didn't end up happening. As explained earlier, `()` adds a Pair to a PairArray Value. Well, in my early version of deserialization, `()` had a const version that would find the Pair that had the given argument as a key. This is more easily explained with an example. 

```cpp
Vlk::Pair root;
root.Read("filename.vlk");
const Vlk::Pair& constRoot = root;
const Vlk::Pair& containedPair = constRoot("ContainedPair");
const Vlk::Pair& otherContainedPair = root("OtherContainedPair");
otherContainedPair = constRoot("OtherContainedPair");
```

First, notice that we need to convert the root Pair into a const Pair on the third line. That's just a bit annoying. The big issue is the `constRoot("ContainedPair")` on the next line. If you think that should add a Pair to the PairArray contained in constRoot, I admire your intuition, but you are wrong. Because we are using the `()` operator on a const Pair, no Pair is created. Instead, if a Pair with the key `ContainedPair` exists in the root PairArray, that Pair will be returned. If it does not exist, there will be a crash. Now compare this to the line directly after it with the statement `root("OtherContainedPair")`. This does what I explained earlier. It creates a Pair within the root PairArray.

Despite having completely identical syntax and the same fundamental type, the functionality of the two lines are completely different. This does not exist in the current version of Valkor for obvious reasons, but holy shit, it was a smell I will remember for a long time. Despite the frustration that arose from this, I am glad I implemented it, because it is a perfect example of the dangers of operator overloading, which is something I had never encountered.

Not only did the overloading nonsense need handling, the fact that there would be a crash if the user attempted to access a nonexistent Value also needed addressing. There was no way to handle an error when the invalid access attempt was made. That's when Vlk::Explorers became a thing.

Instead of performing the deserialization purely through Vlk::Value, the Vlk::Explorer was added as a means to explore a Vlk::Value. Anytime the user attempts to access something that doesn't exist, an error is logged with details on exactly what access attempt was made and where within the Vlk::Value the attempt occured. As usual, this is easier explained by example.

```cpp
Vlk::Pair root;
root.Read("file.vlk");
Vlk::Explorer rootEx(root);
Vlk::Explorer fourthString = rootEx("Container")("Strings")[4];

/*****
file.vlk
{
  :Container: {
    :Strings: [
      "0",
      "1",
      "2",
      "3"
    ]
  }
}

The error that is printed to console.

Error|src/vlk/Explorer.cc(123)|Vlk::Explorer::operator []|
{}{Container}{Strings} did not contain Value at [4]
*****/
```

Because the `Strings` ValueArray did not contain a fourth element, the Vlk::Explorer logged an error. That error specifies exactly where the access attempt was made, making it easier for the user to know where the problem might be within their code. In this case, the logged error says the access attempt was made within `{}{Container}{Strings}` where root represents our root pair. Since errors like this are expected, there also needs to be a way to detect that an error has occured in the deserialization code. The Vlk::Explorer provides a `Valid` function for just that reason.

```cpp
if (!fourthString.Valid())
{
  LogError("Fourth string not found.");
  return;
}
```

In the case of the example above, `fourthString` is not a valid explorer, hence the condition is satisfied and the function is exited. I believe it's necessary to have this kind of information and error handling because of how useful it can be. Just imagine having multiple thousands of lines in a vlk file and being expected to quickly diagnose errors like this without any information. It sounds like a train wreck. Futhermore, a user might want these errors if they expect them to occur for some reason. This is the case for any vlk files containing versioning information. It certainly feels quirky to have another structure for deserialization, but Vlk::Explorer handles the job while also addressing any errors that might occur. I would like a more consolidated interface, but the features provided by it are necessary.

# Concluding Thoughts

This post is long overdue. The near final version of Valkor was completed months ago, but I kept putting this post to the side. For one, I went on a month and a half long trip, but before that I was too excited about saving and loading vlk files within Varkor to write anything. With Valkor, I was finally able to handle the whole serialization/deserialization process for assets, component types, and entire spaces. The result of that is the ability to load and save levels to file. The advantages of this are massive. Spaces no longer need to be created every time I test a feature that requires me to create game objects with certain components. Now I can just save a space to file and load it every time I test whatever it is I am working on. Testing graphics features will take advantage of this the most first, but other systems will be making use of it too. Physics is the most obvious one that comes to mind. What's even better than that is the ability to finally build something that isn't code and not lose the work when I close Varkor. Having that takes Varkor from being the toy it was months ago to being a tool that can actually be used to build something. It only took a year, but I am glad to have finally reached the top of this mountain that I have been hiking up. Now it's time to head into the next valley.

If you managed to reach here, I hope you enjoyed the read. I was writing this on and off over the course of the last two months while traveling and wrapped it up after returning. Creating something coherent during that stretched period of time was difficult. The scattered development of Valkor made it even harder. If anything, I hope the post is reminiscent of what developing the language was like.

As a parting gift, here is a gif showing the loading in action. The goal of everything discussed in the post was to make such a thing possible. Now I think it's finally time to start improving the look and variety of the things that can be loaded.

![space loading](space_loading.gif)
