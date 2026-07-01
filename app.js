'use strict';

/* ---------- config ---------- */
const FALLBACK = { lat: 50.1109, lon: 8.6821, name: 'Frankfurt am Main' };
const REFRESH_MS = 10 * 60 * 1000;

/* ---------- WMO weather codes ---------- */
const WMO = {
  0:['Klar','☀️','🌙'], 1:['Überwiegend klar','🌤️','🌙'], 2:['Teils bewölkt','⛅','☁️'],
  3:['Bedeckt','☁️','☁️'], 45:['Nebel','🌫️','🌫️'], 48:['Reifnebel','🌫️','🌫️'],
  51:['Leichter Niesel','🌦️','🌦️'], 53:['Niesel','🌦️','🌦️'], 55:['Starker Niesel','🌧️','🌧️'],
  56:['Gefr. Niesel','🌧️','🌧️'], 57:['Gefr. Niesel','🌧️','🌧️'],
  61:['Leichter Regen','🌦️','🌧️'], 63:['Regen','🌧️','🌧️'], 65:['Starker Regen','🌧️','🌧️'],
  66:['Gefr. Regen','🌧️','🌧️'], 67:['Gefr. Regen','🌧️','🌧️'],
  71:['Leichter Schnee','🌨️','🌨️'], 73:['Schnee','🌨️','🌨️'], 75:['Starker Schnee','❄️','❄️'],
  77:['Schneegriesel','🌨️','🌨️'],
  80:['Schauer','🌦️','🌧️'], 81:['Schauer','🌧️','🌧️'], 82:['Heftige Schauer','⛈️','⛈️'],
  85:['Schneeschauer','🌨️','🌨️'], 86:['Schneeschauer','❄️','❄️'],
  95:['Gewitter','⛈️','⛈️'], 96:['Gewitter, Hagel','⛈️','⛈️'], 99:['Gewitter, Hagel','⛈️','⛈️']
};
const wmo = (c, day) => { const e = WMO[c] || ['—','·','·']; return { label:e[0], glyph: day ? e[1] : e[2] }; };

/* WMO code -> Meteocons (bundled in vendor/icons), daytime variants for the 7-day view.
   Meteocons has no light/heavy tiers, so intensity is approximated with the two
   available levels: 'partly-cloudy-day-X' (light/intermittent) vs the fuller 'X'. */
const WMO_ICON = {
  0:'clear-day', 1:'clear-day', 2:'partly-cloudy-day', 3:'overcast-day',
  45:'fog', 48:'fog',
  // drizzle: light -> partly-cloudy variant, moderate/heavy -> drizzle; freezing -> sleet
  51:'partly-cloudy-day-drizzle', 53:'drizzle', 55:'drizzle',
  56:'partly-cloudy-day-sleet', 57:'sleet',
  // rain: light -> partly-cloudy, moderate/heavy -> rain; freezing -> sleet
  61:'partly-cloudy-day-rain', 63:'rain', 65:'rain',
  66:'partly-cloudy-day-sleet', 67:'sleet',
  // snow: light -> partly-cloudy, moderate/heavy -> snow
  71:'partly-cloudy-day-snow', 73:'snow', 75:'snow', 77:'snow',
  // showers are intermittent by nature -> partly-cloudy for light, fuller otherwise
  80:'partly-cloudy-day-rain', 81:'rain', 82:'rain',
  85:'partly-cloudy-day-snow', 86:'snow',
  // thunderstorms: dry vs with precipitation/hail
  95:'thunderstorms-day', 96:'thunderstorms-day-rain', 99:'thunderstorms-rain'
};
const wxIcon = c => `vendor/icons/${WMO_ICON[c] || 'overcast-day'}.svg`;

