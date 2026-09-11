import {base,clamp,cellAt,center,aim,note,burst,finish} from '../lib/util.mjs';
import {bg,box,text,line,grid,label,bar,circle} from '../lib/draw.mjs';
export const meta={id:'upstairs-is-on-fire',title:'Upstairs Is on Fire',tag:'BUILDING COMBO PUZZLE',players:1,color:'#ffad75',description:'Build an absurd apartment block. Heat, noise, water, and neighbors turn rooms into combinations.',controls:'Choose a room and tap an empty lot. Neighbors matter. Inspect your building to claim income; remove a room to recover its permit.',actions:['Place room','Inspect building','Remove room'],tools:['Bakery','Greenhouse','Ice studio','Drummer','Laboratory','Aquarium'],tapAction:true,goal:'Earn a building inspection score of 130 using 14 rooms.',ai:'The builder evaluates room placements against the same adjacency rules you use.'};
const X=225,Y=122,Z=91,C=5,R=4;
const names=['BAKERY','GARDEN','ICE','DRUMMER','LAB','AQUARIUM'],icons=['B','G','I','D','L','A'],colors=['#dfa168','#90c99a','#9dd6e5','#cf96cf','#b6b9e9','#74c1bd'];
export function evaluate(board){
  let score=0;const values=[];const details=[];
  for(let i=0;i<20;i++){
    const type=board[i];if(type<0){values.push(0);continue;}let v=4;const below=board[i+C],above=board[i-C];const neighbors=[i%C?i-1:-1,i%C<C-1?i+1:-1,i-C,i+C].filter(j=>j>=0&&j<20);
    if(type===1&&below===0){v+=18;details.push('Bakery warms greenhouse +18');}
    if(type===2&&below===0){v-=18;details.push('Bakery melts ice studio -18');}
    if(type===4){v+=neighbors.filter(j=>board[j]===3).length*13;v-=neighbors.filter(j=>board[j]===5).length*9;}
    if(type===5&&above===1){v+=16;details.push('Garden drainage fills aquarium +16');}
    if(type===2){v+=neighbors.filter(j=>board[j]===2).length*5;}
    if(type===0&&above===5)v-=14;
    values.push(v);score+=v;
  }
  return {score,values,details:[...new Set(details)]};
}
export function init(seed){const s=base(seed,1,600,130);Object.assign(s,{board:Array(20).fill(-1),permits:14,inspections:0});note(s,'A greenhouse ABOVE a bakery gets free heat. Labs love neighboring drummers.');return s;}
export function update(s,inputs){const input=inputs[0]||{},p=s.players[0];if(Number.isInteger(input.tool))p.tool=clamp(input.tool,0,5);const i=cellAt(input,X,Y,Z,C,R);
  if(input.a&&i>=0&&s.board[i]<0&&s.permits>0){s.board[i]=p.tool;s.permits--;const v=evaluate(s.board);s.score=v.score;note(s,v.details.at(-1)||'New tenant installed. Build a useful neighbor.');}
  if(input.c&&i>=0&&s.board[i]>=0){s.board[i]=-1;s.permits++;s.score=evaluate(s.board).score;}
  if(input.b){s.inspections++;s.score=evaluate(s.board).score;if(s.score>=s.goal)finish(s,true,'Inspection passed. Your very strange building is profitable.');else note(s,`Inspection: ${s.score} / ${s.goal}. Rearrange rooms for stronger combinations.`);}
}
export function bot(s){if(s.score>=s.goal||s.permits===0)return {b:true};let best=-Infinity,choice=null;for(let i=0;i<20;i++)if(s.board[i]<0)for(let t=0;t<6;t++){const b=[...s.board];b[i]=t;let v=evaluate(b).score;if(t===3)v+=.2;if(v>best){best=v;choice={i,t};}}if(!choice)return{};const p=center(choice.i,X,Y,Z,C);return aim(p.x,p.y,{a:true,tool:choice.t});}
export function hint(s){return `Projected income: ${s.score} / 130. Labs gain +13 for every adjacent drummer. Gardens above bakeries gain +18.`;}
export function render(c,s){bg(c,'#635365','#273540');label(c,'THE VERTICAL ECONOMY',`${s.permits} building permits • ${s.score} projected income • Inspect at 130`);
  for(let i=0;i<12;i++)box(c,35+i*78,365-(i%3)*35,61,212+(i%3)*35,'#292e43',2);
  box(c,X-19,Y-19,Z*C+38,Z*R+35,'#ced3c1',9);grid(c,X,Y,C,R,Z,'#404e53');const result=evaluate(s.board);
  for(let i=0;i<20;i++){const x=X+i%C*Z,y=Y+Math.floor(i/C)*Z,t=s.board[i];if(t>=0){box(c,x+5,y+5,Z-10,Z-10,colors[t],5);text(c,icons[t],x+Z/2,y+34,28,'#253740','center');text(c,names[t],x+Z/2,y+60,10,'#253740','center');text(c,`${result.values[i]>=0?'+':''}${result.values[i]}`,x+Z-19,y+17,12,result.values[i]<0?'#b33039':'#215748','center');}else{box(c,x+26,y+23,37,42,'#a4b9b222',3);line(c,x+44,y+24,x+44,y+64,'#b5cfc244',2);}}
  box(c,X-30,Y+R*Z+14,Z*C+60,45,'#c0ac95',6);text(c,'ROOMS CREATE THE RULES',480,552,20,'#e7d7bd','center');
  text(c,'HEAT',92,193,17,'#f5bf86');text(c,'Bakery → Garden',92,218,13,'#ddd0c3');text(c,'NOISE',742,300,17,'#ddaaed');text(c,'Drummer → Lab',742,325,13,'#ddd0c3');
}
