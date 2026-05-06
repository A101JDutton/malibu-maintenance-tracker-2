
'use client'
import { useState } from 'react'

export default function Page(){
  const [entries,setEntries]=useState([])
  const [mileage,setMileage]=useState('')
  const [current,setCurrent]=useState('')

  const add=()=>{
    if(!mileage) return
    setEntries([{mileage,date:new Date().toLocaleDateString()},...entries])
    setMileage('')
  }

  const last=entries[0]
  const next=last?Number(last.mileage)+5000:null
  const left=next&&current?next-current:null

  return(
    <div style={{padding:40,fontFamily:'sans-serif'}}>
      <h1>Malibu Maintenance Tracker</h1>

      <h3>Dashboard</h3>
      <p>Last Oil Change: {last?last.mileage+' mi':'None'}</p>
      <p>Next Due: {next||'-'}</p>
      <p>Miles Left: {left||'-'}</p>

      <input placeholder="Current Mileage" value={current} onChange={e=>setCurrent(e.target.value)} />

      <h3>Add Oil Change</h3>
      <input placeholder="Mileage" value={mileage} onChange={e=>setMileage(e.target.value)} />
      <button onClick={add}>Add</button>

      <h3>Records</h3>
      {entries.map((e,i)=>(
        <div key={i}>{e.date} - {e.mileage} mi</div>
      ))}
    </div>
  )
}
