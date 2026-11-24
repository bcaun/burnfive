// Бот для проверки баланса: использует BF.bestMove из движка.
const BF=require('../src/engine.js');
const choose=s=>BF.bestMove(s,0.5);
function play(s,cap=3000){while(!s.over&&s.turn<cap){const m=choose(s);if(!m)break;BF.move(s,m[0],m[1])}return s}
module.exports={play,choose};
