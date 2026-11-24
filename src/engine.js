/* Burn Five: игровой движок. Чистая логика без DOM, детерминированная при заданном seed.
   Работает и в браузере (глобальный BF), и в node (module.exports). */
(function(root){
'use strict';
const COLS=['r','y','g','b'];
const DIRS=[[-1,0],[1,0],[0,-1],[0,1]]; // вверх, вниз, влево, вправо
const PAINT={R:'r',Y:'y',G:'g',V:'b'};

// --- случайность с сохраняемым состоянием (mulberry32) ---
function rng(seed){return {s:seed>>>0}}
function rnext(g){g.s=(g.s+0x6D2B79F5)>>>0;let t=g.s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
function rint(g,n){return Math.floor(rnext(g)*n)}
function hashStr(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}

// --- конфигурации ---
const ENDLESS={
 8:{n:8,min:4,pts:{4:10,5:20,6:50,7:100,8:200},start:20,tempo:{p1:64,p2:160,p3:2},bonusEvery:13,bonusTypes:['J','T','X'],crack:{from:65,rate:1/10,life:14}},
 10:{n:10,min:5,pts:{5:10,6:20,7:50,8:100,9:200,10:500},start:30,tempo:{p1:100,p2:250,p3:1},bonusEvery:20,bonusTypes:['J','T','X'],crack:{from:151,rate:1/12,life:18}}
};
const REPEAT=0.08; // доля повторов цвета подряд

function spawnCount(cfg,t){
 const tp=cfg.tempo;
 if(tp.every) return t%tp.every===0?tp.count:0;
 if(t<=tp.p1) return t%2===0?1:0;
 if(t<=tp.p2) return 1;
 return tp.p3===2?2:(t%3===0?2:1);
}

// --- создание партии ---
// opts: cfg (как ENDLESS[n] плюс поля уровня), seed, terrain (массив), pieces (массив), cracks (массив)
function create(cfg,seed,layout){
 const n=cfg.n, N2=n*n;
 const s={cfg,n,turn:0,score:0,lines:0,over:false,won:false,reason:'',
  T:Array(N2).fill(''),b:Array(N2).fill(null),k:Array(N2).fill(0),
  gC:rng(seed^0xA5A5A5),gP:rng(seed^0x5A5A5A),gB:rng(seed^0x3C3C3C),gX:rng(seed^0xC3C3C3),
  queue:[],nextBonus:null,
  st:{L:Array(7).fill(0),dbl:0,sp:0,J:0,Jb:0,T:0,X:0,Xb:0,Xk:0,cr:0,stone:0,push:0,pushed:0,ice:0,portal:0,paint:0,col:{r:0,y:0,g:0,b:0}}};
 if(layout&&layout.T) s.T=layout.T.slice();
 if(layout&&layout.b){s.b=layout.b.slice();s.k=(layout.k||Array(N2).fill(0)).slice()}
 for(let j=0;j<3;j++) s.queue.push(nextColor(s));
 if(cfg.bonusEvery) s.nextBonus=pickBonus(s);
 // случайные стартовые кубики (без готовых линий)
 const extra=cfg.start||0;
 if(extra){
  const base=s.b.slice();
  for(let tries=0;tries<200;tries++){
   s.b=base.slice();
   const free=spawnable(s);
   for(let j=0;j<extra&&free.length;j++){const p=free.splice(rint(s.gP,free.length),1)[0];s.b[p]=COLS[rint(s.gC,4)]}
   if(!collect(s,s.b.map((_,i)=>i)).n) break;
  }
 }
 return s;
}
function nextColor(s){
 const last=s.queue.length?s.queue[s.queue.length-1]:null;
 if(last&&rnext(s.gC)<REPEAT) return last;
 let c;do{c=COLS[rint(s.gC,4)]}while(c===last);return c;
}
function pickBonus(s){const t=s.cfg.bonusTypes;return t[rint(s.gB,t.length)]}

// --- геометрия ---
function step(s,i,d){const r=Math.floor(i/s.n)+DIRS[d][0],c=i%s.n+DIRS[d][1];return r>=0&&r<s.n&&c>=0&&c<s.n?r*s.n+c:-1}
function around(s,i){const n=s.n,r=Math.floor(i/n),c=i%n,o=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=c+dc;if(rr>=0&&rr<n&&cc>=0&&cc<n)o.push(rr*n+cc)}return o}
const isPillar=(s,i)=>s.T[i]==='P';
const movable=v=>!!v&&v!=='S';
const isColor=v=>COLS.includes(v);
function free(s){const o=[];for(let i=0;i<s.b.length;i++)if(!s.b[i]&&!isPillar(s,i))o.push(i);return o}
function spawnable(s){const f=free(s),plain=f.filter(i=>!s.T[i]);return plain.length?plain:f}
function portalPair(s,i){const t=s.T[i];if(!t||t[0]!=='O')return -1;for(let j=0;j<s.T.length;j++)if(j!==i&&s.T[j]===t)return j;return -1}

// --- линии ---
function runsAt(s,i){
 const v=s.b[i];if(!v||v==='X'||v==='S')return [];
 const n=s.n,r=Math.floor(i/n),q=i%n,out=[];
 for(const [dr,dc] of [[0,1],[1,0]]){
  let best=null;
  for(const c of (v==='J'?COLS:[v])){
   const run=[i];let real=v!=='J';
   for(const sg of [1,-1]){let rr=r+dr*sg,cc=q+dc*sg;while(rr>=0&&rr<n&&cc>=0&&cc<n&&(s.b[rr*n+cc]===c||s.b[rr*n+cc]==='J')){if(s.b[rr*n+cc]===c)real=true;run.push(rr*n+cc);rr+=dr*sg;cc+=dc*sg}}
   if(real&&run.length>=s.cfg.min&&(!best||run.length>best.run.length))best={run,c};
  }
  if(best)out.push({run:best.run.sort((a,z)=>a-z),c:best.c});
 }
 return out;
}
function collect(s,idxs){
 const seen=new Set(),kill=new Set(),lens=[],cols=[];let pts=0,n=0;
 const maxK=Math.max(...Object.keys(s.cfg.pts).map(Number));
 for(const i of idxs)for(const {run,c} of runsAt(s,i)){
  const key=run.join(',');if(seen.has(key))continue;seen.add(key);
  pts+=s.cfg.pts[Math.min(run.length,maxK)];n++;lens.push(run.length);cols.push(c);run.forEach(x=>kill.add(x));
 }
 return {kill,pts,n,lens,cols};
}

// --- ходы ---
// Возвращает план хода или null: цепочка сдвигаемых клеток (от игрока к краю) и клетка назначения хвоста
function plan(s,from,d){
 if(s.over||!movable(s.b[from]))return null;
 const chain=[from];let j=step(s,from,d);
 while(true){
  if(j<0||isPillar(s,j))return null;
  if(!s.b[j])break;
  if(!movable(s.b[j]))return null;
  chain.push(j);j=step(s,j,d);
 }
 return {chain,end:j};
}
function canMove(s,from,d){return !!plan(s,from,d)}
function legalMoves(s){const o=[];for(let i=0;i<s.b.length;i++)if(movable(s.b[i]))for(let d=0;d<4;d++)if(plan(s,i,d))o.push([i,d]);return o}
const snap=s=>({b:s.b.slice(),k:s.k.slice()});

// Сделать ход. Возвращает список событий для анимации: {type, cells, snap, ...}
function move(s,from,d,opt){
 opt=opt||{};
 const p=plan(s,from,d);if(!p)return null;
 const ev=[];const st=s.st;
 s.turn++;
 // сдвиг цепочки с хвоста
 const moved=[];
 for(let x=p.chain.length-1;x>=0;x--){
  const a=p.chain[x],to=step(s,a,d);
  s.b[to]=s.b[a];s.k[to]=s.k[a];s.b[a]=null;s.k[a]=0;moved.push(to);
 }
 if(p.chain.length>1){st.push++;st.pushed+=p.chain.length-1}
 // эффекты клетки для переднего кубика (при толчке) или для самого кубика
 let front=moved[0];
 let player=step(s,from,d);
 let slid=false;
 while(s.T[front]==='I'){const nx=step(s,front,d);if(nx<0||isPillar(s,nx)||s.b[nx])break;s.b[nx]=s.b[front];s.k[nx]=s.k[front];s.b[front]=null;s.k[front]=0;if(player===front)player=nx;front=nx;slid=true}
 if(slid){st.ice++;moved[0]=front}
 const pp=portalPair(s,front);let tele=false;
 if(pp>=0&&!s.b[pp]){tele=true;s.b[pp]=s.b[front];s.k[pp]=s.k[front];s.b[front]=null;s.k[front]=0;if(player===front)player=pp;front=pp;moved[0]=front;st.portal++}
 const painted=[];
 for(const m of moved){const t=s.T[m];if(t&&PAINT[t[0]]&&t.length===1&&isColor(s.b[m])&&s.b[m]!==PAINT[t]){s.b[m]=PAINT[t];painted.push(m);st.paint++}}
 ev.push({type:'move',cells:moved,player,slid,portal:tele,painted,snap:snap(s)});
 // уничтожитель или линии
 let cleared=false;
 if(s.b[player]==='X'){
  const hit=around(s,player).filter(j=>s.b[j]);
  if(hit.length){
   st.Xb++;st.Xk+=hit.length;
   const kill=new Set([...hit,player]);
   for(const j of kill){if(s.b[j]==='S')st.stoneKilled=(st.stoneKilled||0)+1;s.b[j]=null;s.k[j]=0}
   cleared=true;ev.push({type:'boom',cells:[...kill],snap:snap(s)});
  }
 }else{
  const res=collect(s,moved);
  if(res.n){burn(s,res,ev,false);cleared=true}
 }
 // трещины: тикают каждый ход
 const stoned=[];
 for(let i=0;i<s.k.length;i++)if(s.k[i]>0&&s.b[i]){s.k[i]--;if(s.k[i]===0){s.b[i]='S';stoned.push(i);st.stone++}}
 if(stoned.length)ev.push({type:'stone',cells:stoned,snap:snap(s)});
 // новые кубики
 const placed=[];
 if(!cleared){
  for(let j=0,c=spawnCount(s.cfg,s.turn);j<c;j++){
   const f=spawnable(s);if(!f.length)break;
   const at=f[rint(s.gP,f.length)];s.b[at]=s.queue.shift();s.queue.push(nextColor(s));
   const cr=s.cfg.crack;
   if(cr&&cr.rate&&s.turn>=(cr.from||0)&&rnext(s.gX)<cr.rate){s.k[at]=cr.life;st.cr++}
   placed.push(at);
  }
 }
 let bonusType=null;
 if(s.cfg.bonusEvery&&s.turn%s.cfg.bonusEvery===0){
  bonusType=s.nextBonus;const bp=placeBonus(s,bonusType);placed.push(...bp);s.nextBonus=pickBonus(s);
 }
 if(placed.length){
  ev.push({type:'spawn',cells:placed,bonus:bonusType,snap:snap(s)});
  const r2=collect(s,placed);if(r2.n){st.sp+=r2.n;burn(s,r2,ev,true)}
 }
 if(!s.b.some(Boolean)){const f=spawnable(s);if(f.length){const at=f[rint(s.gP,f.length)];s.b[at]=s.queue.shift();s.queue.push(nextColor(s));ev.push({type:'spawn',cells:[at],snap:snap(s)})}}
 checkEnd(s);
 if(s.over)ev.push({type:'end',won:s.won,reason:s.reason,snap:snap(s)});
 return ev;
}
function burn(s,res,ev,fromSpawn){
 const mult=res.n>=2?2:1,got=res.pts*mult,st=s.st;
 if(mult>1)st.dbl++;
 res.lens.forEach(n=>st.L[Math.min(n,10)-4]++);
 res.cols.forEach(c=>st.col[c]++);
 for(const i of res.kill){if(s.b[i]==='J')st.Jb++;s.b[i]=null;s.k[i]=0}
 s.score+=got;s.lines+=res.n;
 ev.push({type:'burn',cells:[...res.kill],pts:got,mult,n:res.n,fromSpawn,snap:snap(s)});
}
function placeBonus(s,t){
 if(t==='T'){
  const slots=[],n=s.n,ok=i=>!s.b[i]&&!s.T[i];
  for(let i=0;i<n*n;i++){const r=Math.floor(i/n),q=i%n;
   if(q<=n-3&&ok(i)&&ok(i+1)&&ok(i+2))slots.push([i,i+1,i+2]);
   if(r<=n-3&&ok(i)&&ok(i+n)&&ok(i+2*n))slots.push([i,i+n,i+2*n]);}
  if(slots.length){const sl=slots[rint(s.gB,slots.length)],c=COLS[rint(s.gB,4)];sl.forEach(i=>s.b[i]=c);s.st.T++;return sl}
  t='J';
 }
 const f=spawnable(s);if(!f.length)return [];
 const at=f[rint(s.gB,f.length)];s.b[at]=t;s.st[t]++;return [at];
}

// --- цели уровней ---
function goalProgress(s){
 const g=s.cfg.goal;if(!g)return null;
 let have=0,need=g.count||0;
 if(g.type==='lines')have=g.color?s.st.col[g.color]:s.lines;
 else if(g.type==='score')have=s.score;
 else if(g.type==='double')have=s.st.dbl;
 else if(g.type==='stones'){need=s.cfg.stonesTotal||0;have=need-s.b.filter(v=>v==='S').length}
 return {have:Math.min(have,need),need,done:have>=need};
}
function checkEnd(s){
 const gp=goalProgress(s);
 if(gp&&gp.done){s.over=true;s.won=true;s.reason='goal';return}
 if(s.cfg.moves&&s.turn>=s.cfg.moves){s.over=true;s.reason='moves';return}
 if(!free(s).length){s.over=true;s.reason='full';return}
 if(!legalMoves(s).length){s.over=true;s.reason='stuck'}
}

// --- разбор карты уровня ---
// terrain: строки из . P I R Y G V 1 2 (цифры: пары порталов); pieces: . r y g b S X J и ! (треснутый кубик случайного цвета)
function parseLevel(lv,seed){
 const n=lv.terrain.length,T=Array(n*n).fill(''),b=Array(n*n).fill(null),k=Array(n*n).fill(0);
 const g=rng(seed^0x77);
 lv.terrain.forEach((row,r)=>[...row].forEach((ch,c)=>{const i=r*n+c;
  if(ch==='P'||ch==='I')T[i]=ch;else if('RYGV'.includes(ch))T[i]=ch;else if(/[1-9]/.test(ch))T[i]='O'+ch;}));
 (lv.pieces||[]).forEach((row,r)=>[...row].forEach((ch,c)=>{const i=r*n+c;
  if('rygbSXJ'.includes(ch))b[i]=ch;else if(ch==='!'){b[i]=COLS[rint(g,4)];k[i]=lv.crack?lv.crack.life:8}}));
 return {T,b,k,stones:b.filter(v=>v==='S').length};
}
function levelCfg(lv){
 return {n:lv.terrain.length,min:4,pts:{4:10,5:20,6:50,7:100,8:200},start:lv.start||0,tempo:lv.tempo||{every:2,count:1},
  bonusEvery:lv.bonusEvery||0,bonusTypes:lv.bonusTypes||['J','T','X'],crack:lv.crack||null,moves:lv.moves,goal:lv.goal};
}
function createLevel(lv,seed){
 const L=parseLevel(lv,seed);const cfg=levelCfg(lv);cfg.stonesTotal=L.stones;
 return create(cfg,seed,L);
}

// --- задача дня: ландшафт из даты ---
function dailyLayout(n,seed){
 const g=rng(seed^0x1234),T=Array(n*n).fill('');
 const take=(cond)=>{for(let t=0;t<500;t++){const i=rint(g,n*n);if(!T[i]&&cond(i))return i}return -1};
 const inner=i=>{const r=Math.floor(i/n),c=i%n;return r>0&&r<n-1&&c>0&&c<n-1};
 for(let j=0;j<3;j++){const i=take(inner);if(i>=0)T[i]='P'}
 // ледяная полоса из 3 клеток
 for(let t=0;t<100;t++){const vert=rnext(g)<.5,r=rint(g,vert?n-2:n),c=rint(g,vert?n:n-2),cells=[0,1,2].map(x=>vert?(r+x)*n+c:r*n+c+x);if(cells.every(i=>!T[i])){cells.forEach(i=>T[i]='I');break}}
 const a=take(()=>true),bb=take(i=>Math.abs(i%n-a%n)+Math.abs(Math.floor(i/n)-Math.floor(a/n))>=n/2);
 if(a>=0&&bb>=0){T[a]='O1';T[bb]='O1'}
 const pnt=take(()=>true);if(pnt>=0)T[pnt]='RYGV'[rint(g,4)];
 return {T};
}
function createDaily(date){
 const seed=hashStr('burnfive-daily-'+date);
 const cfg=Object.assign({},ENDLESS[8]);
 return create(cfg,seed,dailyLayout(8,seed));
}
function createEndless(n,seed){return create(Object.assign({},ENDLESS[n]),seed,null)}

function clone(s){const c=Object.assign({},s);c.T=s.T;c.b=s.b.slice();c.k=s.k.slice();c.queue=s.queue.slice();
 c.gC={s:s.gC.s};c.gP={s:s.gP.s};c.gB={s:s.gB.s};c.gX={s:s.gX.s};c.st=JSON.parse(JSON.stringify(s.st));return c}

const BF={COLS,DIRS,ENDLESS,rng,rnext,hashStr,create,createEndless,createLevel,createDaily,move,canMove,plan,legalMoves,step,collect,runsAt,spawnCount,goalProgress,clone,free,portalPair,PAINT};
if(typeof module!=='undefined'&&module.exports)module.exports=BF;else root.BF=BF;
})(typeof globalThis!=='undefined'?globalThis:this);