/* ---------- dynamic sky palettes ---------- */
function skyFor(code, isDay){
  if(!isDay) return ['#0c1322','#141f33','#22324a','rgba(150,170,210,.10)'];
  if([0,1].includes(code))      return ['#1d3a63','#2f5d8c','#5a93bf','rgba(232,178,122,.22)'];
  if([2].includes(code))        return ['#243a55','#33526f','#5c7d98','rgba(232,178,122,.16)'];
  if([3,45,48].includes(code))  return ['#2b3744','#3c4956','#5a6776','rgba(232,178,122,.08)'];
  if(code>=51 && code<=82)      return ['#222e3c','#33414f','#4d5d6b','rgba(95,176,230,.14)'];
  if(code>=95)                  return ['#1b2330','#2a3340','#3e4a59','rgba(212,98,42,.16)'];
  if(code>=71 && code<=86)      return ['#34404f','#46535f','#6a7682','rgba(238,242,247,.16)'];
  return ['#1b2942','#243752','#3d5774','rgba(232,178,122,.18)'];
}
function applySky(code, isDay){
  const [t,m,b,g] = skyFor(code, isDay);
  const s = document.documentElement.style;
  s.setProperty('--sky-top',t); s.setProperty('--sky-mid',m);
  s.setProperty('--sky-bot',b); s.setProperty('--sky-glow',g);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', t);
}

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const r0 = n => (n==null || isNaN(n)) ? '--' : Math.round(n);
const compass = deg => ['N','NO','O','SO','S','SW','W','NW'][Math.round(((deg%360)/45))%8];
function toast(msg){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(t._h); t._h=setTimeout(()=>t.hidden=true,3200); }

function tick(){ const d=new Date(); $('clock').textContent =
  d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }

/* ---------- location ---------- */
function getLocation(){
  return new Promise(resolve=>{
    if(!navigator.geolocation) return resolve(FALLBACK);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat:p.coords.latitude, lon:p.coords.longitude, name:null }),
      () => { toast('Standort nicht verfügbar — zeige '+FALLBACK.name); resolve(FALLBACK); },
      { timeout:8000, maximumAge:600000 }
    );
  });
}
async function placeName(lat, lon){
  try{
    const u = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=de`;
    const r = await fetch(u); const j = await r.json();
    return j.city || j.locality || j.principalSubdivision || 'Mein Standort';
  }catch{ return 'Mein Standort'; }
}

/* ---------- data ---------- */
async function fetchWeather(lat, lon){
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude:lat, longitude:lon, timezone:'auto', forecast_days:7,
    current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    minutely_15:'precipitation',
    hourly:'temperature_2m,precipitation_probability,weather_code,dew_point_2m',
    daily:'weather_code,temperature_2m_max,temperature_2m_min'
  }).toString();
  const r = await fetch(u); if(!r.ok) throw new Error('Open-Meteo '+r.status);
  return r.json();
}
async function fetchAlerts(lat, lon){
  try{
    const r = await fetch(`https://api.brightsky.dev/alerts?lat=${lat}&lon=${lon}`);
    if(!r.ok) return [];
    const j = await r.json(); return j.alerts || [];
  }catch{ return []; }
}
// DWD station measurements via Bright Sky — a second, independent provider.
async function fetchDwdCurrent(lat, lon){
  try{
    const r = await fetch(`https://api.brightsky.dev/current_weather?lat=${lat}&lon=${lon}`);
    if(!r.ok) return null;
    const j = await r.json(); return j.weather || null;
  }catch{ return null; }
}

/* ---------- render ---------- */
function renderCurrent(d){
  const c = d.current, day = c.is_day === 1;
  const w = wmo(c.weather_code, day);
  $('temp').textContent = r0(c.temperature_2m);
  $('heroGlyph').textContent = w.glyph;
  $('condition').textContent = w.label;
  $('feels').textContent = 'gefühlt '+r0(c.apparent_temperature)+'°';
  applySky(c.weather_code, day);

  // dew point from hourly at the current hour (Open-Meteo has no dew point in `current`)
  const idx = nearestHourIdx(d.hourly.time);
  LAST_DEW_OM = idx>=0 ? d.hourly.dew_point_2m[idx] : null;
}

// Wind + Feuchte are shown from one of two independent providers, switchable
// via #srcToggle. Open-Meteo's `current` block has no dew point, so that one
// value is taken from the hourly series regardless of the active source... unless
// DWD is active and provides its own station dew point.
let dataSrc='om', LAST_OM=null, LAST_DWD=null, LAST_DEW_OM=null;

