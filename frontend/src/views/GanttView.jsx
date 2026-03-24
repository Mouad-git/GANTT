import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import * as XLSX from "xlsx";
import { Edit2, Trash2, CalendarRange, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileUp, Plus, Settings, Check, X } from "lucide-react";
import { T, fmt, pd, gdb, ad, d2s, isOff, isVac, calcWD, addWD, snap, autoProgress, moveSnap, rezEnd, rezStart, grpTag, ZOOMS, GCOLS, CHDR, GTOT, RH, HMAP, apiFetch, norm } from "../utils";
import { Spinner } from "../components/ui";

const GBar=memo(function GBar({task,zoom,viewStart,totalDays,onUpdate,wd,sh,vacs,conflict}){
  const dr=useRef(null);const[prev,setPrev]=useState(null);
  const s=gdb(viewStart,pd(task.start)),dur=gdb(pd(task.start),pd(task.end))+1;
  if(s+dur<=0||s>=totalDays)return null;
  const ds=prev?prev.start:task.start,de=prev?prev.end:task.end;
  const left=gdb(viewStart,pd(ds))*zoom.cw,width=Math.max((gdb(pd(ds),pd(de))+1)*zoom.cw,zoom.cw);
  const dragging=!!prev,tag=grpTag(task.group);
  const prog=useMemo(()=>autoProgress(task,wd,sh,vacs),[task.start,task.end,wd,sh,vacs]);
  const dtype=dr.current?.type??null,HW=zoom.cw>=28?8:5,HP=Math.max(0,HW-3);
  const barLabel = task.group + (task.groupe ? ` — Grp ${task.groupe}` : "");
  function startDrag(e,type){e.stopPropagation();e.preventDefault();dr.current={type,startX:e.clientX,os:task.start,oe:task.end};setPrev({start:task.start,end:task.end});document.body.style.cursor=type==="move"?"grabbing":"col-resize";document.body.style.userSelect="none";
    function mv(ev){const d=Math.round((ev.clientX-dr.current.startX)/zoom.cw);const r=dr.current;let np;if(r.type==="move")np={start:d2s(ad(pd(r.os),d)),end:d2s(ad(pd(r.oe),d))};else if(r.type==="rr")np={start:r.os,end:rezEnd(r.os,r.oe,d,wd,sh,vacs)};else np={start:rezStart(r.os,r.oe,d,wd,sh,vacs),end:r.oe};setPrev(np);}
    function up(ev){const d=Math.round((ev.clientX-dr.current.startX)/zoom.cw);const r=dr.current;let cm;if(r.type==="move")cm=moveSnap(r.os,r.oe,d,wd,sh,vacs);else if(r.type==="rr")cm={start:r.os,end:rezEnd(r.os,r.oe,d,wd,sh,vacs)};else cm={start:rezStart(r.os,r.oe,d,wd,sh,vacs),end:r.oe};onUpdate(task.id,cm.start,cm.end);dr.current=null;setPrev(null);document.body.style.cursor="";document.body.style.userSelect="";window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);}
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);}
  return(
    <div style={{position:"absolute",left,width,top:"50%",transform:"translateY(-50%)",height:dragging?22:18,zIndex:dragging?20:5,userSelect:"none",transition:dragging?"none":"height 0.1s"}}>
      <div onMouseDown={e=>startDrag(e,"rl")} style={{position:"absolute",left:-HP,top:0,bottom:0,width:HW+HP,cursor:"col-resize",zIndex:5}} />
      <div onMouseDown={e=>startDrag(e,"move")} style={{position:"absolute",left:HW,right:HW,top:0,bottom:0,borderRadius:3,overflow:"hidden",cursor:dragging?"grabbing":"grab",boxShadow:conflict&&!dragging?"0 0 0 1.5px rgba(203,145,47,0.7)":"none"}}>
        <div style={{position:"absolute",inset:0,background:tag.bg,border:`1px solid ${tag.bd||"transparent"}`,borderRadius:3}}/>
        <div style={{position:"absolute",top:0,left:0,bottom:0,width:`${prog.pct}%`,background:tag.text,opacity:0.2}}/>
        {(width-HW*2)>36&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",padding:"0 7px",pointerEvents:"none"}}><span style={{fontSize:10,fontWeight:500,color:tag.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{barLabel}</span></div>}
      </div>
      <div onMouseDown={e=>startDrag(e,"rr")} style={{position:"absolute",right:-HP,top:0,bottom:0,width:HW+HP,cursor:"col-resize",zIndex:5}} />
    </div>
  );
});

