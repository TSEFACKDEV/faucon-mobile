/* =====================================================================
   ICÔNES — mini librairie SVG inline au style "lucide" (stroke 2px)
   ===================================================================== */
const ICONS = {
  falcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L4 14 L12 11 L20 14 Z"/><path d="M12 11 L12 22"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 14 8 14 10 6 14 20 17 10 22 10"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="17" height="10" rx="2"/><line x1="22" y1="10.5" x2="22" y2="13.5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><polyline points="3 8 12 13 21 8"/><line x1="12" y1="13" x2="12" y2="22"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`
};

/* =====================================================================
   DONNÉES — flotte de conteneurs (simulation)
   ===================================================================== */
const containers = [
  { id:'4821', name:'Container 4821', status:'moving',  speed:47, battery:82, updated:2,
    path:[[43.296,5.370],[43.24,4.9],[43.05,4.3],[42.6,3.6],[41.9,3.1],[41.38,2.17]] },
  { id:'3390', name:'Container 3390', status:'transit', speed:32, battery:65, updated:6,
    path:[[43.30,5.36],[43.55,6.8],[43.9,8.2],[44.41,8.93]] },
  { id:'1187', name:'Container 1187', status:'stopped',  speed:0,  battery:91, updated:14,
    path:[[41.38,2.17],[41.38,2.17]] },
  { id:'5502', name:'Container 5502', status:'moving',  speed:55, battery:44, updated:1,
    path:[[43.70,7.27],[43.55,6.9],[43.30,5.9],[43.10,5.3],[42.7,4.4]] },
  { id:'2264', name:'Container 2264', status:'transit', speed:28, battery:77, updated:4,
    path:[[43.13,5.93],[43.20,5.6],[43.29,5.37]] },
];

const STATUS_LABEL = { moving:'En mouvement', transit:'En transit', stopped:'À l\u2019arrêt' };
const STATUS_CLASS = { moving:'moving', transit:'transit', stopped:'stopped' };

/* =====================================================================
   CARTE — initialisation Leaflet
   ===================================================================== */
const map = L.map('map', {
  zoomControl:false,
  attributionControl:false,
  center:[42.9, 4.6],
  zoom:7,
  minZoom:3,
  maxZoom:15,
  zoomAnimation:true,
  zoomSnap:0.25
});

const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  subdomains:'abcd', maxZoom:19
}).addTo(map);

const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom:19
});

/* Petit fond bleu clair pour évoquer la mer, sous les tuiles (visible sur zoom faible) */
document.getElementById('map').style.background = '#CFE8F5';

/* Routes maritimes — courbes blanches semi-transparentes */
function curvedLine(a, b, bend = 0.18){
  const [lat1, lng1] = a, [lat2, lng2] = b;
  const midLat = (lat1+lat2)/2, midLng = (lng1+lng2)/2;
  const dx = lat2-lat1, dy = lng2-lng1;
  const ctrlLat = midLat - dy*bend;
  const ctrlLng = midLng + dx*bend;
  const pts = [];
  for(let t=0; t<=1; t+=0.04){
    const lat = (1-t)*(1-t)*lat1 + 2*(1-t)*t*ctrlLat + t*t*lat2;
    const lng = (1-t)*(1-t)*lng1 + 2*(1-t)*t*ctrlLng + t*t*lng2;
    pts.push([lat,lng]);
  }
  return pts;
}
const routes = [
  [[43.296,5.370],[41.38,2.17]],
  [[43.296,5.370],[44.41,8.93]],
  [[43.70,7.27],[43.13,5.93]],
];
routes.forEach(([a,b])=>{
  L.polyline(curvedLine(a,b), { color:'#ffffff', weight:7, opacity:.55, lineCap:'round', lineJoin:'round' }).addTo(map);
  L.polyline(curvedLine(a,b), { color:'#ffffff', weight:2.4, opacity:.9, lineCap:'round' }).addTo(map);
});

/* Marqueurs conteneurs */
const markerIcon = () => L.divIcon({
  className:'container-marker',
  html:`<div class="marker-pulse"></div><div class="marker-dot"></div>`,
  iconSize:[26,26], iconAnchor:[13,13]
});

const markerRefs = {};
containers.forEach(c=>{
  const m = L.marker(c.path[0], { icon:markerIcon() }).addTo(map);
  m.on('click', ()=> selectContainer(c.id));
  markerRefs[c.id] = m;
  c._pathIndex = 0;
});

