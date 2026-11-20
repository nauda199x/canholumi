// Kiểm tra on-page SEO cho toàn bộ dist/ – chạy: node audit.mjs
import fs from 'node:fs';
import path from 'node:path';

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) files.push(p); } })('dist');

const issues = {}; const add = (k, f) => (issues[k] ||= []).push(f.replace(/^dist/, ''));
const titles = new Map(), descs = new Map();
let pages = 0;
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  if (/http-equiv="refresh"/.test(h)) continue; // trang chuyển hướng
  const noindex = /name="robots" content="noindex/.test(h);
  pages++;
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (!title) add('Thiếu title', f); else if (title.length > 70) add('Title > 70 ký tự', f); else if (title.length < 25 && !noindex) add('Title < 25 ký tự', f);
  if (!desc) add('Thiếu meta description', f); else if (desc.length > 160) add('Description > 160 ký tự', f); else if (desc.length < 70 && !noindex) add('Description < 70 ký tự', f);
  if (h1 !== 1 && !f.includes('can-ho/xem')) add(`Số H1 = ${h1}`, f);
  if (!/<link rel="canonical"/.test(h)) add('Thiếu canonical', f);
  if (/<img(?![^>]*\balt=)[^>]*>/.test(h)) add('Ảnh thiếu alt', f);
  if (!/<html lang=/.test(h)) add('Thiếu lang', f);
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { add('JSON-LD lỗi', f); } }
  if (!noindex) { (titles.get(title) || titles.set(title, []).get(title)).push(f); (descs.get(desc) || descs.set(desc, []).get(desc)).push(f); }
}
for (const [t, fs_] of titles) if (fs_.length > 1) add(`Title trùng (${fs_.length}): ${t.slice(0, 50)}`, fs_[0]);
for (const [d, fs_] of descs) if (fs_.length > 1) add(`Description trùng (${fs_.length})`, fs_[0]);

console.log(`Đã kiểm tra ${pages} trang.`);
const keys = Object.keys(issues);
if (!keys.length) console.log('Không phát hiện lỗi on-page.');
for (const k of keys) console.log(`- ${k}: ${issues[k].length} trang (vd: ${issues[k].slice(0, 3).join(', ')})`);
process.exitCode = keys.some(k => /Thiếu|lỗi|H1/.test(k)) ? 1 : 0;