function renderReadouts(){
  const om=LAST_OM, dwd=LAST_DWD;
  const useDwd = dataSrc==='dwd' && dwd;
  const wind = useDwd ? dwd.wind_speed_10 : om && om.wind_speed_10m;
  const gust = useDwd ? dwd.wind_gust_speed_10 : om && om.wind_gusts_10m;
  const dir  = useDwd ? dwd.wind_direction_10 : om && om.wind_direction_10m;
  const hum  = useDwd ? dwd.relative_humidity : om && om.relative_humidity_2m;
  const dew  = useDwd ? dwd.dew_point : LAST_DEW_OM;

  $('wind').textContent = r0(wind);
  $('gust').textContent = r0(gust)+' km/h';
  $('windDir').textContent = dir==null ? '—' : compass(dir);
  lastWindDir = dir; applyWindRotation();
  $('humidity').textContent = r0(hum);
  $('dew').textContent = (dew==null ? '--' : r0(dew))+'°';

  const cap=$('srcCaption');
  if(cap) cap.textContent = useDwd
    ? 'Wind & Feuchte: DWD Messnetz (via Bright Sky)'
    : 'Wind & Feuchte: Open-Meteo (Modell DWD ICON-D2)';
  const btn=$('srcToggle');
  if(btn) btn.textContent = useDwd ? 'Zu Open-Meteo wechseln' : 'Zu DWD wechseln';
}

$('srcToggle').addEventListener('click', ()=>{
  const target = dataSrc==='om' ? 'dwd' : 'om';
  if(target==='dwd' && !LAST_DWD){ toast('DWD-Daten nicht verfügbar.'); return; }
  dataSrc = target;
  renderReadouts();
});
function nearestHourIdx(times){
  const now = Date.now();
  let best=-1, bd=Infinity;
  for(let i=0;i<times.length;i++){
    const diff = Math.abs(new Date(times[i]).getTime()-now);
    if(diff<bd){bd=diff;best=i;}
  }
  return best;
}

function renderNowcast(d){
  const strip=$('rainStrip'); strip.innerHTML='';
  const m=d.minutely_15; if(!m){ $('nowcastSummary').textContent=''; return; }
  const now=Date.now();
  let start=m.time.findIndex(t=>new Date(t).getTime()>=now-15*60000);
  if(start<0) start=0;
  const slice = m.precipitation.slice(start, start+8);
  const max = Math.max(0.5, ...slice.map(v=>v||0));
  let total=0, firstRain=-1;
  slice.forEach((v,i)=>{
    const val=v||0; total+=val; if(val>0.05 && firstRain<0) firstRain=i;
    const bar=document.createElement('div');
    bar.className='rain-bar'+(val>0.05?'':' dry');
    bar.style.height=(val>0.05 ? Math.max(8,(val/max)*100) : 4)+'%';
    bar.style.animationDelay=(i*0.04)+'s';
    bar.title=`${val.toFixed(1)} mm`;
    strip.appendChild(bar);
  });
  $('nowcastSummary').textContent =
    total<0.1 ? 'trocken' :
    firstRain<=0 ? 'Regen jetzt' : `Regen in ~${firstRain*15} min`;
}

function renderHourly(d){
  const wrap=$('hourly'); wrap.innerHTML='';
  const h=d.hourly, idx=nearestHourIdx(h.time);
  for(let i=idx;i<Math.min(idx+12,h.time.length);i++){
    const day = isDaytime(d, h.time[i]);
    const w=wmo(h.weather_code[i], day);
    const el=document.createElement('div'); el.className='hr';
    const hour=new Date(h.time[i]).toLocaleTimeString('de-DE',{hour:'2-digit'});
    const p=h.precipitation_probability[i];
    el.innerHTML=`<span class="t">${i===idx?'jetzt':hour}</span>
      <span class="g">${w.glyph}</span>
      <span class="v">${r0(h.temperature_2m[i])}°</span>
      <span class="p">${p>5?p+'%':''}</span>`;
    wrap.appendChild(el);
  }
}
function isDaytime(d, iso){
  const hr=new Date(iso).getHours(); return hr>=7 && hr<20;
}

// rough "how notable is this weather" ranking, to pick a representative code per
// part of day from the hourly series (higher wins).
const WMO_RANK = {0:0,1:1,2:2,3:3,45:4,48:4,51:5,53:6,55:7,56:7,57:8,
  61:6,63:8,65:10,66:8,67:10,71:6,73:8,75:10,77:6,
  80:7,81:9,82:11,85:7,86:9,95:12,96:13,99:14};
const rank = c => WMO_RANK[c] ?? 0;
// four 6-hour parts of the day
const DAY_PARTS = [['nachts',0,5],['morgens',6,11],['mittags',12,17],['abends',18,23]];

