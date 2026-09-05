const DATA_URL='data/area_a_parcels.geojson', BOUNDARY_URL='data/area_a_boundary.geojson';
let map, parcelsLayer, boundaryLayer, features=[], selected=null, supa=null, channel=null, demo=false;
const state=new Map();
const $=id=>document.getElementById(id);

const STATUS_META={
  supporter:{label:'Supporter',stroke:'#14532d',fill:'#16a34a'},
  visited:{label:'Visited',stroke:'#1e40af',fill:'#2563eb'},
  reachout:{label:'Reach out',stroke:'#9a3412',fill:'#f97316'},
  against:{label:'Against',stroke:'#991b1b',fill:'#dc2626'}
};

function toast(msg){
  $('toast').textContent=msg;
  $('toast').style.cssText='position:fixed;z-index:4000;left:50%;bottom:25px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:9px;box-shadow:0 4px 20px #0004';
  setTimeout(()=>$('toast').style.cssText='',2400);
}
function key(){return 'areaA_canvass_demo'}
function loadDemo(){
  try{
    const x=JSON.parse(localStorage.getItem(key())||'{}');
    Object.entries(x).forEach(([k,v])=>state.set(k,normalizeRow(v)));
  }catch{}
}
function saveDemo(){localStorage.setItem(key(),JSON.stringify(Object.fromEntries(state)))}
function normalizeRow(row={}){
  const status=row.status==='claimed'?'reachout':row.status;
  return {...row,status:STATUS_META[status]?status:'unvisited',phone:row.phone||'',email:row.email||''};
}
function statusFor(id){return normalizeRow(state.get(id)||{status:'unvisited'})}
function styleFeature(f){
  const s=statusFor(f.properties.ParcelID), meta=STATUS_META[s.status];
  if(meta) return {className:'parcel '+s.status,color:meta.stroke,fillColor:meta.fill,fillOpacity:.78,weight:1.4};
  return {className:'parcel unvisited',color:'#374151',fillColor:'#fff',fillOpacity:.22,weight:1};
}
function updateStats(){
  const counts={supporter:0,visited:0,reachout:0,against:0};
  state.forEach(raw=>{const s=normalizeRow(raw);if(counts[s.status]!==undefined)counts[s.status]++});
  $('supporterCount').textContent=counts.supporter;
  $('visitedCount').textContent=counts.visited;
  $('reachoutCount').textContent=counts.reachout;
  $('againstCount').textContent=counts.against;
  const marked=Object.values(counts).reduce((a,b)=>a+b,0);
  const unmarked=Math.max(0,features.length-marked);
  $('count').textContent=features.length.toLocaleString()+' parcels · '+unmarked.toLocaleString()+' unmarked';
}
function refresh(){
  if(parcelsLayer)parcelsLayer.eachLayer(l=>l.setStyle(styleFeature(l.feature)));
  updateStats();
}

async function saveRow(id,row){
  const clean=normalizeRow({...row,updated_at:new Date().toISOString()});
  if(demo){
    state.set(id,clean);
    saveDemo();
    refresh();
    return true;
  }
  const payload={parcel_id:id,status:clean.status,phone:clean.phone||null,email:clean.email||null,updated_at:clean.updated_at};
  const {error}=await supa.from('canvass_status').upsert(payload,{onConflict:'parcel_id'});
  if(error){toast(error.message);return false}
  state.set(id,clean);
  refresh();
  return true;
}

async function setStatus(id,status){
  if(!STATUS_META[status])return;
  const old=statusFor(id);
  const row={...old,status,phone:$('phone').value.trim(),email:$('email').value.trim()};
  if(await saveRow(id,row)){
    openSelected(false);
    toast(STATUS_META[status].label+' saved');
  }
}

async function clearStatus(id){
  const old=statusFor(id);
  const row={...old,status:'unvisited',phone:$('phone').value.trim(),email:$('email').value.trim()};
  if(await saveRow(id,row)){
    openSelected(false);
    toast('Category cleared');
  }
}

let contactTimer;
function queueContactSave(){
  clearTimeout(contactTimer);
  if(!selected)return;
  const parcelId=selected.properties.ParcelID;
  const phone=$('phone').value.trim();
  const email=$('email').value.trim();
  contactTimer=setTimeout(async()=>{
    const current=statusFor(parcelId);
    const row={...current,phone,email};
    await saveRow(parcelId,row);
  },450);
}

const ADDRESS_QUERY='https://maps.cvrd.ca/mapservices/rest/services/AddressBC/MapServer/0/query';
async function findAddressesForParcel(f){
  try{
    const b=L.geoJSON(f).getBounds();
    const p=new URLSearchParams({
      where:'1=1',
      outFields:'CIVIC_ID,FULL_ADDRESS,STREET_NUMBER,STREET_NUMBER_SUFFIX,STREET_NAME,STREET_TYPE,STREET_DIR_PREFIX,STREET_DIR_SUFFIX,LOCALITY,UNIT_NUMBER,UNIT_TYPE,UNIT_NUMBER_SUFFIX',
      f:'geojson',
      returnGeometry:'false',
      geometry:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(','),
      geometryType:'esriGeometryEnvelope',
      inSR:'4326',
      spatialRel:'esriSpatialRelIntersects'
    });
    const r=await fetch(ADDRESS_QUERY+'?'+p.toString());
    if(!r.ok)return [];
    const j=await r.json();
    return (j.features||[]).map(x=>x.properties).filter(x=>x.FULL_ADDRESS);
  }catch(e){return []}
}
function addressHtml(addrs){
  if(!addrs.length)return '<div class="muted">No civic address found in CVRD AddressBC for this property.</div>';
  const unique=[...new Map(addrs.map(a=>[a.FULL_ADDRESS,a])).values()];
  return '<div class="address"><b>Address:</b> '+unique.map(a=>a.FULL_ADDRESS).join('<br>')+'</div>';
}
function statusText(s){
  const meta=STATUS_META[s.status];
  if(!meta)return 'Unmarked';
  const when=s.updated_at?` · Updated ${new Date(s.updated_at).toLocaleString()}`:'';
  return meta.label+when;
}
function updateActiveButton(status){
  document.querySelectorAll('.status-button').forEach(b=>b.classList.remove('active'));
  const id={supporter:'supporter',visited:'visit',reachout:'reachout',against:'against'}[status];
  if(id)$(id).classList.add('active');
}

