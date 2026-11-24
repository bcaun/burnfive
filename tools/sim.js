const BF=require('../src/engine.js'),{play}=require('./bot.js');
const q=(a,p)=>a[Math.floor(p*(a.length-1))];
function report(name,games){
 const t=games.map(g=>g.turn).sort((a,b)=>a-b),sc=games.map(g=>g.score).sort((a,b)=>a-b);
 const sum=k=>games.reduce((a,g)=>a+g.st[k],0);
 console.log(`${name}: ходов ${q(t,.1)}/${q(t,.5)}/${q(t,.9)} очки мед ${q(sc,.5)} | толчков ${(sum('push')/sum0(games)).toFixed(2)} на ход | треснуло ${sum('cr')} окаменело ${sum('stone')}`);
}
const sum0=gs=>gs.reduce((a,g)=>a+g.turn,0);
const mode=process.argv[2],N=+process.argv[3]||60;
if(mode==='endless8'||mode==='endless10'){const n=mode==='endless8'?8:10;const gs=[];for(let i=0;i<N;i++)gs.push(play(BF.createEndless(n,1000+i)));report(mode,gs)}
if(mode==='daily'){const gs=[];for(let i=0;i<N;i++){const s=BF.createDaily('2026-11-'+String(1+i%28).padStart(2,'0'));s.gP={s:s.gP.s^i};gs.push(play(s))}report(mode,gs)}
if(mode==='nopush8'){
 // контроль: те же правила без толчков и трещин
 const orig=BF.plan;BF.plan=(s,f,d)=>{const p=orig(s,f,d);return p&&p.chain.length===1?p:null};
 const gs=[];for(let i=0;i<N;i++){const s=BF.createEndless(8,1000+i);s.cfg.crack=null;gs.push(play(s))}report(mode,gs)}
if(mode==='levels'){
 const LV=require('../src/levels.js');
 for(const lv of LV){let w=0,ml=[];for(let i=0;i<N;i++){const s=play(BF.createLevel(lv,5000+i));if(s.won){w++;ml.push(lv.moves-s.turn)}}
  console.log(`${lv.id} ${lv.name}: бот проходит ${Math.round(w*100/N)}%, ходов в запасе мед ${ml.length?q(ml.sort((a,b)=>a-b),.5):'-'}`)}
}
