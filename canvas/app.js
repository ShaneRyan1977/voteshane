const DATA_URL='data/area_a_parcels.geojson', BOUNDARY_URL='data/area_a_boundary.geojson', VOTER_URL='data/voter_names.json';
let map, parcelsLayer, boundaryLayer, features=[], selected=null, supa=null, channel=null, demo=false;
let voterData={by_key:{},fallback_unique:{}};
const state=new Map();
const $=id=>document.getElementById(id);

const STATUS_META={
  supporter:{label:'Supporter',stroke:'#14532d',fill:'#16a34a'},
  visited:{label:'Visited',stroke:'#1e40af',fill:'#2563eb'},
  reachout:{label:'Reach out',stroke:'#9a3412',fill:'#f97316'},
  against:{label:'Against',stroke:'#991b1b',fill:'#dc2626'}
};

const STREET_TYPE_ALIASES={
  ROAD:'RD',RD:'RD',DRIVE:'DR',DR:'DR',PLACE:'PL',PL:'PL',
  CRESCENT:'CRES',CRES:'CRES',TERRACE:'TERR',TERR:'TERR',TER:'TERR',
  LANE:'LANE',LN:'LANE',COURT:'CRT',CT:'CRT',CRT:'CRT',
  HIGHWAY:'HWY',HWY:'HWY',WAY:'WAY',RISE:'RISE',COVE:'COVE',
  STREET:'ST',ST:'ST',AVENUE:'AVE',AVE:'AVE'
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
function normalizeVoterOverrides(value){
  if(!value || typeof value!=='object' || Array.isArray(value))return {};
  const out={};
  Object.entries(value).forEach(([k,list])=>{
    if(!Array.isArray(list))return;
    out[k]=list.map(person=>({
      given:String(person?.given??'').trim(),
      last:String(person?.last??'').trim()
    })).filter(person=>person.given||person.last);
  });
  return out;
}
function normalizeRow(row={}){
  const status=row.status==='claimed'?'reachout':row.status;
  return {...row,status:STATUS_META[status]?status:'unvisited',phone:row.phone||'',email:row.email||'',voter_names:normalizeVoterOverrides(row.voter_names)};
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
  const previous=state.has(id)?state.get(id):null;
  // Update local state first so a rapid name edit + status/phone action cannot
  // overwrite the newer voter-name data while the Supabase request is in flight.
  state.set(id,clean);
  refresh();
  const payload={parcel_id:id,status:clean.status,phone:clean.phone||null,email:clean.email||null,voter_names:clean.voter_names||{},updated_at:clean.updated_at};
  const {error}=await supa.from('canvass_status').upsert(payload,{onConflict:'parcel_id'});
  if(error){
    if(previous)state.set(id,previous);else state.delete(id);
    refresh();
    toast(error.message);
    return false;
  }
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

function escapeHtml(value){
  return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function normalizeAddressText(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/&/g,' AND ').replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function normalizeStreetType(value){
  const t=normalizeAddressText(value);
  return STREET_TYPE_ALIASES[t]||t;
}
function normalizeStreetNumber(value){
  const n=Number(value);
  return Number.isFinite(n)&&String(value).trim()!==''?String(Math.trunc(n)):normalizeAddressText(value);
}
function addressKey(a){
  return `${normalizeStreetNumber(a.STREET_NUMBER)}|${normalizeAddressText(a.STREET_NAME)}|${normalizeStreetType(a.STREET_TYPE)}`;
}
function looseAddressKey(a){
  return `${normalizeStreetNumber(a.STREET_NUMBER)}|${normalizeAddressText(a.STREET_NAME)}`;
}
function matchedVoterKey(a){
  const exact=addressKey(a);
  if(voterData.by_key?.[exact])return exact;
  const fallback=voterData.fallback_unique?.[looseAddressKey(a)];
  return fallback&&voterData.by_key?.[fallback]?fallback:exact;
}
function namesForAddress(a){
  const raw=voterData.by_key?.[matchedVoterKey(a)]||[];
  const seen=new Set();
  return raw.filter(person=>{
    const k=`${person.last}\u0000${person.given}`;
    if(seen.has(k))return false;
    seen.add(k);
    return true;
  });
}
function baseAddress(a){
  const street=[a.STREET_NUMBER,a.STREET_NUMBER_SUFFIX,a.STREET_DIR_PREFIX,a.STREET_NAME,a.STREET_TYPE,a.STREET_DIR_SUFFIX].filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').join(' ').replace(/\s+/g,' ').trim();
  const locality=String(a.LOCALITY||'').trim();
  return street?(locality?`${street}, ${locality}`:street):(a.FULL_ADDRESS||'Address');
}

function pointInRing(point,ring){
  const [x,y]=point;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1];
    const intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||Number.EPSILON)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}
function pointInPolygonCoordinates(point,coords){
  if(!coords?.length||!pointInRing(point,coords[0]))return false;
  for(let i=1;i<coords.length;i++)if(pointInRing(point,coords[i]))return false;
  return true;
}
function pointInFeature(point,geometry){
  if(!geometry)return false;
  if(geometry.type==='Polygon')return pointInPolygonCoordinates(point,geometry.coordinates);
  if(geometry.type==='MultiPolygon')return geometry.coordinates.some(poly=>pointInPolygonCoordinates(point,poly));
  return false;
}

const ADDRESS_QUERY='https://maps.cvrd.ca/mapservices/rest/services/AddressBC/MapServer/0/query';
async function findAddressesForParcel(f){
  try{
    const b=L.geoJSON(f).getBounds();
    const p=new URLSearchParams({
      where:'1=1',
      outFields:'CIVIC_ID,FULL_ADDRESS,STREET_NUMBER,STREET_NUMBER_SUFFIX,STREET_NAME,STREET_TYPE,STREET_DIR_PREFIX,STREET_DIR_SUFFIX,LOCALITY,UNIT_NUMBER,UNIT_TYPE,UNIT_NUMBER_SUFFIX',
      f:'geojson',
      returnGeometry:'true',
      geometry:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].join(','),
      geometryType:'esriGeometryEnvelope',
      inSR:'4326',
      outSR:'4326',
      spatialRel:'esriSpatialRelIntersects'
    });
    const r=await fetch(ADDRESS_QUERY+'?'+p.toString());
    if(!r.ok)return [];
    const j=await r.json();
    const candidates=j.features||[];
    const inside=candidates.filter(x=>x.geometry?.type==='Point'&&pointInFeature(x.geometry.coordinates,f.geometry));
    const use=inside.length?inside:candidates;
    return use.map(x=>x.properties).filter(x=>x.FULL_ADDRESS||x.STREET_NAME);
  }catch(e){return []}
}

