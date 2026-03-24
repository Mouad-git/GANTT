import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check, Building2, LayoutDashboard, CalendarRange, Users, FolderOpen } from "lucide-react";
import { T, fmtRangeShort } from "../utils";

export const NAV=[
  {key:"overview",label:"Vue d'ensemble",Icon:LayoutDashboard},
  {key:"gantt",label:"Planification",Icon:CalendarRange},
  {key:"candidats",label:"Candidats",Icon:Users},
  {key:"documents",label:"Documents",Icon:FolderOpen}
];

export default function Sidebar({workspaces,activeWs,onSelectWs,section,onSection,onCreateWs,open,apiOnline}){
  const[wsOpen,setWsOpen]=useState(false);
  const dropRef=useRef(null);
  const ws=workspaces.find(w=>w.id===activeWs);
  useEffect(()=>{if(!wsOpen)return;const h=e=>{if(dropRef.current&&!dropRef.current.contains(e.target))setWsOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[wsOpen]);
  const si=(active,onClick,children)=>(<button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"3px 8px",height:28,borderRadius:4,border:"none",background:active?T.sidebarSel:"transparent",cursor:"pointer",textAlign:"left",transition:"background 0.08s",marginBottom:1}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background=T.sidebarHov;}} onMouseLeave={e=>{e.currentTarget.style.background=active?T.sidebarSel:"transparent";}}>{children}</button>);
  
  return(
    <aside style={{position:"fixed",left:0,top:0,bottom:0,zIndex:30,width:open?240:0,background:T.sidebarBg,borderRight:`1px solid ${T.sidebarBdr}`,overflow:"hidden",transition:"width 0.2s ease",flexShrink:0,display:"flex",flexDirection:"column"}}>
      <div style={{width:240,height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div ref={dropRef} style={{padding:"10px 8px 6px",position:"relative"}}>
          {si(false,()=>setWsOpen(v=>!v),<>
            <div style={{width:20,height:20,borderRadius:4,flexShrink:0,background:"rgba(55,53,47,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 style={{width:12,height:12,color:T.sidebarText}}/></div>
            <span style={{flex:1,fontSize:14,fontWeight:600,color:T.sidebarText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{ws?ws.company:"Workspace"}</span>
            <ChevronDown style={{width:12,height:12,color:T.sidebarSub,flexShrink:0,transform:wsOpen?"rotate(180deg)":"none",transition:"transform 0.15s"}}/>
          </>)}
          {wsOpen&&(
            <div style={{position:"absolute",top:"calc(100% + 2px)",left:8,right:8,background:"#fff",borderRadius:6,border:`1px solid ${T.sidebarBdr}`,boxShadow:"0 8px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",zIndex:100,overflow:"hidden",padding:"4px"}}>
              {workspaces.map(w=>(
                <button key={w.id} onClick={()=>{onSelectWs(w.id);setWsOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:4,border:"none",background:w.id===activeWs?T.sidebarSel:"transparent",cursor:"pointer",textAlign:"left",transition:"background 0.08s"}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebarHov} onMouseLeave={e=>e.currentTarget.style.background=w.id===activeWs?T.sidebarSel:"transparent"}>
                  <div style={{width:18,height:18,borderRadius:3,background:"rgba(55,53,47,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Building2 style={{width:10,height:10,color:T.sidebarText}}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.sidebarText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.company}</div>
                    <div style={{fontSize:11,color:T.sidebarSub}}>{fmtRangeShort(w)}</div>
                  </div>
                  {w.id===activeWs&&<Check style={{width:12,height:12,color:T.sidebarSub,flexShrink:0}}/>}
                </button>
              ))}
              <div style={{height:1,background:T.sidebarBdr,margin:"4px 0"}}/>
              <button onClick={()=>{onCreateWs();setWsOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:4,border:"none",background:"transparent",cursor:"pointer",transition:"background 0.08s"}} onMouseEnter={e=>e.currentTarget.style.background=T.sidebarHov} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Plus style={{width:14,height:14,color:T.sidebarSub}}/>
                <span style={{fontSize:13,color:T.sidebarSub}}>Ajouter un workspace</span>
              </button>
            </div>
          )}
        </div>
        <nav style={{flex:1,padding:"2px 8px",overflowY:"auto"}}>
          {NAV.map(item=>{const active=section===item.key;const Icon=item.Icon;return si(active,()=>onSection(item.key),<><Icon style={{width:15,height:15,flexShrink:0,color:active?T.sidebarText:T.sidebarSub,strokeWidth:active?2.2:1.8}}/><span style={{fontSize:14,fontWeight:active?600:400,color:active?T.sidebarText:T.sidebarSub,letterSpacing:"-0.003em"}}>{item.label}</span></>);})}
        </nav>
        <div style={{padding:"8px 16px",borderTop:`1px solid ${T.sidebarBdr}`,display:"flex",alignItems:"center",gap:6}}>
          <div style={{fontSize:11,color:T.sidebarSub,flex:1}}>PlanAdmin · Maroc 🇲🇦</div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:apiOnline?"#448361":"#d44c47",flexShrink:0,transition:"background 0.3s"}}/>
            <span style={{fontSize:10,color:T.sidebarSub}}>{apiOnline?"API":"Hors ligne"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}