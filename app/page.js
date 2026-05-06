'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const allowedEmail=(process.env.NEXT_PUBLIC_ALLOWED_EMAIL || 'gageshaw73@gmail.com').toLowerCase();
const ready=Boolean(url&&key);
const supabase=ready?createClient(url,key):null;
const BUCKET='maintenance-photos';

const services=['Oil Change','Tire Rotation','Brake Service','Inspection','Air Filter','Cabin Filter','Battery','Other'];
const specs=['0W-20 Dexos1 Gen2','0W-20 Dexos1 Gen3'];
const oils=['Mobil 1','Valvoline','Castrol','Pennzoil','ACDelco','Royal Purple','Other'];
const filters=['ACDelco','FRAM','Bosch','Mobil 1','K&N','WIX','Other'];
const blank={date:'',mileage:'',service_type:'Oil Change',oil_spec:'0W-20 Dexos1 Gen3',oil_brand:'Mobil 1',filter_brand:'ACDelco',cost:'',receipt_photo_url:'',odometer_photo_url:'',notes:''};

export default function Page(){
  const [session,setSession]=useState(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loginStatus,setLoginStatus]=useState('');
  const [entries,setEntries]=useState([]);
  const [currentMileage,setCurrentMileage]=useState('');
  const [intervalMiles,setIntervalMiles]=useState(5000);
  const [form,setForm]=useState(blank);
  const [status,setStatus]=useState(ready?'Loading public data...':'Missing Supabase environment variables');

  const isAdmin=session?.user?.email?.toLowerCase()===allowedEmail;

  useEffect(()=>{
    if(!ready)return;
    loadPublicData();
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,newSession)=>setSession(newSession));
    return()=>listener.subscription.unsubscribe();
  },[]);

  async function loadPublicData(){
    setStatus('Loading public data...');
    const {data:settings}=await supabase.from('public_settings').select('*').limit(1).maybeSingle();
    if(settings){
      setCurrentMileage(settings.current_mileage || '');
      setIntervalMiles(settings.interval_miles || 5000);
    }
    const {data,error}=await supabase.from('maintenance_records').select('*').order('mileage',{ascending:false});
    if(error){setStatus('Load error: '+error.message);return;}
    setEntries(data||[]);
    setStatus('Public data loaded');
  }

  async function passwordLogin(){
    if(email.toLowerCase()!==allowedEmail){alert('Only the owner email can edit this tracker.');return;}
    if(!password){alert('Enter your password.');return;}
    setLoginStatus('Signing in...');
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setLoginStatus(error?'Login failed: '+error.message:'Logged in.');
  }

  async function signOut(){await supabase.auth.signOut();}

  function requireAdmin(){
    if(!isAdmin){alert('Only the owner can change records. Everyone else is view-only.');return false;}
    return true;
  }

  async function saveSettings(){
    if(!requireAdmin())return;
    setStatus('Saving settings...');
    const {error}=await supabase.from('public_settings').upsert({
      id:1,current_mileage:Number(currentMileage||0),interval_miles:Number(intervalMiles||5000),updated_at:new Date().toISOString()
    });
    if(error){setStatus('Save settings failed: '+error.message);return;}
    await loadPublicData();
  }

  async function uploadPhoto(file,type){
    if(!file)return '';
    if(!requireAdmin())return '';
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
    const path=`public/${Date.now()}-${type}-${safe}`;
    const {error}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false});
    if(error){alert('Photo upload failed: '+error.message);return '';}
    const {data}=supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function addEntry(){
    if(!requireAdmin())return;
    if(!form.date||!form.mileage){alert('Date and mileage are required.');return;}
    setStatus('Saving record...');
    const payload={
      date:form.date,mileage:Number(form.mileage),service_type:form.service_type,oil_spec:form.oil_spec,
      oil_brand:form.oil_brand,filter_brand:form.filter_brand,cost:form.cost?Number(form.cost):null,
      receipt_photo_url:form.receipt_photo_url||null,odometer_photo_url:form.odometer_photo_url||null,notes:form.notes||null
    };
    const {error}=await supabase.from('maintenance_records').insert(payload);
    if(error){setStatus('Save failed: '+error.message);return;}
    setForm(blank);
    await loadPublicData();
  }

  async function deleteEntry(id){
    if(!requireAdmin())return;
    if(!confirm('Delete this record?'))return;
    const {error}=await supabase.from('maintenance_records').delete().eq('id',id);
    if(error){setStatus('Delete failed: '+error.message);return;}
    await loadPublicData();
  }

  function update(k,v){setForm(p=>({...p,[k]:v}))}

  const oilChanges=useMemo(()=>entries.filter(e=>e.service_type==='Oil Change'&&Number(e.mileage)),[entries]);
  const last=useMemo(()=>oilChanges.length?[...oilChanges].sort((a,b)=>Number(b.mileage)-Number(a.mileage))[0]:null,[oilChanges]);
  const next=last?Number(last.mileage)+Number(intervalMiles||5000):null;
  const left=next&&currentMileage?next-Number(currentMileage):null;
  const total=entries.reduce((s,e)=>s+Number(e.cost||0),0);

  if(!ready){
    return <main className="page"><section className="hero"><h1>Missing Supabase Setup</h1><p>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables.</p></section><Styles/></main>
  }

  return <main className="page">
    <section className="hero">
      <div className="heroTop">
        <div>
          <h1>Malibu Maintenance Tracker</h1>
          <p>Public view • owner-only password edit • cloud synced with Supabase</p>
        </div>
        <span className="statusPill">{status}</span>
      </div>

      <div className="loginRow">
        {isAdmin ? <>
          <span className="adminBadge">Admin Access</span>
          <button className="lightButton" onClick={signOut}>Sign Out</button>
        </> : <>
          <input className="loginInput" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Owner email" />
          <input className="loginInput" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" />
          <button className="lightButton" onClick={passwordLogin}>Owner Login</button>
          <span className="viewBadge">Public view-only</span>
        </>}
      </div>
      {loginStatus && <p className="loginStatus">{loginStatus}</p>}
    </section>

    <section className="cards">
      <Card t="Last Oil Change" v={last?`${Number(last.mileage).toLocaleString()} mi`:'None'} sub={last?.date||'No oil change logged'} />
      <Card t="Next Oil Due" v={next?`${next.toLocaleString()} mi`:'—'} sub="Based on interval" />
      <Card t="Miles Left" v={left!==null?`${left.toLocaleString()} mi`:'—'} sub={left!==null&&left<=0?'Oil change due now':left!==null?'Tracking active':'Current mileage not set'} warn={left!==null&&left<=500}/>
      <Card t="Total Cost" v={`$${total.toFixed(2)}`} sub={`${entries.length} records`} />
    </section>

    {isAdmin && <section className="adminGrid">
      <div className="panel">
        <h2>Dashboard Settings</h2>
        <Field label="Current Mileage"><input className="input" type="number" value={currentMileage} onChange={e=>setCurrentMileage(e.target.value)} /></Field>
        <Field label="Oil Interval Miles"><input className="input" type="number" value={intervalMiles} onChange={e=>setIntervalMiles(e.target.value)} /></Field>
        <button className="primary" onClick={saveSettings}>Save Dashboard Settings</button>
      </div>

      <div className="panel">
        <h2>Add Maintenance Record</h2>
        <div className="formGrid">
          <Field label="Date"><input className="input" type="date" value={form.date} onChange={e=>update('date',e.target.value)} /></Field>
          <Field label="Mileage"><input className="input" type="number" value={form.mileage} onChange={e=>update('mileage',e.target.value)} /></Field>
          <Field label="Service Type"><Sel value={form.service_type} onChange={v=>update('service_type',v)} options={services}/></Field>
          <Field label="Oil Type/Spec"><Sel value={form.oil_spec} onChange={v=>update('oil_spec',v)} options={specs}/></Field>
          <Field label="Oil Brand"><Sel value={form.oil_brand} onChange={v=>update('oil_brand',v)} options={oils}/></Field>
          <Field label="Filter Brand"><Sel value={form.filter_brand} onChange={v=>update('filter_brand',v)} options={filters}/></Field>
          <Field label="Cost"><input className="input" type="number" value={form.cost} onChange={e=>update('cost',e.target.value)} /></Field>
          <Field label="Notes"><input className="input" value={form.notes} onChange={e=>update('notes',e.target.value)} /></Field>
        </div>
        <div className="photoGrid">
          <Photo label="Receipt Photo" value={form.receipt_photo_url} onUploaded={url=>update('receipt_photo_url',url)} uploadPhoto={uploadPhoto}/>
          <Photo label="Odometer Photo" value={form.odometer_photo_url} onUploaded={url=>update('odometer_photo_url',url)} uploadPhoto={uploadPhoto}/>
        </div>
        <button className="primary" onClick={addEntry}>Save Record</button>
      </div>
    </section>}

    <section className="panel">
      <h2>Maintenance Records</h2>
      {!isAdmin && <p className="note">Public view-only mode. Only the owner can add or delete records.</p>}
      {entries.length===0?<p className="empty">No records yet.</p>:<div className="tableWrap"><table>
        <thead><tr>{['Date','Mileage','Service','Oil','Filter','Cost','Photos','Notes',isAdmin?'Actions':''].map(x=><th key={x}>{x}</th>)}</tr></thead>
        <tbody>{entries.map(e=><tr key={e.id}>
          <td>{e.date}</td><td>{Number(e.mileage).toLocaleString()}</td><td>{e.service_type}</td><td>{e.oil_brand} • {e.oil_spec}</td><td>{e.filter_brand}</td><td>{e.cost?`$${Number(e.cost).toFixed(2)}`:'—'}</td>
          <td><div className="photoThumbs">{e.receipt_photo_url&&<a href={e.receipt_photo_url} target="_blank"><img src={e.receipt_photo_url}/></a>}{e.odometer_photo_url&&<a href={e.odometer_photo_url} target="_blank"><img src={e.odometer_photo_url}/></a>}</div></td>
          <td>{e.notes||'—'}</td><td>{isAdmin&&<button className="deleteBtn" onClick={()=>deleteEntry(e.id)}>Delete</button>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <Styles/>
  </main>
}

function Photo({label,value,onUploaded,uploadPhoto}){
  const [busy,setBusy]=useState(false);
  return <div className="upload"><b>{label}</b><input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);const url=await uploadPhoto(file,label.toLowerCase().replaceAll(' ','-'));if(url)onUploaded(url);setBusy(false)}} />{busy&&<p>Uploading...</p>}{value&&<img className="preview" src={value}/>}</div>
}
function Card({t,v,sub,warn}){return <div className={`card ${warn?'warn':''}`}><p className="cardTitle">{t}</p><p className="cardValue">{v}</p><p className="cardSub">{sub}</p></div>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Sel({value,onChange,options}){return <select className="input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select>}

function Styles(){
  return <style jsx global>{`
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f1f5f9; }
    body { overflow-x: hidden; }
    .page { min-height: 100vh; background: #f1f5f9; color: #0f172a; font-family: Arial, sans-serif; padding: 18px; max-width: 100vw; overflow-x: hidden; }
    .hero { background: #020617; color: white; border-radius: 24px; padding: 26px; margin-bottom: 18px; box-shadow: 0 16px 40px rgba(15,23,42,.16); }
    .heroTop { display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
    .hero h1 { font-size: clamp(28px, 5vw, 42px); line-height: 1.05; margin: 0; }
    .hero p { color: #cbd5e1; font-size: 16px; line-height: 1.45; margin: 12px 0 0; }
    .statusPill { background: #dbeafe; color: #1e3a8a; padding: 10px 14px; border-radius: 999px; font-weight: 800; white-space: nowrap; }
    .loginRow { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 18px; }
    .loginInput { border: 1px solid #64748b; border-radius: 14px; padding: 13px 14px; font-size: 16px; min-height: 48px; max-width: 100%; }
    .lightButton { background: white; color: #020617; border: 0; border-radius: 14px; padding: 13px 18px; min-height: 48px; font-weight: 800; cursor: pointer; }
    .adminBadge, .viewBadge { border-radius: 999px; padding: 12px 15px; font-weight: 900; display: inline-flex; align-items: center; min-height: 44px; }
    .adminBadge { background: #dcfce7; color: #166534; }
    .viewBadge { background: #dbeafe; color: #1e3a8a; }
    .loginStatus { color: #93c5fd !important; font-weight: 800; }

    .cards { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin-bottom: 18px; }
    .card { background: white; border-radius: 22px; padding: 20px; box-shadow: 0 10px 24px rgba(15,23,42,.08); min-width: 0; }
    .card.warn { background: #ffedd5; }
    .cardTitle { color: #64748b; font-weight: 800; margin: 0; }
    .cardValue { font-size: clamp(26px, 5vw, 34px); font-weight: 900; margin: 10px 0; word-break: break-word; }
    .cardSub { color: #64748b; margin: 0; }

    .adminGrid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.5fr); gap: 18px; align-items: start; }
    .panel { background: white; border-radius: 22px; padding: 22px; box-shadow: 0 10px 24px rgba(15,23,42,.08); margin-bottom: 18px; min-width: 0; }
    .panel h2 { font-size: clamp(26px, 4vw, 34px); line-height: 1.1; margin: 0 0 20px; }
    .formGrid, .photoGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; margin-bottom: 16px; }
    .field { display: grid; gap: 7px; font-weight: 800; color: #334155; margin-bottom: 14px; min-width: 0; }
    .input { width: 100%; border: 1px solid #cbd5e1; border-radius: 14px; padding: 13px 14px; font-size: 16px; min-height: 48px; background: white; max-width: 100%; }
    .primary { width: 100%; background: #020617; color: white; border: 0; border-radius: 16px; padding: 17px; font-size: 19px; font-weight: 900; cursor: pointer; min-height: 54px; }
    .note { background: #dbeafe; color: #1e3a8a; border-radius: 16px; padding: 14px; }
    .upload { border: 2px dashed #cbd5e1; border-radius: 18px; padding: 16px; background: #f8fafc; min-width: 0; }
    .upload input { display: block; margin-top: 12px; max-width: 100%; }
    .preview { margin-top: 12px; width: 100%; height: 150px; object-fit: cover; border-radius: 14px; }
    .empty { background: #f8fafc; border-radius: 18px; padding: 28px; text-align: center; color: #64748b; }
    .tableWrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table { width: 100%; border-collapse: collapse; min-width: 900px; }
    th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 10px; color: #475569; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: top; }
    .photoThumbs { display:flex; gap:8px; }
    .photoThumbs img { width:54px; height:54px; object-fit:cover; border-radius:10px; }
    .deleteBtn { background:#fee2e2; color:#991b1b; border:0; border-radius:10px; padding:8px 10px; cursor:pointer; }

    @media (max-width: 900px) {
      .cards { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .adminGrid { grid-template-columns: 1fr; }
    }

    @media (max-width: 600px) {
      .page { padding: 12px; }
      .hero { border-radius: 22px; padding: 22px; }
      .heroTop { display: block; }
      .statusPill { display: inline-flex; margin-top: 14px; white-space: normal; }
      .loginRow { display: grid; grid-template-columns: 1fr; width: 100%; }
      .loginInput, .lightButton, .adminBadge, .viewBadge { width: 100%; justify-content: center; text-align: center; }
      .cards { grid-template-columns: 1fr; gap: 14px; }
      .card { padding: 20px 18px; }
      .panel { border-radius: 22px; padding: 20px; }
      .formGrid, .photoGrid { grid-template-columns: 1fr; }
      .primary { position: sticky; bottom: 10px; z-index: 5; box-shadow: 0 12px 30px rgba(2,6,23,.25); }
      table { min-width: 760px; }
    }
  `}</style>
}
