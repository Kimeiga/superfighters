import {base, clamp, cellAt, center, aim, note, burst, finish} from '../lib/util.mjs';
import {bg,box,text,line,grid,label,bar,circle} from '../lib/draw.mjs';
export const meta={id:'misprint',title:'Misprint',tag:'PRINTING ROGUELITE',players:1,color:'#ef88aa',description:'Build an impossible press. Copy, multiply, and foil your way through three print orders.',controls:'Select a stamp below, then tap a grid cell to install it. Print when your preview reaches the order target. Remove refunds a stamp.',actions:['Install stamp','Run the press','Remove stamp'],tools:['Star +3','Copy left','Double left','Foil neighbors','Copy above'],tapAction:true,goal:'Complete three print orders.',ai:'The autopilot searches legal placements and evaluates the resulting print score.'};
const X=190,Y=142,Z=106,C=5,R=3;
const names=['STAR','COPY','DOUBLE','FOIL','ABOVE'],symbols=['★','→','×2','+','↓'],colors=['#f7bb61','#85d6bd','#fa86b0','#b49aed','#8bbfee'];
export function evaluate(board) {
  const values=[];
  for(let i=0;i<board.length;i++){
    const left=i%C?values[i-1]||0:0,above=i>=C?values[i-C]||0:0;
    const n=[i%C?i-1:-1,i%C<C-1?i+1:-1,i-C,i+C].filter(j=>j>=0&&j<board.length&&board[j]>=0).length;
    values[i]=board[i]===0?3:board[i]===1?left:board[i]===2?left*2:board[i]===3?4*n:board[i]===4?above:0;
  }
  return {values,total:values.reduce((a,b)=>a+b,0)};
}
export function init(seed){const s=base(seed,1,600,3);Object.assign(s,{board:Array(15).fill(-1),ink:9,order:1,target:85,printing:false,printIndex:0,printClock:0,printed:[],wait:0});note(s,'Install stamps left to right. COPY and DOUBLE need a valuable stamp on their left.');return s;}
export function update(s,inputs,dt){
  const input=inputs[0]||{},p=s.players[0];if(Number.isInteger(input.tool))p.tool=clamp(input.tool,0,4);
  if(s.printing){s.printClock+=dt;if(s.printClock>.12){s.printClock=0;s.printed.push(evaluate(s.board).values[s.printIndex]);s.printIndex++;if(s.printIndex===15){s.printing=false;const total=evaluate(s.board).total;if(total>=s.target){s.score++;s.wait=2;note(s,`Order ${s.order} accepted: ${total} points!`);if(s.score===3)finish(s,true,'Three extraordinary print orders delivered.');}else note(s,`${total} / ${s.target}. Rearrange the press and try again.`);}}return;}
  if(s.wait>0){s.wait-=dt;if(s.wait<=0){s.order++;s.target=[85,145,220][s.order-1];s.board=Array(15).fill(-1);s.ink=9+s.order;s.printed=[];note(s,`Order ${s.order}: reach ${s.target} points. You have ${s.ink} stamps.`);}return;}
  const index=cellAt(input,X,Y,Z,C,R);
  if(input.a&&index>=0&&s.ink>0&&s.board[index]<0){s.board[index]=p.tool;s.ink--;burst(s,X+index%C*Z+Z/2,Y+Math.floor(index/C)*Z+Z/2,symbols[p.tool]);}
  if(input.c&&index>=0&&s.board[index]>=0){s.board[index]=-1;s.ink++;}
  if(input.b){s.printing=true;s.printIndex=0;s.printed=[];s.printClock=0;note(s,'The press is running.');}
}
export function bot(s){
  if(s.printing||s.wait>0)return {};
  if(evaluate(s.board).total>=s.target||s.ink===0)return {b:true};
  let best=-1,choice=null;
  for(let i=0;i<15;i++)if(s.board[i]<0)for(let type=0;type<5;type++){const board=[...s.board];board[i]=type;const score=evaluate(board).total+(i%C<4&&type===0?1:0);if(score>best){best=score;choice={i,type};}}
  if(!choice)return {b:true};return {...aim(...Object.values(center(choice.i,X,Y,Z,C))),tool:choice.type,a:true};
}
export function hint(s){return `Preview: ${evaluate(s.board).total} / ${s.target}. A STAR → DOUBLE → DOUBLE chain prints 3, 6, then 12.`;}
export function render(c,s){
  bg(c,'#482d47','#251f35');label(c,`ORDER ${s.order} / 3`,`${s.ink} stamps left • Target ${s.target} • Preview ${evaluate(s.board).total}`);
  box(c,154,114,606,389,'#171f2c',20,'#9d708d');box(c,155,492,605,51,'#6e6072',10);
  grid(c,X,Y,C,R,Z,'#343447');
  for(let i=0;i<15;i++){const xx=X+i%C*Z,yy=Y+Math.floor(i/C)*Z,t=s.board[i];
    if(t>=0){box(c,xx+8,yy+8,Z-16,Z-16,colors[t],10);text(c,symbols[t],xx+Z/2,yy+39,32,'#222a35','center');text(c,names[t],xx+Z/2,yy+74,12,'#343343','center');}
    else text(c,'+',xx+Z/2,yy+Z/2,26,'#6d677d','center',400);
    if(s.printed[i]!=null){box(c,xx+12,yy+14,58,32,'#fff4d6',6);text(c,s.printed[i],xx+41,yy+30,21,'#253139','center');}
  }
  for(let i=0;i<7;i++)circle(c,200+i*82,521,12,'#aba0b1');
  const active=s.printing?s.printIndex%5:-1;if(active>=0){box(c,X+active*Z,125,Z,342,'#fff5ce19',8);line(c,X+active*Z,130,X+active*Z,480,'#fff1c2',3);}
  text(c,'BUILD A COMBO. PRINT SOMETHING IMPOSSIBLE.',480,575,17,'#e8becf','center');
}
