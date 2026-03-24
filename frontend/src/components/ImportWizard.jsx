import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, ChevronDown, ChevronRight, ChevronLeft, Plus, X, Check, FileUp, Upload, AlertTriangle, CalendarRange, CheckCircle2 } from "lucide-react";
import { T, Tag, grpTag, fmt, uid, d2s, pd, addWD, snap, normArr, apiFetch, distributeBalanced } from "../utils";
import { Spinner } from "./ui";

const hrs2j=h=>Math.max(1,Math.ceil(parseFloat(String(h).replace(",","."))/7.5));

function detectScheduleConflicts(result){
  const byC={};
  result.forEach(r=>{if(!r.start||!r.end)return;const key=`${String(r.nom||"").trim().toLowerCase()}__${String(r.prenom||"").trim().toLowerCase()}`;if(!byC[key])byC[key]={nom:r.nom,prenom:r.prenom,sessions:[]};byC[key].sessions.push({theme:r.theme,groupe:r.groupe,start:r.start,end:r.end});});
  const conflicts=[];
  Object.values(byC).forEach(({nom,prenom,sessions})=>{if(sessions.length<2)return;const sorted=[...sessions].sort((a,b)=>a.start.localeCompare(b.start));const overlapping=[];for(let i=0;i<sorted.length;i++){for(let j=i+1;j<sorted.length;j++){const a=sorted[i],b=sorted[j];if(a.start<=b.end&&b.start<=a.end){if(!overlapping.some(s=>s.theme===a.theme&&s.groupe===a.groupe))overlapping.push(a);if(!overlapping.some(s=>s.theme===b.theme&&s.groupe===b.groupe))overlapping.push(b);}}}if(overlapping.length>0)conflicts.push({nom,prenom,sessions:overlapping});});
  return conflicts;
}

