"use strict";
const canvas = document.querySelector("#farm");
const ctx = canvas.getContext("2d");
const plots = Array.from({length: 18}, (_, i) => [5 + i % 6, 4 + Math.floor(i / 6)]);
const varieties = {
  turnip: {name: "Turnip", days: 2, cost: 3, price: 8, color: "#e6aac4"},
  carrot: {name: "Carrot", days: 3, cost: 5, price: 14, color: "#f5a14d"},
  strawberry: {name: "Strawberry", days: 4, cost: 8, price: 23, color: "#e35c69"},
  pumpkin: {name: "Pumpkin", days: 5, cost: 12, price: 35, color: "#f38543"},
};
const initial = () => ({
  day: 1, gold: 12, sold: 0, x: 4, y: 4, dx: 1, dy: 0, crops: {},
  area: "farm", selected: "turnip", seeds: {turnip: 4, carrot: 1, strawberry: 1, pumpkin: 0},
  chats: {}, supper: false,
});
const saveKey = "cloverbank-v2";
let state = initial();
try {
  const saved = JSON.parse(localStorage.getItem(saveKey) ?? localStorage.getItem("cloverbank-v1"));
  if (saved) {
    state = {...state, ...saved};
    if (typeof saved.seeds === "number") state.seeds = {...initial().seeds, turnip: saved.seeds};
    for (const crop of Object.values(state.crops)) crop.kind ??= "turnip";
  }
} catch {}
const message = document.querySelector("#message");
const seedPicker = document.querySelector("#seed");
for (const [kind, variety] of Object.entries(varieties)) {
  const option = document.createElement("option");
  option.value = kind;
  option.textContent = `${variety.name} · ${variety.days} days`;
  seedPicker.append(option);
}
seedPicker.value = state.selected;
seedPicker.onchange = () => {
  state.selected = seedPicker.value;
  update();
};
const trees = {
  farm: [[1,1],[2,1],[1,8],[3,8],[12,7],[13,1],[0,5],[9,1]],
  town: [[1,1],[6,1],[13,1],[13,7],[1,7],[7,7],[11,7]],
};
const buildings = {
  farm: [{x: 4, y: 1, name: "Farmhouse", roof: "#a95e49"}],
  town: [
    {x: 2, y: 1, name: "Seed Shop", roof: "#658b6d"},
    {x: 8, y: 1, name: "Tea House", roof: "#ae655e"},
    {x: 9, y: 6, name: "Workshop", roof: "#72698a"},
  ],
};
const villagers = [
  {name: "Fern", area: "farm", shirt: "#815f98", hair: "#793e36",
   route: [[11,2],[12,2],[12,3],[11,3]]},
  {name: "Jun", area: "town", shirt: "#4b8c91", hair: "#3d3045",
   route: [[3,3],[4,3],[4,4],[3,4]],
   lines: ["I run the seed shop. Stand by our green-roofed shop to buy seeds.", "Carrots need three mornings of growth. Water them each day, and they'll fetch 14g."]},
  {name: "Mira", area: "town", shirt: "#b75d6d", hair: "#603f36",
   route: [[8,3],[9,3],[9,4],[8,4]],
   lines: ["I'm saving the window table for the village supper. Come by when the tea house smells like rain.", "Strawberries are my favorite. Sometimes I eat more than I put into the jam."]},
  {name: "Rowan", area: "town", shirt: "#dc9654", hair: "#4d3e30",
   route: [[9,5],[10,5],[11,5],[11,4],[10,4],[10,5]],
   lines: ["I keep the bridge in shape. Head west across it whenever you want to go home.", "A good pumpkin takes five watered nights. I like to watch the vines take their time."]},
].map(person => ({...person, step: 0, position: person.route[0]}));
for (const person of villagers) {
  if (person.area===state.area && person.position[0]===state.x && person.position[1]===state.y) {
    person.step=1;
    person.position=person.route[1];
  }
}
const atBuilding = (building, x, y) =>
  x >= building.x && x < building.x + 3 && y >= building.y && y < building.y + 2;
const byDoor = building =>
  state.x === building.x + 1 &&
  (state.y === building.y + 2 || state.y === building.y - 1);
