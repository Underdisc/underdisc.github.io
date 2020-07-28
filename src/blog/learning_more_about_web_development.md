# Learning More About Web Development

Around two to three years ago, I was making my way through college and would soon be entering the job market as a game programmer. In order to land a job, I was going to need a website to display my previous work. I had no desire to use a service like Squarespace, Wordspace, etc. I was more excited about creating my own website and the challenges that come along with that. Wanting this eliminated Jekyll as an option too.

I found out about [github pages](https://pages.github.com/) for hosting static websites. This would take care of hosting and I needed nothing more than a static website. That means I could focus purely on the work that goes into creating a webpage.

The first step to doing this involves learning about html and css. When I first made my website, I only made use of the two. They were enough to get something quite basic created, but I didn't use them to their full power. I tried to make a layout that would work on both mobile and desktop that wouldn't require any layout changes for different platforms. Those words sound great, but when I looked at the site I made after letting it sit around for two years, I knew this was no longer going to cut it.

![Old website homepage](learning_more_about_web_development_res/old_website.png)

This is the layout that would be used for every device. The image at the top would expand to fill the full width of the screen. When the window was stretched far enough, the image would take up the entire browser window. The top navigation bar always stayed the same. It would consistently be four evenly spaced boxes lined up horizontally. On small broswer windows, these options were clumped together. It wasn't pleasant to look at and there were certainly other problems as well, but it was usable. The issue is that I built it for the browser window I was testing against first and everything else second. I still keep the old page up [here](https://underdisc.github.io/old/index.html) for reference. The links are not broken as of this writing, but they will likely break in the future as stuff is cleaned out from the old and moved to the new. The home page will always stay there though.

I don't like it, but it did do its job. It helped me secure a position at a studio I was intersted in working at. Time has moved on though. I just recently left that job with the goal of persuing my own work and I need a place to share that work. Because of my dislike for the original site, the first task after leaving has been tearing down and rebuilding the entire thing. What you are looking at now is the current iteration of that overhaul. Despite a few minor details that would be nice to have solved in the future, I am proud of it.

> the size of code boxes
> I wish on mobile I could have at least 80 character wide code boxes, but I just haven't found a feasible way to do it.
> The font must be monospace and it can't be too small. While trying to get it right, this is a problem I constantly ran into. Switching to a Serif font provided a lot more space, unfortunately it's not monospace. Decreasing the font size provided more space, but the font was no longer readable. At the end of the day, I had to bite the bullet, turn on `overflow-x: scroll` and leave it at that. The content of the code blocks is at least still easily accessible even though entire lines aren't visible at a glance.

> I still need to do some manual work that I shouln't have to when editing the website. I need to tell the build script about the new markdown document that needs to be rendered. I have to create the directories where resources are placed for that markdown document. It's nothing in comparison to going into an html file, editing the content from directly within it and making sure it works, but I would be lying if I said the little things I still need to do don't annoy me.

For the rebuild, my main goals involved fixing the biggest greivances I had with my previous work. When I recalled working on my old website, these are the major problems that quickly came to mind.

- A layout that doesn't react to window size changes..
- Editing html files directly to add and edit content on the website.

With those in mind, I went off to work.

## Layout

I needed to make something that would handle mobile and desktop well. When addressing that I came across [css media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries). They are explained in more detail in that link, but they are essentially a directive added to a style sheet to apply changes to css properties if a certain condition is met. For example, the media query I use on this website for identifying if the platform is mobile is this.

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

By default, the background color of `div.a` will be black, but if the browser screen size is less than or equal to 500px, the background color of `div.a` will become white. You can see this sort of dynamic behavior in action if you just decrease the width of your browser window while on this page. The window will eventually be small enough that the layout will change to mobile mode.

Media queries were a nice start to what I was looking for to handle my specific use case, but I was also keen on having a dropdown menu on mobile so it wouldn't take up space when it wasn't needed. css has built features for handling dropdowns, but I only came across the potential for on hover dropdowns and never on click dropdowns. For that, I would need to take my first dive into javascript.

```js
function ToggleDropdown()
{
  ...
}

dropdown_button.addEventListener('click', ToggleDropdown);
```

The process of creating the dropdown for the mobile mode was pretty straight forward. When the dropdown button is clicked and not in motion, the dropdown will either slide into view or out of view over a short period of time. This action also results in moving all the content of the page as well. Instead of having the dropdown hide the top of the page content, I wanted to have the content remain visible at all times, even though the bottom would still slide out of view.

```js
function ToggleDropdown()
{
  //...

  // All time values are expressed in milliseconds.
  const animation_time = 250;
  const frame_time = 10;
  let animation = setInterval(step, frame_time);
  dropdown_in_motion = true;
  const start_time = new Date();

  function step()
  {
    let current_time = new Date();
    let time_passed = current_time - start_time;
    if (time_passed >= animation_time)
    {
      dropdown_in_motion = false;
      sidebar.style.bottom = end_pos + 'px';
      content_container.style.bottom = end_pos + 'px';
      clearInterval(animation);
      return;
    }

    let t = time_passed / animation_time;
    let t_quad_in = -1.0 * (t - 1.0) * (t - 1.0) + 1.0;
    let current_pos = start_pos + dist_pos * t_quad_in;
    let current_rot = start_rot + dist_rot * t_quad_in;
    sidebar.style.bottom = current_pos + 'px';
    content_container.style.bottom = current_pos + 'px';
    dropdown_button.style.transform = 'rotate(' + current_rot + 'deg)';
  }
}
```

This was the method I ended up rolling with to accomplish this. The content and sidebar containers have `position: relative` set and that allows me to change the positions of the elements dynamically using the [bottom property](https://developer.mozilla.org/en-US/docs/Web/CSS/bottom). This is just the distance the element is from its bottom edge.

To actually calculate this distance, I use the linear interpolation parameter `t`. As the animation goes from start to finish, this value will move from 0 to 1, getting closer to 1 during every step of the animation. That parameter, which is calculated based off the amount of time passed since the beginning of the animation, is used to to determine how far the element should be from its starting position. At `t = 0` the element hasn't made any motion and when `t = 1` the element will have moved all the way to the end position.

```js
let t_quad_in = -1.0 * (t - 1.0) * (t - 1.0) + 1.0;
```

This statement just changes how `t` scales as it goes from 0 to 1. In this case, `t_quad_in` will change quickly at the beginning of the animation and slowly at the end of the animation. If you were to graph this function `t_quad_in = -1 * (t - 1)^2 + 1` you may notice it's just an upside down parabola centered at `(1, 1)`. That's what's responsible for this type of motion and it's usually referred to as an ease type. I will leave this particular topic here for now, because I can talk for days about these types of transformations. I like calling them `Actions`, and I'll definitely write about them when I go to implement them in my engine in the future.

While getting this animation to work, I was constantly testing the website on my phone by hosting it locally with `python -m http.server`. There was something very strange about the site when viewed on mobile though. The font was ridiculously small and things just didn't seem to be scaled properly on mobile in general. That's when I came across this.

```html
<meta name="viewport" content="width=device-width, initial-scale=1"/>
```

## PS

I hope this first post isn't too all over the place, but I have no doubt that my ability to compose these and make coherent posts will improve with time and practice. If you've made it this far, thanks for reading about the shit I work on. I appreciate you.
