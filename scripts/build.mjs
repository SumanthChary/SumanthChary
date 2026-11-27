#!/usr/bin/env node
// Builds the animated SVG panels for the profile README.
//   node scripts/build.mjs            -> live data via GitHub GraphQL if a token is present, else data/snapshot.json
//   node scripts/build.mjs --snapshot -> force the local snapshot (offline preview)
// Zero dependencies. Needs Node 18+ (global fetch).
// PRIVACY: private repo names are NEVER written to the SVGs unless listed in data/config.json -> privateNamesAllowed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/config.json'), 'utf8'));
const OUT = path.join(ROOT, 'assets');

/* ───────────────────────── design tokens (warm amber terminal; deliberately not blue/purple) ───────────────────────── */
const C = {
  bg: '#15100D', bg2: '#1C1612', bar: '#211A14', line: '#3A2D22',
  text: '#EBDFCE', dim: '#9A8872', faint: '#5E4F40',
  amber: '#FFA033', ember: '#FF6A2B', sand: '#E9C98A', sage: '#A9C98A', clay: '#B5651D', brown: '#8A6E55',
  heat: ['#251C15', '#4B2D12', '#8F4B10', '#E0801A', '#FFB74D'],
};
const FONT = "ui-monospace,'SF Mono','JetBrains Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono','DejaVu Sans Mono',monospace";
const AG = cfg.hero.showAgentSplit !== false; // show hand-vs-agent numbers?
const CW = 8.5; // ~advance of one 14px monospace glyph (for reveal widths)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Number(n).toLocaleString('en-US');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayNum = (s) => Math.floor(Date.parse(s + 'T00:00:00Z') / 864e5);
const fmtDay = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}`; };
const ago = (asOf, s) => {
  const d = dayNum(asOf) - dayNum(s);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d}d ago`;
  if (d < 60) return `${Math.round(d / 7)}w ago`;
  if (d < 700) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
};
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ───────────────────────── shared SVG frame ───────────────────────── */
const CSS = `
text{font-family:${FONT};font-size:14px;fill:${C.text};white-space:pre}
.dim{fill:${C.dim}}.fnt{fill:${C.faint}}.amb{fill:${C.amber}}.emb{fill:${C.ember}}.sg{fill:${C.sage}}.sd{fill:${C.sand}}
.b{font-weight:700}.s11{font-size:12px}.s12{font-size:13px}.s13{font-size:14px}.s16{font-size:16px}
.r{animation:rise .6s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:var(--t,0s)}
@keyframes rise{from{opacity:0;transform:translateY(7px)}}
.cov{transform:translateX(var(--w));animation:slide var(--d,1s) steps(var(--n,20),end) backwards;animation-delay:var(--t,0s)}
@keyframes slide{from{transform:translateX(0)}}
.c{transform-box:fill-box;transform-origin:center;animation:pop .45s ease-out backwards;animation-delay:var(--t,0s)}
@keyframes pop{from{opacity:0;transform:scale(.3)}}
.blink{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
.pulse{animation:pulse 2.2s ease-in-out infinite}@keyframes pulse{50%{opacity:.3}}
.grow{transform-box:fill-box;transform-origin:left center;animation:grow .8s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:var(--t,0s)}
@keyframes grow{from{transform:scaleX(0)}}
.up{transform-box:fill-box;transform-origin:center bottom;animation:up .7s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:var(--t,0s)}
@keyframes up{from{transform:scaleY(0)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

function frame({ w, h, title, desc, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<defs>
<radialGradient id="glow" cx="10%" cy="0%" r="85%"><stop offset="0" stop-color="${C.amber}" stop-opacity=".13"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>
<pattern id="sl" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".1"/></pattern>
<clipPath id="in"><rect x="1" y="38" width="${w - 2}" height="${h - 39}"/></clipPath>
</defs>
<style>${CSS}</style>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="14" fill="${C.bg}" stroke="${C.line}"/>
<path d="M.5 38V14.5a14 14 0 0 1 14-14H${w - 14.5}a14 14 0 0 1 14 14V38Z" fill="${C.bar}"/>
<line x1=".5" y1="38" x2="${w - .5}" y2="38" stroke="${C.line}"/>
<circle cx="24" cy="19" r="5.5" fill="${C.ember}"/><circle cx="42" cy="19" r="5.5" fill="${C.amber}"/><circle cx="60" cy="19" r="5.5" fill="${C.sage}" opacity=".85"/>
<text x="${w / 2}" y="23.5" text-anchor="middle" class="dim s12">${esc(title)}</text>
<g clip-path="url(#in)">${body}</g>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="14" fill="url(#glow)" pointer-events="none"/>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="14" fill="url(#sl)" pointer-events="none"/>
</svg>
`;
}

