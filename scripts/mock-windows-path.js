/**
 * Mock per simulare path.relative con separatori Windows (backslash)
 * nei test di generate-tool-frontmatter.js.
 *
 * Sovrascrive solo path.relative e path.sep; lascia inalterate le altre
 * funzioni di path.
 */

'use strict';

const path = require('path');
const originalRelative = path.relative.bind(path);

path.sep = '\\';
path.relative = function (...args) {
  const rel = originalRelative(...args);
  return rel.split(/\//g).join('\\');
};
