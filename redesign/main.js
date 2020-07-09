let dropdown_open = false;
let compact_mode;

// This comes from media queries within style.css. It is the threshold used to
// determine the layout change.
const compact_em_threshold = 70;

const root = document.querySelector('html');
const content = document.querySelector('div.page_content');
const sidebar = document.querySelector('div.sidebar_grid');

function GetEmWidth()
{
  let width = window.innerWidth;
  let root_style = window.getComputedStyle(root);
  let font_size = parseFloat(root_style.getPropertyValue('font-size'));
  let em_width = width / font_size;
  return em_width;
}

function OnDropdownClick()
{
  if (dropdown_open === false)
  {
    dropdown_open = true;
    sidebar.style.display = 'block';
  }
  else
  {
    dropdown_open = false;
    sidebar.style.display = 'none';
  }
}

function WindowResize()
{
  let em_width = GetEmWidth();
  if (em_width <= compact_em_threshold && compact_mode === false)
  {
    dropdown_open = false;
    compact_mode = true;
    sidebar.style.display = 'none';
  }
  else if (em_width >= compact_em_threshold && compact_mode == true)
  {
    compact_mode = false;
    sidebar.style.display = 'grid';
  }
}

function OnLoad()
{
  let em_width = GetEmWidth();
  compact_mode = em_width <= compact_em_threshold;
}

window.onresize = WindowResize;
window.onload = OnLoad;