const same = ([a,b], x,y) => a === x && b === y;
const box = (color,x,y,w,h) => {ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
function sprite(x,y,shirt,hair,facing=1,stride=0) {
  x *= 32; y *= 32;
  box("#436449",x+6,y+26,21,4);
  box("#342934",x+9,y+22-stride,5,6); box("#342934",x+19,y+22+stride,5,6);
  box(shirt,x+8,y+14,17,10); box("#f5bb83",x+11,y+6,12,10);
  box(hair,x+9,y+3,15,6); box(hair,x+9,y+8,4,6);
  box("#372a32",x+(facing<0?13:19),y+10,2,2);
}
let walkUntil = 0;
let stride = 1;
function draw() {
  const farm = state.area === "farm";
  for (let y=0;y<9;y++) for (let x=0;x<15;x++) {
    const px=x*32, py=y*32, seed=(x*29+y*13)%17;
    const river = x === (farm ? 14 : 0);
    box(river ? "#508f9b" : ["#82a851","#88ae56","#8eb25b"][seed%3],px,py,32,32);
    box(river ? "#9ac5ba" : "#a4bf62",px+seed,py+7+seed,5,2);
    if (river && y === 3) {
      box("#855d44",px,py+5,32,23);
      for (let plank=0;plank<32;plank+=8) box("#c99965",px+plank,py+7,6,19);
    } else if (!river && (x===3 || y===3 || (!farm && x>=6 && x<=10 && y===4))) {
      box(farm?"#c5a36b":"#cfbd9a",px,py+6,32,21);
      if (!farm) box("#b6a389",px+seed,py+12,5,2);
    } else if (seed===1 && !river) {
      box("#e9edd1",px+20,py+18,4,4);box("#ecb849",px+21,py+19,2,2);
    }
    if (!farm && (x===6 || x===7) && (y===5 || y===6)) {
      box("#cdb481",px,py,32,32);
      box("#b39b77",px+4,py+6,23,20);
      box("#6fa6a9",px+7,py+9,17,14);
    }
  }
  for (const [x,y] of trees[state.area]) {
    box("#78503c",x*32+13,y*32+16,7,15);
    box("#395e43",x*32+3,y*32+4,26,20);
    box("#527d46",x*32+6,y*32,20,15);
    box("#70964f",x*32+8,y*32+3,10,6);
  }
  for (const building of buildings[state.area]) {
    const x=building.x*32, y=building.y*32;
    box("#e8c48a",x,y+11,96,53);
    box(building.roof,x-4,y,104,23);
    box("#664c4c",x+3,y-6,90,7);
    box("#f0ad77",x-4,y+20,104,4);
    box("#6b4942",x+39,y+35,20,29);
    box("#8bb2aa",x+10,y+33,17,15);box("#8bb2aa",x+70,y+33,17,15);
    ctx.fillStyle="#fff0cc";ctx.font="bold 9px monospace";ctx.textAlign="center";
    ctx.fillText(building.name,x+48,y+15);
  }
  if (farm) for (const [x,y] of plots) {
    const crop=state.crops[[x,y]], px=x*32, py=y*32;
    box(crop?.wet?"#654b40":"#946a49",px+1,py+1,30,30);
    box(crop?.wet?"#816355":"#b27f52",px+4,py+8,24,2);
    box(crop?.wet?"#816355":"#b27f52",px+4,py+23,24,2);
    if (!crop) continue;
    const variety=varieties[crop.kind];
    box("#345d40",px+14,py+13,5,10);
    box("#b7d46a",px+9,py+11,7,4);
    if (crop.age>=variety.days) {
      box(variety.color,px+9,py+17,15,10);
      box("#f4ce90",px+11,py+19,3,2);
    } else if (crop.age) box("#7eaa57",px+16,py+8,8,5);
  }
  for (const person of villagers.filter(person => person.area===state.area)) {
    sprite(...person.position,person.shirt,person.hair,person.facing,person.stride);
    ctx.fillStyle="#fff7dc";ctx.font="bold 9px monospace";ctx.textAlign="center";
    ctx.fillText(person.name,person.position[0]*32+16,person.position[1]*32);
  }
  sprite(state.x,state.y,"#e2a752","#423544",state.dx,Date.now()<walkUntil?stride:0);
  const tx=(state.x+state.dx)*32, ty=(state.y+state.dy)*32;
  ctx.strokeStyle="#fff2aa";ctx.lineWidth=2;ctx.strokeRect(tx+2,ty+2,28,28);
}
function refreshControls() {
  const area = state.area==="farm"?"Cloverbank Farm":"Willowford";
  const progress = state.supper?"Supper ready":`Supper harvest ${Math.min(state.sold,5)}/5`;
  document.querySelector("#stats").textContent = `${area} · Day ${state.day} · ${state.gold}g · ${progress}`;
  document.querySelector("#stock").textContent = `Seeds in bag: ${state.seeds[state.selected]}`;
  document.querySelector("#buy").textContent = `Buy seed · ${varieties[state.selected].cost}g`;
}
function update(note) {
  if (note) message.textContent=note;
  try { localStorage.setItem(saveKey,JSON.stringify(state)); } catch {}
  refreshControls();
  draw();
}
function move(dx,dy) {
  const x=state.x+dx,y=state.y+dy;
  state.dx=dx;state.dy=dy;
  if(y===3 && ((state.area==="farm" && x===15) || (state.area==="town" && x===-1))) {
    state.area=state.area==="farm"?"town":"farm";
    state.x=state.area==="town"?0:14;
    return update(state.area==="town" ? "Welcome to Willowford. The green roof marks Jun's seed shop." : "Back at the farm. Willowford is across the east bridge.");
  }
  const bank = state.area==="farm"?14:0;
  if(x>=0 && x<15 && y>=0 && y<9 && (x!==bank || y===3) &&
     !buildings[state.area].some(building=>atBuilding(building,x,y)) &&
     !trees[state.area].some(tree=>same(tree,x,y)) &&
     !(state.area==="town" && x>=6 && x<=7 && y>=5 && y<=6) &&
     !villagers.some(person=>person.area===state.area && same(person.position,x,y))) {
    state.x=x;state.y=y;
    stride=-stride;
    walkUntil=Date.now()+150;
    setTimeout(draw,160);
  }
  update();
}
function talk(person) {
  const visits=state.chats[person.name] ?? 0;
  state.chats[person.name]=visits+1;
  if(person.name==="Fern") {
    if(state.sold>=5 && !state.supper) {
      state.supper=true;
      state.gold+=15;
      return update("Fern: Five harvests! The village supper is on. Take 15g for helping us out.");
    }
    return update(state.supper ? "Fern: Mira has a table waiting for us at the tea house." :
      `Fern: Sell five crops for the village supper. You've brought in ${state.sold} so far.`);
  }
  update(`${person.name}: ${person.lines[visits%person.lines.length]}`);
}
function act() {
  const x=state.x+state.dx,y=state.y+state.dy,key=[x,y];
  const person=villagers.find(person=>person.area===state.area && same(person.position,x,y));
  if (person) return talk(person);
  if(state.area==="town") {
    if(byDoor(buildings.town[0])) return update("Jun's Seed Shop: Choose a crop from your seed bag menu, then select Buy seed.");
    return update("Face a villager and use Talk. Follow the west road to return to the farm.");
  }
  if (byDoor(buildings.farm[0]) && atBuilding(buildings.farm[0],x,y)) return sleep();
  if (!plots.some(plot=>same(plot,x,y))) return update("Face a brown garden plot, talk to Fern, or take the east bridge to Willowford.");
  const crop=state.crops[key];
  if (crop && crop.age>=varieties[crop.kind].days) {
    const variety=varieties[crop.kind];
    delete state.crops[key];state.gold+=variety.price;state.sold++;
    return update(state.sold===5?"Five crops sold! Talk to Fern about the village supper.":`${variety.name} sold for ${variety.price}g.`);
  }
  if (crop) {
    if(crop.wet) return update("Already watered today.");
    crop.wet=true;return update(`${varieties[crop.kind].name} watered. It will grow overnight.`);
  }
  const kind=state.selected;
  if(!state.seeds[kind]) return update("You're out of these seeds. Visit the green-roofed seed shop in Willowford.");
  state.seeds[kind]--;
  state.crops[key]={kind,age:0,wet:false};
  update(`${varieties[kind].name} planted. Use the plot again to water it.`);
}
function sleep() {
  if (state.area!=="farm") return update("Head back to the farm before turning in.");
  state.day++;
  state.x=5;state.y=3;state.dx=0;state.dy=1;
  for(const crop of Object.values(state.crops)) {
    if(crop.wet && crop.age<varieties[crop.kind].days) crop.age++;
    crop.wet=false;
  }
  update("A new morning. Check your crops and water the ones still growing.");
}
function buySeed() {
  if(state.area!=="town" || !byDoor(buildings.town[0])) return update("Buy seeds outside the green-roofed shop in Willowford.");
  const variety=varieties[state.selected];
  if(state.gold<variety.cost) return update(`A ${variety.name.toLowerCase()} seed costs ${variety.cost}g.`);
  state.gold-=variety.cost;state.seeds[state.selected]++;
  update(`Bought a ${variety.name.toLowerCase()} seed.`);
}
document.querySelector("#act").onclick=act;
document.querySelector("#sleep").onclick=sleep;
document.querySelector("#buy").onclick=buySeed;
function walkVillagers() {
  for(const person of villagers) {
    const next=(person.step+1)%person.route.length;
    const [x,y]=person.route[next];
    person.stride=0;
    if(person.area===state.area && same([x,y],state.x,state.y)) continue;
    if(villagers.some(other=>other!==person && other.area===person.area && same(other.position,x,y))) continue;
    person.facing=Math.sign(x-person.position[0]) || person.facing;
    person.position=person.route[next];
    person.step=next;
    person.stride=next%2?1:-1;
  }
  draw();
  setTimeout(()=>{
    for(const person of villagers) person.stride=0;
    draw();
  },180);
}
setInterval(walkVillagers,2200);
document.querySelectorAll("[data-move]").forEach(button=>{
  button.onclick=()=>move(...button.dataset.move.split(",").map(Number));
});
const keys={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};
addEventListener("keydown",event=>{
  const direction=keys[event.key.toLowerCase()];
  if(direction && !["SELECT","OPTION"].includes(event.target.tagName)) {event.preventDefault();move(...direction);}
  if(event.code==="Space" && !["BUTTON","SELECT","OPTION"].includes(event.target.tagName)){event.preventDefault();if(!event.repeat)act();}
});
update("Plant a crop or follow the east bridge to Willowford.");
