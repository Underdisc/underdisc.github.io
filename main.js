let dropdown_open = false;
let dropdown_in_motion = false;
let compact_mode;

// These are dom elements that are assigned to in OnLoad.
let root;
let links;
let arrow_svg;

// This comes from the media query within style.css. It is the threshold used to
// determine the layout change.
const compact_em_threshold = 70;

function GetEmWidth()
{
  let width = window.innerWidth;
  let root_style = window.getComputedStyle(root);
  let font_size = parseFloat(root_style.getPropertyValue('font-size'));
  let em_width = width / font_size;
  return em_width;
}

function GetLinksPixelOffset()
{
  style = getComputedStyle(links);
  let element_count = parseFloat(style.getPropertyValue('--element-count'));
  let element_height = parseFloat(style.getPropertyValue('--element-height'));
  let em_height =  element_count * element_height + 1;
  let font_size = parseFloat(style.getPropertyValue('font-size'));
  return em_height * font_size;
}

function ToggleDropdown()
{
  if(dropdown_in_motion === true)
  {
    return;
  }

  let links_offset = GetLinksPixelOffset();
  // The pos suffix values are for the position of the dropdown menu.
  // The rot suffix values are for the rotation of the dropdown menu button.
  let start_pos, end_pos;
  let start_rot, end_rot;
  if (dropdown_open === false)
  {
    start_pos = -links_offset;
    end_pos = 0;
    start_rot = 0;
    end_rot = -180;
    dropdown_open = true;
  }
  else
  {
    start_pos = 0;
    end_pos = -links_offset;
    start_rot = -180;
    end_rot = 0;
    dropdown_open = false;
  }
  const dist_pos = end_pos - start_pos;
  const dist_rot = end_rot - start_rot;

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
      clearInterval(animation);
      return;
    }

    let t = time_passed / animation_time;
    let t_quad_in = -1.0 * (t - 1.0) * (t - 1.0) + 1.0;
    let current_pos = start_pos + dist_pos * t_quad_in;
    let current_rot = start_rot + dist_rot * t_quad_in;
    arrow_svg.style.transform = 'rotate(' + current_rot + 'deg)';
    links.style.transform = 'translate(0px,' + current_pos + 'px)';
  }
}

function WindowResize()
{
  let em_width = GetEmWidth();
  if (em_width <= compact_em_threshold && compact_mode === false)
  {
    dropdown_open = false;
    compact_mode = true;

    let offset = GetLinksPixelOffset();
    arrow_svg.style.transform = 'rotate(0deg)';
    links.style.transform = 'translate(0px,' + -offset + 'px)';
  }
  else if (em_width >= compact_em_threshold && compact_mode == true)
  {
    compact_mode = false;
    links.style.transform = 'translate(0px, 0px)';
  }
}

window.onresize = WindowResize;

function OnLoad()
{
  root = document.querySelector('html');
  links = document.querySelector('div.links');
  arrow_svg = document.querySelector('div.arrow_container svg');

  let arrow_container = document.querySelector('div.arrow_container');
  arrow_container.addEventListener('click', ToggleDropdown);

  compact_mode = false;
  WindowResize();
}

window.onload = OnLoad;
