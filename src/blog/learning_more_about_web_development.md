# Learning More About Web Development

Around two to three years ago, I was making my way through college and would soon be entering the job market as a game programmer. In order to land a job, I was going to need a website to display my previous work. I had no desire to use a service like squarespace, wordspace, etc. I was more excited about creating my own website and the challenges that come along with that.

I found out about [github pages][github-pages] for hosting static websites. This would take care of hosting and I needed nothing more than a static website. That means I could focus purely on what work goes into creating a webpage.

The first step to doing this involves learning about html and css. When I first made my website, I only made use of the two. They were enough to get something quite basic created, but I didn't use them to their full power. I tried to make a layout that would work on both mobile and desktop that wouldn't require any layout changes for different platforms. Those words sound great, but when I looked at the site I made after letting it sit around for two years, I knew it was no longer going to cut it.

I just recently left my job with the goal of persuing my own work and I need a place to share that work, so the first task has been tearing down and rebuilding the entire website. What you are looking at now is the current iteration of the overhaul. So far, I am proud of it despite a few minor details that would be nice to have solved in the future.

## Rebuilding

For this rebuild, my main goal has been to fix the biggest greivances I had with my previous work. When I recalled working on my old website, these are the major problems that quickly came to mind.

- A layout that doesn't change to make the best use of the screenspace available.
- Editing html files directly to add and edit content on the website.

With those things in mind, I went off to work. I started with the layout issue. I needed to make something that would handle mobile and desktop well. When addressing that I came across [css media queries][media-queries]. They are explained in more detail in that link, but they are essentially a directive added to a style sheet to apply changes to css properties if a certain condition is met. For example, the media query I use on this website for identifying if the platform is mobile is this.

```css
@media screen and (max-width: 70em) {
  ...
}
```

This just means if the browser window size is less than or equal to 70em, then the changes within the curly braces are applied. The changes specified within the media query use the same syntax as everything else in css. As an example, here is a full style sheet with a media query.

```css
div.a {
  background-color: black;
}

@media screen and (max-width: 500px) {
  div.a {
    backgound-color: white;
  }
}
```

By default, the background color of `div.a` will be black, but if the browser screen size is less than or equal to 500px, the background color of `div.a` will become white. You can see this in action if you just decrease the width of your browser window while on this page. The window will eventually be small enought that the layout will change to mobile mode.

Media queries were a nice start to what I was looking for to handle my specific use case, but I was also keen on having a dropdown menu on mobile so it wouldn't take up space when it wasn't needed. css has built features for handling dropdowns, but I only came across the potential for on hover dropdowns and never on click dropdowns. For that, I would need to take my first dive into javascript. Despite getting over a few small hurdles when dealing with client side vs node js, getting into the javascript's waters has been quite smooth.

You should mention the thing about this line for scaling on other devices.
I 
<meta name="viewport" content="width=device-width, initial-scale=1"/>

## My Thoughts On Web Development
Creating a web page with the full trifecta of html, css, and js 
I gotta say though, very often when attempting to get my layout the way I wanted it with css, I felt like I was finding little hacks to make things work. Not necessarily true.
I gotta say though, very often when attempting to get my layout the way I wanted it with css, I felt like I was finding little hacks to make things work. Not necessarily true.



[github-pages]: https://pages.github.com/
[media-queries]: https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries 