function ConflictAlert({conflicts,onDismiss}){
  const[expanded,setExpanded]=useState(false);const shown=expanded?conflicts:conflicts.slice(0,3);
  return(
    <div style={{border:"1.5px solid rgba(212,76,71,0.4)",borderRadius:6,background:"rgba(253,224,220,0.35)",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 18px",borderBottom:"1px solid rgba(212,76,71,0.15)"}}>
        <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:"rgba(212,76,71,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><AlertCircle style={{width:18,height:18,color:"#d44c47"}}/></div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#d44c47",marginBottom:3}}>{conflicts.length} conflit{conflicts.length>1?"s":""} de planning détecté{conflicts.length>1?"s":""}</div><div style={{fontSize:12,color:"#9b3c3c",lineHeight:1.6}}>{conflicts.length===1?"Un candidat est inscrit à plusieurs formations dont les périodes se chevauchent.":`${conflicts.length} candidats avec des formations se chevauchant.`} Vérifiez avant d'importer.</div></div>
        {onDismiss&&<button onClick={onDismiss} style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,border:"none",background:"transparent",cursor:"pointer",color:"#d44c47",flexShrink:0}}><X style={{width:13,height:13}}/></button>}
      </div>
      {shown.map((cf,i)=>(<div key={i} style={{padding:"10px 18px 10px 62px",borderBottom:i<shown.length-1?"1px solid rgba(212,76,71,0.1)":"none",background:i%2===0?"transparent":"rgba(212,76,71,0.03)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><div style={{width:22,height:22,borderRadius:4,background:"rgba(212,76,71,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#d44c47",flexShrink:0}}>{cf.nom?.charAt(0)}{cf.prenom?.charAt(0)}</div><span style={{fontSize:13,fontWeight:600,color:T.pageText}}>{cf.nom} {cf.prenom}</span><span style={{fontSize:10,fontWeight:600,color:"#d44c47",background:"rgba(212,76,71,0.12)",padding:"1px 6px",borderRadius:3}}>{cf.sessions.length} formations en conflit</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>{cf.sessions.map((s,si)=>{const pal=grpTag(s.theme);return(<div key={si} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",borderRadius:4,background:"rgba(255,255,255,0.7)",border:"1px solid rgba(212,76,71,0.15)"}}><div style={{width:6,height:6,borderRadius:2,background:pal.text,flexShrink:0}}/><span style={{fontSize:12,fontWeight:600,color:pal.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.theme}</span><span style={{fontSize:11,color:T.pageSub}}>Grp {s.groupe}</span><span style={{fontSize:11,fontFamily:"monospace",color:T.pageSub,background:"rgba(55,53,47,0.05)",padding:"1px 6px",borderRadius:3}}>{fmt(s.start)} → {fmt(s.end)}</span></div>);})}</div>
      </div>))}
      {conflicts.length>3&&<button onClick={()=>setExpanded(v=>!v)} style={{width:"100%",padding:"8px 18px",border:"none",borderTop:"1px solid rgba(212,76,71,0.15)",background:"transparent",cursor:"pointer",fontSize:12,color:"#d44c47",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}} onMouseEnter={e=>e.currentTarget.style.background="rgba(212,76,71,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{expanded?<><ChevronDown style={{width:12,height:12,transform:"rotate(180deg)"}}/> Réduire</>:<><ChevronDown style={{width:12,height:12}}/> Voir {conflicts.length-3} de plus</>}</button>}
    </div>
  );
}

export default function ImportWizard({onClose,onDone,setTasks,wsStart,wsId,showToast}){
  const[step,setStep]=useState(1);const[inputMode,setInputMode]=useState("file");
  const[rawText,setRawText]=useState("");const[rows,setRows]=useState([]);
  const[mapping,setMapping]=useState({nom:-1,prenom:-1,theme:-1,heures:-1});
  const[themeConf,setThemeConf]=useState([]);const[result,setResult]=useState([]);
  const[ganttDone,setGanttDone]=useState(false);
  const[scheduleConflicts,setScheduleConflicts]=useState([]);const[conflictsDismissed,setConflictsDismissed]=useState(false);
  const[dragOver,setDragOver]=useState(false);const[fileName,setFileName]=useState("");
  const[fileError,setFileError]=useState("");const[importing,setImporting]=useState(false);
  const pasteRef=useRef(null);const fileRef=useRef(null);
  const batchId=useRef(uid());const batchTasksRef=useRef([]);

  function handleFile(file){
    if(!file)return;setFileError("");
    const ext=file.name.split(".").pop().toLowerCase();
    if(!["xlsx","xls","csv","ods"].includes(ext)){setFileError("Format non supporté. Utilisez .xlsx, .xls ou .csv");return;}
    setFileName(file.name);
    const reader=new FileReader();
    reader.onload=e=>{try{const data=new Uint8Array(e.target.result);const wb=XLSX.read(data,{type:"array"});const ws=wb.Sheets[wb.SheetNames[0]];const arr=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});const filtered=arr.filter(row=>row.some(cell=>String(cell).trim()!==""));if(filtered.length<2){setFileError("Le fichier semble vide.");return;}const maxCols=Math.max(...filtered.map(r=>r.length));const padded=filtered.map(r=>{const a=[...r];while(a.length<maxCols)a.push("");return a.map(v=>String(v??"").trim());});setRows(padded);setMapping({nom:-1,prenom:-1,theme:-1,heures:-1});setStep(2);}catch{setFileError("Erreur lors de la lecture du fichier.");}};
    reader.readAsArrayBuffer(file);
  }
  function onDrop(e){e.preventDefault();setDragOver(false);const file=e.dataTransfer.files[0];if(file)handleFile(file);}
  function parsePaste(){if(!rawText.trim())return;const lines=rawText.trim().split(/\r?\n/);const parsed=lines.map(l=>l.split("\t").map(c=>c.replace(/^"|"$/g,"").trim()));const maxCols=Math.max(...parsed.map(r=>r.length));const padded=parsed.map(r=>{while(r.length<maxCols)r.push("");return r;});setRows(padded);setMapping({nom:-1,prenom:-1,theme:-1,heures:-1});setStep(2);}
  function applyMapping(){const{nom:ni,prenom:pi,theme:ti,heures:hi}=mapping;if(ni<0||pi<0||ti<0||hi<0)return;const data=rows.slice(1).filter(r=>r[ti]?.trim());const tmap={};data.forEach(r=>{const t=r[ti]?.trim()||"";const j=hrs2j(r[hi]||0);if(!tmap[t])tmap[t]={theme:t,total:0,jours:j,perGroup:"15"};tmap[t].total++;tmap[t].jours=Math.max(tmap[t].jours,j);});setThemeConf(Object.values(tmap));setStep(3);}

  function generateGroups(){
    const{nom:ni,prenom:pi,theme:ti,heures:hi}=mapping;
    const data=rows.slice(1).filter(r=>r[ti]?.trim());
    const gsMap={};themeConf.forEach(tc=>{gsMap[tc.theme]=Math.max(1,parseInt(tc.perGroup)||15);});
    const byTheme={};
    data.forEach(r=>{const t=r[ti]?.trim()||"";if(!byTheme[t])byTheme[t]=[];byTheme[t].push({nom:r[ni]||"",prenom:r[pi]||"",theme:t,heures:parseFloat(String(r[hi]||0).replace(",","."))||0,_rawRow:r});});
    const mappedIdxs=new Set(Object.values(mapping).filter(v=>v>=0));
    const allExtraCols=headers.map((h,i)=>({colIdx:i,label:h||`Colonne ${i+1}`})).filter(c=>!mappedIdxs.has(c.colIdx));
    const res=[];
    Object.entries(byTheme).forEach(([theme,cands])=>{
      const jours=themeConf.find(tc=>tc.theme===theme)?.jours||1;
      const pg=gsMap[theme]||15;
      const distributed=distributeBalanced(cands,pg);
      distributed.forEach(c=>{
        const extraData={};
        allExtraCols.forEach(ec=>{extraData[ec.label]=c._rawRow?.[ec.colIdx]??"";});
        res.push({nom:c.nom,prenom:c.prenom,theme,heures:c.heures,jours,groupe:c.groupe,start:"",end:"",id:uid(),extraData,_allExtraCols:allExtraCols,_rawRow:c._rawRow});
      });
    });
    setResult(res);setGanttDone(false);setScheduleConflicts([]);setConflictsDismissed(false);setStep(4);
  }

  function generateGantt(){
    const dWd=[6,0],dSh=true,dV=[];
    const startDay=snap(wsStart||d2s(new Date()),dWd,dSh,dV);
    const seen=new Map();result.forEach(r=>{const key=`${r.theme}||${r.groupe}`;if(!seen.has(key))seen.set(key,{theme:r.theme,groupe:r.groupe,jours:r.jours});});
    const newTasks=[];let cur=startDay;
    seen.forEach(({theme,groupe,jours})=>{const s=cur,e=addWD(s,jours,dWd,dSh,dV);newTasks.push({id:uid(),name:`${theme} — Grp ${groupe}`,group:theme,groupe:String(groupe),start:s,end:e,_key:`${theme}||${groupe}`});cur=snap(addWD(e,1,dWd,dSh,dV),dWd,dSh,dV);});
    const taskMap={};newTasks.forEach(t=>taskMap[t._key]=t);
    const updated=result.map(r=>{const t=taskMap[`${r.theme}||${r.groupe}`];return{...r,start:t?.start||"",end:t?.end||""};});
    setScheduleConflicts(detectScheduleConflicts(updated));setConflictsDismissed(false);
    setResult(updated);
    setTasks(p=>[...p,...newTasks.map(({_key,...t})=>t)]);
    setGanttDone(true);
    batchTasksRef.current=newTasks.map(({_key,...t})=>t);
  }

  const confirm=async()=>{
    if(!ganttDone||importing)return;setImporting(true);
    try{
      const candidats=result.map(r=>{const{_allExtraCols,_rawRow,...clean}=r;return{nom:clean.nom,prenom:clean.prenom,poste:clean.theme,statut:"Reçu",email:"",telephone:"",notes:"",theme:clean.theme,jours:clean.jours,groupe:clean.groupe,dateDebut:clean.start,dateFin:clean.end,heures:clean.heures||0,extraData:clean.extraData||{}};});
      if(batchTasksRef.current.length>0&&wsId){
        try{
          const saved=await apiFetch(`/workspaces/${wsId}/tasks/bulk`,{method:"POST",body:{tasks:batchTasksRef.current}});
          const realTasks=normArr(saved.tasks||[]);
          setTasks(p=>{const tempIds=new Set(batchTasksRef.current.map(t=>t.id));return[...p.filter(t=>!tempIds.has(t.id)),...realTasks];});
        }catch(e){showToast("Tâches non sauvegardées : "+e.message);}
      }
      if(wsId){
        const res=await apiFetch(`/workspaces/${wsId}/candidats/import`,{method:"POST",body:{batchId:batchId.current,fileName,mapping,headers,rawRows:rows,themeConf,candidats}});
        showToast(`${res.inserted} candidat(s) importé(s) avec succès`,"success");
      }
      onDone(candidats.map(c=>({...c,id:uid(),createdAt:new Date().toISOString()})));
      onClose();
    }catch(e){showToast("Erreur import : "+e.message);}
    setImporting(false);
  };

  const FIELD_OPTS=[{key:"nom",label:"Nom"},{key:"prenom",label:"Prénom"},{key:"theme",label:"Intitulé de formation"},{key:"heures",label:"Nb heures"}];
  const headers=rows[0]||[],preview=rows.slice(1,6);
  const STEP_LABELS=["Source des données","Mapper les colonnes","Configurer les groupes","Résultat final"];
  const canNext2=Object.values(mapping).every(v=>v>=0)&&new Set(Object.values(mapping)).size===4;
  const canImport=ganttDone&&!importing;
  const iS={padding:"5px 9px",borderRadius:4,border:`1px solid rgba(55,53,47,0.2)`,fontSize:12,color:T.pageText,fontFamily:"inherit",outline:"none",background:"#fff"};
  const fI=e=>{e.target.style.borderColor=T.accent;e.target.style.boxShadow=`0 0 0 2px ${T.accent}18`;};
  const fO=e=>{e.target.style.borderColor="rgba(55,53,47,0.2)";e.target.style.boxShadow="none";};
  const thS={padding:"8px 12px",fontSize:10,fontWeight:600,color:T.pageTer,textTransform:"uppercase",letterSpacing:"0.06em",background:"rgba(55,53,47,0.03)",borderBottom:`1px solid ${T.pageBdr}`,textAlign:"left"};
  const tdS={padding:"7px 12px",fontSize:12,color:T.pageText,borderBottom:`1px solid ${T.pageBdr}`};

  function tailleGroupes(total, perGroup) {
    const pg = Math.max(1, parseInt(perGroup) || 15);
    if (!total || total <= 0) return "—";
    const nb = Math.ceil(total / pg);
    if (nb <= 0) return "—";
    const base = Math.floor(total / nb);
    const rem = total % nb;
    if (rem === 0) return `${nb} grp × ${base}`;
    if (nb - rem === 0) return `${nb} grp × ${base + 1}`;
    return `${rem} × ${base + 1}  +  ${nb - rem} × ${base}`;
  }

  return(
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#fff",borderRadius:8,width:"min(900px,98vw)",maxHeight:"94vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",border:`1px solid rgba(55,53,47,0.13)`}}>
        <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${T.pageBdr}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div><div style={{fontSize:16,fontWeight:700,color:T.pageText,letterSpacing:"-0.02em"}}>Importer depuis Excel</div><div style={{fontSize:12,color:T.pageSub,marginTop:2}}>Étape {step} sur 4 — {STEP_LABELS[step-1]}</div></div>
            <button onClick={onClose} style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,border:"none",background:"transparent",cursor:"pointer",color:T.pageSub}}><X style={{width:14,height:14}}/></button>
          </div>
          <div style={{display:"flex",gap:4}}>{STEP_LABELS.map((l,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><div style={{height:3,borderRadius:99,background:i+1<=step?T.accent:"rgba(55,53,47,0.1)",transition:"background 0.2s"}}/><div style={{fontSize:10,color:i+1===step?T.accent:T.pageTer,fontWeight:i+1===step?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l}</div></div>))}</div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {step===1&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",border:`1px solid ${T.pageBdr}`,borderRadius:6,overflow:"hidden",width:"fit-content"}}>{[["file","📂  Importer un fichier"],["paste","📋  Copier-coller"]].map(([mode,label])=>(<button key={mode} onClick={()=>{setInputMode(mode);setFileError("");}} style={{padding:"8px 20px",border:"none",borderRight:mode==="file"?`1px solid ${T.pageBdr}`:"none",background:inputMode===mode?"rgba(55,53,47,0.07)":"#fff",fontSize:13,fontWeight:inputMode===mode?600:400,color:inputMode===mode?T.pageText:T.pageSub,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>))}</div>
              {inputMode==="file"&&(<div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{padding:"12px 16px",borderRadius:6,background:"rgba(51,126,169,0.06)",border:`1px solid ${T.tagBlue.bd}`,display:"flex",gap:10}}><span style={{fontSize:16,flexShrink:0}}>💡</span><div style={{fontSize:13,color:T.pageSub,lineHeight:1.6}}>Importez directement votre fichier Excel (.xlsx, .xls) ou CSV. La première feuille sera utilisée.</div></div>
                <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragOver?T.accent:"rgba(55,53,47,0.2)"}`,borderRadius:8,background:dragOver?"rgba(15,125,219,0.05)":"rgba(55,53,47,0.02)",padding:"48px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,cursor:"pointer",transition:"all 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(55,53,47,0.04)"} onMouseLeave={e=>e.currentTarget.style.background=dragOver?"rgba(15,125,219,0.05)":"rgba(55,53,47,0.02)"}>
                  <div style={{width:48,height:48,borderRadius:12,background:dragOver?`${T.accent}15`:"rgba(55,53,47,0.07)",display:"flex",alignItems:"center",justifyContent:"center"}}><FileUp style={{width:24,height:24,color:dragOver?T.accent:T.pageSub,strokeWidth:1.6}}/></div>
                  {fileName?(<div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.pageText}}>{fileName}</div><div style={{fontSize:12,color:T.pageSub,marginTop:4}}>Cliquez pour changer</div></div>):(<div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:600,color:T.pageText}}>{dragOver?"Déposez ici":"Glissez-déposez votre fichier"}</div><div style={{fontSize:12,color:T.pageSub,marginTop:4}}>ou cliquez pour parcourir</div><div style={{fontSize:11,color:T.pageTer,marginTop:8}}>Formats : .xlsx · .xls · .csv · .ods</div></div>)}
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value="";}}/>
                </div>
                <div style={{display:"flex",justifyContent:"center"}}><button onClick={()=>fileRef.current?.click()} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",fontSize:13,fontWeight:500,color:T.pageText,background:"transparent",border:`1px solid rgba(55,53,47,0.25)`,borderRadius:4,cursor:"pointer",fontFamily:"inherit"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(55,53,47,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Upload style={{width:14,height:14}}/> Parcourir</button></div>
                {fileError&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:4,background:"rgba(212,76,71,0.06)",border:`1px solid rgba(212,76,71,0.2)`,color:"#d44c47",fontSize:13}}><AlertTriangle style={{width:14,height:14,flexShrink:0}}/>{fileError}</div>}
              </div>)}
              {inputMode==="paste"&&(<div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{padding:"12px 16px",borderRadius:6,background:"rgba(51,126,169,0.06)",border:`1px solid ${T.tagBlue.bd}`,display:"flex",gap:10}}><span style={{fontSize:16,flexShrink:0}}>💡</span><div style={{fontSize:13,color:T.pageSub,lineHeight:1.6}}>Dans Excel, copiez vos données avec la ligne d'en-tête (<kbd style={{background:"rgba(55,53,47,0.07)",padding:"1px 5px",borderRadius:3,fontSize:11,fontFamily:"monospace"}}>Ctrl+C</kbd>), puis collez ici.</div></div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:T.pageSub,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Données Excel</div>
                  <textarea ref={pasteRef} autoFocus value={rawText} onChange={e=>setRawText(e.target.value)} onPaste={e=>{setTimeout(()=>{if(pasteRef.current&&pasteRef.current.value.trim())setRawText(pasteRef.current.value);},50);}} placeholder="Collez vos données Excel ici…" style={{width:"100%",height:200,padding:"10px 12px",borderRadius:4,border:`1px solid rgba(55,53,47,0.2)`,fontSize:12,color:T.pageText,fontFamily:"monospace",resize:"vertical",outline:"none",background:"rgba(55,53,47,0.02)",lineHeight:1.7}} onFocus={fI} onBlur={fO}/>
                  {rawText&&<div style={{fontSize:11,color:T.pageTer,marginTop:5}}>{rawText.trim().split(/\r?\n/).length} lignes détectées</div>}
                </div>
              </div>)}
            </div>
          )}
          {step===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {fileName&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:4,background:"rgba(68,131,97,0.06)",border:`1px solid ${T.tagGreen.bd}`}}><CheckCircle2 style={{width:14,height:14,color:T.tagGreen.text,flexShrink:0}}/><span style={{fontSize:12,color:T.tagGreen.text,fontWeight:500}}>{fileName}</span><span style={{fontSize:12,color:T.pageSub}}>— {rows.length-1} ligne{rows.length-1>1?"s":""} détectée{rows.length-1>1?"s":""}</span></div>}
              <div style={{fontSize:13,color:T.pageSub}}>Sélectionnez pour chaque colonne son rôle. Les 5 premières lignes sont affichées en aperçu.</div>
              <div style={{overflowX:"auto",border:`1px solid ${T.pageBdr}`,borderRadius:6}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead>
                  <tr style={{background:"rgba(55,53,47,0.02)"}}>{headers.map((h,ci)=>(<th key={ci} style={{...thS,fontWeight:400}}><select value={Object.entries(mapping).find(([,v])=>v===ci)?.[0]||""} onChange={e=>{const field=e.target.value;setMapping(prev=>{const next={...prev};if(field){Object.keys(next).forEach(k=>{if(next[k]===ci)next[k]=-1;});next[field]=ci;}else{Object.keys(next).forEach(k=>{if(next[k]===ci)next[k]=-1;});}return next;});}} style={{...iS,width:"100%",fontSize:11}}><option value="">— Ignorer —</option>{FIELD_OPTS.map(f=>(<option key={f.key} value={f.key} disabled={mapping[f.key]>=0&&mapping[f.key]!==ci}>{f.label}</option>))}</select>{Object.entries(mapping).find(([,v])=>v===ci)&&<div style={{marginTop:3}}><Tag label={FIELD_OPTS.find(f=>f.key===Object.entries(mapping).find(([,v])=>v===ci)?.[0])?.label||""} scheme={T.tagBlue}/></div>}</th>))}</tr>
                  <tr style={{background:"rgba(55,53,47,0.03)"}}>{headers.map((h,ci)=>(<th key={ci} style={{...thS,color:T.pageText,fontWeight:600,fontSize:11}}>{h||`Col ${ci+1}`}</th>))}</tr>
                </thead><tbody>{preview.map((row,ri)=>(<tr key={ri} style={{background:ri%2===0?"#fff":"rgba(55,53,47,0.01)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(55,53,47,0.03)"} onMouseLeave={e=>e.currentTarget.style.background=ri%2===0?"#fff":"rgba(55,53,47,0.01)"}>{row.map((cell,ci)=>(<td key={ci} style={{...tdS,background:Object.values(mapping).includes(ci)?"rgba(51,126,169,0.05)":undefined,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={cell}>{cell}</td>))}</tr>))}</tbody></table>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{FIELD_OPTS.map(f=>(<div key={f.key} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:4,border:`1px solid ${mapping[f.key]>=0?T.tagGreen.bd:T.pageBdr}`,background:mapping[f.key]>=0?T.tagGreen.bg:"rgba(55,53,47,0.02)"}}>{mapping[f.key]>=0?<Check style={{width:11,height:11,color:T.tagGreen.text}}/>:<div style={{width:11,height:11,borderRadius:"50%",border:`1.5px solid ${T.pageTer}`}}/>}<span style={{fontSize:12,color:mapping[f.key]>=0?T.tagGreen.text:T.pageSub}}>{f.label}{mapping[f.key]>=0&&<span style={{fontWeight:600}}> → Col {mapping[f.key]+1}</span>}</span></div>))}</div>
              {!canNext2&&<div style={{fontSize:12,color:"#d44c47",display:"flex",alignItems:"center",gap:5}}><AlertTriangle style={{width:12,height:12}}/> Mappez les 4 champs requis avant de continuer</div>}
            </div>
          )}
          {step===3&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{padding:"10px 14px",borderRadius:6,background:"rgba(68,131,97,0.06)",border:`1px solid ${T.tagGreen.bd}`,display:"flex",gap:10,alignItems:"flex-start"}}>
                <CheckCircle2 style={{width:15,height:15,color:T.tagGreen.text,flexShrink:0,marginTop:1}}/>
                <div style={{fontSize:13,color:T.pageText,lineHeight:1.6}}><strong>Distribution équilibrée activée.</strong> Les candidats sont répartis de façon égale entre les groupes.</div>
              </div>
              <div style={{border:`1px solid ${T.pageBdr}`,borderRadius:6,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Intitulé","Durée","Total","Max / groupe","Groupes équilibrés"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{themeConf.map((tc,i)=>{
                    const pg=Math.max(1,parseInt(tc.perGroup)||15);
                    const nbGrp=Math.ceil(tc.total/pg);
                    const base=Math.floor(tc.total/nbGrp)||0;
                    const rem=tc.total%nbGrp;
                    const groupBlocks=Array.from({length:nbGrp},(_,gi)=>({g:gi+1,size:gi<rem?base+1:base}));
                    return(<tr key={tc.theme} style={{background:i%2===0?"#fff":"rgba(55,53,47,0.01)"}}>
                      <td style={{...tdS,fontWeight:600}}>{tc.theme}</td>
                      <td style={{...tdS,textAlign:"center"}}>{tc.jours}j</td>
                      <td style={{...tdS,textAlign:"center"}}><span style={{fontSize:14,fontWeight:800}}>{tc.total}</span></td>
                      <td style={{...tdS,textAlign:"center"}}>
                        <input type="number" min={1} step={1} value={tc.perGroup}
                          onChange={e=>setThemeConf(p=>p.map((x,j)=>j===i?{...x,perGroup:e.target.value}:x))}
                          style={{...iS,width:72,textAlign:"center"}} onFocus={fI} onBlur={fO}/>
                      </td>
                      <td style={tdS}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                          {groupBlocks.map(({g,size})=>(
                            <div key={g} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"5px 10px",borderRadius:5,background:T.tagGreen.bg,border:`1px solid ${T.tagGreen.bd}`}}>
                              <span style={{fontSize:10,fontWeight:700,color:T.tagGreen.text}}>GRP {g}</span>
                              <span style={{fontSize:18,fontWeight:800}}>{size}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            </div>
          )}
          {step===4&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {!ganttDone?(
                <div style={{padding:"14px 18px",borderRadius:6,background:"rgba(203,145,47,0.08)",border:`1px solid ${T.tagYellow.bd}`,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}><CalendarRange style={{width:16,height:16,color:T.tagYellow.text,flexShrink:0}}/><div><div style={{fontSize:13,fontWeight:600,color:T.pageText}}>Générer le diagramme de Gantt</div><div style={{fontSize:12,color:T.pageSub}}>Les dates seront calculées automatiquement pour chaque groupe.</div></div></div>
                  <button onClick={generateGantt} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",fontSize:13,fontWeight:600,color:"#fff",background:"#37352f",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"inherit"}}><CalendarRange style={{width:13,height:13}}/> Générer le Gantt</button>
                </div>
              ):(
                <div style={{display:"flex",gap:8,flexDirection:"column"}}>
                  <div style={{padding:"12px 16px",borderRadius:6,background:T.tagGreen.bg,border:`1px solid ${T.tagGreen.bd}`,display:"flex",gap:10,alignItems:"center"}}>
                    <CheckCircle2 style={{width:16,height:16,color:T.tagGreen.text,flexShrink:0}}/>
                    <div style={{fontSize:13,color:T.tagGreen.text,fontWeight:600,flex:1}}>Gantt généré — {[...new Set(result.map(r=>`${r.theme}||${r.groupe}`))].length} tâche(s) créées.</div>
                  </div>
                  {scheduleConflicts.length>0&&!conflictsDismissed&&<ConflictAlert conflicts={scheduleConflicts} onDismiss={()=>setConflictsDismissed(true)}/>}
                </div>
              )}
              <div style={{border:`1px solid ${T.pageBdr}`,borderRadius:6,overflow:"hidden"}}>
                <div style={{overflowX:"auto",maxHeight:440}}>{(()=>{
                  const extraKeys=result.length>0&&result[0]._allExtraCols?result[0]._allExtraCols:Object.keys(result[0]?.extraData||{}).map(k=>({label:k}));
                  const conflictSet=new Set();scheduleConflicts.forEach(cf=>{cf.sessions.forEach(s=>{conflictSet.add(`${String(cf.nom||"").trim().toLowerCase()}__${String(cf.prenom||"").trim().toLowerCase()}__${s.theme}__${s.groupe}`);});});
                  return(<table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead style={{position:"sticky",top:0,zIndex:5}}><tr>{["Nom","Prénom","Formation","Jours","Groupe","Début","Fin",...extraKeys.map(ec=>ec.label)].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{result.map((r,i)=>{const pal=grpTag(r.theme);const ck=`${String(r.nom||"").trim().toLowerCase()}__${String(r.prenom||"").trim().toLowerCase()}__${r.theme}__${r.groupe}`;const isConf=ganttDone&&!conflictsDismissed&&conflictSet.has(ck);return(<tr key={r.id||i} style={{background:isConf?"rgba(253,224,220,0.45)":i%2===0?"#fff":"rgba(55,53,47,0.01)"}}><td style={{...tdS,fontWeight:600}}>{r.nom}</td><td style={tdS}>{r.prenom}</td><td style={{...tdS,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><Tag label={r.theme} scheme={pal}/></td><td style={{...tdS,textAlign:"center",fontFamily:"monospace",fontWeight:600,color:T.pageSub}}>{r.jours}j</td><td style={{...tdS,textAlign:"center"}}><span style={{fontSize:12,fontWeight:700,color:T.pageText,fontFamily:"monospace"}}>Grp {r.groupe}</span></td><td style={{...tdS,fontFamily:"monospace",fontSize:11,color:ganttDone?T.pageText:T.pageTer}}>{ganttDone?fmt(r.start):"—"}</td><td style={{...tdS,fontFamily:"monospace",fontSize:11,color:ganttDone?T.pageText:T.pageTer}}>{ganttDone?fmt(r.end):"—"}</td>{extraKeys.map(ec=>(<td key={ec.label} style={{...tdS,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:T.pageSub}}>{r.extraData?.[ec.label]||"—"}</td>))}</tr>);})}</tbody></table>);
                })()}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${T.pageBdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"rgba(55,53,47,0.01)"}}>
          <button onClick={()=>step>1?setStep(s=>s-1):onClose()} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",fontSize:13,color:T.pageSub,background:"transparent",border:`1px solid rgba(55,53,47,0.18)`,borderRadius:4,cursor:"pointer",fontFamily:"inherit"}}><ChevronLeft style={{width:13,height:13}}/>{step===1?"Annuler":"Retour"}</button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {step===1&&inputMode==="paste"&&<button onClick={parsePaste} disabled={!rawText.trim()} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 20px",fontSize:13,fontWeight:600,color:"#fff",background:rawText.trim()?"#37352f":"#ccc",border:"none",borderRadius:4,cursor:rawText.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>Analyser <ChevronRight style={{width:13,height:13}}/></button>}
            {step===2&&<button onClick={applyMapping} disabled={!canNext2} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 20px",fontSize:13,fontWeight:600,color:"#fff",background:canNext2?"#37352f":"#ccc",border:"none",borderRadius:4,cursor:canNext2?"pointer":"not-allowed",fontFamily:"inherit"}}>Continuer <ChevronRight style={{width:13,height:13}}/></button>}
            {step===3&&<button onClick={generateGroups} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 20px",fontSize:13,fontWeight:600,color:"#fff",background:"#37352f",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"inherit"}}>Générer les groupes <ChevronRight style={{width:13,height:13}}/></button>}
            {step===4&&(<button onClick={confirm} disabled={!canImport} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 20px",fontSize:13,fontWeight:600,color:"#fff",background:!canImport?"#ccc":scheduleConflicts.length>0&&!conflictsDismissed?"rgba(212,76,71,0.85)":"#37352f",border:"none",borderRadius:4,cursor:canImport?"pointer":"not-allowed",fontFamily:"inherit"}}>
              {importing?<Spinner size={13} color="#fff"/>:scheduleConflicts.length>0&&!conflictsDismissed?<AlertTriangle style={{width:13,height:13}}/>:<Check style={{width:13,height:13}}/>}
              {importing?"Import en cours…":scheduleConflicts.length>0&&!conflictsDismissed?`Importer quand même (${result.length})`:`Importer ${result.length} candidat${result.length!==1?"s":""}`}
            </button>)}
          </div>
        </div>
      </div>
    </div>
  );
}