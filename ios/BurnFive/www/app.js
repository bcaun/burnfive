{
const $=id=>document.getElementById(id);
const I=window.BF_I18N,t=I.t;
const cname=c=>t('color')[c],bname=b=>t('bonus')[b];
const tname=x=>x?(t('terrain')[x[0]]||t('terrain').O):t('empty');
const LEVELS=window.BF_LEVELS;
const boardEl=$('board');
// В приложении для iOS страница открывается со схемы burnfive://, сервер тогда указываем полностью
const NATIVE=location.protocol==='burnfive:',API=NATIVE?'https://burnfive.daagamma.com':'';
const hap=k=>{try{window.webkit.messageHandlers.bf.postMessage({h:k})}catch(e){}};
const SID=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const TOUCH=matchMedia('(pointer: coarse)').matches;
const today=()=>new Date().toISOString().slice(0,10);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const rseed=()=>(Math.random()*4294967296)>>>0;

// язык: выбор игрока, иначе русский для русского языка устройства, иначе английский
let lang=ls.get('burnfive-lang',/^ru\b/i.test(navigator.language||'')?'ru':'en');if(!I.L[lang])lang='en';I.setLang(lang);
let mode=ls.get('burnfive-mode','e'); if(!['e','l','d'].includes(mode)) mode='e';
let size=ls.get('burnfive-size',8); if(![8,10].includes(size)) size=8;
let lvIdx=null, s=null, sel=null, busy=false, G=null, view=null, dayDate=today();

// ---------- графика кубиков и клеток ----------
const SYM={r:'<circle cx="10" cy="10" r="6.6"/>',y:'<path d="M10 2.9 17.6 16.4H2.4Z"/>',g:'<rect x="3.7" y="3.7" width="12.6" height="12.6" rx="1.6"/>',b:'<path d="M10 2 18 10 10 18 2 10Z"/>',
 X:'<path d="M10 0.8 12 7 18.6 5 14.2 10 18.6 15 12 13 10 19.2 8 13 1.4 15 5.8 10 1.4 5 8 7Z"/>'};
const sym=c=>`<svg class="sym" viewBox="0 0 20 20" aria-hidden="true">${SYM[c]}</svg>`;
const CRK='M9 5 16 14 13 20 21 26 19 34M16 14 25 11 30 4M21 26 30 24',CRKS=CRK+'M4 21 11 24 9 31M27 15 35 19 33 26';
const crk=(d,h)=>`<svg class="crk${h?' h':''}" viewBox="0 0 40 40" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
function kInner(col,kk,life){
 if(col==='J')return '<i class="jc"></i>';
 if(col==='S')return crk(CRKS,true);
 let h=sym(col);
 if(kk>0){
  if(kk<=3)h+=crk(CRK,true)+`<span class="hotb">${'<i></i>'.repeat(kk)}</span>`;
  else{const f=Math.min(1,kk/(life||kk));h+=crk(CRK)+`<svg class="ring" viewBox="0 0 40 40" preserveAspectRatio="none" aria-hidden="true"><circle class="tr" cx="20" cy="15.5" r="13"/><circle class="ar" cx="20" cy="15.5" r="13" stroke-dasharray="${(81.7*f).toFixed(1)} 100" transform="rotate(-90 20 15.5)"/></svg>`}
 }
 return h;
}
const kHTML=(col,cls='')=>`<span class="k ${col} ${cls}">${kInner(col,0)}</span>`;
function terrainInner(t){
 if(t==='P')return '<span class="col"></span>';
 if(t==='O1'||t==='O2')return `<svg class="arch" viewBox="0 0 40 40" aria-hidden="true"><path class="ap" d="M9 36V18a11 11 0 0 1 22 0v18Z"/>${t==='O1'?'<circle class="ad" cx="20" cy="25" r="2.6"/>':'<circle class="ad" cx="15.5" cy="25" r="2.6"/><circle class="ad" cx="24.5" cy="25" r="2.6"/>'}</svg>`;
 const pc={R:'r',Y:'y',G:'g',V:'b'}[t];
 if(pc)return `<svg class="paint ${pc}" viewBox="0 0 40 40" aria-hidden="true"><path class="pb" d="M20 4c6 0 9 4 13 6s4 8 2 12 0 9-5 11-9 3-14 1-9-2-10-7 0-9 1-13 7-10 13-10Z"/><g class="ps" transform="translate(13 13) scale(.7)">${SYM[pc]}</g></svg>`;
 return '';
}
const crackLife=()=>(s.cfg.crack&&s.cfg.crack.life)||(mode==='l'&&lvIdx!==null&&LEVELS[lvIdx].crack&&LEVELS[lvIdx].crack.life)||8;

// ---------- построение поля ----------
const cells=[];
function build(){
 const n=s.n;boardEl.innerHTML='';cells.length=0;boardEl.style.setProperty('--n',n);
 for(let i=0;i<n*n;i++){const c=document.createElement('button');c.className='c'+(s.T[i]?' t-'+s.T[i]:'');c.dataset.i=i;c.setAttribute('role','gridcell');if(s.T[i])c.innerHTML=terrainInner(s.T[i]);cells.push(c);boardEl.appendChild(c)}
 boardEl.setAttribute('aria-label',t('board',n));
 view={b:s.b.slice(),k:s.k.slice()};
}
function drawCells(v,pop=new Set(),cls=''){
 view=v;
 const tg=new Set();
 if(sel!==null&&s.b[sel]&&!s.over) for(let d=0;d<4;d++) if(BF.canMove(s,sel,d)) tg.add(BF.step(s,sel,d));
 cells.forEach((c,i)=>{
  c.classList.toggle('s',i===sel);c.classList.toggle('t',tg.has(i));
  const col=v.b[i];let k=c.querySelector('.k');
  const sj=!busy&&!s.over&&!col?(s.seeds||[]).indexOf(i):-1;let sd=c.querySelector('.seed');
  if(sj>=0){const sc=s.queue[sj];if(!sd||sd.dataset.c!==sc){if(sd)sd.remove();sd=document.createElement('span');sd.className='seed '+sc;sd.dataset.c=sc;sd.innerHTML=sym(sc);c.appendChild(sd)}}
  else if(sd)sd.remove();
  if(!col){if(k)k.remove();c.setAttribute('aria-label',tname(s.T[i])+(sj>=0?t('landsHere',cname(s.queue[sj])):''));return}
  if(!k||k.dataset.c!==col){if(k)k.remove();k=document.createElement('span');k.className='k '+col;k.dataset.c=col;k.dataset.kk='-1';c.appendChild(k)}
  const cr=v.k[i]>0;k.classList.toggle('cr',cr);k.classList.toggle('hot',cr&&v.k[i]<=3);
  if(k.dataset.kk!==String(v.k[i])){k.dataset.kk=v.k[i];k.innerHTML=kInner(col,v.k[i],crackLife())}
  if(cr)k.dataset.n=v.k[i];else delete k.dataset.n;
  if(pop.has(i)&&cls){k.classList.remove(cls);void k.offsetWidth;k.classList.add(cls)}
  c.setAttribute('aria-label',cname(col)+(cr?t('stoneIn',v.k[i]):''));
 });
}

// ---------- боковая панель ----------
const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c};
const icon=(t,cls='')=>t==='T'?`<span class="trip">${'<span class="ico"><span class="k g"></span></span>'.repeat(3)}</span>`:`<span class="ico ${cls}">${kHTML(t)}</span>`;
function phaseText(n){
 const tp=s.cfg.tempo;
 if(tp.every)return tp.every===1?t('everyMove'):t('everyN',tp.every);
 const p3=tp.p3===2?t('p3two'):t('p3third');
 return n<=tp.p1?t('phase1'):n<=tp.p2?t('phase2'):t('phase3',p3);
}
function goalText(g){
 if(g.type==='lines')return g.color?t('goalColor',g.count,cname(g.color),g.color):t('goalLines',g.count);
 if(g.type==='score')return t('goalScore',g.count);
 if(g.type==='double')return t('goalDouble',g.count);
 if(g.type==='stones')return t('goalStones');
 return '';
}
function panel(){
 const st=s.st;
 $('score').textContent=s.score;
 $('turn').textContent=s.turn;$('lines').textContent=s.lines;
 $('fill').textContent=`${s.b.filter(Boolean).length}/${s.T.filter(t=>t!=='P').length}`;
 $('phase').textContent=phaseText(s.turn+1);
 $('incoming').textContent=t('word',BF.spawnCount(s.cfg,s.turn+1));
 const cap=s.T.filter(t=>t!=='P').length,fillN=s.b.filter(Boolean).length,heat=Math.max(0,Math.min(1,(fillN/cap-0.7)/0.25));
 document.querySelector('.boardbox').style.setProperty('--side',heat?`color-mix(in srgb,#e0483a ${Math.round(heat*100)}%,var(--slabside))`:'');
 $('next').innerHTML=s.queue.slice(0,2).map((c,j)=>`<span class="ico ${j?'sm':''}" role="img" aria-label="${cname(c)}">${kHTML(c)}</span>`).join('');
 $('hnext').innerHTML=$('next').innerHTML;
 const be=s.cfg.bonusEvery;$('bonusrow').hidden=!be;
 if(be){const left=be-s.turn%be;$('hbonus').innerHTML=icon(s.nextBonus,'xs')+`<span>${t('inN',left)}</span>`}else $('hbonus').innerHTML='';
 if(mode==='l'&&lvIdx!==null){const gp=BF.goalProgress(s),left=LEVELS[lvIdx].moves-s.turn;$('hlab').textContent=t('goal');$('hscore').textContent=`${gp.have}/${gp.need}`;
  if(!be)$('hbonus').innerHTML=`<span>${t('movesLeft',left)}</span>`;}
 else{$('hlab').textContent=t('score');$('hscore').textContent=s.score}
 $('undo').disabled=!(G&&G.prev&&!G.undone&&!s.over&&!busy);
 if(be){const left=be-s.turn%be;$('bicon').innerHTML=icon(s.nextBonus,'xs');$('btxt').textContent=left===1?t('bonusNow',bname(s.nextBonus)):t('bonusIn',left,bname(s.nextBonus))}
 if(mode==='l'&&lvIdx!==null){
  const lv=LEVELS[lvIdx],gp=BF.goalProgress(s);
  $('lvname').textContent=t('level',lv.id,lvName(lv));$('goaltxt').textContent=goalText(lv.goal);
  $('goalbar').style.width=(gp.need?gp.have*100/gp.need:0)+'%';$('goalnum').textContent=t('of',gp.have,gp.need);
  const left=lv.moves-s.turn;$('movesleft').textContent=t('movesLeft',left);
  $('hintcard').innerHTML=`<div class="lab">${t('hint')}</div><div class="hint">${lvHint(lv)}</div>`;
 }
 if(mode==='e'){$('bestlab').textContent=t('best');$('best').textContent=Math.max(ls.get(bestKey(),0),s.score)}
 if(mode==='d'){$('bestlab').textContent=t('bestToday');$('best').textContent=Math.max(ls.get('burnfive-day-'+dayDate,0),s.score)}
}
const bestKey=()=>size===10?'kubiki-best':'burnfive-best-'+size;
function rules(){
 const c=s.cfg,o=[];
 o.push(t('r1'));o.push(t('r2'));o.push(t('r3',c.min));o.push(t('r4'));
 if(c.tempo.every)o.push(phaseText(1)+'.');
 else o.push(t('rTempo',c.tempo.p1,c.tempo.p2,c.tempo.p3===2?t('p3two'):t('p3third')));
 if(c.crack&&c.crack.rate)o.push(t('rCrack',c.crack.from));
 o.push(t('rSeeds'));
 o.push(t('rUndo')+(mode==='d'?'':t('rHintIdle')));
 if(c.bonusEvery)o.push(t('rBonus',c.bonusEvery));
 if(mode==='l')o.push(t('rMoves',c.moves));
 $('rules').innerHTML=o.map(x=>`<li>${x}</li>`).join('');
 const has=t=>s.T.some(x=>x&&x.startsWith(t));
 const tl=[];
 if(has('P'))tl.push(['t-P',t('tP')]);
 if(has('I'))tl.push(['t-I',t('tI')]);
 if(has('O'))tl.push(['t-O1',t('tO')]);
 const pc=s.T.find(x=>/^[RYGV]$/.test(x));
 if(pc)tl.push(['t-'+pc,t('tPaint')]);
 $('terrainlegend').innerHTML=tl.map(([c,t])=>`<div class="tiles"><span class="tile c ${c}">${terrainInner(c.slice(2))}</span><span>${t}</span></div>`).join('');
 const bt=c.bonusEvery?c.bonusTypes:[];
 [...$('bonuslegend').children].forEach((li,j)=>li.hidden=!bt.includes(['J','T','X'][j])&&!(j===2&&s.b.includes('X')));
 $('pts').innerHTML=Object.entries(c.pts).map(([k,v])=>`<tr><td>${t('inRow',k)}</td><td>${v}</td></tr>`).join('')+`<tr><td>${t('twoLines')}</td><td>×2</td></tr>`;
}

// ---------- режимы ----------
function setMode(m){
 if(G&&s&&!s.over)report('quit');
 mode=m;ls.set('burnfive-mode',m);$('side').classList.remove('picking');$('undo').hidden=false;$('lvpick').hidden=true;
 document.querySelectorAll('.mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));
 document.querySelectorAll('[data-show]').forEach(el=>el.hidden=!el.dataset.show.split(' ').includes(m));
 $('over').classList.remove('on');
 if(m==='e')startEndless();
 else if(m==='d')startDaily();
 else showLevels();
}
function startEndless(){
 document.querySelectorAll('.size button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.n===size)));
 begin(BF.createEndless(size,rseed()));
}
function startDaily(){
 dayDate=today();
 const d=new Date(dayDate+'T12:00:00Z');
 $('daylab').textContent=t('dayFor',d.toLocaleDateString(t('locale'),{day:'numeric',month:'long',timeZone:'UTC'}));
 $('nick').value=ls.get('burnfive-nick','');
 begin(BF.createDaily(dayDate));loadBoard();
}
function showLevels(){
 lvIdx=null;
 const prog=ls.get('burnfive-levels',{});
 const CHECK='<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>',LOCK='<svg class="badge" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
 const cur=LEVELS.findIndex((lv,j)=>!prog[lv.id]&&(j===0||prog[LEVELS[j-1].id]));
 $('lvpick').innerHTML=LEVELS.map((lv,j)=>{const open=j===0||prog[LEVELS[j-1].id];return `<button class="lv${prog[lv.id]?' done':''}${j===cur?' cur':''}" data-j="${j}" ${open?'':'disabled'} aria-label="${t('lvAria',lv.id,lvName(lv),prog[lv.id],open)}"><b>${lv.id}</b><span>${lvName(lv)}</span>${prog[lv.id]?CHECK:open?'':LOCK}</button>`}).join('');
 $('lvpick').hidden=false;$('side').classList.add('picking');$('undo').hidden=true;
 const done=LEVELS.filter(lv=>prog[lv.id]).length;
 $('hlab').textContent=t('completed');$('hscore').textContent=t('of',done,LEVELS.length);$('hnext').innerHTML='';
 $('hbonus').innerHTML=`<span class="bar" style="width:110px"><i style="width:${done*100/LEVELS.length}%"></i></span>`;
 const nx=LEVELS[cur>=0?cur:LEVELS.length-1];
 $('hintcard').hidden=false;$('hintcard').innerHTML=`<div class="lab">${cur>=0?t('nextLevel'):t('allDone')}</div><div class="goal">${nx.id}. ${lvName(nx)}</div><div class="hint">${lvHint(nx)}</div>`;
 s=BF.createLevel({terrain:Array(8).fill('........'),moves:1,goal:{type:'lines',count:1}},1);build();drawCells(view);
 $('goalcard').hidden=true;$('relevel').hidden=true;$('tolevels').hidden=true;
}
function startLevel(j){
 lvIdx=j;$('lvpick').hidden=true;$('side').classList.remove('picking');$('undo').hidden=false;
 ['goalcard','hintcard','relevel','tolevels'].forEach(id=>$(id).hidden=false);
 begin(BF.createLevel(LEVELS[j],rseed()));
}
function begin(state){
 s=state;sel=null;busy=false;
 G={gid:Date.now().toString(36)+Math.random().toString(36).slice(2,6),t0:Date.now(),sent:'',prev:null,undone:false};clearHint();
 $('over').classList.remove('on');
 build();drawCells({b:s.b.slice(),k:s.k.slice()},new Set(s.b.map((c,i)=>c?i:-1).filter(i=>i>=0)),'pop');
 panel();rules();armHint();
}

// ---------- ход и анимация ----------
const wait=ms=>new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?0:ms));
const COLORS=['r','y','g','b'];
function floatText(list,txt,small){
 const n=s.n;let x=0,y=0;list.forEach(i=>{x+=i%n+.5;y+=Math.floor(i/n)+.5});x/=list.length;y/=list.length;
 const f=document.createElement('div');f.className='float'+(small?' s':'');f.textContent=txt;f.style.left=Math.min(88,Math.max(12,x*100/n))+'%';f.style.top=y*100/n+'%';
 boardEl.parentNode.appendChild(f);setTimeout(()=>f.remove(),1050);
}
async function doMove(from,d){
 if(busy||s.over||!BF.canMove(s,from,d))return;
 busy=true;clearHint();
 G.prev=G.undone?null:BF.clone(s);
 const ev=BF.move(s,from,d);
 for(const e of ev){
  if(e.type==='move'){hap('light');sel=e.player;drawCells(e.snap,new Set(e.painted),'flash');if(e.slid||e.portal)await wait(120);else await wait(60)}
  else if(e.type==='burn'||e.type==='boom'){hap(e.mult>1?'success':'medium');
   e.cells.forEach(i=>{const k=cells[i].querySelector('.k');if(!k)return;k.classList.add('burn');const col=k.dataset.c;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(let q=0;q<4;q++){const sd=document.createElement('i');sd.className='sand '+(COLORS.includes(col)?col:'y');sd.style.left=(10+Math.random()*60)+'%';sd.style.top=(10+Math.random()*50)+'%';sd.style.setProperty('--sx',((Math.random()-.5)*160)+'%');sd.style.setProperty('--sy',(-40-Math.random()*120)+'%');cells[i].appendChild(sd);setTimeout(()=>sd.remove(),500)}});
   floatText(e.cells,e.type==='boom'?t('boom'):'+'+e.pts+(e.mult>1?' ×2':''),e.type==='boom');
   await wait(270);if(sel!==null&&!e.snap.b[sel])sel=null;drawCells(e.snap);
  }
  else if(e.type==='stone'){drawCells(e.snap,new Set(e.cells),'petrify');await wait(160)}
  else if(e.type==='spawn'){drawCells(e.snap,new Set(e.cells),'pop');if(e.bonus)floatText(e.cells,t('bonusFloat')[e.bonus],true);await wait(230)}
 }
 if(sel!==null&&!s.b[sel])sel=null;
 busy=false;
 drawCells({b:s.b.slice(),k:s.k.slice()});panel();
 if(s.over)finish();else armHint();
}
function finish(){
 sel=null;drawCells({b:s.b.slice(),k:s.k.slice()});
 const why=t('why')[s.reason];
 $('over2').hidden=true;$('overmark').hidden=true;
 if(mode==='l'){
  const lv=LEVELS[lvIdx];
  if(s.won){
   const prog=ls.get('burnfive-levels',{});const left=lv.moves-s.turn;prog[lv.id]=Math.max(prog[lv.id]||0,left+1);ls.set('burnfive-levels',prog);
   $('overmark').innerHTML=kHTML('b');$('overmark').hidden=false;
   $('overh').textContent=t('lvDone');$('overtxt').textContent=t('lvDoneTxt',left,s.score);
   const last=lvIdx===LEVELS.length-1;
   $('over1').textContent=last?t('allLevels'):t('nextBtn');$('over1').onclick=()=>last?showLevelsFromOver():startLevel(lvIdx+1);
   $('over2').hidden=false;$('over2').textContent=t('again');$('over2').onclick=()=>startLevel(lvIdx);
  }else{
   $('overh').textContent=why;$('overtxt').textContent=t('lvLoseTxt',goalText(lv.goal),BF.goalProgress(s).have,BF.goalProgress(s).need);
   $('over1').textContent=t('again');$('over1').onclick=()=>startLevel(lvIdx);
   $('over2').hidden=false;$('over2').textContent=t('allLevels');$('over2').onclick=showLevelsFromOver;
  }
 }else if(mode==='d'){
  const k='burnfive-day-'+dayDate,best=Math.max(ls.get(k,0),s.score);ls.set(k,best);
  ls.set('burnfive-day-tries-'+dayDate,ls.get('burnfive-day-tries-'+dayDate,0)+1);
  $('overh').textContent=why;$('overtxt').textContent=t('dayTxt',s.score,s.turn,best);
  $('over1').textContent=t('playAgain');$('over1').onclick=startDaily;
  submitDay();
 }else{
  const best=Math.max(ls.get(bestKey(),0),s.score);ls.set(bestKey(),best);
  $('overh').textContent=why;$('overtxt').textContent=t('endTxt',s.score,s.turn,s.lines,best);
  $('over1').textContent=t('playAgain');$('over1').onclick=startEndless;
 }
 $('over').classList.add('on');
 hap(s.won?'success':'warning');
 report('over');
 panel();
}
function showLevelsFromOver(){$('over').classList.remove('on');showLevels()}

// ---------- статистика и задача дня ----------
function report(r){
 if(!G||!s||G.sent==='over'||s.turn===0)return;
 G.sent=r;const st=s.st;
 const d={gid:G.gid,sid:SID,v:4,r,tu:s.turn,sc:s.score,ln:s.lines,l:st.L,dbl:st.dbl,sp:st.sp,J:st.J,Jb:st.Jb,T:st.T,X:st.X,Xb:st.Xb,Xk:st.Xk,
  push:st.push,cr:st.cr,stone:st.stone,fill:s.b.filter(Boolean).length,dur:Math.round((Date.now()-G.t0)/1000),dev:TOUCH?'t':'m',p:NATIVE?'ios':'web',w:innerWidth,un:G.undone?1:0,
  best:mode==='e'?ls.get(bestKey(),0):0,n:s.n,m:mode,lv:mode==='l'&&lvIdx!==null?LEVELS[lvIdx].id:0,won:s.won?1:0,day:mode==='d'?dayDate:''};
 try{const body=JSON.stringify(d);if(NATIVE||!(navigator.sendBeacon&&navigator.sendBeacon('/api/game',new Blob([body],{type:'application/json'}))))fetch(API+'/api/game',{method:'POST',body,keepalive:true,headers:{'content-type':'application/json'}}).catch(()=>{})}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&s&&!s.over)report('hidden')});
