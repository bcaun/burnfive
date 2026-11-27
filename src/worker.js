// Burn Five: игра, прием итогов партий и закрытая страница статистики.
// Привязки: KV namespace GAMES (wrangler.toml), секрет ADMIN_KEY (задается в Cloudflare).

import HTML from './index.html';
import ENGINE from './engine.js';
import LEVELS from './levels.js';
import APP from './app.js';
import I18N from './i18n.js';
const JS = {'/engine.js':ENGINE, '/levels.js':LEVELS, '/app.js':APP, '/i18n.js':I18N};

const NUM = ['tu','sc','ln','dbl','sp','J','Jb','T','X','Xb','Xk','fill','dur','w','best','push','cr','stone','lv','won'];
const MODE = {e:'игра', l:'уровень', d:'день'};
const REASON = {over:'конец партии', quit:'начал заново', hidden:'свернул или закрыл'};

function clamp(v, max){ v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0; }

async function saveGame(req, env){
  const text = await req.text();
  if (text.length > 2000) return new Response('too big', {status:413});
  let d; try { d = JSON.parse(text); } catch { return new Response('bad json', {status:400}); }
  if (!/^[a-z0-9]{8,20}$/.test(d.gid || '') || !/^[a-z0-9]{8,20}$/.test(d.sid || '')) return new Response('bad id', {status:400});
  const m = {n: d.n === 8 ? 8 : 10, m: MODE[d.m] ? d.m : 'e', day: /^\d{4}-\d\d-\d\d$/.test(d.day||'') ? d.day : '', sid:d.sid, r: REASON[d.r] ? d.r : 'over', u: Date.now(), dev: d.dev === 't' ? 't' : 'm', v: clamp(d.v, 99)};
  for (const k of NUM) m[k] = clamp(d[k], 10000000);
  // l: число линий длиной 4..10 (с версии 3; раньше 5..10)
  const l = Array.isArray(d.l) ? d.l.map(x => clamp(x, 10000)) : [];
  m.l = (m.v >= 3 ? l : [0, ...l]).concat([0,0,0,0,0,0,0]).slice(0,7);
  const prev = await env.GAMES.getWithMetadata('g:' + d.gid);
  if (prev && prev.metadata && prev.metadata.r === 'over') return new Response(null, {status:204});
  await env.GAMES.put('g:' + d.gid, '', {metadata: m});
  return new Response(null, {status:204});
}