const prompt = (x, y, cmd, comment = '', t = 0.1) => {
  const n = [...cmd].length;
  const wcov = Math.ceil(n * CW + 6);
  const cx = x + 44; // after "~ $ "
  return `<text x="${x}" y="${y}"><tspan class="sg">~</tspan><tspan class="dim"> </tspan><tspan class="amb b">$</tspan></text>
<text x="${cx}" y="${y}">${esc(cmd)}</text>
<rect class="cov" x="${cx - 2}" y="${y - 15}" width="${wcov}" height="21" fill="${C.bg}" style="--w:${wcov}px;--n:${n};--d:${(n * 0.03).toFixed(2)}s;--t:${t}s"/>
${comment ? `<text class="fnt s12 r" x="${cx + n * CW + 14}" y="${y}" style="--t:${(t + n * 0.03 + 0.1).toFixed(2)}s">${esc('# ' + comment)}</text>` : ''}`;
};

/* ───────────────────────── 5x7 pixel font for the wordmark ───────────────────────── */
const GLYPH = {
  S: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
};
function pixelWord(str, x0, y0, px, t0) {
  let x = x0, out = '', shadow = '', i = 0;
  const s = px - 1;
  for (const ch of str) {
    if (ch === ' ') { x += 3 * px; continue; }
    const g = GLYPH[ch]; let rects = '', sh = '';
    g.forEach((row, r) => [...row].forEach((v, c) => {
      if (v === '1') {
        rects += `<rect x="${x + c * px}" y="${y0 + r * px}" width="${s}" height="${s}" rx="1"/>`;
        sh += `<rect x="${x + c * px + 3}" y="${y0 + r * px + 3}" width="${s}" height="${s}" rx="1"/>`;
      }
    }));
    const delay = (t0 + i * 0.08).toFixed(2);
    shadow += `<g class="r" style="--t:${delay}s">${sh}</g>`;
    out += `<g class="r" style="--t:${delay}s">${rects}</g>`;
    x += 6 * px; i++;
  }
  const total = x - x0;
  return `<defs><linearGradient id="wg" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x0 + total}" y2="0"><stop offset="0" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.ember}"/></linearGradient></defs>
<g fill="#5A2C0C" opacity=".75">${shadow}</g><g fill="url(#wg)">${out}</g>`;
}

