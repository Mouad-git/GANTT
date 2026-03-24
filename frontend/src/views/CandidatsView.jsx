import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Users, Search, ChevronDown, Mail, Settings, Edit2, Trash2, Check, FileUp, Plus, X } from "lucide-react";
import { T, fmt, grpTag, C_STATUS, Tag, apiFetch, norm } from "../utils";
import ImportWizard from "../components/ImportWizard";
import ConfirmDialog from "../components/ConfirmDialog";

function CModal({item,onClose,onSave}){
  const[f,setF]=useState(item||{nom:"",prenom:"",poste:"",statut:"Reçu",email:"",telephone:"",notes:""});
  const[showConfirm,setShowConfirm]=useState(false);
  const inp=(label,key,type="text",span=1)=>(<div key={key} style={{gridColumn:`span ${span}`}}><div style={{fontSize:11,fontWeight:600,color:T.pageSub,textTransform:"uppercase",marginBottom:5}}>{label}</div><input type={type} value={f[key]||""} onChange={e=>setF(p=>({...p,[key]:e.target.value}))} style={{width:"100%",padding:"7px 10px",borderRadius:4,border:`1px solid rgba(55,53,47,0.2)`}}/></div>);
  const handleAttemptClose=()=>setShowConfirm(true);
  return(
    <>
      {showConfirm&&<ConfirmDialog onConfirm={()=>{setShowConfirm(false);onClose();}} onCancel={()=>setShowConfirm(false)}/>}
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseDown={e=>{if(e.target===e.currentTarget)handleAttemptClose();}}>
      <div style={{background:"#fff",borderRadius:8,width:"min(460px,95vw)",overflow:"hidden",padding:24}}>
        <h3>{item?"Modifier":"Nouveau"} Candidat</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {inp("Nom *","nom")}{inp("Prénom *","prenom")}{inp("Poste","poste","text",2)}{inp("Email","email")}{inp("Téléphone","telephone")}
        </div>
        <div style={{marginTop:16,display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={handleAttemptClose}>Annuler</button><button onClick={()=>{if(!f.nom.trim())return;onSave(f);onClose();}}>Enregistrer</button></div>
      </div>
    </div>
    </>
  );
}

export default function CandidatsView({candidats,setCandidats,tasks,setTasks,ws,wsId,showToast}){
  const[modal,setModal]=useState(null);const[importOpen,setImportOpen]=useState(false);
  const[viewMode,setViewMode]=useState("liste");const[filterTheme,setFilterTheme]=useState("Tous");
  const[filterGroupe,setFilterGroupe]=useState("Tous");const[search,setSearch]=useState("");
  const[showFilters,setShowFilters]=useState(false);const[showColPicker,setShowColPicker]=useState(false);
  const[visibleExtraCols,setVisibleExtraCols]=useState(new Set());const[colPickerInit,setColPickerInit]=useState(false);
  const colPickerRef=useRef(null);

  useEffect(()=>{if(!showColPicker)return;const h=e=>{if(colPickerRef.current&&!colPickerRef.current.contains(e.target))setShowColPicker(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[showColPicker]);

  const hasFormation=useMemo(()=>candidats.some(c=>c.theme),[candidats]);
  const allThemes=useMemo(()=>[...new Set(candidats.filter(c=>c.theme).map(c=>c.theme))].sort(),[candidats]);
  const allGroupes=useMemo(()=>[...new Set(candidats.filter(c=>c.groupe).map(c=>String(c.groupe)))].sort((a,b)=>Number(a)-Number(b)),[candidats]);
  const filtered=useMemo(()=>candidats.filter(c=>{const mT=filterTheme==="Tous"||c.theme===filterTheme;const mG=filterGroupe==="Tous"||String(c.groupe)===filterGroupe;const mS=!search||`${c.nom} ${c.prenom} ${c.poste||""} ${c.theme||""}`.toLowerCase().includes(search.toLowerCase());return mT&&mG&&mS;}),[candidats,filterTheme,filterGroupe,search]);

  const save=async f=>{
    try{
      if(modal==="new"){
        const created=norm(await apiFetch(`/workspaces/${wsId}/candidats`,{method:"POST",body:{...f,createdAt:new Date().toISOString()}}));
        setCandidats(p=>[...p,created]);
      }else{
        const updated=norm(await apiFetch(`/candidats/${modal.id}`,{method:"PUT",body:f}));
        setCandidats(p=>p.map(c=>c.id===modal.id?updated:c));
      }
    }catch(e){showToast("Erreur : "+e.message);}
    setModal(null);
  };
  const delCand=async id=>{setCandidats(p=>p.filter(c=>c.id!==id));try{await apiFetch(`/candidats/${id}`,{method:"DELETE"});}catch(e){showToast("Erreur : "+e.message);}};

  const exportCandidats=()=>{
    const allExtraKeys=[];const seen=new Set();
    candidats.forEach(c=>{if(c.extraData)Object.keys(c.extraData).forEach(k=>{if(!seen.has(k)){seen.add(k);allExtraKeys.push(k);}});});
    const data=filtered.map(c=>{
      const row={"Nom":c.nom||"","Prénom":c.prenom||"","Thème / Formation":c.theme||"","Poste":c.poste||"","Statut":c.statut||"","Jours":c.jours||"","Groupe":c.groupe?`Grp ${c.groupe}`:"","Début":c.dateDebut?fmt(c.dateDebut):"","Fin":c.dateFin?fmt(c.dateFin):"","Email":c.email||"","Téléphone":c.telephone||"","Notes":c.notes||""};
      allExtraKeys.forEach(k=>{row[k]=c.extraData?.[k]||"";});
      return row;
    });
    const sheet=XLSX.utils.json_to_sheet(data);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,sheet,"Candidats");
    XLSX.writeFile(wb,`candidats_export_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast(`${data.length} candidat(s) exporté(s)`,"success");
  };

  return(
    <div style={{padding:"60px 40px 80px",width:"100%"}}>
      {modal&&<CModal item={modal==="new"?null:modal} onClose={()=>setModal(null)} onSave={save}/>}
      {importOpen&&<ImportWizard onClose={()=>setImportOpen(false)} onDone={cands=>setCandidats(p=>[...p,...cands])} setTasks={setTasks} wsStart={ws?.startDate||null} wsId={wsId} showToast={showToast}/>}
      
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}><Users style={{width:24,height:24}}/><h1>Candidats</h1></div>
      
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{padding:"6px 10px",borderRadius:4,border:"1px solid #ccc"}}/>
        <button onClick={()=>setImportOpen(true)} style={{padding:"6px 12px",display:"flex",alignItems:"center",gap:5}}><FileUp size={14}/> Importer</button>
        <button onClick={exportCandidats} style={{padding:"6px 12px",display:"flex",alignItems:"center",gap:5}}><FileUp size={14}/> Exporter</button>
        <button onClick={()=>setModal("new")} style={{padding:"6px 12px",display:"flex",alignItems:"center",gap:5,background:"#37352f",color:"#fff",border:"none",borderRadius:4}}><Plus size={14}/> Nouveau</button>
      </div>

      <div style={{border:"1px solid #eee",borderRadius:6,background:"#fff"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead style={{background:"#f7f7f7"}}><tr style={{textAlign:"left"}}>
            <th style={{padding:12}}>Nom</th><th>Prénom</th><th>Thème</th><th>Groupe</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map((c,i)=>(
              <tr key={c.id} style={{borderTop:"1px solid #eee"}}>
                <td style={{padding:12}}>{c.nom}</td><td>{c.prenom}</td><td><Tag label={c.theme||"Aucun"} scheme={grpTag(c.theme)}/></td><td>{c.groupe||"—"}</td>
                <td>
                  <button onClick={()=>setModal(c)} style={{background:"none",border:"none",cursor:"pointer"}}><Edit2 size={14}/></button>
                  <button onClick={()=>delCand(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"red"}}><Trash2 size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}