// weather codes within [h0,h1] of the given local date
function sectionCodes(hourly, date, h0, h1){
  const out=[];
  if(!hourly || !hourly.time) return out;
  for(let k=0;k<hourly.time.length;k++){
    const t=hourly.time[k];
    if(t.slice(0,10)!==date) continue;
    const hr=+t.slice(11,13);
    if(hr>=h0 && hr<=h1) out.push(hourly.weather_code[k]);
  }
  return out;
}

// main = the average/dominant condition (mode, calmer one on ties);
// extras = up to 2 distinct codes more notable than the main, most extreme first
function partSummary(codes){
  if(!codes.length) return null;
  const freq={}; codes.forEach(c=>freq[c]=(freq[c]||0)+1);
  let main=codes[0], bestF=-1;
  Object.keys(freq).forEach(k=>{ const c=+k, f=freq[k];
    if(f>bestF || (f===bestF && rank(c)<rank(main))){ bestF=f; main=c; }
  });
  const extras=[...new Set(codes)]
    .filter(c=>rank(c)>rank(main))
    .sort((a,b)=>rank(b)-rank(a))
    .slice(0,2);
  return { main, extras };
}

function renderDaily(d){
  const wrap=$('daily'); wrap.innerHTML='';
  const dd=d.daily, h=d.hourly;
  const lo=Math.min(...dd.temperature_2m_min), hi=Math.max(...dd.temperature_2m_max);
  const span=Math.max(1,hi-lo);
  dd.time.forEach((t,i)=>{
    const date=String(t).slice(0,10);
    const dname=i===0?'Heute':new Date(t).toLocaleDateString('de-DE',{weekday:'short'});
    const l=dd.temperature_2m_min[i], hh=dd.temperature_2m_max[i];
    const left=((l-lo)/span)*100, width=((hh-l)/span)*100;
    const parts = DAY_PARTS.map(([lbl,a,b])=>{
      const s = partSummary(sectionCodes(h,date,a,b)) || {main:dd.weather_code[i], extras:[]};
      const wMain = wmo(s.main, true);
      const extras = s.extras.map(c=>{
        const wx=wmo(c,true);
        return `<img class="dy-xic" src="${wxIcon(c)}" alt="${wx.label}" title="${wx.label}" width="22" height="22" loading="lazy" />`;
      }).join('');
      return `<button class="dy-part" type="button" data-date="${date}" data-h0="${a}" data-h1="${b}" data-lbl="${lbl}">
        <img class="dy-ic" src="${wxIcon(s.main)}" alt="${wMain.label}" title="${lbl}: ${wMain.label}" width="48" height="48" loading="lazy" />
        <span class="dy-extra">${extras}</span>
        <span class="lbl">${lbl}</span></button>`;
    }).join('');
    const el=document.createElement('div'); el.className='dy';
    el.innerHTML=`<div class="dy-top">
        <span class="d">${dname}</span>
        <span class="range"><span class="lo">${r0(l)}°</span>
          <span class="bar"><i style="left:${left}%;width:${Math.max(6,width)}%"></i></span>
          <span class="hi">${r0(hh)}°</span></span>
      </div>
      <div class="dy-parts">${parts}</div>
      <div class="dy-detail" hidden></div>`;
    wrap.appendChild(el);
  });
}

// clicking a 6h part highlights it and expands an hourly breakdown for that
// window below its day row; expanding a new one collapses whichever was open.
$('daily').addEventListener('click', e=>{
  const btn = e.target.closest('.dy-part'); if(!btn) return;
  const dy = btn.closest('.dy');
  const detail = dy.querySelector('.dy-detail');
  const wasActive = btn.classList.contains('active');

  document.querySelectorAll('#daily .dy-part.active').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#daily .dy-detail').forEach(p=>{ p.hidden=true; p.innerHTML=''; });
  if(wasActive) return; // toggled off

  btn.classList.add('active');
  const { date, h0, h1, lbl } = btn.dataset;
  const h = LAST_WX && LAST_WX.hourly;
  if(!h){ detail.hidden=false; detail.innerHTML='<p class="dy-empty">Keine Daten.</p>'; return; }
  const rows=[];
  for(let k=0;k<h.time.length;k++){
    const tt=h.time[k]; if(tt.slice(0,10)!==date) continue;
    const hr=+tt.slice(11,13); if(hr<+h0 || hr>+h1) continue;
    rows.push(k);
  }
  detail.innerHTML = rows.length ? rows.map(k=>{
    const day = isDaytime(null, h.time[k]);
    const w = wmo(h.weather_code[k], day);
    const hhmm = new Date(h.time[k]).toLocaleTimeString('de-DE',{hour:'2-digit'});
    return `<div class="dy-hr">
      <span class="t">${hhmm}</span>
      <img class="ic" src="${wxIcon(h.weather_code[k])}" alt="${w.label}" title="${w.label}" width="34" height="34" loading="lazy" />
      <span class="v">${r0(h.temperature_2m[k])}°</span>
    </div>`;
  }).join('') : `<p class="dy-empty">Keine Stundendaten für ${lbl}.</p>`;
  detail.hidden=false;
});

