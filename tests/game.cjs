const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('geoquiz.js','utf8');
const nodes=new Map();
function element(){return {hidden:false,value:'single',textContent:'',dataset:{},setAttribute(){},removeAttribute(){},append(){},insertBefore(){},addEventListener(){},namespaceURI:'http://www.w3.org/2000/svg'}}
const root={querySelector(s){if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},querySelectorAll(){return []}};
const geometry=JSON.parse(source.slice(source.indexOf('const countries=')+16,source.indexOf(';const pool=')));
const pool=JSON.parse(source.match(/const pool=(\[.*?\]);/)[1]);assert.equal(pool.length,100);assert.equal(new Set(pool).size,100);for(const id of pool)assert(geometry.some(c=>c[0]===id));
const geoContext={};vm.createContext(geoContext);vm.runInContext(source.slice(0,source.indexOf('const host=')).replace('(()=>{','')+';globalThis.library=d3;',geoContext);
const context={document:{querySelector:()=>({attachShadow:()=>root}),createElementNS:()=>element()},d3:{geoOrthographic:geoContext.library.geoOrthographic,geoPath:geoContext.library.geoPath,geoCentroid:()=>[45,30],geoArea:geoContext.library.geoArea},countries:geometry,pool,console,matchMedia:()=>({matches:true}),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};
vm.createContext(context);
let runtime=source.slice(source.indexOf('const host='),source.lastIndexOf('})();'));
runtime+='\nglobalThis.game={start:(m)=>{$("#mode-"+m).onclick()},answer:(id)=>{selected=id;$("#answer").onclick()},hint:()=>$("#hint").onclick(),next:()=>$("#answer").onclick(),state:()=>({queue,index,score,checked,attempts,correctCount,hintUsed,mode,active}),territories,paths,locations,render};';
vm.runInContext(runtime,context);const g=context.game;const projection=vm.runInContext('projection',context);
function wrong(){return pool.filter(id=>id!==g.state().queue[g.state().index])}
for(let attempt=1;attempt<=3;attempt++){g.start('triple');for(let n=1;n<attempt;n++)g.answer(wrong()[n]);g.answer(g.state().queue[0]);assert.equal(g.state().score,4-attempt);assert(g.state().checked)}
g.start('triple');for(const id of wrong().slice(0,3))g.answer(id);assert(g.state().checked);assert.equal(g.state().score,0);
g.start('triple');g.hint();assert.equal(nodes.get('#hint').hidden,true);assert.equal(nodes.get('#answer').hidden,false);assert.equal(nodes.get('#answer').textContent,'Далее');assert(g.state().checked);g.hint();assert.equal(g.state().score,0);g.next();assert.equal(g.state().hintUsed,false);assert.equal(g.state().attempts,0);assert.equal(nodes.get('#hint').hidden,false);
g.start('single');g.answer(wrong()[0]);assert(g.state().checked);assert.equal(g.state().score,0);
g.start('single');g.answer(g.state().queue[0]);assert.equal(g.state().score,1);
g.start('triple');for(let i=0;i<10;i++){g.answer(g.state().queue[i]);g.next()}assert.equal(g.state().score,30);assert.equal(g.state().active,false);assert(nodes.get('#intro').textContent.includes('100%'));
assert.equal(nodes.get('.modes').hidden,true);assert.equal(nodes.get('#new-game').hidden,false);nodes.get('#new-game').onclick();assert.equal(nodes.get('.modes').hidden,false);assert.equal(nodes.get('#new-game').hidden,true);assert.equal(nodes.get('h1').textContent,'Геоквиз');
g.start('learn');g.answer(pool[0]);g.render();assert.equal(g.state().score,0);assert.equal(nodes.get('#hint').hidden,true);assert.equal(nodes.get('#answer').hidden,true);assert.equal(nodes.get('#progress').textContent,'Обучение');
context.matchMedia=()=>({matches:false});
const frames=[];context.requestAnimationFrame=callback=>{frames.push(callback);return frames.length};
vm.runInContext('longitude=170;latitude=0;k=3;rotateTo([-170,40])',context);
const turnDuration=Math.hypot(20,40)*3/60*1000;
for(const time of [0,turnDuration/4,turnDuration/2,turnDuration*3/4,turnDuration]){const callback=frames.shift();assert(callback);callback(time);const position=vm.runInContext('({longitude,latitude,k})',context);if(time===turnDuration/2){assert.equal(position.longitude,180);assert(Math.abs(position.latitude-20)<1e-10);assert(Math.abs(position.k-2)<1e-10)}}
assert.equal(vm.runInContext('longitude',context),190);assert.equal(vm.runInContext('latitude',context),40);assert.equal(frames.length,0);
// A 180-degree turn must stretch to 9 seconds for cubic easing.
vm.runInContext('longitude=0;latitude=0;k=1;rotateTo([180,0])',context);
let previous=0;
for(let time=0;time<=9000;time+=50){const callback=frames.shift();assert(callback);callback(time);const current=vm.runInContext('longitude',context);assert(Math.abs(current-previous)/.05<=60+1e-8);previous=current;}
assert.equal(Math.abs(previous),180);assert.equal(frames.length,0);
vm.runInContext('longitude=90;latitude=30;k=2',context);
g.start('single');assert.equal(g.state().active,false);assert.equal(nodes.get('footer').hidden,true);assert.equal(nodes.get('#question').textContent,'');
for(let time=0;frames.length&&time<15000;time+=50)frames.shift()(time);
assert.equal(g.state().active,true);assert.equal(nodes.get('footer').hidden,false);assert.equal(vm.runInContext('latitude',context),0);assert(Math.abs(vm.runInContext('longitude',context)%360)<1e-9);
context.matchMedia=()=>({matches:true});nodes.get('#menu').onclick();assert.equal(nodes.get('.hud').hidden,true);assert.equal(nodes.get('.zoom').hidden,true);assert.equal(nodes.get('#hint').hidden,true);
// Large islands/exclaves are independent answers; date-line cuts are not.
assert(g.territories.has('ITA:2'));assert.equal(g.territories.get('ITA:2').name,'Сардиния (Италия)');
assert(g.territories.has('RUS:8'));assert.equal(g.territories.get('RUS:8').name,'Калининградская область (Россия)');
assert(!g.territories.has('RUS:11')); // Chukotka joins mainland across ±180°.
assert(!g.territories.has('USA:3')); // Small island remains in main geometry.
g.start('single');vm.runInContext("queue[0]='ITA'",context);g.answer('ITA:2');assert.equal(g.state().score,0);assert(g.state().checked);
g.start('triple');vm.runInContext("queue[0]='RUS'",context);g.answer('RUS:8');assert.equal(g.state().checked,false);assert.equal(g.state().attempts,1);g.answer('RUS');assert.equal(g.state().score,2);
g.start('learn');vm.runInContext("selected='ITA:2';render()",context);assert.equal(nodes.get('#question').textContent,'Сардиния (Италия)');
assert.notEqual(g.paths.get('ITA'),g.paths.get('ITA:2'));
for(const [id,t]of g.territories)if(id.includes(':')){assert(!t.name.includes('отдельная территория'));assert(!t.name.includes('undefined'));assert(/\(.+\)$/.test(t.name));}
// Island states select and score as a whole, including every large island.
for(const code of ['JPN','IDN','PHL','NZL','PNG','GBR','FJI','BHS','SLB','VUT','AUS']){
 assert(g.territories.has(code));assert(![...g.territories.keys()].some(id=>id.startsWith(code+':')));
 const original=geometry.find(c=>c[0]===code)[2];
 assert.equal(g.territories.get(code).geometry.coordinates.length,original.type==='MultiPolygon'?original.coordinates.length:1);
}
g.start('single');vm.runInContext("queue[0]='JPN'",context);g.answer('JPN');assert.equal(g.state().score,1);
assert(g.territories.has('ITA:2'));assert(g.territories.has('RUS:8'));
// Fullscreen game layout follows the actual SVG viewport, not a fixed aspect ratio.
let viewportSize={width:400,height:800};nodes.get('svg').getBoundingClientRect=()=>viewportSize;
vm.runInContext('k=1;transform()',context);assert.equal(projection.scale(),400);
viewportSize={width:1200,height:700};vm.runInContext('transform()',context);assert.equal(projection.scale(),600);
// Location selection, navigation, pool membership and short rounds.
nodes.get('#menu').onclick();nodes.get('#mode-location').onclick();
assert.equal(nodes.get('.modes').hidden,true);assert.equal(nodes.get('.locations').hidden,false);
assert.equal(nodes.get('h1').textContent,'Выберите локацию');
nodes.get('#location-back').onclick();assert.equal(nodes.get('.modes').hidden,false);assert.equal(nodes.get('.locations').hidden,true);
assert.equal(g.locations.length,6);
const regionSizes={europe:13,africa:37,'south-america':12,'asia-mainland':26,'asia-islands':3,'middle-east':8};
for(const location of g.locations){
 const candidates=pool.filter(id=>location.countries.includes(id));
 assert.equal(candidates.length,regionSizes[location.id]);
 assert.equal(new Set(location.countries).size,location.countries.length);
 for(const id of location.countries){assert(pool.includes(id));assert(g.territories.has(id));}
 nodes.get('#mode-location').onclick();nodes.get('#location-'+location.id).onclick();
 assert.equal(g.state().mode,'location');assert.equal(g.state().active,true);
 assert.equal(vm.runInContext('latitude',context),location.center[1]);assert(Math.abs((vm.runInContext('longitude',context)-location.center[0])%360)<1e-9);
 assert.equal(g.state().queue.length,Math.min(10,candidates.length));assert.equal(new Set(g.state().queue).size,g.state().queue.length);
 for(const id of g.state().queue)assert(candidates.includes(id));
 for(let i=0;i<g.state().queue.length;i++){g.answer(g.state().queue[i]);g.next();}
 assert.equal(g.state().active,false);assert.equal(g.state().score,Math.min(10,candidates.length));
 assert(nodes.get('#intro').textContent.includes('100%'));
 assert.equal(nodes.get('.locations').hidden,true);assert.equal(nodes.get('#new-game').hidden,false);
 nodes.get('#new-game').onclick();assert.equal(nodes.get('.locations').hidden,true);assert.equal(nodes.get('.modes').hidden,false);
}
nodes.get('#location-asia-islands').onclick();g.hint();g.next();g.answer(g.state().queue[1]);g.next();g.answer(wrong()[0]);assert(g.state().checked);g.next();assert.equal(g.state().score,1);assert(nodes.get('#intro').textContent.includes('33%'));assert(nodes.get('#intro').textContent.includes('из 3'));
const mainland=g.locations.find(l=>l.id==='asia-mainland').countries;
for(const id of g.locations.find(l=>l.id==='asia-islands').countries)assert(!mainland.includes(id));
g.start('single');assert.equal(g.state().queue.length,10);g.start('triple');assert.equal(g.state().queue.length,10);
// Location introduction animates toward its region and reveals the quiz afterward.
context.matchMedia=()=>({matches:false});vm.runInContext('longitude=0;latitude=0',context);
nodes.get('#location-south-america').onclick();assert.equal(g.state().active,false);assert.equal(nodes.get('footer').hidden,true);
for(let time=0;frames.length&&time<15000;time+=50)frames.shift()(time);
assert.equal(g.state().active,true);assert.equal(vm.runInContext('longitude',context),-60);assert.equal(vm.runInContext('latitude',context),-20);
// All location answer geometries fit the safe viewport in both orientations.
context.matchMedia=()=>({matches:true});
assert(!g.locations.find(l=>l.id==='europe').countries.includes('RUS'));
for(const size of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
 viewportSize=size;
 for(const location of g.locations){
  nodes.get('#location-'+location.id).onclick();
  const features={type:'FeatureCollection',features:location.countries.map(id=>({type:'Feature',geometry:g.territories.get(id).geometry}))};
  const bounds=geoContext.library.geoPath(projection).bounds(features);
  assert(bounds[0][0]>=15);assert(bounds[1][0]<=size.width-15);
  assert(bounds[0][1]>=139);assert(bounds[1][1]<=size.height-109);
 }
}
nodes.get('#menu').onclick();assert(projection.scale()<Math.min(viewportSize.width,viewportSize.height)/2);
console.log('OK: top-100 geometry, modes, attempts, scoring, hints, reset and final results');