const nickVal=()=>($('nick').value.trim()||t('player')+' '+SID.slice(-3).toUpperCase()).slice(0,16);
$('nick').addEventListener('change',()=>ls.set('burnfive-nick',$('nick').value.trim()));
function drawBoard(list){
 lbCache=list;
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 $('lb').innerHTML=list&&list.length?list.map(x=>`<li class="${x.me?'me':''}"><span>${esc(x.nick)}</span><span>${x.sc}</span></li>`).join(''):`<li class="none"><span>${t('nobody')}</span><span></span></li>`;
}
async function loadBoard(){
 try{const r=await fetch(API+'/api/daily?date='+dayDate+'&sid='+SID);if(r.ok)drawBoard((await r.json()).top)}catch(e){}
}
async function submitDay(){
 try{const r=await fetch(API+'/api/daily',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:dayDate,gid:G.gid,sid:SID,nick:nickVal(),sc:s.score,tu:s.turn})});
  if(r.ok){const j=await r.json();drawBoard(j.top);if(j.rank)$('overtxt').textContent+=t('rank',j.rank,j.total)}}catch(e){}
}

// ---------- подсказка, отмена, предпросмотр ----------
const DV=[[0,-1],[0,1],[-1,0],[1,0]];
let hintT=null;
function clearHint(){clearTimeout(hintT);hintT=null;cells.forEach(c=>{const k=c.querySelector('.k.wig');if(k)k.classList.remove('wig')})}
function armHint(){
 clearHint();
 if(mode==='d'||!s||s.over)return;
 hintT=setTimeout(()=>{
  if(busy||!s||s.over||!$('lvpick').hidden||$('over').classList.contains('on'))return;
  const m=BF.bestMove(s,0);if(!m)return;
  const k=cells[m[0]].querySelector('.k');if(!k)return;
  k.style.setProperty('--nx',DV[m[1]][0]*14+'%');k.style.setProperty('--ny',DV[m[1]][1]*14+'%');
  k.classList.remove('wig');void k.offsetWidth;k.classList.add('wig');
  setTimeout(armHint,1500);
 },6000);
}
function undo(){
 if(busy||!G||!G.prev||G.undone||s.over)return;
 s=G.prev;G.prev=null;G.undone=true;sel=null;
 drawCells({b:s.b.slice(),k:s.k.slice()});panel();armHint();
}
let nudged=[];
function clearNudge(){nudged.forEach(k=>k.classList.remove('nudge'));nudged=[]}
function preview(i,dx,dy){
 clearNudge();
 if(busy||!s||s.over||!s.b[i]||Math.hypot(dx,dy)<14)return;
 const d=Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy>0?1:0);
 const p=BF.plan(s,i,d);if(!p)return;
 for(const j of p.chain){const k=cells[j].querySelector('.k');if(!k)continue;k.style.setProperty('--nx',DV[d][0]*18+'%');k.style.setProperty('--ny',DV[d][1]*18+'%');k.classList.add('nudge');nudged.push(k)}
}
['pointerdown','touchstart','keydown'].forEach(t=>document.addEventListener(t,()=>{if(s&&!busy)armHint()},{passive:true}));