/* ───────────────────────── derive stats from normalized data ───────────────────────── */
function derive(data) {
  const cal = data.calendar, last = cal.slice(-365);
  const S = (arr, k) => arr.reduce((a, c) => a + c[k], 0);
  const mine = (c) => c.pub + c.prv;
  let longest = 0, run = 0;
  for (const c of last) { if (mine(c) > 0) { run++; longest = Math.max(longest, run); } else run = 0; }
  let current = 0;
  for (let i = last.length - 1; i >= 0; i--) { if (mine(last[i]) > 0) current++; else if (i === last.length - 1) continue; else break; }
  const [ay, am] = data.asOf.split('-').map(Number);
  const months = [];
  for (let k = 11; k >= 0; k--) { let m = am - k, y = ay; while (m < 1) { m += 12; y--; } months.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: MON[m - 1], mine: 0, agent: 0 }); }
  const mi = Object.fromEntries(months.map((m) => [m.key, m]));
  const wd = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
  for (const c of last) {
    const m = mi[c.date.slice(0, 7)]; if (m) { m.mine += mine(c); m.agent += c.agent; }
    const g = (new Date(c.date + 'T00:00:00Z').getUTCDay() + 6) % 7; wd[g] += mine(c);
  }
  const repos = data.repos;
  const langs = {};
  for (const r of repos) for (const [k, v] of Object.entries(r.languages || {})) langs[k] = (langs[k] || 0) + v;
  const langTotal = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
  const langList = Object.entries(langs).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: k, share: v / langTotal }));
  const withCommits = repos.filter((r) => r.mine + r.agent > 0);
  return {
    pub: S(last, 'pub'), prv: S(last, 'prv'), agent: S(last, 'agent'), mine: S(last, 'pub') + S(last, 'prv'),
    activeDays: last.filter((c) => mine(c) > 0).length, longest, current, months, wd, langList,
    nRepos: repos.length, nPub: repos.filter((r) => !r.isPrivate).length, nPrv: repos.filter((r) => r.isPrivate).length,
    mineAll: S(repos, 'mine'), agentAll: S(repos, 'agent'),
    lastPush: repos.map((r) => r.pushedAt).filter(Boolean).sort().pop(),
    ranked: withCommits.slice().sort((a, b) => (b.pushedAt || '').localeCompare(a.pushedAt || '') || b.mine - a.mine),
  };
}

/* ───────────────────────── 1) HERO ───────────────────────── */
function hero(data, s) {
  const W = 900, rows = [...cfg.hero.rows];
  rows.push(['repos', `${s.nRepos} repos  /  ${s.nPub} public  /  ${s.nPrv} private (names redacted)`]);
  rows.push(['commits', cfg.hero.showAgentSplit
    ? `${fmt(s.mineAll + s.agentAll)} total  /  ${fmt(s.mineAll)} by hand  /  ${fmt(s.agentAll)} agent-assisted`
    : `${fmt(s.mineAll)} commits across ${s.nRepos} repos`]);
  let b = prompt(36, 72, 'whoami', '', 0.15);
  b += pixelWord('SUMANTH CHARY', 36, 92, 8, 0.7);
  const tag = cfg.hero.tagline, tn = [...tag].length, tw = Math.ceil(tn * 9.7 + 8);
  b += `<text class="s16" x="36" y="182">${esc(tag)}</text>
<rect class="cov" x="34" y="165" width="${tw}" height="24" fill="${C.bg}" style="--w:${tw}px;--n:${tn};--d:${(tn * 0.022).toFixed(2)}s;--t:1.9s"/>`;
  let y = 224, t = 2.2;
  for (const [k, v] of rows) {
    b += `<g class="r" style="--t:${t.toFixed(2)}s"><text class="amb b" x="36" y="${y}">${esc(k)}</text><text x="150" y="${y}">${esc(v)}</text></g>`;
    y += 28; t += 0.12;
  }
  b += `<g class="r" style="--t:${t.toFixed(2)}s"><text class="amb b" x="36" y="${y}">status</text>
<circle class="pulse" cx="154" cy="${y - 5}" r="4.5" fill="${C.sage}"/><text x="168" y="${y}">building  /  last push ${esc(fmtDay(s.lastPush))}</text></g>`;
  y += 44;
  b += `<g class="r" style="--t:${(t + 0.2).toFixed(2)}s"><text x="36" y="${y}"><tspan class="sg">~</tspan><tspan class="dim"> </tspan><tspan class="amb b">$</tspan></text><rect class="blink" x="80" y="${y - 13}" width="9" height="17" fill="${C.amber}"/></g>`;
  const sw = [C.ember, C.amber, C.sand, C.sage, C.clay, C.brown, C.faint, C.text];
  b += `<g class="r" style="--t:${(t + 0.3).toFixed(2)}s">${sw.map((c, i) => `<rect x="${864 - (8 - i) * 24 + 6}" y="${y - 14}" width="18" height="18" rx="3" fill="${c}"/>`).join('')}</g>`;
  return frame({
    w: W, h: y + 34, title: 'sumanth@ship: ~', body: b,
    desc: `Terminal card: Sumanth Chary. ${cfg.hero.tagline} ${s.nRepos} repositories (${s.nPub} public, ${s.nPrv} private), ${fmt(s.mineAll)} commits by hand and ${fmt(s.agentAll)} agent-assisted.`,
  });
}