let selectedId = null;
function selectContainer(id){
  selectedId = id;
  Object.entries(markerRefs).forEach(([cid, m])=>{
    const el = m.getElement();
    if(!el) return;
    el.classList.toggle('selected', cid === id);
  });
  const c = containers.find(x=>x.id===id);
  if(c){
    map.flyTo(markerRefs[id].getLatLng(), Math.max(map.getZoom(), 9), { duration:.9 });
  }
  renderDeviceList();
}

/* Simulation du déplacement en temps réel */
setInterval(()=>{
  containers.forEach(c=>{
    if(c.status === 'stopped') return;
    c._pathIndex = (c._pathIndex + 1) % c.path.length;
    const next = c.path[c._pathIndex];
    markerRefs[c.id].setLatLng(next);
    c.speed = Math.max(15, Math.min(65, c.speed + (Math.random()*10-5) | 0));
    c.battery = Math.max(5, c.battery - (Math.random() < .5 ? 1 : 0));
    c.updated = 0;
  });
  containers.forEach(c=>{ c.updated += 1; });
  renderDeviceList();
}, 3200);

/* =====================================================================
   TOGGLE CARTE / SATELLITE
   ===================================================================== */
const mapToggle = document.getElementById('mapToggle');
const mapEl = document.getElementById('map');
mapToggle.querySelectorAll('.toggle-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const mode = btn.dataset.mode;
    if(mode === mapToggle.dataset.mode) return;
    mapToggle.dataset.mode = mode;
    mapToggle.querySelectorAll('.toggle-btn').forEach(b=> b.classList.toggle('active', b===btn));

    mapEl.classList.add('fading');
    setTimeout(()=>{
      if(mode === 'satellite'){ map.removeLayer(lightLayer); map.addLayer(satLayer); }
      else { map.removeLayer(satLayer); map.addLayer(lightLayer); }
      mapEl.classList.remove('fading');
    }, 260);
  });
});

/* =====================================================================
   ZOOM
   ===================================================================== */
document.getElementById('zoomIn').addEventListener('click', ()=> map.zoomIn(0.6));
document.getElementById('zoomOut').addEventListener('click', ()=> map.zoomOut(0.6));

/* =====================================================================
   LISTE DES DISPOSITIFS
   ===================================================================== */
const deviceList = document.getElementById('deviceList');
const tabDevicesBody = document.getElementById('tabDevicesBody');

function deviceCardHTML(c){
  const low = c.battery <= 25;
  const timeLabel = c.updated < 1 ? 'à l\u2019instant' : `il y a ${c.updated} minute${c.updated>1?'s':''}`;
  return `
    <div class="device-card ${c.id===selectedId?'active':''}" data-id="${c.id}">
      <div class="pin">${ICONS.mapPin}</div>
      <div class="info">
        <div class="name">${c.name}</div>
        <div class="meta">
          <span class="status-pill ${STATUS_CLASS[c.status]}">${STATUS_LABEL[c.status]}</span>
          <span class="dot">•</span>
          <span>${c.speed} km/h</span>
          <span class="dot">•</span>
          <span>Batterie ${c.battery}%</span>
        </div>
        <div class="updated">${ICONS.clock} Dernière mise à jour : ${timeLabel}</div>
      </div>
      <div class="battery ${low?'low':''}">${ICONS.battery}${c.battery}%</div>
    </div>`;
}

function renderDeviceList(){
  const html = containers.map(deviceCardHTML).join('');
  deviceList.innerHTML = html;
  tabDevicesBody.innerHTML = html;
  document.getElementById('deviceCount').textContent = `${containers.length} au total`;
  document.getElementById('activeCount').textContent = `${containers.length} actifs`;

  [deviceList, tabDevicesBody].forEach(container=>{
    container.querySelectorAll('.device-card').forEach(card=>{
      card.addEventListener('click', ()=> selectContainer(card.dataset.id));
    });
  });
}
renderDeviceList();

/* Bouton "Ajouter un dispositif" */
const addBtn = document.getElementById('addDeviceBtn');
addBtn.innerHTML = `${ICONS.plus} Ajouter un dispositif`;

/* =====================================================================
   ICÔNES statiques (logo + nav + status badge)
   ===================================================================== */
document.getElementById('logoIcon').innerHTML = ICONS.falcon;
document.querySelector('.status-badge .pulse-dot')
  .insertAdjacentHTML('beforebegin', `<span class="icon">${ICONS.activity}</span>`);

