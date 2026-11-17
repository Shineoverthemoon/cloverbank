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
  chats: {}, supper: false, harvests: {}, quests: {},
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
  farm: [{x: 4, y: 1, name: "Farmhouse", room: "farmhouse", roof: "#a95e49"}],
  town: [
    {x: 2, y: 1, name: "Seed Shop", room: "shop", roof: "#658b6d"},
    {x: 8, y: 1, name: "Tea House", room: "tea", roof: "#ae655e"},
    {x: 2, y: 5, name: "River Cottage", room: "cottage", roof: "#9c6959"},
    {x: 9, y: 6, name: "Workshop", room: "workshop", roof: "#72698a"},
  ],
};
const rooms = {
  farmhouse: {name: "Farmhouse", walls: "#8e694e", rug: "#ad7764", fixtures: [
    [4,2,"bed"],[5,2,"bed"],[9,2,"shelf"],[10,2,"shelf"],[10,5,"table"],
  ]},
  shop: {name: "Jun's Seed Shop", walls: "#63816b", rug: "#758c62", fixtures: [
    [4,2,"shelf"],[5,2,"shelf"],[9,2,"shelf"],[10,2,"shelf"],[4,5,"crate"],[10,5,"crate"],
  ]},
  tea: {name: "Mira's Tea House", walls: "#ad7772", rug: "#9d6a80", fixtures: [
    [4,2,"shelf"],[9,2,"shelf"],[10,2,"shelf"],[4,5,"table"],[10,5,"table"],
  ]},
  workshop: {name: "Rowan's Workshop", walls: "#77728d", rug: "#777b91", fixtures: [
    [4,2,"shelf"],[5,2,"shelf"],[9,2,"table"],[10,2,"table"],[4,5,"crate"],[10,5,"crate"],
  ]},
  cottage: {name: "Lark's River Cottage", walls: "#9d7664", rug: "#688b85", fixtures: [
    [4,2,"bed"],[5,2,"bed"],[9,2,"shelf"],[10,2,"shelf"],[4,5,"table"],[10,5,"crate"],
  ]},
};
const commissions = {
  Jun: {title: "Market Test", kind: "carrot", count: 2, reward: 16, reason: "I'd love to see how my carrot seeds do in that river soil."},
  Mira: {title: "A Taste of Summer", kind: "strawberry", count: 2, reward: 24, reason: "Grow strawberries for the market and I'll set some aside for jam."},
  Rowan: {title: "Porch Lantern", kind: "pumpkin", count: 1, reward: 20, reason: "Grow a pumpkin and I'll buy it from the market for a lantern."},
  Lark: {title: "A Pot of Stew", kind: "turnip", count: 2, reward: 12, reason: "The market could use fresh turnips for my stew."},
};
const villagers = [
  {name: "Fern", area: "farm", shirt: "#815f98", hair: "#793e36",
   route: [[11,2],[12,2],[12,3],[11,3]]},
  {name: "Jun", area: "shop", shirt: "#4b8c91", hair: "#3d3045",
   route: [[6,4],[7,4],[7,3],[6,3]], lines: ["The seed shelves are full. You can buy seeds anywhere inside my shop."]},
  {name: "Mira", area: "tea", shirt: "#b75d6d", hair: "#603f36",
   route: [[8,4],[9,4],[9,5],[8,5]], lines: ["I'm saving the window table for the village supper."]},
  {name: "Rowan", area: "workshop", shirt: "#dc9654", hair: "#4d3e30",
   route: [[8,4],[9,4],[9,5],[8,5]], lines: ["If the bridge creaks when you cross, that's how I know someone is headed into town."]},
  {name: "Lark", area: "cottage", shirt: "#6687a4", hair: "#53505b",
   route: [[6,4],[7,4],[7,3],[6,3]], lines: ["On quiet mornings I can hear the river from my kitchen."]},
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
  state.y === building.y + 2;
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
function drawRoom(room) {
  box("#29312d",0,0,480,288);
  box(room.walls,96,31,288,201);
  box("#b9885f",128,64,224,160);
  for(let y=64;y<224;y+=16) {
    box("#a57451",128,y,224,2);
    for(let x=128+(y%32?16:0);x<352;x+=32) box("#a57451",x,y,1,16);
  }
  box("#ebc38a",185,111,112,77);
  box(room.rug,189,115,104,69);
  box("#d9b486",192,119,98,2);box("#d9b486",192,178,98,2);
  box("#6c5243",219,224,42,35);box("#cc9b6e",224,224,32,27);
  box("#fff0cc",237,240,6,2);box("#fff0cc",239,237,2,7);
  for(const [tileX,tileY,kind] of room.fixtures) {
    const x=tileX*32,y=tileY*32;
    box("#78563f",x+2,y+4,28,25);
    if(kind==="bed") {
      box("#f0d7ae",x+4,y+6,24,8);box("#a97983",x+4,y+14,24,13);
    } else if(kind==="shelf") {
      box("#bc9565",x+4,y+11,24,2);box("#bc9565",x+4,y+21,24,2);
      box("#94b379",x+6,y+5,5,6);box("#db9c6f",x+14,y+14,5,7);box("#a9a1b8",x+22,y+14,4,7);
    } else {
      box("#ca9e6b",x+4,y+5,24,17);
      box(kind==="table"?"#f5d6a2":"#9f744e",x+8,y+9,16,9);
    }
  }
}
function draw() {
  const farm = state.area === "farm";
  const room = rooms[state.area];
  if (room) drawRoom(room);
  else {
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
  }
  for (const person of villagers.filter(person => person.area===state.area)) {
    sprite(...person.position,person.shirt,person.hair,person.facing,person.stride);
    const quest = commissions[person.name];
    const entry = state.quests[person.name];
    const marker = quest && (!entry || (!entry.done && questProgress(person.name)>=quest.count)) ? " !" : "";
    ctx.fillStyle="#fff7dc";ctx.font="bold 9px monospace";ctx.textAlign="center";
    ctx.fillText(person.name+marker,person.position[0]*32+16,person.position[1]*32);
  }
  sprite(state.x,state.y,"#e2a752","#423544",state.dx,Date.now()<walkUntil?stride:0);
  const tx=(state.x+state.dx)*32, ty=(state.y+state.dy)*32;
  ctx.strokeStyle="#fff2aa";ctx.lineWidth=2;ctx.strokeRect(tx+2,ty+2,28,28);
}
function refreshControls() {
  const area = rooms[state.area]?.name ?? (state.area==="farm"?"Cloverbank Farm":"Willowford");
  const progress = state.supper?"Supper ready":`Supper harvest ${Math.min(state.sold,5)}/5`;
  document.querySelector("#stats").textContent = `${area} · Day ${state.day} · ${state.gold}g · ${progress}`;
  document.querySelector("#stock").textContent = `Seeds in bag: ${state.seeds[state.selected]}`;
  const journal = document.querySelector("#quests");
  journal.replaceChildren();
  for (const [name, entry] of Object.entries(state.quests)) {
    const quest = commissions[name];
    const row = document.createElement("li");
    row.textContent = entry.done ? `${quest.title} · Complete` :
      `${quest.title} · ${Math.min(questProgress(name),quest.count)}/${quest.count} ${varieties[quest.kind].name.toLowerCase()} · Return to ${name} at ${rooms[villagers.find(person=>person.name===name).area].name}`;
    journal.append(row);
  }
  document.querySelector("#journal-empty").hidden = journal.childElementCount > 0;
  document.querySelector("#buy").textContent = `Buy seed · ${varieties[state.selected].cost}g`;
}
function update(note) {
  if (note) message.textContent=note;
  try { localStorage.setItem(saveKey,JSON.stringify(state)); } catch {}
  refreshControls();
  draw();
}
function changeArea(area,x,y,dx,dy,note) {
  Object.assign(state,{area,x,y,dx,dy});
  update(note);
}
function leaveRoom() {
  const outside = state.area==="farmhouse"?"farm":"town";
  const building = buildings[outside].find(place=>place.room===state.area);
  changeArea(outside,building.x+1,building.y+2,0,1,`Back outside ${building.name}.`);
}
function blocked(x,y) {
  if (villagers.some(person=>person.area===state.area && same(person.position,x,y))) return true;
  const room = rooms[state.area];
  if (room) {
    if (x===7 && y===7) return false;
    return x<4 || x>10 || y<2 || y>6 || room.fixtures.some(tile=>same(tile,x,y));
  }
  const bank = state.area==="farm"?14:0;
  return x<0 || x>14 || y<0 || y>8 || (x===bank && y!==3) ||
    buildings[state.area].some(building=>atBuilding(building,x,y)) ||
    trees[state.area].some(tree=>same(tree,x,y)) ||
    (state.area==="town" && x>=6 && x<=7 && y>=5 && y<=6);
}
function move(dx,dy) {
  const x=state.x+dx,y=state.y+dy;
  state.dx=dx;state.dy=dy;
  if(y===3 && ((state.area==="farm" && x===15) || (state.area==="town" && x===-1))) {
    state.area=state.area==="farm"?"town":"farm";
    state.x=state.area==="town"?0:14;
    return update(state.area==="town" ? "Welcome to Willowford. The green roof marks Jun's seed shop." : "Back at the farm. Willowford is across the east bridge.");
  }
  if(rooms[state.area] && x===7 && y===8) return leaveRoom();
  if(!blocked(x,y)) {
    state.x=x;state.y=y;
    stride=-stride;
    walkUntil=Date.now()+150;
    setTimeout(draw,160);
  }
  update();
}
function questProgress(name) {
  const quest = commissions[name];
  return (state.harvests[quest.kind] ?? 0) - (state.quests[name]?.start ?? 0);
}
function checkCommission(person) {
  const quest = commissions[person.name];
  const entry = state.quests[person.name];
  if (entry?.done) return false;
  const crop = varieties[quest.kind].name.toLowerCase();
  const amount = `${quest.count} ${crop}${quest.count===1?"":quest.kind==="strawberry"?" plants":" crops"}`;
  if (!entry) {
    state.quests[person.name] = {start: state.harvests[quest.kind] ?? 0, done: false};
    if (quest.kind==="pumpkin" && !state.seeds.pumpkin) state.seeds.pumpkin++;
    update(`${person.name}: ${quest.reason} Harvest ${amount} and tell me when you're done. I'll pay ${quest.reward}g.${quest.kind==="pumpkin"?" I can spare a seed if you need one.":""}`);
  } else if (questProgress(person.name)>=quest.count) {
    entry.done = true;
    state.gold += quest.reward;
    update(`${person.name}: Thanks for growing those! You earned ${quest.reward}g for ${quest.title}.`);
  } else {
    update(`${person.name}: You've harvested ${questProgress(person.name)} of ${quest.count} for ${quest.title}. Come back when the rest are ready.`);
  }
  return true;
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
  if (!checkCommission(person)) update(`${person.name}: ${person.lines[visits%person.lines.length]}`);
}
function act() {
  const x=state.x+state.dx,y=state.y+state.dy,key=[x,y];
  const person=villagers.find(person=>person.area===state.area && same(person.position,x,y));
  if (person) return talk(person);
  if(rooms[state.area]) {
    if(x===7 && y>=7) return leaveRoom();
    if(state.area==="farmhouse" && rooms.farmhouse.fixtures.some(tile=>same(tile,x,y) && tile[2]==="bed")) return sleep();
    return update(state.area==="shop" ? "Choose a crop and select Buy seed to shop." : "Face a person to talk, or walk south through the door.");
  }
  const door = buildings[state.area].find(building=>byDoor(building) && state.dy===-1);
  if(door) return changeArea(door.room,7,7,0,-1,`Inside ${rooms[door.room].name}. Walk south through the door to leave.`);
  if(state.area==="town") return update("Stand below a building's door, face north, and use Open / Talk to enter.");
  if (!plots.some(plot=>same(plot,x,y))) return update("Face a brown garden plot, talk to Fern, or take the east bridge to Willowford.");
  const crop=state.crops[key];
  if (crop && crop.age>=varieties[crop.kind].days) {
    const variety=varieties[crop.kind];
    delete state.crops[key];state.gold+=variety.price;state.sold++;
    state.harvests[crop.kind]=(state.harvests[crop.kind] ?? 0)+1;
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
  if (state.area!=="farm" && state.area!=="farmhouse") return update("Head back to the farm before turning in.");
  state.day++;
  if(state.area==="farmhouse") {state.x=4;state.y=3;state.dx=0;state.dy=-1;}
  else {state.x=5;state.y=3;state.dx=0;state.dy=1;}
  for(const crop of Object.values(state.crops)) {
    if(crop.wet && crop.age<varieties[crop.kind].days) crop.age++;
    crop.wet=false;
  }
  update("A new morning. Check your crops and water the ones still growing.");
}
function buySeed() {
  if(state.area!=="shop" && !(state.area==="town" && byDoor(buildings.town[0]))) return update("Buy seeds at the green-roofed shop in Willowford.");
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