/* ───────────────────────── 2) ACTIVITY (heatmap, tiles, rhythm) ───────────────────────── */
function activity(data, s) {
  const W = 900, H = 488;
  const cal = new Map(data.calendar.map((c) => [c.date, c]));
  const asOf = data.asOf, asOfDow = new Date(asOf + 'T00:00:00Z').getUTCDay();
  const start = dayNum(asOf) - (asOfDow + 52 * 7);
  const lvl = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4);
  let b = prompt(36, 72, 'git log --all --author=me --since="1 year ago"', 'private repos included', 0.1);

  // tiles
  const ty = 90, th = 80, gap = 14, w1 = 262, w2 = 174;
  const tile = (x, w, label, big, sub, t) => `<g class="r" style="--t:${t}s"><rect x="${x}" y="${ty}" width="${w}" height="${th}" rx="9" fill="${C.bg2}" stroke="${C.line}"/>
<text class="dim s12" x="${x + 16}" y="${ty + 24}">${esc(label)}</text><text class="amb b" x="${x + 16}" y="${ty + 56}" style="font-size:30px">${esc(big)}</text>${sub}</g>`;
  const tot = Math.max(1, s.pub + s.prv), pw = (w1 - 32) * (s.prv / tot);
  b += tile(36, w1, 'my commits  ·  365 days', fmt(s.mine),
    `<text class="amb s12" x="${36 + 120}" y="${ty + 48}">${fmt(s.prv)} private</text><text class="sd s12" x="${36 + 120}" y="${ty + 64}">${fmt(s.pub)} public</text>
<rect x="52" y="${ty + 68}" width="${w1 - 32}" height="4" rx="2" fill="${C.sand}" opacity=".55"/><rect class="grow" x="52" y="${ty + 68}" width="${pw.toFixed(1)}" height="4" rx="2" fill="${C.amber}" style="--t:.9s"/>`, 0.3);
  const x2 = 36 + w1 + gap;
  const touched = s.ranked.filter((r) => dayNum(data.asOf) - dayNum(r.pushedAt || '1970-01-01') <= 365).length;
  b += AG ? tile(x2, w2, 'agent-assisted', fmt(s.agent), `<text class="dim s11" x="${x2 + 16}" y="${ty + 72}">Lovable / v0 / Claude</text>`, 0.42)
          : tile(x2, w2, 'repos touched', fmt(touched), `<text class="dim s11" x="${x2 + 16}" y="${ty + 72}">public + private</text>`, 0.42);
  b += tile(x2 + (w2 + gap), w2, 'active days', fmt(s.activeDays), `<text class="dim s11" x="${x2 + w2 + gap + 16}" y="${ty + 72}">of the last 365</text>`, 0.54);
  b += tile(x2 + 2 * (w2 + gap), w2, 'longest streak', `${s.longest}d`, `<text class="dim s11" x="${x2 + 2 * (w2 + gap) + 16}" y="${ty + 72}">current: ${s.current} day${s.current === 1 ? '' : 's'}</text>`, 0.66);

  // heatmap
  const gx = 70, gy = 214, P = 15, CS = 12;
  let lastLabelCol = -9, months = '', cols = '';
  for (let c = 0; c < 53; c++) {
    let cells = '';
    for (let r = 0; r < 7; r++) {
      const dn = start + c * 7 + r; if (dn > dayNum(asOf)) continue;
      const iso = new Date(dn * 864e5).toISOString().slice(0, 10);
      const e = cal.get(iso) || { pub: 0, prv: 0, agent: 0 }, m = e.pub + e.prv;
      cells += `<rect x="${gx + c * P}" y="${gy + r * P}" width="${CS}" height="${CS}" rx="2.5" fill="${C.heat[lvl(m)]}"/>`;
      if (AG && e.agent > 0) cells += `<circle cx="${gx + c * P + CS / 2}" cy="${gy + r * P + CS / 2}" r="${e.agent > 20 ? 2.6 : 1.8}" fill="${C.text}" opacity="${m ? 0.9 : 0.55}"/>`;
    }
    const d0 = new Date((start + c * 7) * 864e5), dom = d0.getUTCDate();
    if (dom <= 7 && c - lastLabelCol >= 3) { months += `<text class="dim s11" x="${gx + c * P}" y="${gy - 8}">${MON[d0.getUTCMonth()]}</text>`; lastLabelCol = c; }
    cols += `<g class="c" style="--t:${(0.7 + c * 0.014).toFixed(2)}s">${cells}</g>`;
  }
  b += months + ['Mon', 'Wed', 'Fri'].map((l, i) => `<text class="dim s11" x="36" y="${gy + (i * 2 + 1) * P + 10}">${l}</text>`).join('') + cols;
  const ly = gy + 7 * P + 24;
  b += `<g class="r" style="--t:1.5s"><text class="dim s11" x="36" y="${ly}">less</text>${C.heat.map((c, i) => `<rect x="${72 + i * 17}" y="${ly - 10}" width="12" height="12" rx="2.5" fill="${c}"/>`).join('')}
<text class="dim s11" x="166" y="${ly}">more</text>${AG ? `<circle cx="228" cy="${ly - 4}" r="2.4" fill="${C.text}" opacity=".9"/><text class="dim s11" x="238" y="${ly}">agent-assisted commits that day</text>` : ''}
<text class="fnt s11" x="864" y="${ly}" text-anchor="end">${data.source === 'snapshot' ? 'snapshot' : 'live'} · ${esc(fmtDay(asOf))}</text></g>`;

  // monthly rhythm
  const my = ly + 38, mx = 94, mp = 45, bh = 28;
  b += `<text class="dim s12" x="36" y="${my - 6}">per month</text><text class="dim s12" x="660" y="${my - 6}">my commits by weekday</text>`;
  const maxMine = Math.max(1, ...s.months.map((m) => m.mine)), maxAg = Math.max(1, ...s.months.map((m) => m.agent));
  const rowH = AG ? bh : 2 * bh;
  b += `<text class="amb s11" x="36" y="${my + rowH - 8}">me</text>${AG ? `<text class="sd s11" x="36" y="${my + 2 * bh + 12}">agents</text>` : ''}`;
  s.months.forEach((m, i) => {
    const x = mx + i * mp, h1 = Math.max(m.mine ? 2 : 0, (m.mine / maxMine) * rowH), h2 = Math.max(m.agent ? 2 : 0, (m.agent / maxAg) * bh);
    const t = (1.2 + i * 0.05).toFixed(2);
    b += `<rect class="up" x="${x}" y="${my + rowH - h1}" width="30" height="${h1.toFixed(1)}" rx="2" fill="${C.amber}" style="--t:${t}s"/>
${AG ? `<rect class="up" x="${x}" y="${my + 2 * bh + 6 - h2}" width="30" height="${h2.toFixed(1)}" rx="2" fill="${C.sand}" opacity=".7" style="--t:${t}s"/>` : ''}
<text class="dim s11" x="${x + 15}" y="${my + 2 * bh + 24}" text-anchor="middle">${m.label}</text>`;
    if (m.mine === maxMine && m.mine > 0) b += `<text class="amb s11" x="${x + 15}" y="${my + rowH - h1 - 4}" text-anchor="middle">${m.mine}</text>`;
  });
  const maxW = Math.max(1, ...s.wd), wh = 2 * bh;
  s.wd.forEach((v, i) => {
    const x = 664 + i * 29, h = Math.max(v ? 2 : 0, (v / maxW) * wh);
    b += `<rect class="up" x="${x}" y="${my + wh - h}" width="20" height="${h.toFixed(1)}" rx="2" fill="${v === maxW ? C.amber : C.clay}" style="--t:${(1.3 + i * 0.05).toFixed(2)}s"/>
<text class="dim s11" x="${x + 10}" y="${my + 2 * bh + 24}" text-anchor="middle">${'MTWTFSS'[i]}</text>`;
  });
  return frame({
    w: W, h: H, title: 'git log: the last 365 days', body: b,
    desc: `Contribution heatmap. In the last year: ${s.mine} commits by hand (${s.prv} private, ${s.pub} public), ${s.agent} agent-assisted commits, ${s.activeDays} active days, longest streak ${s.longest} days.`,
  });
}