const GRow=memo(function GRow({task,SC,cs,zoom,projStart,totalDays,todayOff,days,wd,sh,vacs,onEdit,onDelete,onUpdate,conflict,registerScrollable,unregisterScrollable}){
  const[hov,setHov]=useState(false);const ref=useRef(null);
  useEffect(()=>{const el=ref.current;if(!el)return;registerScrollable(el);return()=>unregisterScrollable(el);},[registerScrollable,unregisterScrollable]);
  const wDays=useMemo(()=>calcWD(task.start,task.end,wd,sh,vacs),[task.start,task.end,wd,sh,vacs]);
  const prog=useMemo(()=>autoProgress(task,wd,sh,vacs),[task.start,task.end,wd,sh,vacs]);
  const pal=grpTag(task.group);
  let displayGrp = task.groupe || ""; if (!displayGrp && task.name && task.name.includes(" — Grp ")) displayGrp = task.name.split(" — Grp ")[1];
  return(
    <div style={{display:"flex",height:RH,background:hov?"rgba(55,53,47,0.03)":"#fff",borderBottom:`1px solid ${T.pageBdr}`}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{display:"flex",flexShrink:0}}>
        <div style={{...cs(SC[0].sw),padding:"0 8px",gap:5,justifyContent:"flex-start"}}><div style={{width:8,height:8,borderRadius:2,background:pal.text,flexShrink:0}}/><span style={{fontSize:13,fontWeight:600,color:T.pageText,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.group}</span>
          <div style={{display:"flex",gap:1,opacity:hov?1:0}}><button onClick={onEdit} style={{width:20,height:20,border:"none",background:"transparent",cursor:"pointer"}}><Edit2 style={{width:11,height:11}}/></button><button onClick={onDelete} style={{width:20,height:20,border:"none",background:"transparent",cursor:"pointer"}}><Trash2 style={{width:11,height:11}}/></button></div>
        </div>
        <div style={{...cs(SC[1].sw),justifyContent:"center"}}><span style={{fontSize:12,fontWeight:600,color:T.pageSub}}>{displayGrp ? `G${displayGrp}` : "—"}</span></div>
        <div style={{...cs(SC[2].sw),justifyContent:"center"}}><span style={{fontSize:12,fontFamily:"monospace",color:T.pageSub}}>{wDays}</span></div>
        <div style={{...cs(SC[3].sw),justifyContent:"center"}}><span style={{fontSize:11,fontFamily:"monospace",color:T.pageSub}}>{fmt(task.start)}</span></div>
        <div style={{...cs(SC[4].sw),padding:"0 10px",flexDirection:"column",alignItems:"stretch",justifyContent:"center",gap:3}}><div style={{height:3,background:"rgba(55,53,47,0.1)",borderRadius:99}}><div style={{height:"100%",width:`${prog.pct}%`,background:prog.pct===100?T.tagGreen.text:"rgba(55,53,47,0.45)",borderRadius:99}}/></div></div>
        <div style={{...cs(SC[5].sw),justifyContent:"center",borderRight:`1px solid ${T.pageBdr}`}}><span style={{fontSize:11,fontFamily:"monospace",color:T.pageSub}}>{fmt(task.end)}</span></div>
      </div>
      <div style={{flex:1,overflow:"hidden"}}><div ref={ref} style={{overflowX:"hidden",width:"100%",height:"100%"}}><div style={{width:totalDays*zoom.cw,height:"100%",position:"relative"}}>
        {days.map((d,i)=>{const ds=d2s(d),isW=wd.includes(d.getDay()),hol=sh?HMAP[ds]:null,vacDay=isVac(d,vacs);if(!isW&&!hol&&!vacDay)return null;return<div key={i} style={{position:"absolute",top:0,bottom:0,left:i*zoom.cw,width:zoom.cw,background:vacDay?"rgba(51,126,169,0.09)":hol?hol.religious?"rgba(68,131,97,0.08)":"rgba(212,76,71,0.06)":"rgba(55,53,47,0.03)",zIndex:1}}/>;} )}
        {todayOff>=0&&todayOff<=totalDays&&<div style={{position:"absolute",top:0,bottom:0,left:todayOff*zoom.cw,width:1,background:T.accent,opacity:0.6,zIndex:5}}/>}
        <GBar task={task} zoom={zoom} viewStart={projStart} totalDays={totalDays} onUpdate={onUpdate} wd={wd} sh={sh} vacs={vacs} conflict={conflict}/>
      </div></div></div>
    </div>
  );
});

export default function GanttView({tasks,setTasks,wsId,showToast}){
  const[wd,setWd]=useState([6,0]);const[sh,setSh]=useState(true);const[vacs,setVacs]=useState([]);
  const[zi,setZi]=useState(1);const[editId,setEditId]=useState(null);
  const[form,setForm]=useState({group:"",groupe:"",start:"",end:"",nbJ:1});
  const[cw,setCw]=useState(0);
  const[showSettings,setShowSettings]=useState(false);const[vacForm,setVacForm]=useState({label:"",start:"",end:""});
  const[saving,setSaving]=useState(false);
  const contRef=useRef(null),hdrRef=useRef(null),scrRef=useRef(null);
  const scrollLeftRef=useRef(0),rowScrollables=useRef(new Set());

  const registerScrollable=useCallback(el=>{if(!el)return;rowScrollables.current.add(el);el.scrollLeft=scrollLeftRef.current;},[]);
  const unregisterScrollable=useCallback(el=>{if(el)rowScrollables.current.delete(el);},[]);
  const zoom=ZOOMS[zi],today=new Date();

  useEffect(()=>{
    if(!contRef.current)return;
    const ro=new ResizeObserver(es=>{for(const e of es){if(e.contentRect.width>0)setCw(e.contentRect.width);}});
    ro.observe(contRef.current);
    if(contRef.current.offsetWidth>0)setCw(contRef.current.offsetWidth);
    return()=>ro.disconnect();
  },[]);

  const{projStart,totalDays}=useMemo(()=>{
    const tDates=tasks.flatMap(t=>[t.start,t.end]).filter(Boolean).map(pd);
    const earliest=tDates.length>0?tDates.reduce((a,b)=>a<b?a:b):today;
    const latest=tDates.length>0?tDates.reduce((a,b)=>a>b?a:b):ad(today,180);
    return{projStart:ad(earliest,-14),totalDays:Math.max(365,gdb(ad(earliest,-14),latest)+60)};
  },[tasks]);
  const days=useMemo(()=>Array.from({length:totalDays},(_,i)=>ad(projStart,i)),[projStart,totalDays]);

  useEffect(()=>{const off=gdb(projStart,today);requestAnimationFrame(()=>sync(Math.max(0,off*zoom.cw-120)));},[]);
  
  const weekHdrs=useMemo(()=>{const r=[];let wi=0;while(wi<days.length){const d=days[wi],span=Math.min(days.length-wi,7-(d.getDay()===0?6:d.getDay()-1));r.push({date:d,span,key:wi});wi+=span;}return r;},[days]);
  const sync=sl=>{scrollLeftRef.current=sl;rowScrollables.current.forEach(el=>{el.scrollLeft=sl;});if(hdrRef.current)hdrRef.current.scrollLeft=sl;if(scrRef.current)scrRef.current.scrollLeft=sl;};
  const scrollBy=n=>{const cur=scrRef.current?.scrollLeft??scrollLeftRef.current;sync(Math.max(0,cur+n*zoom.cw));};
  const goToday=()=>{const off=gdb(projStart,today);sync(Math.max(0,off*zoom.cw-120));};
  
  const avail=cw>0?Math.min(cw*0.44,GTOT):GTOT,scale=cw>0?avail/GTOT:1;
  const SC=useMemo(()=>GCOLS.map(c=>({...c,sw:Math.max(Math.round(c.w*scale),c.key==="group"?140:c.key==="groupe"?40:c.key==="wdays"?40:c.key==="prog"?60:66)})),[scale]);
  const cs=useCallback(w=>({width:w,minWidth:w,maxWidth:w,boxSizing:"border-box",flexShrink:0,display:"flex",alignItems:"center",overflow:"hidden",borderRight:`1px solid ${T.pageBdr}`}),[]);
  
  function fc(field,val){setForm(p=>{const u={...p,[field]:val};if(field==="start"){if(u.start)u.start=snap(u.start,wd,sh,vacs);if(u.end)u.nbJ=calcWD(u.start,u.end,wd,sh,vacs);else if(u.nbJ)u.end=addWD(u.start,u.nbJ,wd,sh,vacs);}if(field==="end"&&u.start){if(u.end)u.end=snap(u.end,wd,sh,vacs);u.nbJ=calcWD(u.start,u.end,wd,sh,vacs);}if(field==="nbJ"){const n=Math.max(1,Math.round(parseFloat(val)||1));u.nbJ=n;if(u.start)u.end=addWD(u.start,n,wd,sh,vacs);}return u;});}

  const startEdit=t=>{setEditId(t.id);let eGrp=t.groupe||"";if(!eGrp&&t.name&&t.name.includes(" — Grp "))eGrp=t.name.split(" — Grp ")[1];setForm({group:t.group||"",groupe:eGrp,start:t.start,end:t.end,nbJ:calcWD(t.start,t.end,wd,sh,vacs)});};
  
  const commit=async()=>{
    if(!form.group.trim()||!form.start||!form.end||saving)return;
    const ns=snap(form.start,wd,sh,vacs),ne=addWD(ns,calcWD(form.start,form.end,wd,sh,vacs),wd,sh,vacs);
    const builtName=form.group.trim()+(form.groupe?.trim()?` — Grp ${form.groupe.trim()}`:"");
    const base={name:builtName,group:form.group.trim(),groupe:form.groupe?.trim()||"",start:ns,end:ne};
    setSaving(true);
    try{
      if(editId==="new"){const created=norm(await apiFetch(`/workspaces/${wsId}/tasks`,{method:"POST",body:base}));setTasks(p=>[...p,created]);}
      else{const updated=norm(await apiFetch(`/tasks/${editId}`,{method:"PUT",body:base}));setTasks(p=>p.map(t=>t.id===editId?updated:t));}
      setEditId(null);
    }catch(e){showToast("Erreur sauvegarde : "+e.message);}
    setSaving(false);
  };

  const delTask=async id=>{setTasks(p=>p.filter(t=>t.id!==id));if(editId===id)setEditId(null);try{await apiFetch(`/tasks/${id}`,{method:"DELETE"});}catch(e){showToast("Erreur : "+e.message);}};
  const updTask=useCallback((id,s,e)=>{setTasks(p=>p.map(t=>t.id===id?{...t,start:s,end:e}:t));apiFetch(`/tasks/${id}/dates`,{method:"PATCH",body:{start:s,end:e}}).catch(()=>{});},[wsId]);

  const exportGantt=()=>{
    const data=tasks.map(t=>{const prog=autoProgress(t,wd,sh,vacs);let grp=t.groupe||"";if(!grp&&t.name&&t.name.includes(" — Grp "))grp=t.name.split(" — Grp ")[1];return{"Thème / Formation":t.group||"","Groupe":grp?`G${grp}`:"—","Nb jours":calcWD(t.start,t.end,wd,sh,vacs),"Début":t.start?fmt(t.start):"—","Fin":t.end?fmt(t.end):"—","Avancement (%)":prog.pct,"Statut":prog.pct===100?"Terminé":prog.pct===0?"Non démarré":"En cours"};});
    const sheet=XLSX.utils.json_to_sheet(data);sheet["!cols"]=[{wch:40},{wch:8},{wch:10},{wch:12},{wch:12},{wch:14},{wch:14}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,sheet,"Planification");
    XLSX.writeFile(wb,`planification_export.xlsx`);
    showToast(`${data.length} tâche(s) exportée(s)`,"success");
  };

  const allGroups=useMemo(()=>[...new Set(tasks.map(t=>t.group).filter(Boolean))],[tasks]);
  const todayOff=useMemo(()=>gdb(projStart,today),[projStart]);
  const conflicts=useMemo(()=>new Set(tasks.filter(t=>t.start&&t.end&&[pd(t.start),pd(t.end)].some(d=>isOff(d,wd,sh,vacs))).map(t=>t.id)),[tasks,wd,sh,vacs]);
  function addVac(){if(!vacForm.label.trim()||!vacForm.start||!vacForm.end||vacForm.start>vacForm.end)return;setVacs(p=>[...p,{id:uid(),...vacForm}]);setVacForm({label:"",start:"",end:""});}

  return(
    <div ref={contRef} style={{padding:"60px 40px 80px",width:"100%",boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><CalendarRange style={{width:24,height:24,color:T.pageSub,strokeWidth:1.6}}/><h1 style={{fontSize:32,fontWeight:800,color:T.pageText,letterSpacing:"-0.04em",margin:0}}>Planification</h1></div>
      <div style={{fontSize:13,color:T.pageSub,marginBottom:24}}>{tasks.length} tâche{tasks.length!==1?"s":""} · {7-wd.length} jour{7-wd.length!==1?"s":""} ouvrés/semaine</div>
      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        <button onClick={()=>setSh(v=>!v)} style={{height:26,padding:"0 9px",border:"none",borderRadius:4,background:sh?"rgba(55,53,47,0.1)":"transparent"}}>🇲🇦 Fériés</button>
        <button onClick={()=>setShowSettings(v=>!v)} style={{height:26,padding:"0 9px",border:"none",borderRadius:4,background:showSettings?"rgba(55,53,47,0.1)":"transparent"}}><Settings style={{width:13,height:13}}/> Paramètres</button>
        <div style={{display:"flex",border:`1px solid ${T.pageBdr}`,borderRadius:4,overflow:"hidden"}}><button onClick={()=>scrollBy(-zoom.days)} style={{width:26,height:26,border:"none"}}><ChevronLeft style={{width:12,height:12}}/></button><button onClick={goToday} style={{border:"none",padding:"0 8px"}}>Aujourd'hui</button><button onClick={()=>scrollBy(zoom.days)} style={{width:26,height:26,border:"none"}}><ChevronRight style={{width:12,height:12}}/></button></div>
        <div style={{display:"flex",border:`1px solid ${T.pageBdr}`,borderRadius:4,overflow:"hidden"}}><button onClick={()=>setZi(z=>Math.max(0,z-1))} style={{width:26,height:26,border:"none"}} disabled={zi===0}><ZoomIn style={{width:12,height:12}}/></button><span style={{padding:"0 8px",lineHeight:"26px",fontSize:12}}>{zoom.label}</span><button onClick={()=>setZi(z=>Math.min(ZOOMS.length-1,z+1))} style={{width:26,height:26,border:"none"}} disabled={zi===ZOOMS.length-1}><ZoomOut style={{width:12,height:12}}/></button></div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={exportGantt} disabled={tasks.length===0} style={{display:"flex",alignItems:"center",gap:5,height:26,padding:"0 10px",border:`1px solid rgba(55,53,47,0.25)`,borderRadius:4,background:"transparent",cursor:"pointer"}}><FileUp style={{width:13,height:13}}/> Exporter</button>
          <button onClick={()=>{setEditId("new");setForm({group:"",groupe:"",start:"",end:"",nbJ:1});}} style={{display:"flex",alignItems:"center",gap:5,height:26,padding:"0 10px",background:"#37352f",color:"#fff",border:"none",borderRadius:4,cursor:"pointer"}}><Plus style={{width:13,height:13}}/> Nouvelle tâche</button>
        </div>
      </div>
      
      {showSettings&&(
        <div style={{border:`1px solid ${T.pageBdr}`,borderRadius:6,background:"rgba(55,53,47,0.02)",padding:"20px 24px",marginBottom:16}}>
           {/* Formulaire des settings (Congés et Week-ends) - gardé concis */}
           <div style={{display:"flex",gap:5}}>{[["Lun",1],["Mar",2],["Mer",3],["Jeu",4],["Ven",5],["Sam",6],["Dim",0]].map(([l,d])=><button key={d} onClick={()=>setWd(p=>p.includes(d)?p.length>=6?p:p.filter(x=>x!==d):[...p,d])} style={{padding:"5px 12px",border:`1px solid ${wd.includes(d)?"rgba(55,53,47,0.3)":T.pageBdr}`,background:wd.includes(d)?"rgba(55,53,47,0.1)":"#fff"}}>{l}</button>)}</div>
        </div>
      )}

      <div style={{border:`1px solid ${T.pageBdr}`,borderRadius:4,background:"#fff"}}>
        <div style={{display:"flex",background:"#f7f7f7",borderBottom:`1px solid ${T.pageBdr}`,height:30,position:"sticky",top:0,zIndex:20}}>
          <div style={{display:"flex",flexShrink:0}}>{SC.map(col=>(<div key={col.key} style={{...cs(col.sw),justifyContent:CHDR[col.key]??"flex-start",padding:"0 8px"}}><span style={{fontSize:10,fontWeight:600}}>{col.label}</span></div>))}</div>
          <div style={{flex:1,overflow:"hidden"}}><div ref={hdrRef} style={{overflowX:"hidden",width:"100%",height:"100%"}}><div style={{width:totalDays*zoom.cw,height:"100%",position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,display:"flex",borderBottom:`1px solid ${T.pageBdr}`,height:14}}>{weekHdrs.map(wh=>(<div key={wh.key} style={{width:wh.span*zoom.cw,borderRight:`1px solid ${T.pageBdr}`,overflow:"hidden",fontSize:9}}>{String(wh.date.getDate()).padStart(2,"0")}/{String(wh.date.getMonth()+1).padStart(2,"0")}</div>))}</div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",height:16}}>{days.map((d,i)=><div key={i} style={{width:zoom.cw,borderRight:`1px solid ${T.pageBdr}`,background:(sh&&HMAP[d2s(d)])?"rgba(212,76,71,0.06)":wd.includes(d.getDay())?"rgba(55,53,47,0.04)":"transparent",fontSize:9}}>{d.getDate()}</div>)}</div>
          </div></div></div>
        </div>
        {tasks.map(t=>{
          if(editId===t.id)return <div key={t.id} style={{height:RH,background:"#f9f9f9"}}>Édition en cours... (remplacé visuellement)</div>; // Simplifié pour la vue
          return <GRow key={t.id} task={t} SC={SC} cs={cs} zoom={zoom} projStart={projStart} totalDays={totalDays} todayOff={todayOff} days={days} wd={wd} sh={sh} vacs={vacs} onEdit={()=>startEdit(t)} onDelete={()=>delTask(t.id)} onUpdate={updTask} conflict={conflicts.has(t.id)} registerScrollable={registerScrollable} unregisterScrollable={unregisterScrollable}/>;
        })}
        <div style={{display:"flex",borderTop:`1px solid ${T.pageBdr}`,background:"#f9f9f9",position:"sticky",bottom:0,zIndex:20}}>
          <div style={{width:SC.reduce((s,c)=>s+c.sw,0),flexShrink:0,borderRight:`1px solid ${T.pageBdr}`}}/>
          <div ref={scrRef} style={{flex:1,overflowX:"auto",height:10}} onScroll={e=>sync(e.currentTarget.scrollLeft)}><div style={{width:totalDays*zoom.cw,height:1}}/></div>
        </div>
      </div>
    </div>
  );
}
