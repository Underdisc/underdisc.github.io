function GetOccurrenceCount(string, search)
{
  let count = 0;
  let fromIndex = -1;
  while(true)
  {
    fromIndex = string.indexOf(search, fromIndex + 1);
    if(fromIndex === -1)
    {
      return count;
    }
    ++count;
  }
}

const fs = require('fs');
function GetFileContent(filename)
{
  return fs.readFileSync(filename, 'utf8')
}

let templateHtml = GetFileContent('template.html');
const cheerio = require('cheerio');
let showdown = require('showdown');
let converter = new showdown.Converter();
let hljs = require('highlight.js');

function CorrectLink(html, selector, attribute, correction)
{
    let linkElement = html(selector);
    let filePath = linkElement.attr(attribute);
    filePath = correction + filePath;
    linkElement.attr(attribute, filePath);
}

function IsBuildNeeded(inputFile, outputFile)
{
  exists = fs.existsSync(outputFile);
  if(!exists)
  {
    return true;
  }

  let inputStats = fs.statSync(inputFile);
  let outputStats = fs.statSync(outputFile);
  let inputModifiedDate = inputStats.mtime;
  let outputModifiedDate = outputStats.mtime;
  return inputModifiedDate >= outputModifiedDate;
}

function RenderMarkdown(inputFile, destination)
{
  // Before rendering a markdown document to html, we first check to see if the
  // output html document is already up to date with the current markdown
  // document. If it is, no rendering is required.
  let exists = fs.existsSync(inputFile);
  if(!exists)
  {
    console.error(inputFile + ' does not exist');
    return;
  }
  let filenameEnd = inputFile.indexOf('.');
  let outputFile = inputFile.slice(0, filenameEnd);
  outputFile = destination + outputFile + '.html';
  if(!IsBuildNeeded(inputFile, outputFile))
  {
    return;
  }

  // Before rendering the markdown document, we first fix all the links
  // contained in the template html if the output html will exist in a
  // directory below the root.
  let template = cheerio.load(templateHtml);
  let depth = GetOccurrenceCount(inputFile, '/');
  if(depth > 0)
  {
    let linkCorrection = '';
    for(let i = 0; i < depth; ++i)
    {
      linkCorrection += '../'
    }
    CorrectLink(template, 'link.main_style', 'href', linkCorrection);
    CorrectLink(template, 'link.hljs_style', 'href', linkCorrection);
    CorrectLink(template, 'a.index_link', 'href', linkCorrection);
    CorrectLink(template, 'a.blog_link', 'href', linkCorrection);
    CorrectLink(template, 'a.portfolio_link', 'href', linkCorrection);
    CorrectLink(template, 'a.contact_link', 'href', linkCorrection);
    CorrectLink(template, 'script.main_script', 'src', linkCorrection);
  }

  // Render the markdown document to html.
  let markdown = fs.readFileSync(inputFile, 'utf8');
  let html = converter.makeHtml(markdown);
  let content_div = '<div class=\'page_content\'></div>';
  template('div.content_container').append(content_div);
  template('div.page_content').append(html);

  // Take all of the content within code elements where a language is defined
  // and apply syntax highlighting to them.
  template('code').each(function(i, domElement)
  {
    let fullLangString = template(this).attr('class');
    if(typeof(fullLangString) === 'undefined')
    {
      return;
    }

    let langEnd = fullLangString.indexOf(' ');
    let lang = fullLangString.slice(0, langEnd);
    let bareContent = template(this).html();
    let highlightedContent = hljs.highlight(lang, bareContent).value;
    template(this).replaceWith('<code>' + highlightedContent + '</code>');
  });

  // Ouput the new html to its destination.
  let outputHtml = template.html();
  fs.writeFileSync(outputFile, outputHtml, 'utf8');
}

RenderMarkdown('index.md', '../');
RenderMarkdown('blog.md', '../');
RenderMarkdown('portfolio.md', '../');
RenderMarkdown('contact.md', '../');
RenderMarkdown('blog/learning_more_about_web_development.md', '../');