// ---------- управление ----------
function dirTo(a,b){const n=s.n;if(b===a-n)return 0;if(b===a+n)return 1;if(b===a-1&&a%n)return 2;if(b===a+1&&b%n)return 3;return -1}
function gesture(i,dx,dy){
 if(busy||!s||s.over||!$('lvpick').hidden)return;
 if(Math.hypot(dx,dy)>14&&s.b[i]&&s.b[i]!=='S'){
  const d=Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy>0?1:0);
  if(BF.canMove(s,i,d)){doMove(i,d);return}
  sel=i;drawCells(view);return;
 }
 if(sel!==null&&i!==sel){const d=dirTo(sel,i);if(d>=0&&BF.canMove(s,sel,d)){doMove(sel,d);return}}
 if(s.b[i]&&s.b[i]!=='S'){sel=sel===i?null:i;drawCells(view)}
 else{sel=null;drawCells(view)}
}
const cellAt=(x,y)=>{const el=document.elementFromPoint(x,y);const c=el&&el.closest('.c');return c&&boardEl.contains(c)?+c.dataset.i:null};
let ts=null;
boardEl.addEventListener('touchstart',e=>{const t=e.changedTouches[0];const i=cellAt(t.clientX,t.clientY);if(i===null)return;e.preventDefault();ts={i,x:t.clientX,y:t.clientY,id:t.identifier}},{passive:false});
boardEl.addEventListener('touchmove',e=>{if(!ts)return;e.preventDefault();const t=[...e.changedTouches].find(x=>x.identifier===ts.id);if(t)preview(ts.i,t.clientX-ts.x,t.clientY-ts.y)},{passive:false});
boardEl.addEventListener('touchend',e=>{if(!ts)return;const t=[...e.changedTouches].find(x=>x.identifier===ts.id);if(!t)return;e.preventDefault();const st=ts;ts=null;clearNudge();gesture(st.i,t.clientX-st.x,t.clientY-st.y)},{passive:false});
boardEl.addEventListener('touchcancel',()=>{ts=null;clearNudge()});
let ps=null;
boardEl.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;const i=cellAt(e.clientX,e.clientY);if(i===null)return;ps={i,x:e.clientX,y:e.clientY};try{boardEl.setPointerCapture(e.pointerId)}catch(_){}});
boardEl.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!ps)return;preview(ps.i,e.clientX-ps.x,e.clientY-ps.y)});
boardEl.addEventListener('pointerup',e=>{if(e.pointerType==='touch'||!ps)return;const st=ps;ps=null;clearNudge();gesture(st.i,e.clientX-st.x,e.clientY-st.y)});
boardEl.addEventListener('keydown',e=>{
 const c=e.target.closest('.c');if(!c||!s)return;const i=+c.dataset.i,n=s.n;
 if(e.key==='Escape'){sel=null;drawCells(view);return}
 if(e.key==='Enter'||e.key===' '){e.preventDefault();gesture(i,0,0);return}
 const d={ArrowUp:0,ArrowDown:1,ArrowLeft:2,ArrowRight:3}[e.key];if(d===undefined)return;e.preventDefault();
 const from=sel!==null?sel:(s.b[i]&&s.b[i]!=='S'?i:null);
 if(from!==null&&BF.canMove(s,from,d)){doMove(from,d).then(()=>{if(sel!==null)cells[sel].focus()});return}
 const j=BF.step(s,i,d);if(j>=0)cells[j].focus();
});
$('undo').addEventListener('click',undo);
$('lvpick').addEventListener('click',e=>{const b=e.target.closest('.lv');if(b&&!b.disabled)startLevel(+b.dataset.j)});
document.querySelectorAll('.mode button').forEach(b=>b.addEventListener('click',()=>{if(!busy)setMode(b.dataset.m)}));
document.querySelectorAll('.size button').forEach(b=>b.addEventListener('click',()=>{
 const n=+b.dataset.n;if(n===size||busy)return;if(G&&s&&!s.over)report('quit');size=n;ls.set('burnfive-size',n);startEndless()}));
