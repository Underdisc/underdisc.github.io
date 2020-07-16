let showdown = require('showdown');
let converter = new showdown.Converter();
const fs = require('fs');

function GetFileContent(filename)
{
  return fs.readFileSync(filename, 'utf8')
}

const homeFilename = 'home.md';
const autobiographyFilename = 'autobiography.md'
let homeContent = GetFileContent(homeFilename);
let autobiographyContent = GetFileContent(autobiographyFilename);

let homeHtml = converter.makeHtml(homeContent);
let autobiographyHtml = converter.makeHtml(autobiographyContent);

console.log(homeHtml);
console.log(autobiographyHtml);

