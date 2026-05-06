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
    if(email.toLowerCase()!==allowedEmail){
      alert('Only the owner email can edit this tracker.');
      return;
    }
    if(!password){
      alert('Enter your password.');
      return;
    }
    setLoginStatus('Signing in...');
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){
      setLoginStatus('Login failed: '+error.message);
      return;
    }
    setLoginStatus('Logged in.');
  }

  async function signOut(){await supabase.auth.signOut();}

  function requireAdmin(){
    if(!isAdmin){
      alert('Only the owner can change records. Everyone else is view-only.');
      return false;
    }
    return true;
  }

  async function saveSettings(){
    if(!requireAdmin())return;
    setStatus('Saving settings...');
    const {error}=await supabase.from('public_settings').upsert({
      id:1,
      current_mileage:Number(currentMileage||0),
      interval_miles:Number(intervalMiles||5000),
      updated_at:new Date().toISOString()
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
      date:form.date,
      mileage:Number(form.mileage),
      service_type:form.service_type,
      oil_spec:form.oil_spec,
      oil_brand:form.oil_brand,
      filter_brand:form.filter_brand,
      cost:form.cost?Number(form.cost):null,
      receipt_photo_url:form.receipt_photo_url||null,
      odometer_photo_url:form.odometer_photo_url||null,
      notes:form.notes||null
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
    return <main style={s.page}><section style={s.hero}><h1>Missing Supabase Setup</h1><p>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Environment Variables.</p></section></main>
  }

  return <main style={s.page}>
    <section style={s.hero}>
      <h1 style={s.h1}>Malibu Maintenance Tracker</h1>
      <p style={s.muted}>Public view • owner-only password edit • cloud synced with Supabase</p>
      <p style={s.status}>Status: {status}</p>

      <div style={s.loginRow}>
        {isAdmin ? <>
          <span style={s.adminBadge}>Admin Access</span>
          <button style={s.btnLight} onClick={signOut}>Sign Out</button>
        </> : <>
          <input style={s.loginInput} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Owner email" />
          <input style={s.loginInput} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" />
          <button style={s.btnLight} onClick={passwordLogin}>Owner Login</button>
          <span style={s.viewBadge}>Public view-only mode</span>
        </>}
      </div>
      {loginStatus && <p style={s.status}>{loginStatus}</p>}
    </section>

    <section style={s.cards}>
      <Card t="Last Oil Change" v={last?`${Number(last.mileage).toLocaleString()} mi`:'None'} sub={last?.date||'No oil change logged'} />
      <Card t="Next Oil Due" v={next?`${next.toLocaleString()} mi`:'—'} sub="Based on interval" />
      <Card t="Miles Left" v={left!==null?`${left.toLocaleString()} mi`:'—'} sub={left!==null&&left<=0?'Oil change due now':left!==null?'Tracking active':'Current mileage not set'} warn={left!==null&&left<=500}/>
      <Card t="Total Cost" v={`$${total.toFixed(2)}`} sub={`${entries.length} records`} />
    </section>

    {isAdmin && <section style={s.grid}>
      <div style={s.panel}>
        <h2>Dashboard Settings</h2>
        <Field label="Current Mileage"><input style={s.input} type="number" value={currentMileage} onChange={e=>setCurrentMileage(e.target.value)} /></Field>
        <Field label="Oil Interval Miles"><input style={s.input} type="number" value={intervalMiles} onChange={e=>setIntervalMiles(e.target.value)} /></Field>
        <button style={s.primary} onClick={saveSettings}>Save Dashboard Settings</button>
      </div>

      <div style={s.panel}>
        <h2>Add Maintenance Record</h2>
        <div style={s.form}>
          <Field label="Date"><input style={s.input} type="date" value={form.date} onChange={e=>update('date',e.target.value)} /></Field>
          <Field label="Mileage"><input style={s.input} type="number" value={form.mileage} onChange={e=>update('mileage',e.target.value)} /></Field>
          <Field label="Service Type"><Sel value={form.service_type} onChange={v=>update('service_type',v)} options={services}/></Field>
          <Field label="Oil Type/Spec"><Sel value={form.oil_spec} onChange={v=>update('oil_spec',v)} options={specs}/></Field>
          <Field label="Oil Brand"><Sel value={form.oil_brand} onChange={v=>update('oil_brand',v)} options={oils}/></Field>
          <Field label="Filter Brand"><Sel value={form.filter_brand} onChange={v=>update('filter_brand',v)} options={filters}/></Field>
          <Field label="Cost"><input style={s.input} type="number" value={form.cost} onChange={e=>update('cost',e.target.value)} /></Field>
          <Field label="Notes"><input style={s.input} value={form.notes} onChange={e=>update('notes',e.target.value)} /></Field>
        </div>
        <div style={s.form}>
          <Photo label="Receipt Photo" value={form.receipt_photo_url} onUploaded={url=>update('receipt_photo_url',url)} uploadPhoto={uploadPhoto}/>
          <Photo label="Odometer Photo" value={form.odometer_photo_url} onUploaded={url=>update('odometer_photo_url',url)} uploadPhoto={uploadPhoto}/>
        </div>
        <button style={s.primary} onClick={addEntry}>Save Record</button>
      </div>
    </section>}

    <section style={s.panel}>
      <h2>Maintenance Records</h2>
      {!isAdmin && <p style={s.note}>Public view-only mode. Only the owner can add or delete records.</p>}
      {entries.length===0?<p style={s.empty}>No records yet.</p>:<div style={{overflowX:'auto'}}><table style={s.table}>
        <thead><tr>{['Date','Mileage','Service','Oil','Filter','Cost','Photos','Notes',isAdmin?'Actions':''].map(x=><th style={s.th} key={x}>{x}</th>)}</tr></thead>
        <tbody>{entries.map(e=><tr key={e.id}>
          <td style={s.td}>{e.date}</td><td style={s.td}>{Number(e.mileage).toLocaleString()}</td><td style={s.td}>{e.service_type}</td><td style={s.td}>{e.oil_brand} • {e.oil_spec}</td><td style={s.td}>{e.filter_brand}</td><td style={s.td}>{e.cost?`$${Number(e.cost).toFixed(2)}`:'—'}</td>
          <td style={s.td}><div style={{display:'flex',gap:8}}>{e.receipt_photo_url&&<a href={e.receipt_photo_url} target="_blank"><img src={e.receipt_photo_url} style={s.thumb}/></a>}{e.odometer_photo_url&&<a href={e.odometer_photo_url} target="_blank"><img src={e.odometer_photo_url} style={s.thumb}/></a>}</div></td>
          <td style={s.td}>{e.notes||'—'}</td><td style={s.td}>{isAdmin&&<button style={s.del} onClick={()=>deleteEntry(e.id)}>Delete</button>}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </main>
}

function Photo({label,value,onUploaded,uploadPhoto}){
  const [busy,setBusy]=useState(false);
  return <div style={s.upload}><b>{label}</b><input style={{marginTop:10}} type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);const url=await uploadPhoto(file,label.toLowerCase().replaceAll(' ','-'));if(url)onUploaded(url);setBusy(false)}} />{busy&&<p>Uploading...</p>}{value&&<img src={value} style={s.preview}/>}</div>
}
function Card({t,v,sub,warn}){return <div style={{...s.card,...(warn?s.warn:{})}}><p style={s.cardT}>{t}</p><p style={s.cardV}>{v}</p><p style={s.cardS}>{sub}</p></div>}
function Field({label,children}){return <label style={s.label}><span>{label}</span>{children}</label>}
function Sel({value,onChange,options}){return <select style={s.input} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select>}

const s={
 page:{minHeight:'100vh',background:'#f1f5f9',color:'#0f172a',fontFamily:'Arial,sans-serif',padding:24},
 hero:{background:'#020617',color:'white',borderRadius:24,padding:28,marginBottom:20},h1:{fontSize:36,margin:0},muted:{color:'#cbd5e1'},status:{color:'#93c5fd',fontWeight:700},
 loginRow:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'},loginInput:{border:'1px solid #64748b',borderRadius:14,padding:12,fontSize:15},btnLight:{background:'white',color:'#020617',border:0,borderRadius:14,padding:'12px 18px',fontWeight:700,cursor:'pointer'},adminBadge:{background:'#dcfce7',color:'#166534',borderRadius:999,padding:'8px 12px',fontWeight:800},viewBadge:{background:'#dbeafe',color:'#1e3a8a',borderRadius:999,padding:'8px 12px',fontWeight:800},
 cards:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,marginBottom:20},card:{background:'white',borderRadius:22,padding:20,boxShadow:'0 10px 24px rgba(15,23,42,.08)'},warn:{background:'#ffedd5'},cardT:{color:'#64748b',fontWeight:700,margin:0},cardV:{fontSize:28,fontWeight:800,margin:'8px 0'},cardS:{color:'#64748b',margin:0},
 grid:{display:'grid',gridTemplateColumns:'minmax(250px,1fr) minmax(300px,2fr)',gap:20,marginBottom:20},panel:{background:'white',borderRadius:22,padding:22,boxShadow:'0 10px 24px rgba(15,23,42,.08)',marginBottom:20},form:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,marginBottom:16},
 label:{display:'grid',gap:7,fontWeight:700,color:'#334155',marginBottom:14},input:{border:'1px solid #cbd5e1',borderRadius:14,padding:12,fontSize:15},primary:{width:'100%',background:'#020617',color:'white',border:0,borderRadius:16,padding:16,fontSize:18,fontWeight:800,cursor:'pointer'},note:{background:'#dbeafe',color:'#1e3a8a',borderRadius:16,padding:14},
 upload:{border:'2px dashed #cbd5e1',borderRadius:18,padding:16,background:'#f8fafc'},preview:{marginTop:12,width:'100%',height:150,objectFit:'cover',borderRadius:14},thumb:{width:54,height:54,objectFit:'cover',borderRadius:10},empty:{background:'#f8fafc',borderRadius:18,padding:28,textAlign:'center',color:'#64748b'},table:{width:'100%',borderCollapse:'collapse',minWidth:900},th:{textAlign:'left',borderBottom:'1px solid #cbd5e1',padding:10,color:'#475569'},td:{borderBottom:'1px solid #e2e8f0',padding:10,verticalAlign:'top'},del:{background:'#fee2e2',color:'#991b1b',border:0,borderRadius:10,padding:'8px 10px',cursor:'pointer'}
};
