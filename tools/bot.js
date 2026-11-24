// Жадный бот для проверки баланса: оценивает каждый ход по сгоранию и заготовкам линий.
const BF=require('../src/engine.js');
function evalBoard(s){
 const n=s.n,L=s.cfg.min,W=[0,1,6,40,0,0,0,0,0,0,0];let v=0;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)for(const [dr,dc] of [[0,1],[1,0]]){
  if(r+dr*(L-1)>=n||c+dc*(L-1)>=n)continue;
  let col=null,cnt=0,bad=false;
  for(let x=0;x<L;x++){const i=(r+dr*x)*n+c+dc*x,b=s.b[i];
   if(s.T[i]==='P'||b==='S'||b==='X'){bad=true;break}
   if(!b)continue;if(b==='J'){cnt++;continue}
   if(col&&b!==col){bad=true;break}col=b;cnt++}
  if(!bad)v+=W[cnt];
 }
 // штраф за треснутые кубики и камни
 for(let i=0;i<s.b.length;i++){if(s.b[i]==='S')v-=8;if(s.k[i]>0)v-=4-s.k[i]*0.2}
 return v;
}
function choose(s){
 const ms=BF.legalMoves(s);let best=null,bv=-1e9;
 for(const [f,d] of ms){
  const c=BF.clone(s);c.cfg=Object.assign({},s.cfg,{bonusEvery:0});
  // ход без новых кубиков: временно глушим темп
  c.cfg.tempo={every:1e9,count:0};c.cfg.moves=0;c.cfg.goal=null;
  const ev=BF.move(c,f,d);
  let v=evalBoard(c)+ (c.score-s.score)*50;
  const g=s.cfg.goal;
  if(g){
   if(g.type==='lines'&&g.color)v+= (c.st.col[g.color]-s.st.col[g.color])*400;
   if(g.type==='double')v+=(c.st.dbl-s.st.dbl)*600;
   if(g.type==='stones'){const before=s.b.filter(x=>x==='S').length,after=c.b.filter(x=>x==='S').length;v+=(before-after)**2*150;if(c.st.Xb>s.st.Xb&&before===after)v-=500;
     // тянуть уничтожитель к камням
     const xi=c.b.indexOf('X');if(xi>=0){let dmin=99;c.b.forEach((x,i)=>{if(x==='S'){const dd=Math.abs(i%c.n-xi%c.n)+Math.abs(Math.floor(i/c.n)-Math.floor(xi/c.n));dmin=Math.min(dmin,dd)}});v-=dmin*6}}
  }
  // уничтожитель без пользы не трогаем
  if(s.b[f]==='X'&&!(g&&g.type==='stones')&&c.score===s.score)v-=30;
  v+=Math.random()*0.5;
  if(v>bv){bv=v;best=[f,d]}
 }
 return best;
}
function play(s,cap=3000){while(!s.over&&s.turn<cap){const m=choose(s);if(!m)break;BF.move(s,m[0],m[1])}return s}
module.exports={play,choose,evalBoard};
