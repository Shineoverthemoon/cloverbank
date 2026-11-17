"use strict";
const canvas = document.querySelector("#farm");
const ctx = canvas.getContext("2d");
const plots = Array.from({length: 18}, (_, i) => [5 + i % 6, 4 + Math.floor(i / 6)]);
const initial = () => ({day: 1, gold: 12, seeds: 4, sold: 0, x: 4, y: 4, dx: 1, dy: 0, crops: {}});
const saveKey = "cloverbank-v1";
let state = initial();
try {
  const saved = JSON.parse(localStorage.getItem(saveKey));
  if (saved) state = saved;
} catch {}
const message = document.querySelector("#message");
const fern = [11, 2];
const trees = [[1,1],[2,1],[1,8],[3,8],[12,7],[13,1],[0,5],[9,1]];
const hut = (x, y) => x >= 4 && x <= 6 && y >= 1 && y <= 2;
const same = ([a,b], x,y) => a === x && b === y;
const box = (color,x,y,w,h) => {ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
function sprite(x,y,shirt,hair) {
  x *= 32; y *= 32;
  box("#436449",x+6,y+26,21,4);
  box("#342934",x+9,y+22,5,6); box("#342934",x+19,y+22,5,6);
  box(shirt,x+8,y+14,17,10); box("#f5bb83",x+11,y+6,12,10);
  box(hair,x+9,y+3,15,6); box(hair,x+9,y+8,4,6);
  box("#372a32",x+19,y+10,2,2);
}
function draw() {
  for (let y=0;y<9;y++) for (let x=0;x<15;x++) {
    const px=x*32, py=y*32, seed=(x*29+y*13)%17;
    box(x===14 ? "#508f9b" : ["#82a851","#88ae56","#8eb25b"][seed%3],px,py,32,32);
    box(x===14 ? "#83b8ad" : "#a4bf62",px+seed,py+7+seed,5,2);
    if (x===3 || y===3) box("#c5a36b",px+(x===3?7:0),py+(y===3?7:0),x===3&&y!==3?18:32,y===3&&x!==3?18:32);
    if (seed===1 && x<14) {box("#e9edd1",px+20,py+18,4,4);box("#ecb849",px+21,py+19,2,2);}
  }
  for (const [x,y] of trees) {
    box("#78503c",x*32+13,y*32+16,7,15);
    box("#395e43",x*32+3,y*32+4,26,20);
    box("#527d46",x*32+6,y*32,20,15);
    box("#70964f",x*32+8,y*32+3,10,6);
  }
  box("#e8c48a",128,43,96,53); box("#a95e49",122,30,108,24);
  box("#793e3e",129,24,94,10); box("#f0ad77",122,51,108,5);
  box("#6b4942",167,67,20,29); box("#8bb2aa",138,65,17,15); box("#8bb2aa",198,65,17,15);
  for (const [x,y] of plots) {
    const crop=state.crops[[x,y]], px=x*32, py=y*32;
    box(crop?.wet?"#654b40":"#946a49",px+1,py+1,30,30);
    box(crop?.wet?"#816355":"#b27f52",px+4,py+8,24,2);
    box(crop?.wet?"#816355":"#b27f52",px+4,py+23,24,2);
    if (!crop) continue;
    box("#345d40",px+14,py+11,5,12);
    box("#b7d46a",px+9,py+11,7,4);
    if (crop.age>=2) box("#e6aac4",px+9,py+17,15,10);
    else if (crop.age) box("#7eaa57",px+16,py+8,8,5);
  }
  sprite(...fern,"#815f98","#793e36");
  sprite(state.x,state.y,"#e2a752","#423544");
  const tx=(state.x+state.dx)*32, ty=(state.y+state.dy)*32;
  ctx.strokeStyle="#fff2aa";ctx.lineWidth=2;ctx.strokeRect(tx+2,ty+2,28,28);
  document.querySelector("#stats").textContent = `Day ${state.day}  ·  ${state.gold}g  ·  Seeds ${state.seeds}  ·  Harvest ${Math.min(state.sold,5)}/5`;
}
function update(note) {
  if (note) message.textContent=note;
  try { localStorage.setItem(saveKey,JSON.stringify(state)); } catch {}
  draw();
}
function move(dx,dy) {
  const x=state.x+dx,y=state.y+dy;
  state.dx=dx;state.dy=dy;
  if(x>=0 && x<14 && y>=0 && y<9 && !hut(x,y) && !same(fern,x,y) && !trees.some(t=>same(t,x,y))) {
    state.x=x;state.y=y;
  }
  update();
}
function act() {
  const x=state.x+state.dx,y=state.y+state.dy,key=[x,y];
  if (same(fern,x,y)) return update(state.sold>=5 ? "Fern: You did it! The village is lucky to have you." : "Fern: Bring in five turnips and we'll have enough for the village supper!");
  if (!plots.some(plot=>same(plot,x,y))) return update("Face a brown garden plot to tend it, or find Fern northeast of the farmhouse.");
  const crop=state.crops[key];
  if (crop?.age>=2) {
    delete state.crops[key];state.gold+=8;state.sold++;
    return update(state.sold===5?"Five turnips sold! Talk to Fern to share the news.":"Turnip harvested and sold for 8g.");
  }
  if (crop) {
    if(crop.wet) return update("Already watered today.");
    crop.wet=true;return update("Watered. This turnip will grow overnight.");
  }
  if(!state.seeds) return update("You're out of seeds. Buy more for 3g each.");
  state.seeds--;state.crops[key]={age:0,wet:false};
  update("Turnip planted. Use the plot again to water it.");
}
function sleep() {
  state.day++;
  for(const crop of Object.values(state.crops)) {
    if(crop.wet && crop.age<2) crop.age++;
    crop.wet=false;
  }
  update("A new morning. Check your turnips and water the ones still growing.");
}
document.querySelector("#act").onclick=act;
document.querySelector("#sleep").onclick=sleep;
document.querySelector("#buy").onclick=()=>{
  if(state.gold<3) return update("A seed costs 3g.");
  state.gold-=3;state.seeds++;update("Bought a turnip seed.");
};
document.querySelectorAll("[data-move]").forEach(button=>{
  button.onclick=()=>move(...button.dataset.move.split(",").map(Number));
});
const keys={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
addEventListener("keydown",event=>{
  const direction=keys[event.key.toLowerCase()];
  if(direction) {event.preventDefault();move(...direction);}
  if(event.code==="Space" && event.target.tagName!=="BUTTON"){event.preventDefault();if(!event.repeat)act();}
});
update("Welcome to Cloverbank! Plant a turnip in the plot just east of you.");
