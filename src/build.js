let rebuild = false;
let makeTests = false;
if (process.argv.length > 2) {
  rebuild = process.argv[2] === 'r';
  makeTests = process.argv[2] === 't';
}

const fs = require('fs');
let templateHtml = fs.readFileSync('template.html', 'utf8');
const cheerio = require('cheerio');
let showdown = require('showdown');
showdown.setOption('noHeaderId', 'true');
showdown.setOption('simpleLineBreaks', 'true');
const showdownHighlight = require('showdown-highlight');
const converter = new showdown.Converter({extensions: [showdownHighlight]});

// Retrieves the content of the template html and modifies the links to have
// the correct relative paths.
function RelativeTemplate(linkCorrection) {
  let template = cheerio.load(templateHtml);

  function CorrectLink(html, selector, attribute, correction) {
    let linkElement = html(selector);
    let filePath = linkElement.attr(attribute);
    filePath = correction + filePath;
    linkElement.attr(attribute, filePath);
  }
  CorrectLink(template, 'link.favicon', 'href', linkCorrection);
  CorrectLink(template, 'link.main_style', 'href', linkCorrection);
  CorrectLink(template, 'link.hljs_style', 'href', linkCorrection);
  CorrectLink(template, 'a.index_link', 'href', linkCorrection);
  CorrectLink(template, 'a.blog_link', 'href', linkCorrection);
  CorrectLink(template, 'a.projects_link', 'href', linkCorrection);
  CorrectLink(template, 'a.notes_link', 'href', linkCorrection);
  CorrectLink(template, 'a.candy_link', 'href', linkCorrection);
  CorrectLink(template, 'script.main_script', 'src', linkCorrection);
  return template;
}

function IsBuildNeeded(inputFile, outputFile) {
  exists = fs.existsSync(outputFile);
  if (!exists) {
    return true;
  }
  let inputStats = fs.statSync(inputFile);
  let outputStats = fs.statSync(outputFile);
  let inputModifiedDate = inputStats.mtime;
  let outputModifiedDate = outputStats.mtime;
  return inputModifiedDate >= outputModifiedDate;
}

function MakeRequiredDirectories(outputFile) {
  let dirEnd = outputFile.lastIndexOf('/');
  let dirPath = outputFile.slice(0, dirEnd);
  let options = {recursive: true};
  fs.mkdirSync(dirPath, options);
}

// Render markdown text into the provided html template.
function RenderMarkdownIntoTemplate(template, markdown) {
  let html = converter.makeHtml(markdown);
  template('div.content_container').append(html);

  // Put all <pre><code> blocks inside of a code box div.
  template('pre code').each(function(i, domElement) {
    template(this).parent().replaceWith(
      '<div class=\"code_box"><pre><code>' + template(this).html());
  });

  // Apply lazy loading to all images and add the image_box class to the
  // parent element because all images are contained in an image box.
  template('img').each(function(i, domElement) {
    let image = template(this);
    image.attr('loading', 'lazy');
    let imageContainer = image.parent();
    imageContainer.attr('class', 'image_box');
  });
}

function RenderLocalMarkdown(inputFile) {
  let exists = fs.existsSync(inputFile);
  if (!exists) {
    console.error(inputFile + ' does not exist');
    return;
  }

  // Only render the markdown if it's out of date or a rebuild is happening.
  let filenameEnd = inputFile.indexOf('.');
  let outputFile = inputFile.slice(0, filenameEnd);
  outputFile = '../' + outputFile + '.html';
  if (!rebuild && !IsBuildNeeded(inputFile, outputFile)) {
    return;
  }
  MakeRequiredDirectories(outputFile);

  // Get the template html with correct relative links.
  function GetOccurrenceCount(string, search) {
    let count = 0;
    let fromIndex = -1;
    while (true) {
      fromIndex = string.indexOf(search, fromIndex + 1);
      if (fromIndex === -1) {
        return count;
      }
      ++count;
    }
  }
  let depth = GetOccurrenceCount(inputFile, '/');
  let linkCorrection = ''
  for (let i = 0; i < depth; ++i) {
    linkCorrection += '../'
  }
  let template = RelativeTemplate(linkCorrection);

  // Ouput the new html to its destination.
  let markdown = fs.readFileSync(inputFile, 'utf8');
  RenderMarkdownIntoTemplate(template, markdown)
  fs.writeFileSync(outputFile, template.html(), 'utf8');
  console.log('Built ' + outputFile);
}

