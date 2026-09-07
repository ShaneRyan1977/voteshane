(()=>{try{
const m=location.hash.match(/(?:^#|&)voteshane=([^&]+)/);
if(!m){alert('No VoteShane voter details were found in this CVRD form URL. Open the form using the Mail In button in the canvassing app first.');return}
const s=m[1].replace(/-/g,'+').replace(/_/g,'/');
const b=atob(s+'='.repeat((4-s.length%4)%4));
const d=JSON.parse(new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0))));
const fire=e=>{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};
const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!==undefined&&v!==null&&String(v)!==''){e.value=v;fire(e)}};
const check=id=>{const e=document.getElementById(id);if(e){e.checked=true;fire(e)}};
const choose=(id,want)=>{const e=document.getElementById(id);if(!e)return;const q=String(want).toLowerCase();const o=[...e.options].find(x=>String(x.value).toLowerCase()===q||String(x.text).toLowerCase()===q||String(x.text).toLowerCase().includes(q));if(o){e.value=o.value;fire(e)}};
if(!document.getElementById('gform_42')){alert('The CVRD mail-ballot form was not found on this page.');return}
set('input_42_8_3',d.given);
set('input_42_8_6',d.last);
set('input_42_24_1',d.street);
set('input_42_24_2',d.line2);
set('input_42_24_3',d.city);
set('input_42_24_4',d.province||'BC');
choose('input_42_24_6',d.country||'Canada');
set('input_42_33',d.date);
set('input_42_16',d.phone);
set('input_42_17',d.email);
if(d.residentElector)check('choice_42_10_0');
if(d.mailToResidential)check('choice_42_28_1');
document.getElementById('voteshane-helper-banner')?.remove();
const n=document.createElement('div');n.id='voteshane-helper-banner';
n.style='position:fixed;z-index:2147483647;left:12px;right:12px;top:12px;background:#fff;border:3px solid #166534;border-radius:12px;padding:12px 42px 12px 14px;font:600 15px/1.35 system-ui;box-shadow:0 6px 30px #0005;color:#111827';
n.innerHTML='<b>Voter details filled.</b><br>Please review the form, personally confirm the eligibility declarations, and have the voter complete the signature field.<button style="position:absolute;right:8px;top:7px;border:0;background:transparent;font-size:24px" aria-label="Close">×</button>';
n.querySelector('button').onclick=()=>n.remove();document.body.appendChild(n);
document.getElementById('input_42_8_3')?.scrollIntoView({behavior:'smooth',block:'center'});
}catch(e){alert('Could not fill the CVRD form: '+e.message)}})()