function voterOverrideForAddress(parcelId,key,spreadsheetNames){
  const row=statusFor(parcelId);
  if(Object.prototype.hasOwnProperty.call(row.voter_names||{},key))return row.voter_names[key];
  return spreadsheetNames;
}
function voterPairHtml(person={given:'',last:''}){
  return `<div class="voter-pair">
    <label>Given Names<input class="voter-given" type="text" autocomplete="off" value="${escapeHtml(person.given||'')}"></label>
    <label>Last Name<input class="voter-last" type="text" autocomplete="off" value="${escapeHtml(person.last||'')}"></label>
    <button type="button" class="remove-voter" aria-label="Remove voter name">Remove</button>
  </div>`;
}
function voterEditorHtml(key,names){
  const rows=names.length?names.map(voterPairHtml).join(''):'<div class="no-voters">No voter names saved for this address.</div>';
  return `<div class="voter-editor" data-voter-key="${escapeHtml(key)}">
    <div class="voter-label">Given Names + Last Name <span class="voter-count">(${names.length})</span></div>
    <div class="voter-pairs">${rows}</div>
    <button type="button" class="add-voter">+ Add name</button>
  </div>`;
}
function addressHtml(addrs,parcelId){
  if(!addrs.length)return '<div class="muted">No civic address found in CVRD AddressBC for this property.</div>';
  const groups=new Map();
  addrs.forEach(a=>{
    const k=matchedVoterKey(a)||addressKey(a);
    if(!groups.has(k)){
      const spreadsheetNames=namesForAddress(a);
      groups.set(k,{key:k,address:baseAddress(a),names:voterOverrideForAddress(parcelId,k,spreadsheetNames)});
    }
  });
  return [...groups.values()].map(group=>`<section class="address-group"><div class="address"><b>Address:</b> ${escapeHtml(group.address)}</div>${voterEditorHtml(group.key,group.names)}</section>`).join('');
}
function collectVoterPairs(editor){
  return [...editor.querySelectorAll('.voter-pair')].map(pair=>({
    given:pair.querySelector('.voter-given')?.value.trim()||'',
    last:pair.querySelector('.voter-last')?.value.trim()||''
  })).filter(person=>person.given||person.last);
}
function updateVoterEditorDisplay(editor){
  const pairs=editor.querySelector('.voter-pairs');
  const count=editor.querySelector('.voter-count');
  const rows=editor.querySelectorAll('.voter-pair');
  if(count)count.textContent=`(${rows.length})`;
  if(pairs && rows.length===0 && !pairs.querySelector('.no-voters'))pairs.innerHTML='<div class="no-voters">No voter names saved for this address.</div>';
  if(pairs && rows.length>0)pairs.querySelector('.no-voters')?.remove();
}
async function saveVoterEditor(editor){
  if(!selected||!editor)return false;
  const parcelId=selected.properties.ParcelID;
  const addressKeyValue=editor.dataset.voterKey;
  const current=statusFor(parcelId);
  const voter_names={...(current.voter_names||{})};
  voter_names[addressKeyValue]=collectVoterPairs(editor);
  const row={...current,voter_names,phone:$('phone').value.trim(),email:$('email').value.trim()};
  const ok=await saveRow(parcelId,row);
  if(ok)toast('Voter names saved');
  return ok;
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

let viewportSyncFrame=0;
function syncPanelToViewport(){
  cancelAnimationFrame(viewportSyncFrame);
  viewportSyncFrame=requestAnimationFrame(()=>{
    const panel=$('panel');
    if(!panel||panel.classList.contains('hidden'))return;
    if(window.matchMedia('(min-width:800px)').matches){
      ['top','left','right','bottom','width','height','maxHeight'].forEach(prop=>panel.style[prop]='');
      return;
    }
    const vv=window.visualViewport;
    const top=Math.max(0,vv?.offsetTop||0);
    const left=Math.max(0,vv?.offsetLeft||0);
    const width=Math.max(280,vv?.width||window.innerWidth);
    const height=Math.max(260,vv?.height||window.innerHeight);
    panel.style.top=`${top}px`;
    panel.style.left=`${left}px`;
    panel.style.right='auto';
    panel.style.bottom='auto';
    panel.style.width=`${width}px`;
    panel.style.height=`${height}px`;
    panel.style.maxHeight=`${height}px`;
  });
}
function keepFieldVisible(target){
  const scroller=$('panelScroll');
  if(!scroller||!target||!scroller.contains(target))return;
  requestAnimationFrame(()=>{
    const r=target.getBoundingClientRect();
    const s=scroller.getBoundingClientRect();
    const pad=18;
    if(r.bottom>s.bottom-pad)scroller.scrollTop+=r.bottom-(s.bottom-pad);
    else if(r.top<s.top+pad)scroller.scrollTop-=s.top+pad-r.top;
  });
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
  requestAnimationFrame(syncPanelToViewport);

  if(!lookupAddress)return;
  $('parcelInfo').innerHTML='<div class="loading">Looking up civic address and voter names…</div>';
  const selectedId=p.ParcelID;
  const addrs=await findAddressesForParcel(selected);
  if(!selected || selected.properties.ParcelID!==selectedId)return;
  $('parcelInfo').innerHTML=addressHtml(addrs,selectedId);
  requestAnimationFrame(syncPanelToViewport);
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
  const [geo,boundary,voters]=await Promise.all([
    fetch(DATA_URL).then(r=>r.json()),
    fetch(BOUNDARY_URL).then(r=>r.json()),
    fetch(VOTER_URL).then(r=>r.ok?r.json():null).catch(()=>null)
  ]);
  if(voters)voterData=voters;
  features=geo.features;
  map=L.map('map',{zoomControl:true}).setView([48.55,-123.55],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenStreetMap contributors'}).addTo(map);
  boundaryLayer=L.geoJSON(boundary,{style:{color:'#111827',weight:3,fill:false}}).addTo(map);
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
$('closePanel').onclick=()=>{
  if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  $('panel').classList.add('hidden');
  selected=null;
};
$('supporter').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'supporter');
$('visit').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'visited');
$('reachout').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'reachout');
$('against').onclick=()=>selected&&setStatus(selected.properties.ParcelID,'against');
$('clearStatus').onclick=()=>selected&&clearStatus(selected.properties.ParcelID);
$('phone').addEventListener('input',queueContactSave);
$('email').addEventListener('input',queueContactSave);
$('phone').addEventListener('change',queueContactSave);
$('email').addEventListener('change',queueContactSave);
$('panel').addEventListener('focusin',event=>{
  setTimeout(()=>{
    syncPanelToViewport();
    if(event.target instanceof HTMLElement)keepFieldVisible(event.target);
  },80);
  setTimeout(()=>{
    syncPanelToViewport();
    if(event.target instanceof HTMLElement)keepFieldVisible(event.target);
  },320);
});
$('parcelInfo').addEventListener('click',async event=>{
  const editor=event.target.closest('.voter-editor');
  if(!editor)return;
  if(event.target.closest('.add-voter')){
    const pairs=editor.querySelector('.voter-pairs');
    pairs.querySelector('.no-voters')?.remove();
    pairs.insertAdjacentHTML('beforeend',voterPairHtml());
    updateVoterEditorDisplay(editor);
    const added=[...editor.querySelectorAll('.voter-pair')].at(-1);
    added?.querySelector('.voter-given')?.focus();
    keepFieldVisible(added?.querySelector('.voter-given'));
    return;
  }
  const remove=event.target.closest('.remove-voter');
  if(remove){
    remove.closest('.voter-pair')?.remove();
    updateVoterEditorDisplay(editor);
    await saveVoterEditor(editor);
  }
});
$('parcelInfo').addEventListener('change',event=>{
  if(!event.target.matches('.voter-given,.voter-last'))return;
  const editor=event.target.closest('.voter-editor');
  if(editor)saveVoterEditor(editor);
});
$('locate').onclick=()=>map.locate({setView:true,maxZoom:17});

function syncViewportAndFocus(){
  syncPanelToViewport();
  setTimeout(()=>{
    if(document.activeElement instanceof HTMLElement && $('panel').contains(document.activeElement))keepFieldVisible(document.activeElement);
  },60);
}
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',syncViewportAndFocus);
  window.visualViewport.addEventListener('scroll',syncViewportAndFocus);
}
window.addEventListener('resize',syncViewportAndFocus);
window.addEventListener('orientationchange',()=>setTimeout(syncViewportAndFocus,150));

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
        const near=features.find(f=>pointInFeature([pt.x,pt.y],f.geometry)||L.geoJSON(f).getBounds().contains([pt.y,pt.x]));
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
