function OnDropdownClick()
{
  var content = document.getElementById("content");
  var sidebar = document.getElementById("sidebar");
  if (content.style.display != "none")
  {
    content.style.display = "none";
    sidebar.style.display = "block";
  }
  else
  {
    content.style.display = "block";
    sidebar.style.display = "none";
  }
}