/* ───────────────────────── 3) SHIP LOG (private repos included, names redacted) ───────────────────────── */
function shiplog(data, s) {
  const W = 900, N = 12, rows = s.ranked.slice(0, N), rest = s.ranked.length - rows.length;
  const maxMine = Math.max(1, ...rows.map((r) => r.mine));
  let b = prompt(36, 72, 'git shortlog --all', 'private repos included, names redacted', 0.1);
  const hy = 104;
  b += `<g class="dim s11"><text x="58" y="${hy}">repo</text><text x="318" y="${hy}">visibility</text><text x="480" y="${hy}" text-anchor="end">mine</text>${AG ? `<text x="556" y="${hy}" text-anchor="end">agents</text>` : ''}<text x="590" y="${hy}">${AG ? 'hand vs agent' : 'my commits'}</text><text x="864" y="${hy}" text-anchor="end">last push</text></g>
<line x1="36" y1="${hy + 10}" x2="864" y2="${hy + 10}" stroke="${C.line}"/>`;
  let y = hy + 38;
  rows.forEach((r, i) => {
    const allowed = r.isPrivate ? cfg.privateNamesAllowed[r.name] : (cfg.publicNames[r.name] || r.name);
    const d = dayNum(data.asOf) - dayNum(r.pushedAt || data.asOf);
    const dot = d <= 14 ? C.amber : d <= 90 ? C.sand : C.faint;
    const t = (0.5 + i * 0.09).toFixed(2);
    let nameEl;
    if (allowed) nameEl = `<text x="58" y="${y}">${esc(allowed)}</text>`;
    else { const wbar = 90 + (hash(r.name) % 90); nameEl = `<rect x="58" y="${y - 11}" width="${wbar}" height="14" rx="3" fill="${C.faint}" opacity=".85"/>`; }
    const vis = r.isPrivate
      ? `<rect x="318" y="${y - 12}" width="62" height="17" rx="8.5" fill="none" stroke="${C.ember}" opacity=".8"/><text class="emb s11" x="349" y="${y}" text-anchor="middle">private</text>`
      : `<text class="dim s12" x="318" y="${y}">public</text>`;
    const tot = Math.max(1, r.mine + r.agent), share = r.mine / tot, TW = 150;
    const mw = r.mine ? Math.max(3, share * TW) : 0;
    b += `<g class="r" style="--t:${t}s"><circle ${d <= 3 ? 'class="pulse" ' : ''}cx="42" cy="${y - 4}" r="4" fill="${dot}"/>${nameEl}${vis}
<text class="amb b" x="480" y="${y}" text-anchor="end">${fmt(r.mine)}</text>${AG ? `<text class="dim" x="556" y="${y}" text-anchor="end">${fmt(r.agent)}</text>` : ''}
<rect x="590" y="${y - 9}" width="${TW}" height="6" rx="3" fill="${C.sand}" opacity="${AG ? (r.agent ? 0.42 : 0.12) : 0.12}"/><rect class="grow" x="590" y="${y - 9}" width="${(AG ? mw : (r.mine ? Math.max(3, (r.mine / maxMine) * TW) : 0)).toFixed(1)}" height="6" rx="3" fill="${C.amber}" style="--t:${(+t + 0.2).toFixed(2)}s"/>
${AG ? `<text class="dim s11" x="750" y="${y - 2}">${Math.round(share * 100)}%</text>` : ''}
<text class="dim s12" x="864" y="${y}" text-anchor="end">${esc(ago(data.asOf, r.pushedAt || data.asOf))}</text></g>`;
    y += 28;
  });
  if (rest > 0) b += `<text class="fnt s12 r" x="58" y="${y + 2}" style="--t:${(0.5 + N * 0.09 + 0.2).toFixed(2)}s">+ ${rest} more repos  ·  ${fmt(s.mineAll)} commits by me across all ${s.nRepos}</text>`;
  return frame({
    w: W, h: y + 30, title: 'git shortlog --all', body: b,
    desc: `Activity per repository, private ones included with names redacted. ${s.nRepos} repositories: ${s.nPub} public and ${s.nPrv} private.`,
  });
}

