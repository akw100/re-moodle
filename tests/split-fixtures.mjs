// Splits the moodle-fixtures.json made by tests/capture-moodle.js into fixtures/live/<page>.html.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './harness.mjs';

const src = process.argv[2];
if (!src) throw new Error('usage: node tests/split-fixtures.mjs <path to moodle-fixtures.json>');
const pages = JSON.parse(readFileSync(src, 'utf8'));
mkdirSync(join(ROOT, 'fixtures/live'), {recursive: true});
for (const [name, html] of Object.entries(pages)) {
  if (!/^[a-z-]+$/.test(name) || /<script\b(?![^>]*>window\.M=)/i.test(html.replace(/<script>window\.M=[^<]*<\/script>/, ''))) throw new Error('unexpected content in ' + name);
  writeFileSync(join(ROOT, 'fixtures/live', name + '.html'), html);
  console.log(name, (html.length / 1024).toFixed(0) + 'KB');
}
