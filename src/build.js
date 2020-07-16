let showdown = require('showdown');
let converter = new showdown.Converter();
const fs = require('fs');

function GetFileContent(filename)
{
  return fs.readFileSync(filename, 'utf8')
}

const indexFilename = 'index.md';
const autobiographyFilename = 'autobiography.md'
let indexContent = GetFileContent(indexFilename);
let autobiographyContent = GetFileContent(autobiographyFilename);

let indexHtml = converter.makeHtml(indexContent);
let autobiographyHtml = converter.makeHtml(autobiographyContent);

console.log(indexHtml);
console.log(autobiographyHtml);