async function allGames(env){
  const out = []; let cursor;
  do {
    const r = await env.GAMES.list({prefix:'g:', cursor});
    for (const k of r.keys) if (k.metadata) out.push({gid:k.name.slice(2), ...k.metadata});
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out.sort((a,b) => b.u - a.u);
}

const med = a => { if (!a.length) return 0; const s = [...a].sort((x,y)=>x-y), h = s.length>>1; return s.length % 2 ? s[h] : Math.round((s[h-1]+s[h])/2); };
const pct = (a,b) => b ? Math.round(a*100/b) + '%' : '0%';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtDate = t => new Date(t).toLocaleString('ru-RU', {timeZone:'Europe/Madrid', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
const fmtDur = s => Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');

function statsPage(all, key, sel){
  const g = sel === 'all' ? all : sel === 'l' || sel === 'd' ? all.filter(x => x.m === sel) : all.filter(x => (x.m||'e') === 'e' && (x.n||10) === +sel);
  let extra = '';
  if (sel === 'l') {
    const ids = [...new Set(g.map(x => x.lv))].filter(Boolean).sort((a,b)=>a-b);
    extra = `<h2>Уровни</h2><div class="s"><table><tr><th>Уровень</th><th>Попыток</th><th>Игроков</th><th>Пройдено</th><th>Доля побед среди доигранных</th><th>Ходов до победы, медиана</th></tr>${ids.map(id => { const a = g.filter(x => x.lv === id), f = a.filter(x => x.r === 'over'), w = f.filter(x => x.won); return `<tr><td>${id}</td><td>${a.length}</td><td>${new Set(a.map(x=>x.sid)).size}</td><td>${w.length}</td><td>${pct(w.length, f.length)}</td><td>${med(w.map(x=>x.tu))}</td></tr>`; }).join('')}</table></div>`;
  }
  if (sel === 'd') {
    const days = [...new Set(g.map(x => x.day))].filter(Boolean).sort().reverse();
    extra = `<h2>Задачи дня</h2><div class="s"><table><tr><th>Дата</th><th>Партий</th><th>Игроков</th><th>Лучший счет</th><th>Очков, медиана</th></tr>${days.map(dd => { const a = g.filter(x => x.day === dd); return `<tr><td>${dd}</td><td>${a.length}</td><td>${new Set(a.map(x=>x.sid)).size}</td><td>${Math.max(0,...a.map(x=>x.sc))}</td><td>${med(a.filter(x=>x.r==='over').map(x=>x.sc))}</td></tr>`; }).join('')}</table></div>`;
  }
  const fin = g.filter(x => x.r === 'over'), players = new Set(g.map(x => x.sid)).size;
  const sum = f => g.reduce((a,x) => a + (x[f]||0), 0);
  const L7 = x => (x.l||[]).length === 7 ? x.l : [0, ...(x.l||[])];
  const lines = [0,1,2,3,4,5,6].map(i => g.reduce((a,x) => a + (L7(x)[i]||0), 0));
  const allLines = lines.reduce((a,b)=>a+b,0);
  const B = sel === '8' ? [[0,64],[65,160],[161,200],[201,240],[241,280],[281,1e9]] : [[0,100],[101,250],[251,300],[301,350],[351,400],[401,1e9]];
  const ends = B.map(([a,b]) => fin.filter(x => x.tu>=a && x.tu<=b).length);
  const endLabels = B.map(([a,b]) => a === 0 ? 'до ' + b : b > 1e8 ? 'больше ' + (a-1) : a + '-' + b);
  const maxEnd = Math.max(1, ...ends);
  const kpi = [
    ['Партий', g.length], ['Игроков (сессий)', players], ['Доиграно до конца', fin.length + ' (' + pct(fin.length, g.length) + ')'],
    ['Ходов в доигранной партии, медиана', med(fin.map(x=>x.tu))], ['Очков, медиана', med(fin.map(x=>x.sc))], ['Рекорд', Math.max(0, ...g.map(x=>x.sc))],
    ['Длительность доигранной партии, медиана', fmtDur(med(fin.map(x=>x.dur)))], ['С телефона', pct(g.filter(x=>x.dev==='t').length, g.length)]
  ];
  const bonus = [
    ['Джокер', sum('J'), sum('Jb'), 'сгорел в линии'],
    ['Уничтожитель', sum('X'), sum('Xb'), 'сработал (снес кубиков: ' + sum('Xk') + ')'],
    ['Тройка', sum('T'), '', ''],
    ['Толчки', sum('push'), '', 'ходов с толчком ряда'],
    ['Трещины', sum('cr'), sum('stone'), 'окаменело']
  ];
  const rows = g.slice(0, 500).map(x => `<tr><td>${fmtDate(x.u)}</td><td>${MODE[x.m||'e']}${x.lv?' '+x.lv:''}</td><td>${(x.n||10)}×${(x.n||10)}</td><td>${esc(x.sid.slice(-4))}</td><td>${x.tu}</td><td>${x.sc}</td><td>${x.ln}</td><td>${x.dbl}</td><td>${x.Jb}/${x.J}</td><td>${x.Xb}/${x.X}</td><td>${x.T}</td><td>${fmtDur(x.dur)}</td><td>${x.dev==='t'?'телефон':'компьютер'}</td><td>${x.m==='l'&&x.r==='over'?(x.won?'победа':'поражение'):REASON[x.r]||x.r}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Burn Five: статистика</title>
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;color:#111;background:#fff}.w{max-width:1100px;margin:0 auto;padding:28px 16px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 8px;border-top:2px solid #111;padding-top:10px}.m{color:#6b6b6b;font-size:13px}
.k{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px 24px;margin-top:20px}.k b{display:block;font-size:30px;line-height:1.1}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{padding:5px 8px 5px 0;border-bottom:1px solid #e6e6e6;text-align:left;white-space:nowrap}th{font-weight:600;font-size:13px;color:#6b6b6b}
.s{overflow-x:auto}.bar{display:grid;grid-template-columns:110px 1fr 40px;gap:8px;align-items:center;margin:4px 0}.bar i{display:block;height:14px;background:#111}
a{color:#111}</style></head><body><div class="w">
<h1>Burn Five: статистика</h1><div class="m">Обновлено ${fmtDate(Date.now())}. <a href="/stats.csv?key=${encodeURIComponent(key)}">Скачать CSV</a></div>
<div class="m" style="margin-top:8px">Показать: ${[['8','игра 8×8'],['10','игра 10×10'],['l','уровни'],['d','задача дня'],['all','все']].map(([v,t]) => v === sel ? `<b>${t}</b>` : `<a href="/stats?key=${encodeURIComponent(key)}&n=${v}">${t}</a>`).join(' · ')}</div>
<div class="k">${kpi.map(([a,b]) => `<div><span class="m">${a}</span><b>${b}</b></div>`).join('')}</div>
${extra}
<h2>На каком ходу заканчиваются доигранные партии</h2>
${ends.map((n,i) => `<div class="bar"><span>${endLabels[i]}</span><span><i style="width:${n*100/maxEnd}%"></i></span><span>${n}</span></div>`).join('')}
<h2>Линии</h2><div class="s"><table><tr><th>Длина</th>${[4,5,6,7,8,9,'10'].map(x=>`<th>${x}</th>`).join('')}<th>Двойных ходов (×2)</th><th>Сожгли упавшие кубики</th></tr>
<tr><td>Сколько раз</td>${lines.map(n=>`<td>${n}</td>`).join('')}<td>${sum('dbl')}</td><td>${sum('sp')} (${pct(sum('sp'), allLines)})</td></tr></table></div>
<h2>Бонусы</h2><table><tr><th>Бонус</th><th>Появился</th><th>Использован</th><th></th></tr>${bonus.map(b=>`<tr><td>${b[0]}</td><td>${b[1]}</td><td>${b[2]}</td><td class="m">${b[3]}</td></tr>`).join('')}</table>
<h2>Партии</h2><div class="m">Последние 500. Игрок: последние 4 знака случайного номера сессии, без личных данных.</div>
<div class="s"><table><tr><th>Когда</th><th>Режим</th><th>Поле</th><th>Игрок</th><th>Ходов</th><th>Очки</th><th>Линий</th><th>×2</th><th>Джокер</th><th>Уничт.</th><th>Тройка</th><th>Время</th><th>Устройство</th><th>Итог</th></tr>${rows}</table></div>
</div></body></html>`;
}

// --- задача дня: таблица лучших ---
const DAY = /^\d{4}-\d\d-\d\d$/;
function dayOk(d){ if (!DAY.test(d)) return false; const t = Date.parse(d + 'T00:00:00Z'), now = Date.now(); return Math.abs(now - t) < 2.2 * 86400000; }
async function dayTop(env, date, sid){
  const best = new Map(); let cursor;
  do {
    const r = await env.GAMES.list({prefix:'d:' + date + ':', cursor});
    for (const k of r.keys) { const m = k.metadata; if (!m) continue; const b = best.get(m.sid); if (!b || m.sc > b.sc || (m.sc === b.sc && m.tu < b.tu)) best.set(m.sid, m); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  const list = [...best.values()].sort((a,b) => b.sc - a.sc || a.tu - b.tu);
  const rank = list.findIndex(x => x.sid === sid) + 1;
  return {top: list.slice(0, 10).map(x => ({nick:x.nick, sc:x.sc, me: x.sid === sid})), rank, total: list.length};
}
async function daily(req, env, url){
  const json = o => new Response(JSON.stringify(o), {headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  if (req.method === 'GET') {
    const date = url.searchParams.get('date') || '', sid = url.searchParams.get('sid') || '';
    if (!DAY.test(date)) return new Response('bad date', {status:400});
    return json(await dayTop(env, date, sid));
  }
  if (req.method !== 'POST') return new Response('method', {status:405});
  const text = await req.text(); if (text.length > 1000) return new Response('too big', {status:413});
  let d; try { d = JSON.parse(text); } catch { return new Response('bad json', {status:400}); }
  if (!dayOk(d.date || '') || !/^[a-z0-9]{8,20}$/.test(d.gid || '') || !/^[a-z0-9]{8,20}$/.test(d.sid || '')) return new Response('bad', {status:400});
  const nick = String(d.nick || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Player';
  await env.GAMES.put('d:' + d.date + ':' + d.gid, '', {metadata:{nick, sid:d.sid, sc:clamp(d.sc, 10000000), tu:clamp(d.tu, 100000), u:Date.now()}});
  return json(await dayTop(env, d.date, d.sid));
}

function csv(g){
  const head = ['date','mode','level','day','won','board','session','outcome','turns','score','lines','len4','len5','len6','len7','len8','len9','len10','double','spawn_lines','joker','joker_burned','triple','destroyer','destroyer_used','destroyer_killed','pushes','cracked','stoned','fill','seconds','device','width','best'];
  const rows = g.map(x => [new Date(x.u).toISOString(), x.m||'e', x.lv||'', x.day||'', x.won||0, (x.n||10), x.sid, x.r, x.tu, x.sc, x.ln, ...((x.l||[]).length === 7 ? x.l : [0, ...(x.l||[0,0,0,0,0,0])]), x.dbl, x.sp, x.J, x.Jb, x.T, x.X, x.Xb, x.Xk, x.push||0, x.cr||0, x.stone||0, x.fill, x.dur, x.dev==='t'?'phone':'desktop', x.w, x.best].join(','));
  return [head.join(','), ...rows].join('\n');
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (url.pathname === '/api/game') {
      if (req.method !== 'POST') return new Response('method', {status:405});
      if (!env.GAMES) return new Response('no storage', {status:500});
      return saveGame(req, env);
    }
    if (url.pathname === '/api/daily') {
      if (!env.GAMES) return new Response('no storage', {status:500});
      return daily(req, env, url);
    }
    if (JS[url.pathname]) return new Response(JS[url.pathname], {headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'}});
    if (url.pathname === '/stats' || url.pathname === '/stats.csv') {
      const key = url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('Not found', {status:404});
      const g = await allGames(env);
      if (url.pathname === '/stats.csv') return new Response(csv(g), {headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="burnfive.csv"'}});
      const sel = ['8','10','l','d','all'].includes(url.searchParams.get('n')) ? url.searchParams.get('n') : '8';
      return new Response(statsPage(g, key, sel), {headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}});
    }
    if (url.pathname === '/' || url.pathname === '/index.html')
      return new Response(HTML, {headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
    return new Response('Not found', {status:404});
  }
};
