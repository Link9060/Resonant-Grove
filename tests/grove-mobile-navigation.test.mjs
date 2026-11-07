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
  assert.match(app, /if\(e\.key==='Escape'\)\{const menuWasOpen=\$\('sidebar'\)\.classList\.contains\('open'\);closeModal\(\);closeMenu\(\);if\(menuWasOpen\)\$\('menuButton'\)\.focus\(\);\}/);
});

test('Escape returns focus to toggle only if mobile menu was open', () => {
  assert.match(app, /const menuWasOpen=\$\('sidebar'\)\.classList\.contains\('open'\)/);
  assert.match(app, /if\(menuWasOpen\)\$\('menuButton'\)\.focus\(\)/);
});


test('resizing to desktop clears stale mobile navigation state', () => {
  const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(app, /window\.addEventListener\('resize',\(\)=>\{if\(window\.innerWidth>720\)closeMenu\(\);\}\)/);
});


test('opening the mobile menu places keyboard focus on its first navigation link', () => {
  assert.match(app, /if\(open\)\$\('sidebar'\)\.querySelector\('\.nav-link'\)\?\.focus\(\)/);
});

test('open mobile menu traps Tab and Shift+Tab at the navigation boundaries', () => {
  assert.match(app, /e\.key!=='Tab'\|\|window\.innerWidth>720/);
  assert.match(app, /!\$\('sidebar'\)\.classList\.contains\('open'\)/);
  assert.match(app, /\$\('modalBackdrop'\)\.classList\.contains\('open'\)/);
  assert.match(app, /if\(e\.shiftKey&&\(active===first\|\|!\$\('sidebar'\)\.contains\(active\)\)\)/);
  assert.match(app, /else if\(!e\.shiftKey&&\(active===last\|\|!\$\('sidebar'\)\.contains\(active\)\)\)/);
  assert.match(app, /e\.preventDefault\(\);last\.focus\(\)/);
  assert.match(app, /e\.preventDefault\(\);first\.focus\(\)/);
});


test('navigating from open mobile sidebar restores focus to visible menu button', () => {
  const navigate = app.match(/function navigate\(target\)\s*\{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(navigate, 'navigate helper must exist');
  assert.match(navigate, /const wasMobileMenuOpen=window\.innerWidth<=720&&\$\('sidebar'\)\.classList\.contains\('open'\)/);
  assert.match(navigate, /closeMenu\(\);[\s\S]*if\(wasMobileMenuOpen\)\$\('menuButton'\)\.focus\(\{preventScroll:true\}\)/);
});