window.selectParcel=id=>{
  const f=features.find(x=>x.properties.ParcelID===id);
  if(f){selected=f;openSelected();map.fitBounds(L.geoJSON(f).getBounds(),{maxZoom:18})}
};

async function openSelected(lookupAddress=true){
  if(!selected)return;
  const p=selected.properties,s=statusFor(p.ParcelID);
  $('phone').value=s.phone||'';
  $('email').value=s.email||'';
  $('currentStatus').textContent=statusText(s);
  updateActiveButton(s.status);
  $('panel').classList.remove('hidden');

  if(!lookupAddress)return;
  $('parcelInfo').innerHTML='<div class="loading">Looking up civic address…</div>';
  const selectedId=p.ParcelID;
  const addrs=await findAddressesForParcel(selected);
  if(!selected || selected.properties.ParcelID!==selectedId)return;
  $('parcelInfo').innerHTML=addressHtml(addrs);
}

async function connect(url,key){
  supa=window.supabase.createClient(url,key);
  const auth=await supa.auth.signInAnonymously();
  if(auth.error)throw auth.error;
  const {data,error}=await supa.from('canvass_status').select('*');
  if(error)throw error;
  data.forEach(r=>state.set(r.parcel_id,normalizeRow(r)));
  channel=supa.channel('canvass-status')
    .on('postgres_changes',{event:'*',schema:'public',table:'canvass_status'},payload=>{
      if(payload.eventType==='DELETE')state.delete(payload.old.parcel_id);
      else state.set(payload.new.parcel_id,normalizeRow(payload.new));
      refresh();
      if(selected&&payload.new?.parcel_id===selected.properties.ParcelID)openSelected(false);
    }).subscribe();
}

async function init(){
  const geo=await fetch(DATA_URL).then(r=>r.json());
  features=geo.features;
  map=L.map('map',{zoomControl:true}).setView([48.55,-123.55],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap contributors'}).addTo(map);
  boundaryLayer=L.geoJSON(await fetch(BOUNDARY_URL).then(r=>r.json()),{style:{color:'#111827',weight:3,fill:false}}).addTo(map);
  parcelsLayer=L.geoJSON(geo,{style:styleFeature,onEachFeature:(f,l)=>{
    l.on('click',()=>{selected=f;openSelected()});
  }}).addTo(map);
  map.fitBounds(parcelsLayer.getBounds());
  updateStats();
}

$('saveSetup').onclick=async()=>{
  const u=$('sbUrl').value.trim(),k=$('sbKey').value.trim();
  if(!u||!k){toast('Enter both Supabase values');return}
  try{
    await connect(u,k);
    localStorage.setItem('sb_url',u);
    localStorage.setItem('sb_key',k);
    $('setup').classList.add('hidden');
    refresh();
    toast('Collaborative mode connected');
  }catch(e){toast('Connection failed: '+e.message)}
};
$('demoMode').onclick=()=>{
  demo=true;
  loadDemo();
  $('setup').classList.add('hidden');
  refresh();
  toast('Demo mode: changes stay on this device');
};
$('closePanel').onclick=()=>{$('panel').classList.add('hidden');selected=null};
$('supporter').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'supporter');
$('visit').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'visited');
$('reachout').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'reachout');
$('against').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'against');
$('clearStatus').onclick=()=>selected&&clearStatus(selected.properties.ParcelID);
$('phone').addEventListener('input',queueContactSave);
$('email').addEventListener('input',queueContactSave);
$('phone').addEventListener('change',queueContactSave);
$('email').addEventListener('change',queueContactSave);
$('locate').onclick=()=>map.locate({setView:true,maxZoom:17});

let searchTimer;
$('search').addEventListener('input',e=>{
  clearTimeout(searchTimer);
  const q=e.target.value.toLowerCase().trim();
  if(q.length<3)return;
  const f=features.find(x=>(x.properties.search||'').includes(q));
  if(f){selectParcel(f.properties.ParcelID);return}
  searchTimer=setTimeout(async()=>{
    try{
      const p=new URLSearchParams({where:`LOWER(FULL_ADDRESS) LIKE '%${q.replace(/'/g,"''")}%'`,outFields:'CIVIC_ID,FULL_ADDRESS',f:'json',returnGeometry:'true',outSR:'4326',resultRecordCount:'10'});
      const r=await fetch(ADDRESS_QUERY+'?'+p.toString());
      const j=await r.json();
      if(j.features&&j.features.length){
        const pt=j.features[0].geometry;
        map.setView([pt.y,pt.x],18);
        const near=features.find(f=>L.geoJSON(f).getBounds().contains([pt.y,pt.x]));
        if(near)selectParcel(near.properties.ParcelID);
      }
    }catch{}
  },350);
});

(async()=>{
  await init();
  const u=localStorage.getItem('sb_url'),k=localStorage.getItem('sb_key');
  if(u&&k){
    try{
      await connect(u,k);
      $('setup').classList.add('hidden');
      refresh();
      toast('Connected to shared map');
    }catch{}
  }
})();