function renderAlerts(alerts){
  const box=$('alerts');
  if(!alerts.length){ box.hidden=true; box.innerHTML=''; return; }
  const sevMap={Minor:1,Moderate:2,Severe:3,Extreme:4};
  box.innerHTML='';
  alerts.slice(0,3).forEach(a=>{
    const sev=sevMap[a.severity]||1;
    const el=document.createElement('div');
    el.className='alert-item sev-'+sev;
    const head=a.event_de||a.event_en||a.headline_de||'Wetterwarnung';
    const body=a.description_de||a.headline_de||'';
    el.innerHTML=`<div class="a-head">⚠ ${head}</div>${body?`<div class="a-body">${body}</div>`:''}`;
    box.appendChild(el);
  });
  box.hidden=false;
}

/* ---------- orchestration ---------- */
let CURRENT=null, LAST_WX=null;
async function load(){
  document.body.classList.add('loading');
  try{
    const loc = CURRENT || await getLocation();
    CURRENT = loc;
    const [wx, alerts, dwd] = await Promise.all([
      fetchWeather(loc.lat, loc.lon),
      fetchAlerts(loc.lat, loc.lon),
      fetchDwdCurrent(loc.lat, loc.lon)
    ]);
    LAST_WX = wx; LAST_OM = wx.current; LAST_DWD = dwd;
    $('place').textContent = loc.name || await placeName(loc.lat, loc.lon);
    renderCurrent(wx); renderReadouts();
    renderNowcast(wx); renderHourly(wx); renderDaily(wx);
    renderAlerts(alerts);
    updateMaps(loc);
  }catch(e){
    console.error(e);
    toast('Wetterdaten konnten nicht geladen werden. Tippe auf Aktualisieren.');
  }finally{
    document.body.classList.remove('loading');
  }
}

/* ---------- controls ---------- */
$('refresh').addEventListener('click', load);
$('fs').addEventListener('click', async ()=>{
  try{
    if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }catch{ toast('Vollbild wird hier nicht unterstützt.'); }
});

/* ---------- weather maps (switchable RainViewer / DWD radar + satellite) ---------- */
const RV_API = 'https://api.rainviewer.com/public/weather-maps.json';
const DWD_WMS = 'https://maps.dwd.de/geoserver/dwd/wms';
// RainViewer radar tiles top out at a low zoom; keep the view zoomed out so the
// "Zoom level not supported" placeholder never appears, and cap the native zoom.
const RADAR_ZOOM = 7, RADAR_MAX_NATIVE = 8;
// DWD timeline: 5-min product; show recent past + ~90 min forecast, 15-min steps.
const DWD_STEP = 15*60000, DWD_BACK = 90*60000, DWD_FWD = 90*60000;

const RV_OPACITY = .7, DWD_OPACITY = .75;
let radarMap=null, radarDot=null, radarSized=false, radarSource='dwd', radarShownIdx=0;
// one Leaflet layer per timeline frame, all preloaded at opacity 0 → scrubbing
// only toggles opacity, so no tile reloads / stutter while swiping the timeline.
let rvFrames=[], rvLayers=[], rvNowIdx=0, rvKey='';
let dwdFrames=[], dwdLayers=[], dwdNowIdx=0, dwdKey='';

function baseTiles(){
  return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {subdomains:'abcd', maxZoom:19, attribution:'© OpenStreetMap, © CARTO'});
}
function locDot(){
  return L.circleMarker([FALLBACK.lat, FALLBACK.lon],
    {radius:5, color:'#e8b27a', weight:2, fillColor:'#e8b27a', fillOpacity:.9});
}
function plainMap(id){
  const el=$(id); if(!el) return null;
  return L.map(el, {zoomControl:false, scrollWheelZoom:false, doubleClickZoom:false,
    attributionControl:true, fadeAnimation:false});
}