const navIcons = { map:ICONS.map, devices:ICONS.package, history:ICONS.clock, alerts:ICONS.bell, profile:ICONS.user };
document.querySelectorAll('.nav-item').forEach(item=>{
  item.querySelector('.nav-icon-wrap').innerHTML = navIcons[item.dataset.tab];
});
document.querySelectorAll('.tab-placeholder-row').forEach((row,i)=>{
  const icons=[ICONS.clock, ICONS.bell, ICONS.package];
  row.innerHTML = `${icons[i%icons.length]}<span>Aucune donnée pour le moment</span>`;
});

/* =====================================================================
   NAVIGATION INFÉRIEURE — changement d'onglet
   ===================================================================== */
const navItems = document.querySelectorAll('.nav-item');
const tabOverlays = { devices:'tab-devices', history:'tab-history', alerts:'tab-alerts', profile:'tab-profile' };

navItems.forEach(item=>{
  item.addEventListener('click', (e)=>{
    triggerRipple(e, item);
    navItems.forEach(n=> n.classList.toggle('active', n===item));
    const tab = item.dataset.tab;
    Object.values(tabOverlays).forEach(id=> document.getElementById(id).classList.remove('visible'));
    if(tab !== 'map'){
      document.getElementById(tabOverlays[tab]).classList.add('visible');
    }
  });
});

/* =====================================================================
   RIPPLE — effet tactile générique
   ===================================================================== */
function triggerRipple(e, el){
  const rect = el.getBoundingClientRect();
  const span = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  span.className = 'ripple-span';
  span.style.width = span.style.height = size+'px';
  const x = (e.clientX ?? rect.left+rect.width/2) - rect.left - size/2;
  const y = (e.clientY ?? rect.top+rect.height/2) - rect.top - size/2;
  span.style.left = x+'px'; span.style.top = y+'px';
  el.style.position = el.style.position || 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(span);
  span.addEventListener('animationend', ()=> span.remove());
}
document.querySelectorAll('.zoom-btn, .toggle-btn, .add-device-btn, .nav-item').forEach(el=>{
  el.addEventListener('click', (e)=> triggerRipple(e, el));
});

/* =====================================================================
   BOTTOM SHEET — glissement (drag) fluide
   ===================================================================== */
const sheet = document.getElementById('bottomSheet');
const dragZone = document.getElementById('sheetDragZone');

const SHEET_HEIGHT = () => sheet.offsetHeight;
const PEEK = 250; // hauteur visible en position repliée
let collapsedY = 0;
let currentY = 0;
let dragStartY = 0;
let dragStartTranslate = 0;
let dragging = false;

function computeCollapsed(){
  collapsedY = Math.max(SHEET_HEIGHT() - PEEK, 0);
  return collapsedY;
}

function setSheetY(y, animate=true){
  currentY = Math.min(Math.max(y, 0), computeCollapsed());
  sheet.style.setProperty('--sheet-y', currentY+'px');
}

window.addEventListener('load', ()=>{ computeCollapsed(); setSheetY(collapsedY); });
window.addEventListener('resize', ()=>{ computeCollapsed(); setSheetY(currentY); });

function pointerDown(e){
  dragging = true;
  sheet.classList.add('is-dragging');
  dragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
  dragStartTranslate = currentY;
}
function pointerMove(e){
  if(!dragging) return;
  const y = (e.touches ? e.touches[0].clientY : e.clientY);
  const delta = y - dragStartY;
  setSheetY(dragStartTranslate + delta);
}
function pointerUp(){
  if(!dragging) return;
  dragging = false;
  sheet.classList.remove('is-dragging');
  const collapsed = computeCollapsed();
  const shouldExpand = currentY < collapsed * 0.55;
  setSheetY(shouldExpand ? 0 : collapsed);
}

dragZone.addEventListener('mousedown', pointerDown);
window.addEventListener('mousemove', pointerMove);
window.addEventListener('mouseup', pointerUp);
dragZone.addEventListener('touchstart', pointerDown, {passive:true});
window.addEventListener('touchmove', pointerMove, {passive:true});
window.addEventListener('touchend', pointerUp);

/* Toucher un dispositif dans la liste replie légèrement le sheet pour voir la carte */
deviceList.addEventListener('click', (e)=>{
  if(e.target.closest('.device-card')){
    computeCollapsed();
    setSheetY(collapsedY);
  }
});