$('new').addEventListener('click',()=>{if(busy)return;if(s&&!s.over)report('quit');startEndless()});
$('reday').addEventListener('click',()=>{if(busy)return;if(s&&!s.over)report('quit');startDaily()});
$('relevel').addEventListener('click',()=>{if(busy||lvIdx===null)return;if(!s.over)report('quit');startLevel(lvIdx)});
$('tolevels').addEventListener('click',()=>{if(busy)return;if(s&&!s.over)report('quit');$('over').classList.remove('on');showLevels()});
function lvName(lv){return lang==='ru'?lv.name:(lv.name_en||lv.name)}
function lvHint(lv){return lang==='ru'?lv.hint:(lv.hint_en||lv.hint)}
let lbCache=null;
function applyLang(){
 I.setLang(lang);document.documentElement.lang=lang;
 document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
 document.querySelectorAll('[data-th]').forEach(el=>el.innerHTML=t(el.dataset.th));
 document.querySelectorAll('[data-ta]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.ta)));
 document.querySelectorAll('[data-tt]').forEach(el=>el.setAttribute('title',t(el.dataset.tt)));
 document.querySelectorAll('[data-tp]').forEach(el=>el.setAttribute('placeholder',t(el.dataset.tp)));
 document.querySelectorAll('.lang button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.l===lang)));
 drawBoard(lbCache);
}
function switchLang(l){
 if(l===lang||busy)return;lang=l;ls.set('burnfive-lang',l);applyLang();
 if(!s)return;
 if(mode==='l'&&lvIdx===null){showLevels();return}
 if(mode==='d')$('daylab').textContent=t('dayFor',new Date(dayDate+'T12:00:00Z').toLocaleDateString(t('locale'),{day:'numeric',month:'long',timeZone:'UTC'}));
 boardEl.setAttribute('aria-label',t('board',s.n));
 panel();rules();drawCells(view);
}
document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>switchLang(b.dataset.l)));
applyLang();
document.querySelectorAll('#bonuslegend .k').forEach(k=>{const c=['J','X','r','y','g','b'].find(x=>k.classList.contains(x));if(c)k.innerHTML=kInner(c,0)});
window.BFUI={get s(){return s},doMove,setMode,startLevel,undo};
setMode(mode);
}
