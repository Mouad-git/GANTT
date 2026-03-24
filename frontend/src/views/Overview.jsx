import React, { useState } from "react";
import { Trash2, Building2, CalendarRange, Users, FolderOpen, X } from "lucide-react";
import { T, fmt, fmtRange, pd, grpTag, C_STATUS, Tag } from "../utils";
import { Spinner } from "../components/ui";

export default function Overview({ws,tasks,candidats,documents,onSection,loading,onDeleteWs}){
  const[confirmDelete,setConfirmDelete]=useState(false);
  const[deleting,setDeleting]=useState(false);
  
  if(!ws)return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:8}}><Building2 style={{width:40,height:40,color:T.pageTer,strokeWidth:1.4}}/><div style={{fontSize:16,fontWeight:600,color:T.pageText}}>Sélectionnez un workspace</div></div>);
  if(loading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",gap:10}}><Spinner size={20} color={T.accent}/><span style={{fontSize:14,color:T.pageSub}}>Chargement…</span></div>);
  
  const done=tasks.filter(t=>{const now=new Date();now.setHours(0,0,0,0);return pd(t.end)<now;}).length;
  const retained=candidats.filter(c=>c.statut==="Retenu").length;
  const validated=documents.filter(d=>d.statut==="Validé").length;
  const divider=<div style={{height:1,background:T.pageBdr,margin:"32px 0"}}/>;
  
  const handleDelete=async()=>{setDeleting(true);await onDeleteWs(ws.id);setDeleting(false);setConfirmDelete(false);};
  
  return(
    <div style={{padding:"80px 96px 80px",maxWidth:900}}>
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmDelete(false);}}>
          <div style={{background:"#fff",borderRadius:8,boxShadow:"0 16px 48px rgba(0,0,0,0.18)",width:"min(420px,95vw)",border:`1px solid rgba(55,53,47,0.13)`,overflow:"hidden"}}>
            <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${T.pageBdr}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:"rgba(212,76,71,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Trash2 style={{width:16,height:16,color:"#d44c47"}}/></div>
              <span style={{fontSize:16,fontWeight:700,color:T.pageText,letterSpacing:"-0.02em"}}>Supprimer le workspace</span>
              <button onClick={()=>setConfirmDelete(false)} style={{marginLeft:"auto",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,border:"none",background:"transparent",cursor:"pointer",color:T.pageSub}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:"20px 24px"}}>
              <p style={{fontSize:14,color:T.pageText,margin:"0 0 8px",lineHeight:1.6}}>Vous êtes sur le point de supprimer <strong>"{ws.company}"</strong>.</p>
              <p style={{fontSize:13,color:T.pageSub,margin:"0 0 20px",lineHeight:1.6}}>Cette action supprimera définitivement <strong>{tasks.length} tâche{tasks.length!==1?"s":""}</strong>, <strong>{candidats.length} candidat{candidats.length!==1?"s":""}</strong> et <strong>{documents.length} document{documents.length!==1?"s":""}</strong>. Elle est irréversible.</p>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={()=>setConfirmDelete(false)} style={{padding:"7px 16px",fontSize:13,color:T.pageSub,background:"transparent",border:`1px solid rgba(55,53,47,0.2)`,borderRadius:4,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
                <button onClick={handleDelete} disabled={deleting} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",fontSize:13,fontWeight:600,color:"#fff",background:"#d44c47",border:"none",borderRadius:4,cursor:deleting?"not-allowed":"pointer",fontFamily:"inherit",opacity:deleting?0.7:1}}>
                  {deleting?<Spinner size={13} color="#fff"/>:<Trash2 style={{width:13,height:13}}/>}{deleting?"Suppression…":"Supprimer définitivement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:13,color:T.pageSub,marginBottom:8,display:"flex",alignItems:"center",gap:5}}><CalendarRange style={{width:12,height:12}}/>{fmtRange(ws)}</div>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
          <div>
            <h1 style={{fontSize:40,fontWeight:800,color:T.pageText,letterSpacing:"-0.04em",lineHeight:1.1,margin:0}}>{ws.company}</h1>
            <div style={{fontSize:13,color:T.pageTer,marginTop:8}}>Créé le {new Date(ws.createdAt||Date.now()).toLocaleDateString("fr-FR")}</div>
          </div>
          <button onClick={()=>setConfirmDelete(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",fontSize:13,fontWeight:500,color:"#d44c47",background:"transparent",border:`1px solid rgba(212,76,71,0.3)`,borderRadius:4,cursor:"pointer",fontFamily:"inherit",flexShrink:0,marginTop:8}}>
            <Trash2 style={{width:13,height:13}}/> Supprimer ce workspace
          </button>
        </div>
      </div>
      {divider}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,border:`1px solid ${T.pageBdr}`,borderRadius:4,overflow:"hidden"}}>
        {[{Icon:CalendarRange,label:"Tâches planifiées",value:tasks.length,sub:`${done} terminée${done!==1?"s":""}`,key:"gantt"},{Icon:Users,label:"Candidats",value:candidats.length,sub:`${retained} retenu${retained!==1?"s":""}`,key:"candidats"},{Icon:FolderOpen,label:"Documents",value:documents.length,sub:`${validated} validé${validated!==1?"s":""}`,key:"documents"}].map((s,i)=>{const Icon=s.Icon;return(<button key={s.key} onClick={()=>onSection(s.key)} style={{padding:"24px",border:"none",background:"#fff",cursor:"pointer",textAlign:"left",borderRight:i<2?`1px solid ${T.pageBdr}`:"none"}}><div style={{marginBottom:12}}><Icon style={{width:20,height:20,color:T.pageSub,strokeWidth:1.6}}/></div><div style={{fontSize:32,fontWeight:800,color:T.pageText,letterSpacing:"-0.04em",lineHeight:1}}>{s.value}</div><div style={{fontSize:13,color:T.pageText,fontWeight:500,marginTop:4}}>{s.label}</div><div style={{fontSize:12,color:T.pageSub,marginTop:2}}>{s.sub}</div></button>);})}
      </div>
      {divider}
      {tasks.length>0&&<><div style={{fontSize:11,fontWeight:600,color:T.pageSub,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Tâches récentes</div><div style={{border:`1px solid ${T.pageBdr}`,borderRadius:4,overflow:"hidden",marginBottom:32}}>{tasks.slice(0,5).map((t,i)=>(<div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",borderBottom:i<Math.min(tasks.length,5)-1?`1px solid ${T.pageBdr}`:"none",background:i%2===0?"#fff":"rgba(55,53,47,0.015)"}}><span style={{fontSize:11,color:T.pageTer,fontFamily:"monospace",width:20,textAlign:"right",flexShrink:0}}>{i+1}</span><span style={{flex:1,fontSize:13,color:T.pageText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span><Tag label={t.group} scheme={grpTag(t.group)}/><span style={{fontSize:11,color:T.pageSub,fontFamily:"monospace",flexShrink:0}}>{fmt(t.end)}</span></div>))}</div></>}
      {candidats.length>0&&<><div style={{fontSize:11,fontWeight:600,color:T.pageSub,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Candidats récents</div><div style={{border:`1px solid ${T.pageBdr}`,borderRadius:4,overflow:"hidden"}}>{candidats.slice(0,4).map((c,i)=>{const st=C_STATUS.find(s=>s.key===c.statut)||C_STATUS[0];return(<div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 14px",borderBottom:i<Math.min(candidats.length,4)-1?`1px solid ${T.pageBdr}`:"none",background:i%2===0?"#fff":"rgba(55,53,47,0.015)"}}><div style={{width:26,height:26,borderRadius:4,background:"rgba(55,53,47,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.pageSub,flexShrink:0}}>{c.nom.charAt(0)}{c.prenom?.charAt(0)||""}</div><span style={{flex:1,fontSize:13,color:T.pageText,fontWeight:500}}>{c.nom} {c.prenom}</span><span style={{fontSize:12,color:T.pageSub}}>{c.poste}</span><Tag label={c.statut} scheme={{text:st.text,bg:st.bg,bd:st.bd}}/></div>);})}</div></>}
    </div>
  );
}