function RenderRecursively(directory) {
  let options = {withFileTypes: true};
  let entries = fs.readdirSync(directory, options);
  for (let i = 0; i < entries.length; ++i) {
    let entry = entries[i];
    if (entry.isDirectory()) {
      RenderRecursively(directory + entry.name + '/', rebuild);
    }

    if (entry.name.length < 3) {
      continue;
    }
    let extension = entry.name.slice(entry.name.length - 3);
    if (extension === '.md') {
      RenderLocalMarkdown(directory + entry.name, rebuild);
    }
  }
}

function RenderNotes() {
  let notesIndexMarkdown = fs.readFileSync('notes/index.md');
  fs.readdirSync('notes/').forEach(filename => {
    if (filename == 'index.md') {
      return;
    }

    // Create the entry on the notes index.
    let dateEnd = filename.indexOf('_');
    let date = filename.slice(0, dateEnd);
    let titleEnd = filename.indexOf('.');
    let title = filename.slice(dateEnd + 1, titleEnd);
    title = title.replaceAll('_', ' ');
    let extensionStart = filename.indexOf('.');
    let htmlFilename = filename.slice(0, extensionStart + 1) + 'html';
    notesIndexMarkdown +=
      '\n' + date + ' - [' + title + '](' + htmlFilename + ')';

    // Only write render the html if it needs to be updated.
    let markdownFilename = 'notes/' + filename;
    htmlFilename = '../notes/' + htmlFilename
    if (!IsBuildNeeded(markdownFilename, htmlFilename) && !rebuild) {
      return;
    }

    // Render the file.
    let notesMarkdown = fs.readFileSync(markdownFilename);
    notesMarkdown = '#' + title + '\n' + notesMarkdown;
    let template = RelativeTemplate('../');
    RenderMarkdownIntoTemplate(template, notesMarkdown.toString());
    fs.writeFileSync(htmlFilename, template.html(), 'utf-8');
    console.log('Built ' + htmlFilename);
  })

  let template = RelativeTemplate('../');
  RenderMarkdownIntoTemplate(template, notesIndexMarkdown);
  let htmlFilename = '../notes/index.html';
  fs.writeFileSync(htmlFilename, template.html(), 'utf-8');
  console.log('Built ' + htmlFilename);
}

function RenderCandy() {
  // Render the markdown file.
  let candyIndexMarkdown = fs.readFileSync('candy/index.md');
  let template = RelativeTemplate('../');
  RenderMarkdownIntoTemplate(template, candyIndexMarkdown.toString());

  // Reference all images and videos in the root candy directory in the html.
  let entries = fs.readdirSync('../candy');
  let content = '<p class="image_box">'
  for (let i = entries.length - 1; i >= 0; --i) {
    let filename = entries[i];
    let extensionStart = filename.indexOf('.') + 1;
    let extension = filename.slice(extensionStart);
    if (extension == 'gif') {
      content +=
        '<img src="' + filename + '" alt="' + filename + '" loading="lazy">';
    }
    else if (extension == 'mp4') {
      content += '<video controls autoplay loop muted><source src="' +
        filename + '" type="video/mp4"></video>'
    }
  }
  content += '</p>';

  // Write the html file.
  template('div.content_container').append(content);
  let htmlFilename = '../candy/index.html';
  fs.writeFileSync(htmlFilename, template.html(), 'utf8');
  console.log('Built ' + htmlFilename);
}

if (makeTests) {
  RenderLocalMarkdown('index.md', true);
}

// Render all of the markdown files into html files.
RenderLocalMarkdown('index.md');
RenderRecursively('blog/');
RenderRecursively('projects/');
RenderNotes();
RenderCandy();