/* ───────────────────────── 4) STACK ───────────────────────── */
function stack(data, s) {
  const W = 900, pal = [C.amber, C.ember, C.sand, C.clay, C.brown, C.sage];
  let b = prompt(36, 72, 'cloc ~/code', `${s.nRepos} repos, public + private`, 0.1);
  const bx = 36, bw = 828, by = 92;
  const top = s.langList.slice(0, 6);
  let x = bx;
  b += `<rect x="${bx}" y="${by}" width="${bw}" height="22" rx="6" fill="${C.bg2}" stroke="${C.line}"/>`;
  top.forEach((l, i) => {
    const w = Math.max(5, l.share * bw - 2);
    b += `<rect class="grow" x="${x.toFixed(1)}" y="${by + 2}" width="${w.toFixed(1)}" height="18" rx="4" fill="${pal[i]}" style="--t:${(0.4 + i * 0.1).toFixed(2)}s"/>`;
    x += w + 2;
  });
  top.forEach((l, i) => {
    const lx = 36 + (i % 3) * 276, ly = 146 + Math.floor(i / 3) * 24;
    b += `<g class="r" style="--t:${(0.9 + i * 0.07).toFixed(2)}s"><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${pal[i]}"/><text x="${lx + 18}" y="${ly}" class="s13">${esc(l.name)}</text><text class="dim s13" x="${lx + 196}" y="${ly}" text-anchor="end">${(l.share * 100).toFixed(1)}%</text></g>`;
  });
  let cx = 36, cy = 226, t = 1.3;
  for (const chip of cfg.stackChips) {
    const w = Math.ceil(chip.length * 7.4 + 24);
    if (cx + w > 864) { cx = 36; cy += 34; }
    b += `<g class="r" style="--t:${t.toFixed(2)}s"><rect x="${cx}" y="${cy - 17}" width="${w}" height="26" rx="13" fill="${C.bg2}" stroke="${C.line}"/><text class="sd s12" x="${cx + w / 2}" y="${cy}" text-anchor="middle">${esc(chip)}</text></g>`;
    cx += w + 10; t += 0.04;
  }
  return frame({
    w: W, h: cy + 34, title: 'cloc ~/code', body: b,
    desc: `Language mix across ${s.nRepos} repositories: ${top.map((l) => `${l.name} ${(l.share * 100).toFixed(0)}%`).join(', ')}. Tools: ${cfg.stackChips.join(', ')}.`,
  });
}

