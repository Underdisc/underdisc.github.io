let dropdown_open = false;
let dropdown_in_motion = false;
let compact_mode;

// This comes from media queries within style.css. It is the threshold used to
// determine the layout change.
const compact_em_threshold = 70;

const root = document.querySelector('html');
const content_container = document.querySelector('div.content_container');
const sidebar = document.querySelector('div.sidebar_grid');
const dropdown_button = document.querySelector('div.header_dropdown');

function GetEmWidth()
{
  let width = window.innerWidth;
  let root_style = window.getComputedStyle(root);
  let font_size = parseFloat(root_style.getPropertyValue('font-size'));
  let em_width = width / font_size;
  return em_width;
}

function GetDropdownPixelOffset()
{
  sidebar_style = getComputedStyle(sidebar);
  let element_count = parseFloat(
    sidebar_style.getPropertyValue('--element-count'));
  let buffer_height = parseFloat(
    sidebar_style.getPropertyValue('--buffer-height'));
  let element_height = parseFloat(
    sidebar_style.getPropertyValue('--element-height'));
  let em_offset = buffer_height + (element_count * element_height);
  let font_size = parseFloat(sidebar_style.getPropertyValue('font-size'));
  return em_offset * font_size;
}

function ToggleDropdown()
{
  if(dropdown_in_motion === true)
  {
    return;
  }

  let dropdown_offset = GetDropdownPixelOffset();
  let start_pos;
  let end_pos;
  if (dropdown_open === false)
  {
    sidebar.style.bottom = dropdown_offset + 'px';
    content_container.style.bottom = dropdown_offset + 'px';
    start_pos = dropdown_offset;
    end_pos = 0;
    dropdown_open = true;
  }
  else
  {
    start_pos = 0;
    end_pos = dropdown_offset;
    dropdown_open = false;
  }
  const dist = end_pos - start_pos;

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
    let current_pos = start_pos + dist * t_quad_in;
    sidebar.style.bottom = current_pos + 'px';
    content_container.style.bottom = current_pos + 'px';
  }
}

dropdown_button.addEventListener('click', ToggleDropdown);

function WindowResize()
{
  let em_width = GetEmWidth();
  if (em_width <= compact_em_threshold && compact_mode === false)
  {
    dropdown_open = false;
    compact_mode = true;
    let starting_offset = GetDropdownPixelOffset();
    sidebar.style.bottom = starting_offset + 'px';
    content_container.style.bottom = starting_offset + 'px';
  }
  else if (em_width >= compact_em_threshold && compact_mode == true)
  {
    compact_mode = false;
    sidebar.style.bottom = 0;
    content_container.style.bottom = 0;
  }
}

window.onresize = WindowResize;

function OnLoad()
{
  let em_width = GetEmWidth();
  compact_mode = em_width <= compact_em_threshold;
}

window.onload = OnLoad;