function buildDwdFrames(){
  const now = Date.now();
  const base = Math.round(now/(5*60000))*(5*60000); // snap to DWD's 5-min grid
  dwdFrames = []; dwdNowIdx = 0;
  for(let t=base-DWD_BACK; t<=base+DWD_FWD; t+=DWD_STEP){
    const snap = Math.round(t/(5*60000))*(5*60000);
    if(Math.abs(snap-base) < DWD_STEP/2) dwdNowIdx = dwdFrames.length;
    dwdFrames.push({ time:snap, future: snap > base, iso:new Date(snap).toISOString() });
  }
}

function addLayers(arr){ if(radarMap) arr.forEach(l=>l.addTo(radarMap)); }
function removeLayers(arr){ if(radarMap) arr.forEach(l=>radarMap.removeLayer(l)); }

// (Re)build the preloaded layer pool for a source. Adding every frame layer to
// the map (at opacity 0) makes the browser fetch all tiles up front.
function buildRvLayers(){
  const key = rvFrames.map(f=>f.url).join('|');
  if(key===rvKey && rvLayers.length) return;
  rvKey = key;
  removeLayers(rvLayers);
  rvLayers = rvFrames.map(f => L.tileLayer(f.url,
    {opacity:0, maxNativeZoom:RADAR_MAX_NATIVE, maxZoom:19, zIndex:300}));
  if(radarSource==='rv') addLayers(rvLayers);
}
function buildDwdLayers(){
  const key = dwdFrames.map(f=>f.iso).join('|');
  if(key===dwdKey && dwdLayers.length) return;
  dwdKey = key;
  removeLayers(dwdLayers);
  dwdLayers = dwdFrames.map(f => L.tileLayer.wms(DWD_WMS,
    {layers:'dwd:Niederschlagsradar', format:'image/png', transparent:true,
     version:'1.3.0', time:f.iso, opacity:0, zIndex:300, attribution:'DWD'}));
  if(radarSource==='dwd') addLayers(dwdLayers);
}

function initMaps(){
  if(typeof L === 'undefined') return;
  if(!radarMap){
    radarMap = plainMap('map');
    if(radarMap){
      baseTiles().addTo(radarMap);
      radarMap.setView([FALLBACK.lat, FALLBACK.lon], RADAR_ZOOM);
      radarDot = locDot().addTo(radarMap);
      buildDwdFrames(); buildDwdLayers();
      setRadarSource('dwd');
      loadRvFrames(); // preload RainViewer frames in the background too, so switching is instant
    }
  }
}