/* ───────────────────────── data layer ───────────────────────── */
async function gql(token, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-readme-build' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.errors) throw new Error(`GraphQL ${res.status}: ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.data;
}

async function fetchLive(token) {
  const login = cfg.login, tz = cfg.tzOffsetMinutes * 60000;
  const bucket = (iso) => new Date(Date.parse(iso) + tz).toISOString().slice(0, 10);
  const asOf = bucket(new Date().toISOString());
  const startDay = dayNum(asOf) - 371;
  const since = new Date(startDay * 864e5 - tz).toISOString();
  const uid = (await gql(token, 'query($l:String!){user(login:$l){id}}', { l: login })).user.id;

  const repos = []; let after = null;
  for (;;) {
    const d = await gql(token, `query($l:String!,$after:String){user(login:$l){repositories(first:50,after:$after,ownerAffiliations:OWNER,isFork:false,orderBy:{field:PUSHED_AT,direction:DESC}){
      pageInfo{hasNextPage endCursor} nodes{name isPrivate createdAt pushedAt languages(first:8,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}}}`, { l: login, after });
    const r = d.user.repositories; repos.push(...r.nodes);
    if (!r.pageInfo.hasNextPage) break; after = r.pageInfo.endCursor;
  }
  const cal = new Map();
  for (let i = 0; i <= 371; i++) cal.set(new Date((startDay + i) * 864e5).toISOString().slice(0, 10), { pub: 0, prv: 0, agent: 0 });
  const out = [];
  for (const r of repos) {
    let mineAll = 0, totalAll = 0, cursor = null;
    for (;;) {
      const d = await gql(token, `query($o:String!,$n:String!,$since:GitTimestamp!,$after:String,$uid:ID!){repository(owner:$o,name:$n){defaultBranchRef{target{... on Commit{
        all:history(first:1){totalCount} mine:history(first:1,author:{id:$uid}){totalCount}
        recent:history(first:100,since:$since,after:$after){pageInfo{hasNextPage endCursor} nodes{committedDate author{user{login}}}}}}}}}`,
        { o: login, n: r.name, since, after: cursor, uid });
      const tgt = d.repository && d.repository.defaultBranchRef && d.repository.defaultBranchRef.target;
      if (!tgt) break;
      totalAll = tgt.all.totalCount; mineAll = tgt.mine.totalCount;
      for (const n of tgt.recent.nodes) {
        const e = cal.get(bucket(n.committedDate)); if (!e) continue;
        const me = n.author && n.author.user && n.author.user.login && n.author.user.login.toLowerCase() === login.toLowerCase();
        if (me) e[r.isPrivate ? 'prv' : 'pub']++; else e.agent++;
      }
      if (!tgt.recent.pageInfo.hasNextPage) break; cursor = tgt.recent.pageInfo.endCursor;
    }
    out.push({ name: r.name, isPrivate: r.isPrivate, pushedAt: r.pushedAt ? bucket(r.pushedAt) : null, createdAt: bucket(r.createdAt),
      mine: mineAll, agent: Math.max(0, totalAll - mineAll), languages: Object.fromEntries(r.languages.edges.map((e) => [e.node.name, e.size])) });
  }
  if (!out.some((r) => r.isPrivate)) console.warn('WARNING: no private repos visible. The token probably lacks the "repo" scope, so private activity will read as zero.');
  return { source: 'live', asOf, user: { login }, calendar: [...cal].map(([date, v]) => ({ date, ...v })), repos: out };
}

/* ───────────────────────── main ───────────────────────── */
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const live = token && !process.argv.includes('--snapshot');
const data = live ? await fetchLive(token) : JSON.parse(fs.readFileSync(path.join(ROOT, 'data/snapshot.json'), 'utf8'));
const s = derive(data);
fs.mkdirSync(OUT, { recursive: true });
const write = (n, svg) => { fs.writeFileSync(path.join(OUT, n), svg); console.log(`wrote assets/${n}  (${(svg.length / 1024).toFixed(1)} kB)`); };
write('hero.svg', hero(data, s));
write('shiplog.svg', shiplog(data, s));
write('activity.svg', activity(data, s));
write('stack.svg', stack(data, s));
console.log(`source=${data.source} asOf=${data.asOf} repos=${s.nRepos} mine365=${s.mine} (prv ${s.prv} / pub ${s.pub}) agent365=${s.agent} active=${s.activeDays} streak=${s.longest}/${s.current}`);
