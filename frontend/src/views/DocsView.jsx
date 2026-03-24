import React, { useState } from "react";
import { FolderOpen, Plus, Edit2, Trash2, Link, Search, X } from "lucide-react";
import { T, DOC_TYPES, DOC_STATUS, DOC_COLOR, DocIcon, fmtFr, Tag, apiFetch, norm } from "../utils";
import ConfirmDialog from "../components/ConfirmDialog";

function DModal({item,onClose,onSave}){
  const[f,setF]=useState(item||{nom:"",type:"Contrat",statut:"Reçu",dateDoc:"",lien:"",notes:""});
  const[showConfirm,setShowConfirm]=useState(false);
  const handleAttemptClose=()=>setShowConfirm(true);
  return(
    <>
      {showConfirm&&<ConfirmDialog onConfirm={()=>{setShowConfirm(false);onClose();}} onCancel={()=>setShowConfirm(false)}/>}
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseDown={e=>{if(e.target===e.currentTarget)handleAttemptClose();}}>
      <div style={{background:"#fff",borderRadius:8,width:"min(440px,95vw)",overflow:"hidden"}}>
        <div style={{padding:"20px 24px 14px",borderBottom:`1px solid ${T.pageBdr}`}}><span style={{fontSize:16,fontWeight:700}}>{item?"Modifier":"Nouveau document"}</span></div>
        <div style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"span 2"}}><div style={{fontSize:11,fontWeight:600,marginBottom:5}}>Nom du document *</div><input autoFocus value={f.nom} onChange={e=>setF(p=>({...p,nom:e.target.value}))} style={{width:"100%",padding:"7px 10px",borderRadius:4,border:`1px solid rgba(55,53,47,0.2)`}}/></div>
          <div style={{gridColumn:"span 2"}}><div style={{fontSize:11,fontWeight:600,marginBottom:8}}>Type</div><select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={{width:"100%",padding:6}}>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        </div>
        <div style={{padding:"12px 24px",borderTop:`1px solid ${T.pageBdr}`,display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={handleAttemptClose}>Annuler</button><button onClick={()=>{if(!f.nom.trim())return;onSave(f);onClose();}}>Enregistrer</button></div>
      </div>
    </div>
    </>
  );
}

export default function DocsView({documents,setDocuments,wsId,showToast}){
  const[modal,setModal]=useState(null);const[filter,setFilter]=useState("Tous");const[search,setSearch]=useState("");
  const filtered=documents.filter(d=>(filter==="Tous"||d.type===filter)&&(!search||d.nom.toLowerCase().includes(search.toLowerCase())));

  const save=async f=>{
    try{
      if(modal==="new"){const created=norm(await apiFetch(`/workspaces/${wsId}/documents`,{method:"POST",body:f}));setDocuments(p=>[...p,created]);}
      else{const updated=norm(await apiFetch(`/documents/${modal.id}`,{method:"PUT",body:f}));setDocuments(p=>p.map(d=>d.id===modal.id?updated:d));}
    }catch(e){showToast("Erreur : "+e.message);}
  };
  const delDoc=async id=>{setDocuments(p=>p.filter(d=>d.id!==id));try{await apiFetch(`/documents/${id}`,{method:"DELETE"});}catch(e){showToast("Erreur : "+e.message);}};

  return(
    <div style={{padding:"60px 40px 80px",width:"100%"}}>
      {modal&&<DModal item={modal==="new"?null:modal} onClose={()=>setModal(null)} onSave={save}/>}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}><FolderOpen style={{width:24,height:24}}/><h1>Documents</h1></div>
      
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{padding:"6px 10px",borderRadius:4,border:"1px solid #ccc"}}/>
        <button onClick={()=>setModal("new")} style={{padding:"6px 12px",display:"flex",alignItems:"center",gap:5,background:"#37352f",color:"#fff",border:"none",borderRadius:4}}><Plus size={14}/> Nouveau</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
        {filtered.map(doc=>(
          <div key={doc.id} style={{border:`1px solid ${T.pageBdr}`,borderRadius:4,padding:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><DocIcon type={doc.type} size={24}/><div><button onClick={()=>setModal(doc)} style={{background:"none",border:"none",cursor:"pointer"}}><Edit2 size={12}/></button><button onClick={()=>delDoc(doc.id)} style={{background:"none",border:"none",cursor:"pointer",color:"red"}}><Trash2 size={12}/></button></div></div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{doc.nom}</div>
            <Tag label={doc.statut}/>
          </div>
        ))}
      </div>
    </div>
  );
}