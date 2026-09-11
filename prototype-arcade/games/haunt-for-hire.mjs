import {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} from '../lib/util.mjs';
import {bg,box,text,line,circle,eye,label,bar} from '../lib/draw.mjs';
export const meta={id:'haunt-for-hire',title:'Haunt for Hire',tag:'SUPERNATURAL CO-OP',players:4,color:'#a89bfa',description:'Be the ghosts. Possess household objects and coordinate scares against reactive residents.',controls:'Move near a household prop and possess it. Scare when a resident is nearby. Different props in quick succession create stronger scares.',actions:['Possess / release','Scare','Flicker lights'],tools:[],goal:'Scare five residents out of the house.',ai:'Ghosts pick props near residents; residents flee, investigate, or become less sensitive to repeated scares.'};
const props=[{x:170,y:232,name:'TV',room:0},{x:470,y:232,name:'PIANO',room:1},{x:780,y:232,name:'MIRROR',room:2},{x:175,y:480,name:'LAMP',room:3},{x:470,y:480,name:'FRIDGE',room:4},{x:780,y:480,name:'FAN',room:5}];
function resident(s,id){return {id,x:100+rand(s)*740,y:id%2?420:190,tx:100+rand(s)*750,fear:0,memory:Array(6).fill(0),lastProp:-1,lastScare:-20,kind:id%3};}
export function init(seed){const s=base(seed,4,160,5);s.props=props.map((p,id)=>({...p,id,owner:-1,glow:0}));s.residents=[0,1,2].map(i=>resident(s,i));s.next=3;s.dark=0;s.players.forEach(p=>p.possess=-1);note(s,'Scares work within 190 pixels. Chain different props for a bonus.');return s;}
export function update(s,inputs,dt){
  s.dark=Math.max(0,s.dark-dt);s.props.forEach(p=>p.glow=Math.max(0,p.glow-dt));
  s.players.forEach((p,i)=>{const input=inputs[i]||{};if(p.possess<0)move(p,input,dt,220,[50,130,910,535]);else{p.x=s.props[p.possess].x;p.y=s.props[p.possess].y-40;}
    if(input.a&&p.cooldown<=0){p.cooldown=.3;if(p.possess>=0){s.props[p.possess].owner=-1;p.possess=-1;}else{const prop=nearest(p,s.props,q=>q.owner<0&&dist(p,q)<85);if(prop){prop.owner=i;p.possess=prop.id;burst(s,prop.x,prop.y-45,'Possessed',COLORS[i]);}}}
    if(input.c&&p.cooldown<=0){s.dark=2;p.cooldown=3;burst(s,p.x,p.y,'Lights out','#bab6ff');}
    if(input.b&&p.cooldown<=0){p.cooldown=1.3;const prop=s.props[p.possess];if(prop)prop.glow=.8;
      let hit=0;for(const r of s.residents){if(dist(p,r)>195)continue;const prior=prop?r.memory[prop.id]:3;const combo=prop&&r.lastProp!==prop.id&&s.elapsed-r.lastScare<3.5;const amount=(prop?22:5)*(combo?1.6:1)*(s.dark>0?1.25:1)/(1+prior*.2);r.fear+=amount;r.lastScare=s.elapsed;if(prop){r.memory[prop.id]++;r.lastProp=prop.id;}hit++;burst(s,r.x,r.y-28,combo?'COMBO!':`+${Math.round(amount)}`,'#cabfff');}
      if(!hit)note(s,'Nobody is close enough. Release this prop and find another.');
    }
  });
  for(const r of s.residents){r.fear=Math.max(0,r.fear-dt*.7);const speed=r.fear>65?90:25+r.kind*8;if(Math.abs(r.x-r.tx)<15)r.tx=80+rand(s)*800;r.x+=Math.sign(r.tx-r.x)*dt*speed;
    if(r.fear>=100){s.score++;burst(s,r.x,r.y,'I QUIT!','#9bffd2');Object.assign(r,resident(s,s.next++));note(s,`${s.score} resident${s.score===1?'':'s'} fled. Next tenant is moving in.`);}
  }
  if(s.score>=s.goal)finish(s,true,'Five-star haunting. The deposit is yours.');
}
export function bot(s,i){const p=s.players[i];if(p.possess>=0){const has=s.residents.some(r=>dist(p,r)<185);return has?{b:true}:{a:true};}const prop=nearest(p,s.props,q=>q.owner<0&&s.residents.some(r=>dist(q,r)<190));return prop?aim(prop.x,prop.y-35,{a:dist(p,{x:prop.x,y:prop.y-35})<35}):aim(480,280);}
export function hint(s){return 'Residents get used to the same prop. Move to a new object or coordinate a scare with another ghost.';}
export function render(c,s,view={}){
  bg(c,'#292d50','#191b31');label(c,'WELCOME TO 13 WISTERIA LANE',`${s.score} / 5 tenants persuaded to leave`);
  for(let i=0;i<6;i++){const x=32+i%3*300,y=110+Math.floor(i/3)*233;box(c,x,y,291,219,i%2?'#404362':'#374953',12,'#647187');for(let xx=x+20;xx<x+280;xx+=24)line(c,xx,y+8,xx,y+180,'#ffffff05',1);box(c,x+205,y+27,55,77,'#142334',4);line(c,x+233,y+28,x+233,y+100,'#566582',3);line(c,x+207,y+64,x+258,y+64,'#566582',3);box(c,x+5,y+182,280,27,'#786378',3);}
  s.props.forEach(p=>{if(p.glow>0)circle(c,p.x,p.y-13,60+p.glow*35,'#d1bcff33');box(c,p.x-39,p.y-44,78,62,p.owner>=0?COLORS[p.owner]:'#9f92aa',8);text(c,p.name,p.x,p.y-10,14,'#22263b','center');if(p.owner>=0)eye(c,p.x,p.y-33,.5);});
  s.residents.forEach(r=>{circle(c,r.x+3,r.y+14,20,'#13182c66');box(c,r.x-12,r.y+3,24,28,['#d09767','#719aaa','#aa7989'][r.kind],8);circle(c,r.x,r.y-6,17,'#ebcda5');eye(c,r.x,r.y-10,.6,r.fear>45?'worried':'happy');bar(c,r.x-30,r.y-40,60,r.fear/100,'#f39eb6');});
  s.players.forEach((p,i)=>{c.save();c.globalAlpha=p.possess>=0?.6:.95;circle(c,p.x,p.y,21,COLORS[i]);box(c,p.x-21,p.y,42,24,COLORS[i],8);for(let j=0;j<3;j++)circle(c,p.x-14+j*14,p.y+22,7,COLORS[i]);eye(c,p.x,p.y-3,.8);if(i===view.you)text(c,'YOU',p.x,p.y-32,12,'#fff3d6','center');c.restore();});
  if(s.dark>0)box(c,20,100,920,467,'#060b2555',15);
}
