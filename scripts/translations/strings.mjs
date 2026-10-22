// Finds the Kinyarwanda text shown to users in the frontend and the seed data,
// so it can be reviewed in a spreadsheet and written back (see export.mjs, apply.mjs).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ts = createRequire(join(root, 'frontend', 'package.json'))('typescript');

// Lesson and disease text; everything else under frontend/src is interface text.
const contentFiles = ['frontend/src/data/healthContent.ts', 'backend/src/config/seedData.js'];
const textAttributes = new Set(['placeholder', 'aria-label', 'title', 'alt', 'label']);
const skippedCalls = new Set(['includes', 'startsWith', 'getItem', 'setItem', 'removeItem', 'addEventListener', 'removeEventListener', 'toLocaleDateString', 'navigate', 'setTab', 'Error']);

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return walk(path);
  return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : [];
});

export const sourceFiles = () => [
  ...walk(join(root, 'frontend', 'src')).map((path) => relative(root, path)).filter((path) => !contentFiles.includes(path) && path !== 'frontend/src/services/api.ts'),
  ...contentFiles
];

// Values the code compares or switches on (screen names, CSS states), not words users read.
const codeWords = new Set(['All', 'dashboard', 'onboarding', 'landing', 'ncd', 'file', 'voice', 'chosen', 'correct', 'wrong', 'dim', 'review', 'pending', 'content', 'admin']);
const looksLikeCode = (text) => /^\/|^https?:|^[a-z]{2}-[A-Z]{2}$|^[#.]/.test(text) || /^[a-z0-9_-]+$/.test(text);
const hasWords = (text) => /[A-Za-z]{2}/.test(text);

// True for text inside className={...}, key={...} and other attributes that are not read by users.
const inCodeAttribute = (node) => {
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) return false;
    if (ts.isJsxAttribute(current)) return !textAttributes.has(current.name.getText());
  }
  return false;
};

// Should this literal be offered for translation, given where it sits in the code?
const wanted = (node, isContent) => {
  const parent = node.parent;
  if (inCodeAttribute(node) || codeWords.has(node.text)) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isLiteralTypeNode(parent)) return false;
  if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node) return false;
  if (ts.isElementAccessExpression(parent) || ts.isCaseClause(parent)) return false;
  if (ts.isBinaryExpression(parent) && /=/.test(ts.tokenToString(parent.operatorToken.kind) ?? '')) return false;
  if (ts.isJsxAttribute(parent)) return textAttributes.has(parent.name.getText()) && hasWords(node.text);
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    const callee = parent.expression;
    const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText();
    if (skippedCalls.has(name)) return false;
  }
  if (ts.isPropertyAssignment(parent) && ['slug', 'audioUrl', 'imageUrl', 'icon', 'id', 'categorySlug', 'status', 'role'].includes(parent.name.getText())) return false;
  const text = node.text;
  if (!hasWords(text) || looksLikeCode(text)) {
    // A single lowercase word can still be a word users read, e.g. a ? 'ikibazo' : 'ibibazo'.
    return ts.isConditionalExpression(parent) && /^[a-z]+$/.test(text) && !isContent && hasWords(text);
  }
  return true;
};

// Every translatable piece of text with its exact position in the file.
// `text` is what users see; for template strings it keeps the ${...} parts as written.
export const extract = (file) => {
  const code = readFileSync(join(root, file), 'utf8');
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const isContent = contentFiles.includes(file);
  const found = [];
  const add = (node, kind, text, start, end) => found.push({
    file, kind, text, start, end, line: source.getLineAndCharacterOfPosition(start).line + 1, inJsxAttribute: ts.isJsxAttribute(node.parent)
  });

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const raw = node.getText();
      const text = raw.trim();
      if (hasWords(text)) {
        const start = node.getStart() + raw.indexOf(text);
        add(node, 'jsx', text.replace(/\s+/g, ' '), start, start + text.length);
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && wanted(node, isContent)) {
      const text = ts.isStringLiteral(node) ? node.text : node.getText().slice(1, -1);
      add(node, ts.isStringLiteral(node) ? 'string' : 'template', text, node.getStart(), node.getEnd());
    } else if (ts.isTemplateExpression(node) && !inCodeAttribute(node)) {
      const raw = node.getText().slice(1, -1);
      const words = raw.replace(/\$\{[^}]*\}/g, '').trim();
      if (hasWords(words) && !looksLikeCode(words)) add(node, 'template', raw, node.getStart(), node.getEnd());
      return; // the parts inside ${...} are code
    } else if (ts.isTemplateExpression(node)) {
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

export const sectionOf = (file) => (contentFiles.includes(file) ? 'Lesson and disease content' : 'App interface');

// Turns corrected text back into source code of the same kind.
export const encode = (item, text) => {
  if (item.kind === 'jsx') {
    if (/[{}<>]/.test(text)) throw new Error('JSX text cannot contain { } < >');
    return text;
  }
  if (item.kind === 'template') {
    // Template text is kept as written, so only stray backticks need escaping.
    const wanted = item.text.match(/\$\{[^}]*\}/g) ?? [];
    const kept = text.match(/\$\{[^}]*\}/g) ?? [];
    if (wanted.join() !== kept.join()) throw new Error('keep the ${...} parts exactly as they were');
    return `\`${text.replace(/(?<!\\)`/g, '\\`')}\``;
  }
  if (item.inJsxAttribute) return text.includes('"') ? `{'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'}` : `"${text}"`;
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
};
