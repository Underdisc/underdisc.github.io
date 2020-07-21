const fs = require('fs');
function GetFileContent(filename)
{
  return fs.readFileSync(filename, 'utf8')
}

let templateHtml = GetFileContent('template.html');
const cheerio = require('cheerio');
let template = cheerio.load(templateHtml);
let showdown = require('showdown');
let converter = new showdown.Converter();
function RenderMarkdown(input, destination)
{
  let markdown = fs.readFileSync(input, 'utf8');
  let html = converter.makeHtml(markdown);
  let content_div = '<div class=\'page_content\'></div>';
  template('div.content_container').append(content_div);
  template('div.page_content').append(html);
  let filenameEnd = input.indexOf('.');
  let outputFile = input.slice(0, filenameEnd);
  outputFile = destination + outputFile + '.html';
  fs.writeFileSync(outputFile, template.html(), 'utf8');
  template('div.page_content').remove();
}

RenderMarkdown('index.md', '../');
RenderMarkdown('blog.md', '../');
RenderMarkdown('portfolio.md', '../');
RenderMarkdown('contact.md', '../');


