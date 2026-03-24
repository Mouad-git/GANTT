import React, { useState } from "react";
import { X, CalendarRange } from "lucide-react";
import { T, gdb, pd } from "../utils";
import { Spinner } from "./ui";
import ConfirmDialog from "./ConfirmDialog";

export default function WsModal({onClose,onCreate}){
  const[company,setCompany]=useState("");
  const[startDate,setStartDate]=useState("");
  const[endDate,setEndDate]=useState("");
  const[saving,setSaving]=useState(false);
  const[showConfirm,setShowConfirm]=useState(false);
  const canCreate=company.trim()&&startDate&&endDate&&startDate<=endDate;
  const create=async()=>{if(!canCreate||saving)return;setSaving(true);await onCreate({company:company.trim(),startDate,endDate});setSaving(false);onClose();};
  const handleAttemptClose=()=>setShowConfirm(true);
  const iS={width:"100%",boxSizing:"border-box",padding:"7px 10px",borderRadius:4,border:`1px solid rgba(55,53,47,0.2)`,fontSize:13,color:T.pageText,outline:"none",fontFamily:"inherit",background:"#fff",transition:"box-shadow 0.12s,border-color 0.12s"};
  const fI=e=>{e.target.style.borderColor=T.accent;e.target.style.boxShadow=`0 0 0 2px ${T.accent}22`;};
  const fO=e=>{e.target.style.borderColor="rgba(55,53,47,0.2)";e.target.style.boxShadow="none";};
  const dur=startDate&&endDate&&startDate<=endDate?gdb(pd(startDate),pd(endDate))+1:null;
  return(
    <>
      {showConfirm&&<ConfirmDialog onConfirm={()=>{setShowConfirm(false);onClose();}} onCancel={()=>setShowConfirm(false)}/>}
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseDown={e=>{if(e.target===e.currentTarget)handleAttemptClose();}}>
      <div style={{background:"#fff",borderRadius:8,boxShadow:"0 16px 48px rgba(0,0,0,0.18)",width:"min(400px,95vw)",border:`1px solid rgba(55,53,47,0.13)`,overflow:"hidden"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${T.pageBdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:16,fontWeight:700,color:T.pageText,letterSpacing:"-0.02em"}}>Nouveau workspace</span>
          <button onClick={handleAttemptClose} style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,border:"none",background:"transparent",cursor:"pointer",color:T.pageSub}}><X style={{width:14,height:14}}/></button>
        </div>
        <div style={{padding:"18px 24px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:T.pageSub,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>Entreprise / Client</div>
            <input autoFocus value={company} onChange={e=>setCompany(e.target.value)} onKeyDown={e=>e.key==="Enter"&&create()} placeholder="Ex: TechCorp Maroc" style={iS} onFocus={fI} onBlur={fO}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:T.pageSub,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Période</div>
            <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
              <div style={{flex:1}}><div style={{fontSize:11,color:T.pageTer,marginBottom:4}}>Début</div><input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);if(endDate&&e.target.value>endDate)setEndDate("");}} style={iS} onFocus={fI} onBlur={fO}/></div>
              <div style={{paddingBottom:9,color:T.pageTer,fontSize:13}}>→</div>
              <div style={{flex:1}}><div style={{fontSize:11,color:T.pageTer,marginBottom:4}}>Fin</div><input type="date" value={endDate} min={startDate||undefined} onChange={e=>setEndDate(e.target.value)} style={iS} onFocus={fI} onBlur={fO}/></div>
            </div>
            {dur&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:8,padding:"5px 10px",borderRadius:4,background:"rgba(55,53,47,0.04)",border:`1px solid ${T.pageBdr}`,width:"fit-content"}}><CalendarRange style={{width:12,height:12,color:T.pageSub}}/><span style={{fontSize:12,color:T.pageSub,fontWeight:500}}>{dur} jour{dur>1?"s":""}</span></div>}
          </div>
          <button onClick={create} disabled={!canCreate||saving} style={{width:"100%",padding:"9px",fontSize:14,fontWeight:600,color:"#fff",background:canCreate&&!saving?"#37352f":"#ccc",border:"none",borderRadius:4,cursor:canCreate&&!saving?"pointer":"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {saving&&<Spinner size={14} color="#fff"/>}Créer le workspace
          </button>
        </div>
      </div>
    </div>
    </>
  );
}