async function loadRvFrames(){
  try{
    const r = await fetch(RV_API); if(!r.ok) return;
    const j = await r.json();
    const host = j.host;
    const past = (j.radar && j.radar.past) || [];
    const soon = (j.radar && j.radar.nowcast) || [];
    rvFrames = past.concat(soon).map((f,i)=>({
      time: f.time*1000,
      future: i >= past.length,
      url: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`
    }));
    rvNowIdx = Math.max(0, past.length-1); // last observation ≈ now
    buildRvLayers();
    if(radarSource==='rv') syncScrubber();
  }catch{ /* base map stays without overlay */ }
}

function radarFrames(){ return radarSource==='rv' ? rvFrames : dwdFrames; }
function activeLayers(){ return radarSource==='rv' ? rvLayers : dwdLayers; }
function radarNowIdx(){ return radarSource==='rv' ? rvNowIdx : dwdNowIdx; }

function showFrame(i){
  const fr = radarFrames(); const layers = activeLayers();
  const f = fr[i]; if(!f || !layers[i]) return;
  const op = radarSource==='rv' ? RV_OPACITY : DWD_OPACITY;
  layers.forEach((l,k)=>l.setOpacity(k===i ? op : 0)); // preloaded → instant swap
  radarShownIdx = i;
  const lbl=$('radarTime');
  if(lbl){
    const hhmm = new Date(f.time).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
    const isNow = i === radarNowIdx();
    lbl.textContent = (isNow ? 'jetzt · ' : f.future ? '+ ' : '') + hhmm;
  }
  const s=$('radarSlider'); if(s && +s.value !== i) s.value = i;
}

// reflect the active source's frame list on the scrubber, parked at "now"
function syncScrubber(){
  const fr = radarFrames(); const s = $('radarSlider'); if(!s) return;
  if(!fr.length){ s.max = 0; return; }
  s.max = fr.length-1;
  s.value = radarNowIdx();
  showFrame(radarNowIdx());
}

function setRadarSource(src){
  radarSource = src;
  $('srcRv').classList.toggle('on', src==='rv');
  $('srcDwd').classList.toggle('on', src==='dwd');
  removeLayers(src==='rv' ? dwdLayers : rvLayers);
  addLayers(src==='rv' ? rvLayers : dwdLayers);
  const cr=$('radarCredit');
  if(cr) cr.textContent = src==='rv'
    ? 'Niederschlagsradar — RainViewer'
    : 'Niederschlagsradar — Deutscher Wetterdienst (DWD)';
  syncScrubber();
}

function updateMaps(loc){
  initMaps();
  const c=[loc.lat, loc.lon];
  if(radarMap){ radarDot.setLatLng(c); radarMap.setView(c, RADAR_ZOOM, {animate:false}); }
  buildDwdFrames(); buildDwdLayers();
  if(radarSource==='rv') loadRvFrames(); else syncScrubber();
  if(!radarSized){ radarSized=true; setTimeout(()=>{ if(radarMap) radarMap.invalidateSize(); }, 200); }
}

$('srcRv').addEventListener('click', ()=>setRadarSource('rv'));
$('srcDwd').addEventListener('click', ()=>setRadarSource('dwd'));
$('radarSlider').addEventListener('input', e=>showFrame(+e.target.value));

/* ---------- compass: align the wind arrow to the viewing direction ---------- */
let lastWindDir=null, devHeading=null, headingOn=false;

function applyWindRotation(){
  const a=$('windArrow'); if(!a || lastWindDir==null) return;
  const base = lastWindDir + 180; // arrow points the way the wind blows to
  a.style.transform = `rotate(${headingOn && devHeading!=null ? base - devHeading : base}deg)`;
}
function onOrient(e){
  let h=null;
  if(typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;      // iOS
  else if(e.absolute === true && typeof e.alpha === 'number') h = (360 - e.alpha) % 360; // absolute orientation
  if(h==null) return;
  devHeading = h;
  if(!headingOn){ headingOn=true; $('app').classList.add('compass-on'); }
  applyWindRotation();
}
function attachOrient(){
  window.addEventListener('deviceorientationabsolute', onOrient, true);
  window.addEventListener('deviceorientation', onOrient, true);
}
function initCompass(){
  if(!('DeviceOrientationEvent' in window)) return;
  if(typeof DeviceOrientationEvent.requestPermission === 'function'){
    const b=$('compass'); if(!b) return;
    b.hidden=false; // iOS needs an explicit, gesture-triggered grant
    b.addEventListener('click', async ()=>{
      try{
        const res = await DeviceOrientationEvent.requestPermission();
        if(res==='granted'){ attachOrient(); b.classList.add('on'); b.textContent='Kompass ✓'; }
        else toast('Kompass-Zugriff abgelehnt.');
      }catch{ toast('Kompass wird hier nicht unterstützt.'); }
    });
  }else{
    attachOrient(); // Android / others: no explicit permission needed
  }
}

/* ---------- init ---------- */
tick(); setInterval(tick, 15000);
initCompass();
initMaps();   // bring up the maps independently of the weather fetch
load();
setInterval(load, REFRESH_MS);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) load(); });

/* ---------- service worker ---------- */
if('serviceWorker' in navigator){
  // Our SW calls clients.claim() on activate, which fires 'controllerchange'
  // even on a brand-new, first-ever visit (uncontrolled page gaining a
  // controller) — not just on genuine updates. Only auto-reload when this
  // page was ALREADY controlled by a previous SW, i.e. a real version swap;
  // otherwise a fresh visit would reload itself for no reason.
  const hadController = !!navigator.serviceWorker.controller;
  let swReloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(!hadController || swReloaded) return;
    swReloaded=true; location.reload();
  });
  // updateViaCache:'none' stops the browser's own HTTP cache from serving a
  // stale sw.js for up to 24h, which otherwise delays picking up new deploys.
  window.addEventListener('load', async ()=>{
    try{
      const reg = await navigator.serviceWorker.register('sw.js', {updateViaCache:'none'});
      reg.update();
      document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) reg.update(); });
    }catch{}
  });
}
