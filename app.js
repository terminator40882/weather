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
    current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    minutely_15:'precipitation',
    hourly:'temperature_2m,precipitation_probability,weather_code,dew_point_2m,visibility',
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

/* ---------- render ---------- */
function renderCurrent(d){
  const c = d.current, day = c.is_day === 1;
  const w = wmo(c.weather_code, day);
  $('temp').textContent = r0(c.temperature_2m);
  $('heroGlyph').textContent = w.glyph;
  $('condition').textContent = w.label;
  $('feels').textContent = 'gefühlt '+r0(c.apparent_temperature)+'°';
  $('wind').textContent = r0(c.wind_speed_10m);
  $('gust').textContent = r0(c.wind_gusts_10m)+' km/h';
  $('windDir').textContent = compass(c.wind_direction_10m);
  $('windArrow').style.transform = `rotate(${(c.wind_direction_10m||0)+180}deg)`;
  $('humidity').textContent = r0(c.relative_humidity_2m);
  $('pressure').textContent = r0(c.surface_pressure);
  applySky(c.weather_code, day);

  // dew point + visibility from hourly at current hour
  const idx = nearestHourIdx(d.hourly.time);
  if(idx>=0){
    $('dew').textContent = r0(d.hourly.dew_point_2m[idx])+'°';
    const v = d.hourly.visibility[idx];
    $('vis').textContent = v==null ? '--' : (v>=1000 ? (v/1000).toFixed(0)+' km' : v+' m');
  }
}
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

function renderDaily(d){
  const wrap=$('daily'); wrap.innerHTML='';
  const dd=d.daily;
  const lo=Math.min(...dd.temperature_2m_min), hi=Math.max(...dd.temperature_2m_max);
  const span=Math.max(1,hi-lo);
  dd.time.forEach((t,i)=>{
    const w=wmo(dd.weather_code[i], true);
    const dname=i===0?'Heute':new Date(t).toLocaleDateString('de-DE',{weekday:'short'});
    const l=dd.temperature_2m_min[i], h=dd.temperature_2m_max[i];
    const left=((l-lo)/span)*100, width=((h-l)/span)*100;
    const el=document.createElement('div'); el.className='dy';
    el.innerHTML=`<span class="d">${dname}</span>
      <span class="g">${w.glyph}</span>
      <span class="range"><span class="lo">${r0(l)}°</span>
        <span class="bar"><i style="left:${left}%;width:${Math.max(6,width)}%"></i></span>
        <span class="hi">${r0(h)}°</span></span>`;
    wrap.appendChild(el);
  });
}

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
let CURRENT=null;
async function load(){
  document.body.classList.add('loading');
  try{
    const loc = CURRENT || await getLocation();
    CURRENT = loc;
    const [wx, alerts] = await Promise.all([
      fetchWeather(loc.lat, loc.lon),
      fetchAlerts(loc.lat, loc.lon)
    ]);
    $('place').textContent = loc.name || await placeName(loc.lat, loc.lon);
    renderCurrent(wx); renderNowcast(wx); renderHourly(wx); renderDaily(wx);
    renderAlerts(alerts);
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

/* ---------- init ---------- */
tick(); setInterval(tick, 15000);
load();
setInterval(load, REFRESH_MS);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) load(); });

/* ---------- service worker ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
