import React, { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { T } from "../utils";

export function Spinner({size=16,color=T.pageSub}){
  return(<div style={{width:size,height:size,borderRadius:"50%",border:"2px solid rgba(55,53,47,0.12)",borderTopColor:color,animation:"spin 0.6s linear infinite",flexShrink:0}}/>);
}

export function Toast({message,type="error",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4500);return()=>clearTimeout(t);},[]);
  const c=type==="error"?{bg:"rgba(212,76,71,0.94)"}:{bg:"rgba(55,53,47,0.92)"};
  return(<div style={{background:c.bg,color:"#fff",borderRadius:6,padding:"10px 16px",fontSize:13,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:10,maxWidth:360,animation:"fadeUp 0.2s ease-out"}}>
    {type==="error"&&<AlertCircle style={{width:14,height:14,flexShrink:0}}/>}
    {type==="success"&&<CheckCircle2 style={{width:14,height:14,flexShrink:0}}/>}
    <span style={{flex:1}}>{message}</span>
    <button onClick={onClose} style={{border:"none",background:"transparent",cursor:"pointer",color:"rgba(255,255,255,0.65)",padding:0,display:"flex"}}><X style={{width:13,height:13}}/></button>
  </div>);
}

export function useToast(){
  const [toasts,setToasts]=useState([]);
  const uid_t=()=>Math.random().toString(36).slice(2,9);
  const show=useCallback((msg,type="error")=>{const id=uid_t();setToasts(p=>[...p,{id,message:msg,type}]);},[]);
  const remove=useCallback(id=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const ToastContainer=()=>(<div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>remove(t.id)}/>)}</div>);
  return{show,ToastContainer};
}