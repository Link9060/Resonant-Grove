// Source-level regression guard for mobile navigation accessibility.
// Run with: node --test tests/grove-mobile-navigation.test.mjs
// This does not replace real keyboard and screen-reader acceptance testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('menu button starts collapsed and controls the sidebar', () => {
  const button = html.match(/<button\b[^>]*\bid="menuButton"[^>]*>/)?.[0];
  assert.ok(button, 'mobile menu button must exist');
  assert.match(button, /\baria-controls="sidebar"/);
  assert.match(button, /\baria-expanded="false"/);
  assert.match(html, /<aside\b[^>]*\bid="sidebar"/);
});

test('opening menu updates overlay and accessibility state', () => {
  assert.match(app, /const open=\$\('sidebar'\)\.classList\.toggle\('open'\)/);
  assert.match(app, /\$\('mobileShade'\)\.classList\.toggle\('show',open\)/);
  assert.match(app, /\$\('menuButton'\)\.setAttribute\('aria-expanded',String\(open\)\)/);
});

test('closing menu resets sidebar, shade and expanded state', () => {
  const close = app.match(/function closeMenu\(\)\s*\{([^}]+)\}/)?.[1];
  assert.ok(close, 'shared closeMenu helper must exist');
  assert.match(close, /\$\('sidebar'\)\.classList\.remove\('open'\)/);
  assert.match(close, /\$\('mobileShade'\)\.classList\.remove\('show'\)/);
  assert.match(close, /\$\('menuButton'\)\.setAttribute\('aria-expanded','false'\)/);
});

test('navigation, backdrop and Escape invoke shared close helper', () => {
  const navigate = app.match(/function navigate\(target\)\s*\{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(navigate && navigate.includes('closeMenu()'), 'navigation must close mobile menu');
  assert.match(app, /\$\('mobileShade'\)\.addEventListener\('click',closeMenu\)/);
  assert.match(app, /if\(e\.key==='Escape'\)\{closeModal\(\);closeMenu\(\);\}/);
});
