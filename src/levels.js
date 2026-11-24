/* Burn Five: уровни. terrain: . пусто, P колонна, I лед, R Y G V краска, 1 2 пары порталов.
   pieces: r y g b кубики, S камень, X уничтожитель, J джокер, ! треснутый кубик. */
(function(root){
const E='........';
const LEVELS=[
 {id:1,name:'Первые шаги',hint:'Сдвиньте кубик на соседнюю клетку. 4 кубика одного цвета в ряд сгорают.',
  goal:{type:'lines',count:2},moves:12,tempo:{every:3,count:1},
  terrain:[E,E,E,E,E,E,E,E],
  pieces:[E,'.rr.r...','...r....',E,'..y.....','..y.....','..y.....','...y....']},
 {id:2,name:'Толчок',hint:'Кубик можно двинуть в занятую клетку: он толкнет весь ряд перед собой, если в конце есть место.',
  goal:{type:'lines',count:3},moves:12,tempo:{every:4,count:1},
  terrain:[E,E,E,E,E,E,E,E],
  pieces:['......r.','......g.','byyy.yg.','......g.',E,'......g.','..grrr.r',E]},
 {id:3,name:'Колонны',hint:'Каменные колонны не двигаются, через них нельзя пройти и толкнуть.',
  goal:{type:'lines',count:4},moves:30,start:20,tempo:{every:1,count:1},
  terrain:[E,E,'..P..P..',E,E,'..P..P..',E,E]},
 {id:4,name:'Лед',hint:'На льду кубик скользит, пока не упрется в препятствие или не съедет со льда.',
  goal:{type:'lines',count:4},moves:30,start:20,tempo:{every:1,count:1},
  terrain:[E,'.IIIIII.',E,E,E,E,'.IIIIII.',E]},
 {id:5,name:'Порталы',hint:'Кубик, вставший на портал, переносится на парный портал того же цвета, если тот свободен.',
  goal:{type:'lines',count:4},moves:35,start:20,tempo:{every:1,count:1},
  terrain:['....P...','..1.P.2.','....P...',E,E,'....P...','.2..P.1.','....P...']},
 {id:6,name:'Краска',hint:'Клетка с краской перекрашивает кубик, который на нее встал. Здесь нужны фиолетовые линии.',
  goal:{type:'lines',count:2,color:'b'},moves:30,start:20,tempo:{every:1,count:1},
  terrain:[E,'..V.....','......V.',E,E,'.V......','.....V..',E]},
 {id:7,name:'Трещины',hint:'Треснутый кубик через несколько ходов станет камнем. Сожгите его раньше.',
  goal:{type:'lines',count:6},moves:40,start:16,tempo:{every:1,count:1},crack:{from:0,rate:0.3,life:10},
  terrain:[E,E,E,E,E,E,E,E],
  pieces:[E,'..!..!..',E,'.!....!.',E,'..!..!..',E,E]},
 {id:8,name:'Каменоломня',hint:'Камни убирает только уничтожитель: подведите его вплотную, он сожжет все 8 клеток вокруг. Встаньте так, чтобы задеть сразу три камня.',
  goal:{type:'stones'},moves:30,tempo:{every:3,count:1},bonusEvery:8,bonusTypes:['X'],
  terrain:[E,E,E,E,E,E,E,E],
  pieces:['..SSS...',E,E,'...X...S','.......S','....X..S',E,'.SSS....']},
 {id:9,name:'Двойной удар',hint:'Сожгите две линии одним ходом: например, крестом или толчком.',
  goal:{type:'double',count:2},moves:25,start:10,tempo:{every:2,count:1},bonusEvery:10,bonusTypes:['J'],
  terrain:[E,E,E,E,E,E,E,E],
  pieces:['..r.....','..r.....','..r.....','rr.r....','..r..y..','.....y..','.....y..','..yyy.y.']},
 {id:10,name:'Лабиринт',hint:'Колонны и лед вместе. Думайте на шаг вперед.',
  goal:{type:'lines',count:6},moves:45,start:20,tempo:{every:1,count:1},
  terrain:['P......P','..I..I..','..I..I..','...PP...','...PP...','..I..I..','..I..I..','P......P']},
 {id:11,name:'Все вместе',hint:'Колонны, лед, порталы, краска и трещины.',
  goal:{type:'score',count:100},moves:50,start:20,tempo:{every:1,count:1},crack:{from:0,rate:0.2,life:12},bonusEvery:12,bonusTypes:['J','T','X'],
  terrain:[E,'.1....V.','..P..I..','..P..I..','..I..P..','..I..P..','.R....1.',E]},
 {id:12,name:'Финал',hint:'Кубик падает каждый ход. Держитесь.',
  goal:{type:'lines',count:14},moves:70,start:16,tempo:{every:1,count:1},crack:{from:0,rate:0.2,life:12},bonusEvery:10,bonusTypes:['J','T','X'],
  terrain:['P......P','...12...',E,'.I....I.','.I....I.',E,'...21...','P......P']}
];
if(typeof module!=='undefined'&&module.exports)module.exports=LEVELS;else root.BF_LEVELS=LEVELS;
})(typeof globalThis!=='undefined'?globalThis:this);
