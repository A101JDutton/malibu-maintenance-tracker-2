'use client';
import {useEffect,useMemo,useState} from 'react';

const DB='malibu-maintenance-db', STORE='app-data';
const services=['Oil Change','Tire Rotation','Brake Service','Inspection','Air Filter','Cabin Filter','Battery','Other'];
const specs=['0W-20 Dexos1 Gen2','0W-20 Dexos1 Gen3'];
const oils=['Mobil 1','Valvoline','Castrol','Pennzoil','ACDelco','Royal Purple','Other'];
const filters=['ACDelco','FRAM','Bosch','Mobil 1','K&N','WIX','Other'];
const blank={date:'',mileage:'',serviceType:'Oil Change',oilSpec:'0W-20 Dexos1 Gen3',oilBrand:'Mobil 1',filterBrand:'ACDelco',cost:'',receiptPhoto:'',odometerPhoto:'',notes:''};

function openDb(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
  });
}
async function saveData(data){
  const db=await openDb();
  return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,'main');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});
}
async function loadData(){
  const db=await openDb();
  return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get('main');r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)});
}
function fileToDataUrl(file,cb){const reader=new FileReader();reader.onload=()=>cb(reader.result);reader.readAsDataURL(file)}

export default function Page(){
  const [current,setCurrent]=useState('');
  const [interval,setIntervalMiles]=useState(5000);
  const [entries,setEntries]=useState([]);
  const [form,setForm]=useState(blank);
  const [status,setStatus]=useState('Loading saved data...');
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{loadData().then(d=>{if(d){setCurrent(d.current||'');setIntervalMiles(d.interval||5000);setEntries(d.entries||[])}setLoaded(true);setStatus('Saved data loaded')}).catch(()=>{setLoaded(true);setStatus('Ready')})},[]);
  useEffect(()=>{if(!loaded)return; const t=setTimeout(()=>saveData({current,interval,entries}).then(()=>setStatus('Saved')).catch(()=>setStatus('Save failed')),400); return()=>clearTimeout(t)},[current,interval,entries,loaded]);

  const oilChanges=useMemo(()=>entries.filter(e=>e.serviceType==='Oil Change'&&Number(e.mileage)),[entries]);
  const last=useMemo(()=>oilChanges.length?[...oilChanges].sort((a,b)=>Number(b.mileage)-Number(a.mileage))[0]:null,[oilChanges]);
  const next=last?Number(last.mileage)+Number(interval||5000):null;
  const left=next&&current?next-Number(current):null;
  const total=entries.reduce((s,e)=>s+Number(e.cost||0),0);

  function update(k,v){setForm(p=>({...p,[k]:v}))}
  function add(){if(!form.date||!form.mileage){alert('Date and mileage are required.');return} setEntries(p=>[{...form,id:crypto.randomUUID()},...p]); setForm(blank); setStatus('Saving...')}
  function del(id){setEntries(p=>p.filter(e=>e.id!==id));setStatus('Saving...')}
  function backup(){
    const blob=new Blob([JSON.stringify({current,interval,entries},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='malibu-maintenance-backup.json'; a.click(); URL.revokeObjectURL(url);
  }
  function restore(e){
    const file=e.target.files?.[0]; if(!file)return;
    const reader=new FileReader(); reader.onload=()=>{try{const d=JSON.parse(reader.result);setCurrent(d.current||'');setIntervalMiles(d.interval||5000);setEntries(d.entries||[]);setStatus('Imported and saved')}catch{alert('Could not import backup.')}}; reader.readAsText(file);
  }
  function clearAll(){if(confirm('Delete all records and photos saved in this browser?')){setCurrent('');setIntervalMiles(5000);setEntries([]);setStatus('Saving...')}}

  return <main style={s.page}>
    <section style={s.hero}>
      <h1 style={s.h1}>Malibu Maintenance Tracker</h1>
      <p style={s.muted}>2020 Chevy Malibu 1.5L Turbo • saves records and photos in this browser</p>
      <div style={s.row}><button style={s.btnLight} onClick={backup}>Export Backup</button><label style={s.btnLight}>Import Backup<input type="file" accept="application/json" onChange={restore} style={{display:'none'}}/></label><button style={s.btnRed} onClick={clearAll}>Clear Data</button></div>
      <p style={s.status}>Status: {status}</p>
    </section>

    <section style={s.cards}>
      <Card t="Last Oil Change" v={last?`${Number(last.mileage).toLocaleString()} mi`:'None'} sub={last?.date||'Add your first oil change'}/>
      <Card t="Next Oil Due" v={next?`${next.toLocaleString()} mi`:'—'} sub="Based on interval"/>
      <Card t="Miles Left" v={left!==null?`${left.toLocaleString()} mi`:'—'} sub={left!==null&&left<=0?'Oil change due now':left!==null?'Tracking active':'Enter current mileage'} warn={left!==null&&left<=500}/>
      <Card t="Total Cost" v={`$${total.toFixed(2)}`} sub={`${entries.length} records saved`}/>
    </section>

    <section style={s.grid}>
      <div style={s.panel}>
        <h2>Dashboard Settings</h2>
        <Field label="Current Mileage"><input style={s.input} type="number" value={current} onChange={e=>setCurrent(e.target.value)} placeholder="Example: 84250"/></Field>
        <Field label="Oil Interval Miles"><input style={s.input} type="number" value={interval} onChange={e=>setIntervalMiles(e.target.value)}/></Field>
        <p style={s.note}>Data + photos save automatically. Use Export Backup before clearing browser data or switching devices.</p>
      </div>
      <div style={s.panel}>
        <h2>Add Maintenance Record</h2>
        <div style={s.form}>
          <Field label="Date"><input style={s.input} type="date" value={form.date} onChange={e=>update('date',e.target.value)}/></Field>
          <Field label="Mileage"><input style={s.input} type="number" value={form.mileage} onChange={e=>update('mileage',e.target.value)} placeholder="Mileage at service"/></Field>
          <Field label="Service Type"><Sel value={form.serviceType} onChange={v=>update('serviceType',v)} options={services}/></Field>
          <Field label="Oil Type/Spec"><Sel value={form.oilSpec} onChange={v=>update('oilSpec',v)} options={specs}/></Field>
          <Field label="Oil Brand"><Sel value={form.oilBrand} onChange={v=>update('oilBrand',v)} options={oils}/></Field>
          <Field label="Filter Brand"><Sel value={form.filterBrand} onChange={v=>update('filterBrand',v)} options={filters}/></Field>
          <Field label="Cost"><input style={s.input} type="number" value={form.cost} onChange={e=>update('cost',e.target.value)} placeholder="Optional"/></Field>
          <Field label="Notes"><input style={s.input} value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Example: DIY oil change"/></Field>
        </div>
        <div style={s.form}><Photo label="Receipt Photo" value={form.receiptPhoto} onChange={v=>update('receiptPhoto',v)}/><Photo label="Odometer Photo" value={form.odometerPhoto} onChange={v=>update('odometerPhoto',v)}/></div>
        <button style={s.primary} onClick={add}>Save Record</button>
      </div>
    </section>

    <section style={s.panel}>
      <h2>Maintenance Records</h2>
      {entries.length===0?<p style={s.empty}>No records yet.</p>:<div style={{overflowX:'auto'}}><table style={s.table}><thead><tr>{['Date','Mileage','Service','Oil','Filter','Cost','Photos','Notes',''].map(x=><th style={s.th} key={x}>{x}</th>)}</tr></thead><tbody>{entries.map(e=><tr key={e.id}><td style={s.td}>{e.date}</td><td style={s.td}>{Number(e.mileage).toLocaleString()}</td><td style={s.td}>{e.serviceType}</td><td style={s.td}>{e.oilBrand} • {e.oilSpec}</td><td style={s.td}>{e.filterBrand}</td><td style={s.td}>{e.cost?`$${Number(e.cost).toFixed(2)}`:'—'}</td><td style={s.td}><div style={{display:'flex',gap:8}}>{e.receiptPhoto&&<a href={e.receiptPhoto} target="_blank"><img src={e.receiptPhoto} style={s.thumb}/></a>}{e.odometerPhoto&&<a href={e.odometerPhoto} target="_blank"><img src={e.odometerPhoto} style={s.thumb}/></a>}</div></td><td style={s.td}>{e.notes||'—'}</td><td style={s.td}><button style={s.del} onClick={()=>del(e.id)}>Delete</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>
}

function Card({t,v,sub,warn}){return <div style={{...s.card,...(warn?s.warn:{})}}><p style={s.cardT}>{t}</p><p style={s.cardV}>{v}</p><p style={s.cardS}>{sub}</p></div>}
function Field({label,children}){return <label style={s.label}><span>{label}</span>{children}</label>}
function Sel({value,onChange,options}){return <select style={s.input} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select>}
function Photo({label,value,onChange}){return <div style={s.upload}><b>{label}</b><input style={{marginTop:10}} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)fileToDataUrl(f,onChange)}}/>{value&&<img src={value} style={s.preview}/>}</div>}

const s={
 page:{minHeight:'100vh',background:'#f1f5f9',color:'#0f172a',fontFamily:'Arial, sans-serif',padding:24},
 hero:{background:'#020617',color:'white',borderRadius:24,padding:28,marginBottom:20}, h1:{fontSize:36,margin:0}, muted:{color:'#cbd5e1'},
 row:{display:'flex',gap:10,flexWrap:'wrap'}, btnLight:{background:'white',color:'#020617',border:0,borderRadius:14,padding:'12px 18px',fontWeight:700,cursor:'pointer'}, btnRed:{background:'#ef4444',color:'white',border:0,borderRadius:14,padding:'12px 18px',fontWeight:700,cursor:'pointer'}, status:{color:'#93c5fd',fontWeight:700},
 cards:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,marginBottom:20}, card:{background:'white',borderRadius:22,padding:20,boxShadow:'0 10px 24px rgba(15,23,42,.08)'}, warn:{background:'#ffedd5'}, cardT:{color:'#64748b',fontWeight:700,margin:0}, cardV:{fontSize:28,fontWeight:800,margin:'8px 0'}, cardS:{color:'#64748b',margin:0},
 grid:{display:'grid',gridTemplateColumns:'minmax(250px,1fr) minmax(300px,2fr)',gap:20,marginBottom:20}, panel:{background:'white',borderRadius:22,padding:22,boxShadow:'0 10px 24px rgba(15,23,42,.08)',marginBottom:20}, form:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:14,marginBottom:16},
 label:{display:'grid',gap:7,fontWeight:700,color:'#334155',marginBottom:14}, input:{border:'1px solid #cbd5e1',borderRadius:14,padding:12,fontSize:15}, note:{background:'#dbeafe',color:'#1e3a8a',borderRadius:16,padding:14}, primary:{width:'100%',background:'#020617',color:'white',border:0,borderRadius:16,padding:16,fontSize:18,fontWeight:800,cursor:'pointer'},
 upload:{border:'2px dashed #cbd5e1',borderRadius:18,padding:16,background:'#f8fafc'}, preview:{marginTop:12,width:'100%',height:150,objectFit:'cover',borderRadius:14}, thumb:{width:54,height:54,objectFit:'cover',borderRadius:10}, empty:{background:'#f8fafc',borderRadius:18,padding:28,textAlign:'center',color:'#64748b'}, table:{width:'100%',borderCollapse:'collapse',minWidth:900}, th:{textAlign:'left',borderBottom:'1px solid #cbd5e1',padding:10,color:'#475569'}, td:{borderBottom:'1px solid #e2e8f0',padding:10,verticalAlign:'top'}, del:{background:'#fee2e2',color:'#991b1b',border:0,borderRadius:10,padding:'8px 10px',cursor:'pointer'}
};
