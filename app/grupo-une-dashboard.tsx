"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { BookOpenCheck, Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Database, Eye, FileSpreadsheet, Gauge, Plus, RefreshCw, Search, Ship, Upload, Users, WalletCards, X } from "lucide-react";

type Operation = {
  id:number; company:string; purchaseOrder:string; customsReference:string; supplier:string; product:string; status:string;
  etd:string|null; eta:string|null; warehouseReceiptDate:string|null; sapEntryDate:string|null; incoterm:string;
  originCountry:string; loadingPort:string; arrivalPort:string; transitDays:number|null; etaToWarehouseDays:number|null;
  warehouseToSapDays:number|null; etaToSapDays:number|null; ocCompliance:string; ocComplianceNotes:string; notes:string; updatedAt:string;
  noticeDate:string; ocCreationDate:string; valueQuantitySentDate:string; ocBalancedDate:string; ocRetentionNoticeDate:string; ocReleaseDate:string;
  approval1Date:string; approval2Date:string; approval3Date:string; cxpSentDate:string; cxpRegisteredDate:string; warehouseEntryRequestedDate:string;
  storageCostCents:number; weightKg:number; valuesRequestedDate:string; arrivalDate:string; macobsaPaymentDate:string; transportMode:string;
  documentsReceivedAt:string; documentsSentExecutiveAt:string;
};
type Classification = {
  company:string; client:string; classificationCode:string; brand:string; model:string; description:string; characteristic:string;
  tariffSubheading:string; supplementaryCode:string; restrictions:string; originCountry:string; tpci:string; tpng:string; tpne:string;
  approver:string; validCriterion:string; observation:string;
};
type ClassificationResponse = {rows:Classification[];total:number;page:number;pageSize:number;pages:number;summary:{total:number;companies:Record<string,number>;restricted:number};error?:string};
type View = "dashboard" | "operations" | "classifications";
const COMPANIES = ["ECUABARNICES", "FADESA GYE", "FADESA MANTA"];
const CLASSIFICATION_COMPANIES = ["ECUABARNICES", "FADESA GYE", "FADESA MANTA"];
const STATUSES = ["PLANIFICADO", "EN CURSO", "EN ESPERA", "TRAMITADO", "FINALIZADO", "CANCELADO"];

export default function GrupoUneDashboard({ onOpenLegal }: { onOpenLegal: () => void }) {
  const [view,setView]=useState<View>("dashboard");
  const [operations,setOperations]=useState<Operation[]>([]);
  const [months,setMonths]=useState<string[]>([]);
  const [month,setMonth]=useState("");
  const [company,setCompany]=useState("");
  const [status,setStatus]=useState("");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [canManage,setCanManage]=useState(false);
  const [editor,setEditor]=useState<Operation|null|undefined>(undefined);
  const [selectedOperation,setSelectedOperation]=useState<Operation|null>(null);
  const [detailCompany,setDetailCompany]=useState("ECUABARNICES");
  const [detailProducts,setDetailProducts]=useState<Classification[]>([]);
  const [detailProductsLoading,setDetailProductsLoading]=useState(false);
  const [classRows,setClassRows]=useState<Classification[]>([]);
  const [classQuery,setClassQuery]=useState("");
  const [classCompany,setClassCompany]=useState("");
  const [classRestricted,setClassRestricted]=useState(false);
  const [classPage,setClassPage]=useState(1);
  const [classTotal,setClassTotal]=useState(0);
  const [classPages,setClassPages]=useState(1);
  const [classSummary,setClassSummary]=useState({total:4100,companies:{"ECUABARNICES":541,"FADESA GYE":3135,"FADESA MANTA":424} as Record<string,number>,restricted:99});
  const [classLoading,setClassLoading]=useState(false);
  const [importRows,setImportRows]=useState<Record<string,unknown>[]>([]);
  const [importName,setImportName]=useState("");
  const [importBusy,setImportBusy]=useState(false);
  const [importResult,setImportResult]=useState("");

  async function load() {
    setLoading(true); setMessage("");
    try {
      const params=new URLSearchParams();
      if(month)params.set("month",month); if(company)params.set("company",company); if(status)params.set("status",status); if(query)params.set("q",query);
      const response=await fetch(`/api/grupo-une?${params}`,{cache:"no-store"});
      const data=await response.json() as {error?:string;operations?:Operation[];months?:string[];canManage?:boolean};
      if(!response.ok)throw new Error(data.error||"No fue posible cargar Grupo UNE");
      setOperations(data.operations||[]); setMonths(data.months||[]); setCanManage(Boolean(data.canManage));
    } catch(error) { setMessage(error instanceof Error?error.message:"No fue posible cargar Grupo UNE"); }
    finally { setLoading(false); }
  }
  async function loadClassifications(page=1) {
    setClassLoading(true); setMessage("");
    try {
      const params=new URLSearchParams({page:String(page)});
      if(classQuery)params.set("q",classQuery); if(classCompany)params.set("company",classCompany); if(classRestricted)params.set("restricted","1");
      const response=await fetch(`/api/grupo-une/classifications?${params}`,{cache:"no-store"});
      const data=await response.json() as ClassificationResponse;
      if(!response.ok)throw new Error(data.error||"No fue posible consultar la base aduanera");
      setClassRows(data.rows); setClassTotal(data.total); setClassPage(data.page); setClassPages(data.pages); setClassSummary(data.summary);
    } catch(error) { setMessage(error instanceof Error?error.message:"No fue posible consultar la base aduanera"); }
    finally { setClassLoading(false); }
  }
  useEffect(()=>{void load()},[month,company,status]);
  useEffect(()=>{if(view==="classifications")void loadClassifications(1)},[view,classCompany,classRestricted]);
  useEffect(()=>{
    if(view!=="dashboard")return;
    let active=true;
    setDetailProductsLoading(true);
    const classificationCompany=detailCompany;
    fetch(`/api/grupo-une/classifications?company=${encodeURIComponent(classificationCompany)}&page=1`,{cache:"no-store"})
      .then(response=>response.json()).then((data:ClassificationResponse)=>{if(active)setDetailProducts((data.rows||[]).slice(0,8))})
      .catch(()=>{if(active)setDetailProducts([])})
      .finally(()=>{if(active)setDetailProductsLoading(false)});
    return()=>{active=false};
  },[view,detailCompany]);

  const metrics=useMemo(()=>{
    const completed=operations.filter(o=>o.status==="FINALIZADO").length;
    const active=operations.filter(o=>!["FINALIZADO","CANCELADO"].includes(o.status)).length;
    return {total:operations.length,completed,active,pct:operations.length?completed/operations.length*100:0};
  },[operations]);
  const originalKpis=useMemo(()=>[
    timeKpi(operations,"eta","warehouseReceiptDate","ETA vs recepción en bodega",7),
    timeKpi(operations,"warehouseReceiptDate","sapEntryDate","Recepción bodega vs ingreso SAP",3),
    timeKpi(operations,"eta","sapEntryDate","ETA vs ingreso a bodega SAP",10),
  ],[operations]);
  const roleKpis=useMemo(()=>({
    buyers:[
      durationKpi(operations,"noticeDate","ocCreationDate","Creación de OC","Fecha aviso → creación"),
      durationKpi(operations,"valueQuantitySentDate","ocBalancedDate","Novedad valor / cantidad","Envío → OC cuadrada"),
      durationKpi(operations,"ocRetentionNoticeDate","ocReleaseDate","OC retenida","Aviso → liberación"),
      durationKpi(operations,"approval1Date","approval3Date","Ruta de aprobaciones","Aprobación 1 → aprobación final"),
    ],
    inhouse:[
      durationKpi(operations,"cxpSentDate","warehouseReceiptDate","Envío CXP → bodega","Gestión In-House"),
      durationKpi(operations,"cxpRegisteredDate","warehouseEntryRequestedDate","Registro CXP → solicitud ingreso","Gestión In-House"),
      costPerTmKpi(operations),
      hoursKpi(operations),
    ],
    finance:[
      targetDurationKpi(operations,"valuesRequestedDate","eta","Solicitud de valores → ETA","Meta ≥ 3 días",value=>value>=3),
      targetDurationKpi(operations,"arrivalDate","macobsaPaymentDate","Arribo → pago MACOBSA","Meta ≤ 1 día",value=>value<=1),
      durationKpi(operations,"eta","macobsaPaymentDate","Pago realizado vs ETA","Seguimiento preventivo"),
    ],
  }),[operations]);
  const oc=useMemo(()=>{const measured=operations.filter(o=>["CUMPLE","NO CUMPLE"].includes(o.ocCompliance));const complies=measured.filter(o=>o.ocCompliance==="CUMPLE").length;return{measured:measured.length,complies,nonComplies:measured.length-complies,pct:measured.length?complies/measured.length*100:null}},[operations]);

  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const payload=Object.fromEntries(new FormData(event.currentTarget));
    const response=await fetch("/api/grupo-une",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,action:editor?"update":"create",id:editor?.id})});
    const data=await response.json() as {error?:string};
    if(!response.ok){setMessage(data.error||"No fue posible guardar");return;}
    setEditor(undefined); setMessage(editor?"Operación actualizada correctamente.":"Operación registrada correctamente."); await load();
  }
  async function selectImport(file?:File) {
    setImportRows([]); setImportResult(""); setMessage("");
    if(!file)return;
    try {
      const parsed=await parseFadesaWorkbook(file);
      if(!parsed.length)throw new Error("No encontré filas con una orden de compra válida.");
      setImportRows(parsed); setImportName(file.name);
    } catch(error) { setMessage(error instanceof Error?error.message:"No se pudo leer el archivo Excel."); }
  }
  async function importOperations() {
    if(!importRows.length||importBusy)return;
    setImportBusy(true); setMessage(""); setImportResult("");
    try {
      const response=await fetch("/api/grupo-une",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"import",source:importName,operations:importRows})});
      const data=await response.json() as {error?:string;imported?:number;skippedExisting?:number;duplicatesInFile?:number;skippedInvalid?:number};
      if(!response.ok)throw new Error(data.error||"No se pudo cargar la matriz.");
      setImportResult(`Cargadas ${data.imported||0} operaciones · ${data.skippedExisting||0} ya existían · ${data.duplicatesInFile||0} repetidas en el archivo${data.skippedInvalid?` · ${data.skippedInvalid} filas inválidas omitidas`:""}.`);
      setImportRows([]); setImportName(""); await load();
    } catch(error) { setMessage(error instanceof Error?error.message:"No se pudo completar la carga."); }
    finally { setImportBusy(false); }
  }

  return <section className="section-body une-dashboard-page">
    <nav className="une-module-switch" aria-label="Opciones de Grupo UNE">
      <button className={view==="dashboard"?"active":""} onClick={()=>setView("dashboard")}><Gauge size={18}/>Dashboard ejecutivo</button>
      <button className={view==="operations"?"active":""} onClick={()=>setView("operations")}><Ship size={18}/>Operaciones</button>
      <button className={view==="classifications"?"active":""} onClick={()=>setView("classifications")}><Database size={18}/>Base aduanera</button>
      <button onClick={onOpenLegal}><BookOpenCheck size={18}/>Repositorio legal</button>
    </nav>

    <div className="une-integrated-hero">
      <div><span>CONTROL INTEGRADO · CRM MACOBSA</span><h2>Grupo UNE</h2><p>FADESA GYE · FADESA Manta · Ecuabarnices</p></div>
      {canManage&&view!=="classifications"&&<button className="une-primary" onClick={()=>setEditor(null)}><Plus size={17}/>Nueva operación</button>}
    </div>

    {view!=="classifications"&&<div className="une-filter-bar">
      <label><CalendarDays size={17}/><select value={month} onChange={e=>setMonth(e.target.value)}><option value="">Todos los meses</option>{months.map(value=><option value={value} key={value}>{monthLabel(value)}</option>)}</select></label>
      <label><Building2 size={17}/><select value={company} onChange={e=>setCompany(e.target.value)}><option value="">Todas las empresas</option>{COMPANIES.map(value=><option key={value}>{value}</option>)}</select></label>
      <button onClick={()=>void load()}><RefreshCw size={16}/>Actualizar</button>
    </div>}
    {message&&<div className="une-inline-message">{message}<button onClick={()=>setMessage("")}><X size={15}/></button></div>}

    {view==="dashboard"?<>
      <div className="une-metric-grid">
        <Metric icon={<Ship/>} label="Operaciones" value={metrics.total}/>
        <Metric icon={<CheckCircle2/>} label="Finalizadas" value={metrics.completed} note={`${metrics.pct.toFixed(1)}% del período`}/>
        <Metric icon={<RefreshCw/>} label="En seguimiento" value={metrics.active}/>
        <Metric icon={<Database/>} label="Productos clasificados" value={classSummary.total.toLocaleString("es-EC")} note="3 bases verificadas"/>
      </div>
      <section className="panel une-company-detail">
        <header className="une-detail-heading"><div><span>DETALLE COMPLETO POR EMPRESA</span><h3>Operaciones y base aduanera en una sola vista</h3><p>Seleccione una empresa para consultar sus trámites, productos, partidas, restricciones y observaciones.</p></div></header>
        <div className="une-company-tabs">{COMPANIES.map(name=>{const count=operations.filter(o=>sameCompany(o.company,name)).length;return <button key={name} className={detailCompany===name?"active":""} onClick={()=>setDetailCompany(name)}><Building2/><span><strong>{name}</strong><small>{count} operaciones · {(classSummary.companies[name]||0).toLocaleString("es-EC")} productos</small></span><ChevronRight/></button>})}</div>
        <div className="une-data-availability"><strong>{detailCompany}</strong><span>{detailCompany==="ECUABARNICES"||operations.some(o=>sameCompany(o.company,detailCompany))?"Histórico operativo y base aduanera cargados.":"Base aduanera cargada. El histórico operativo aparecerá al cargar la matriz de tránsito de esta empresa."}</span></div>
        <div className="une-detail-block"><div className="une-detail-title"><div><h4>Trámites y operaciones</h4><p>{operations.filter(o=>sameCompany(o.company,detailCompany)).length} registros en la selección actual</p></div><button onClick={()=>{setCompany(detailCompany);setView("operations")}}>Ver todos</button></div><OperationsTable rows={operations.filter(o=>sameCompany(o.company,detailCompany)).slice(0,8)} loading={loading} onView={setSelectedOperation} onEdit={canManage?setEditor:undefined}/></div>
        <div className="une-detail-block"><div className="une-detail-title"><div><h4>Productos y criterios aduaneros</h4><p>Código, descripción, subpartida, restricciones y observaciones</p></div><button onClick={()=>{setClassCompany(detailCompany==="FADESA"?"FADESA GYE":detailCompany==="FADESA Manta"?"FADESA MANTA":detailCompany);setView("classifications")}}>Abrir base completa</button></div><ClassificationPreview rows={detailProducts} loading={detailProductsLoading}/></div>
      </section>
      <KpiSection icon={<Gauge/>} title="Lead times operativos" subtitle="Días laborables de lunes a viernes; sin feriados">
        {originalKpis.map(kpi=><TimeKpi key={kpi.label} {...kpi}/>)}
        <article className={`une-time-kpi ${oc.pct===null?"neutral":oc.pct>=90?"good":oc.pct>=75?"watch":"bad"}`}><header><CheckCircle2/><span>Creación de OC</span></header><strong>{oc.pct===null?"Sin evaluar":`${oc.pct.toFixed(1)}%`}</strong><small>{oc.complies} cumple · {oc.nonComplies} no cumple · {oc.measured} evaluados</small></article>
      </KpiSection>
      <KpiSection icon={<ClipboardCheck/>} title="Compras y Orden de Compra" subtitle="Medición de atrasos internos del comprador">
        {roleKpis.buyers.map(kpi=><RoleKpi key={kpi.label} {...kpi}/>)}
      </KpiSection>
      <KpiSection icon={<Users/>} title="Gestión In-House" subtitle="CXP, ingreso a bodega, almacenaje y documentación aérea">
        {roleKpis.inhouse.map(kpi=><RoleKpi key={kpi.label} {...kpi}/>)}
      </KpiSection>
      <KpiSection icon={<WalletCards/>} title="Financiero y Ejecutivo de Cuenta" subtitle="Solicitud anticipada de valores y oportunidad del pago">
        {roleKpis.finance.map(kpi=><RoleKpi key={kpi.label} {...kpi}/>)}
      </KpiSection>
      <div className="une-company-grid">{COMPANIES.map(name=><article key={name}><Building2/><div><span>EMPRESA DEL GRUPO</span><strong>{name}</strong><small>{operations.filter(o=>sameCompany(o.company,name)).length} operaciones en la selección</small></div></article>)}</div>
      <article className="panel une-recent"><div className="panel-head"><h3>Operaciones recientes del Grupo</h3><button onClick={()=>setView("operations")}>Ver todas</button></div><OperationsTable rows={operations.slice(0,8)} loading={loading} onView={setSelectedOperation} onEdit={canManage?setEditor:undefined}/></article>
    </>:view==="operations"?<article className="panel une-operations-panel">
      {canManage&&<div className="une-import-card"><div><FileSpreadsheet/><span><strong>Importar matriz de operaciones</strong><small>Excel .xlsx · Empresas, hitos y fechas originales. Los KPI se recalculan al cargar.</small></span></div><label className="une-import-button"><Upload size={16}/>Elegir archivo<input type="file" accept=".xlsx,.xls" onChange={e=>void selectImport(e.target.files?.[0])}/></label></div>}
      {importRows.length>0&&<div className="une-import-preview"><div><strong>{importName}</strong><span>{importRows.length} operaciones válidas · FADESA GYE: {importRows.filter(row=>row.company==="FADESA GYE").length} · FADESA MANTA: {importRows.filter(row=>row.company==="FADESA MANTA").length}</span><small>Las fórmulas de indicadores del archivo se omiten; se calculan desde las fechas y se protegen las OC que ya existan.</small></div><button disabled={importBusy} onClick={()=>void importOperations()}>{importBusy?"Cargando…":"Confirmar carga"}</button><button className="une-import-cancel" disabled={importBusy} onClick={()=>{setImportRows([]);setImportName("")}}>Cancelar</button></div>}
      {importResult&&<div className="une-import-result"><CheckCircle2 size={17}/>{importResult}</div>}
      <div className="une-operation-filters"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar orden, trámite, proveedor o producto"/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos los estados</option>{STATUSES.map(value=><option key={value} value={value}>{statusLabel(value)}</option>)}</select><button onClick={()=>void load()}><Search size={16}/>Buscar</button></div>
      <p>{loading?"Actualizando…":`${operations.length} operaciones encontradas`}</p>
      <OperationsTable rows={operations} loading={loading} onView={setSelectedOperation} onEdit={canManage?setEditor:undefined}/>
    </article>:<ClassificationRepository rows={classRows} loading={classLoading} query={classQuery} setQuery={setClassQuery} company={classCompany} setCompany={setClassCompany} restricted={classRestricted} setRestricted={setClassRestricted} total={classTotal} page={classPage} pages={classPages} summary={classSummary} search={()=>void loadClassifications(1)} changePage={page=>void loadClassifications(page)}/>}

    {editor!==undefined&&<OperationEditor operation={editor} onClose={()=>setEditor(undefined)} onSave={save}/>}
    {selectedOperation&&<OperationDetail operation={selectedOperation} onClose={()=>setSelectedOperation(null)} onEdit={canManage?()=>{setSelectedOperation(null);setEditor(selectedOperation)}:undefined}/>}
  </section>;
}

function KpiSection({icon,title,subtitle,children}:{icon:React.ReactNode;title:string;subtitle:string;children:React.ReactNode}){return <section className="panel une-role-section"><header><div className="une-role-icon">{icon}</div><div><h3>{title}</h3><p>{subtitle}</p></div></header><div className="une-kpi-grid">{children}</div></section>}
function Metric({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string|number;note?:string}){return <article className="une-metric"><div>{icon}</div><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</article>}
function TimeKpi({label,target,average,compliance,sample}:{label:string;target:number;average:number|null;compliance:number|null;sample:number}){const tone=compliance===null?"neutral":compliance>=90?"good":compliance>=75?"watch":"bad";return <article className={`une-time-kpi ${tone}`}><header><Clock3/><span>{label}</span></header><strong>{average===null?"Sin datos":`${average.toFixed(1)} días`}</strong><small>Meta ≤ {target} días laborables · {compliance===null?"—":`${compliance.toFixed(1)}%`} cumplimiento · {sample} medidos</small></article>}
function RoleKpi({label,note,value,unit,sample,compliance}:{label:string;note:string;value:number|null;unit:string;sample:number;compliance?:number|null}){const tone=compliance==null?"neutral":compliance>=90?"good":compliance>=75?"watch":"bad";return <article className={`une-time-kpi ${tone}`}><header><Clock3/><span>{label}</span></header><strong>{value===null?"Sin datos":`${value.toFixed(1)} ${unit}`}</strong><small>{note} · {sample} operaciones medibles{compliance==null?"":` · ${compliance.toFixed(1)}% cumple`}</small></article>}

function ClassificationPreview({rows,loading}:{rows:Classification[];loading:boolean}){return <div className="une-product-preview">{loading?<p>Consultando base aduanera…</p>:rows.length?rows.map((row,index)=><article key={`${row.company}-${row.classificationCode}-${index}`}><div><span>{row.classificationCode||"SIN CÓDIGO"}</span><strong>{row.description||"Sin descripción"}</strong><small>{row.brand||"Sin marca"}{row.model?` · ${row.model}`:""}</small></div><dl><div><dt>Subpartida</dt><dd>{row.tariffSubheading||"—"}</dd></div><div><dt>Restricción</dt><dd>{row.restrictions||"Sin restricción registrada"}</dd></div><div><dt>Observación</dt><dd>{row.observation||"—"}</dd></div></dl></article>):<p>No existen productos para esta empresa.</p>}</div>}

function OperationDetail({operation,onClose,onEdit}:{operation:Operation;onClose:()=>void;onEdit?:()=>void}){
  const etaWarehouse=kpiValue(operation.eta,operation.warehouseReceiptDate,operation.etaToWarehouseDays);
  const warehouseSap=kpiValue(operation.warehouseReceiptDate,operation.sapEntryDate,operation.warehouseToSapDays);
  const etaSap=kpiValue(operation.eta,operation.sapEntryDate,operation.etaToSapDays);
  const ocCreation=dateDiff(operation.noticeDate,operation.ocCreationDate);
  const valueFix=dateDiff(operation.valueQuantitySentDate,operation.ocBalancedDate);
  const retention=dateDiff(operation.ocRetentionNoticeDate,operation.ocReleaseDate);
  const valuesLead=dateDiff(operation.valuesRequestedDate,operation.eta||"");
  const paymentDelay=dateDiff(operation.arrivalDate,operation.macobsaPaymentDate);
  return <div className="une-editor-backdrop" role="presentation"><article className="une-editor une-detail-modal"><header><div><span>DETALLE INTEGRAL · {operation.company}</span><h3>OC {operation.purchaseOrder}</h3><p>{operation.supplier||"Proveedor no registrado"} · {operation.product||"Producto no registrado"}</p></div><button onClick={onClose} aria-label="Cerrar"><X/></button></header><div className="une-detail-modal-body">
    <DetailSection title="Datos generales" items={[["Trámite",operation.customsReference],["Estado",statusLabel(operation.status)],["ETD",formatDate(operation.etd)],["ETA",formatDate(operation.eta)],["Arribo real",formatDate(operation.arrivalDate)],["Recepción bodega",formatDate(operation.warehouseReceiptDate)],["Ingreso SAP",formatDate(operation.sapEntryDate)],["Incoterm",operation.incoterm],["Origen",operation.originCountry],["Puerto llegada",operation.arrivalPort]]}/>
    <DetailSection title="KPI operativos (días laborables)" items={[["ETA → recepción",dayValue(etaWarehouse,7)],["Recepción → SAP",dayValue(warehouseSap,3)],["ETA → SAP",dayValue(etaSap,10)]]}/>
    <DetailSection title="Compras y Orden de Compra" items={[["Aviso",formatDate(operation.noticeDate)],["Creación OC",formatDate(operation.ocCreationDate)],["Tiempo creación",plainDays(ocCreation)],["Resultado",ocLabel(operation.ocCompliance)],["Novedad valor/cantidad",formatDate(operation.valueQuantitySentDate)],["OC cuadrada",formatDate(operation.ocBalancedDate)],["Tiempo solución",plainDays(valueFix)],["Aviso retención",formatDate(operation.ocRetentionNoticeDate)],["Liberación",formatDate(operation.ocReleaseDate)],["Tiempo retenida",plainDays(retention)],["Aprobación 1",formatDate(operation.approval1Date)],["Aprobación 2",formatDate(operation.approval2Date)],["Aprobación 3",formatDate(operation.approval3Date)],["Observación OC",operation.ocComplianceNotes]]}/>
    <DetailSection title="Gestión In-House" items={[["Envío CXP",formatDate(operation.cxpSentDate)],["Registro CXP",formatDate(operation.cxpRegisteredDate)],["Solicitud ingreso bodega",formatDate(operation.warehouseEntryRequestedDate)],["Vía",operation.transportMode],["Costo almacenaje",operation.storageCostCents?`USD ${(operation.storageCostCents/100).toFixed(2)}`:"—"],["Peso",operation.weightKg?`${operation.weightKg.toLocaleString("es-EC")} kg`:"—"],["Recepción documentos",formatDateTime(operation.documentsReceivedAt)],["Envío a Ejecutivo",formatDateTime(operation.documentsSentExecutiveAt)]]}/>
    <DetailSection title="Financiero y Ejecutivo" items={[["Solicitud de valores",formatDate(operation.valuesRequestedDate)],["Anticipación vs ETA",plainDays(valuesLead)],["Pago MACOBSA",formatDate(operation.macobsaPaymentDate)],["Pago después de arribo",plainDays(paymentDelay)],["Observaciones generales",operation.notes]]}/>
  </div><footer><button onClick={onClose}>Cerrar</button>{onEdit&&<button className="une-primary" onClick={onEdit}>Editar operación</button>}</footer></article></div>;
}
function DetailSection({title,items}:{title:string;items:[string,string][]}){return <section><h4>{title}</h4><dl>{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||"—"}</dd></div>)}</dl></section>}

function ClassificationRepository(props:{rows:Classification[];loading:boolean;query:string;setQuery:(v:string)=>void;company:string;setCompany:(v:string)=>void;restricted:boolean;setRestricted:(v:boolean)=>void;total:number;page:number;pages:number;summary:{total:number;companies:Record<string,number>;restricted:number};search:()=>void;changePage:(p:number)=>void}){
  return <section className="une-classification-page">
    <div className="une-classification-summary"><Metric icon={<Database/>} label="Registros consolidados" value={props.summary.total.toLocaleString("es-EC")}/><Metric icon={<Building2/>} label="FADESA GYE" value={(props.summary.companies["FADESA GYE"]||0).toLocaleString("es-EC")}/><Metric icon={<Building2/>} label="FADESA Manta" value={(props.summary.companies["FADESA MANTA"]||0).toLocaleString("es-EC")}/><Metric icon={<Building2/>} label="Ecuabarnices" value={(props.summary.companies["ECUABARNICES"]||0).toLocaleString("es-EC")}/></div>
    <article className="panel une-operations-panel"><div className="une-operation-filters"><label><Search/><input value={props.query} onChange={e=>props.setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")props.search()}} placeholder="Buscar código, marca, modelo, producto o subpartida"/></label><select value={props.company} onChange={e=>props.setCompany(e.target.value)}><option value="">Todas las empresas</option>{CLASSIFICATION_COMPANIES.map(value=><option key={value}>{value}</option>)}</select><label className="une-restriction-check"><input type="checkbox" checked={props.restricted} onChange={e=>props.setRestricted(e.target.checked)}/>Con restricciones</label><button onClick={props.search}><Search size={16}/>Buscar</button></div><p>{props.loading?"Consultando…":`${props.total.toLocaleString("es-EC")} registros encontrados · ${props.summary.restricted} con restricciones en la base completa`}</p><div className="une-table-wrap"><table className="une-classification-table"><thead><tr><th>Empresa / código</th><th>Marca / modelo</th><th>Descripción y característica</th><th>Subpartida</th><th>Origen</th><th>Restricciones / observación</th></tr></thead><tbody>{props.loading?<tr><td colSpan={6}>Consultando base aduanera…</td></tr>:props.rows.map(row=><tr key={`${row.company}-${row.classificationCode}-${row.description}`}><td><strong>{row.company}</strong><small>{row.classificationCode}</small></td><td><strong>{row.brand||"Sin marca"}</strong><small>{row.model||"Sin modelo"}</small></td><td><strong>{row.description}</strong><small>{row.characteristic}</small></td><td><strong>{row.tariffSubheading}</strong><small>Suplementario {row.supplementaryCode||"0000"}</small></td><td>{row.originCountry||"—"}</td><td>{row.restrictions?<span className="une-restriction">{row.restrictions}</span>:<span>Sin restricción registrada</span>}<small>{row.observation}</small></td></tr>)}</tbody></table></div><div className="une-pagination"><button disabled={props.page<=1} onClick={()=>props.changePage(props.page-1)}>Anterior</button><span>Página {props.page} de {props.pages}</span><button disabled={props.page>=props.pages} onClick={()=>props.changePage(props.page+1)}>Siguiente</button></div></article>
  </section>;
}

function OperationEditor({operation,onClose,onSave}:{operation:Operation|null;onClose:()=>void;onSave:(event:FormEvent<HTMLFormElement>)=>void}){
  return <div className="une-editor-backdrop" role="presentation"><form className="une-editor" onSubmit={onSave}><header><div><span>{operation?"ACTUALIZAR":"NUEVO REGISTRO"}</span><h3>{operation?`OC ${operation.purchaseOrder}`:"Nueva operación Grupo UNE"}</h3></div><button type="button" onClick={onClose} aria-label="Cerrar"><X/></button></header><div className="une-form-grid">
    <FormSection title="Datos generales"/>
    <Field label="Empresa"><select name="company" defaultValue={operation?.company||"ECUABARNICES"} disabled={Boolean(operation)}>{COMPANIES.map(value=><option key={value}>{value}</option>)}</select></Field>
    <Field label="Orden de compra"><input name="purchaseOrder" defaultValue={operation?.purchaseOrder||""} required disabled={Boolean(operation)}/></Field>
    <Field label="Trámite aduanero"><input name="customsReference" defaultValue={operation?.customsReference||""}/></Field>
    <Field label="Proveedor"><input name="supplier" defaultValue={operation?.supplier||""}/></Field>
    <Field label="Producto"><input name="product" defaultValue={operation?.product||""}/></Field>
    <Field label="Estado"><select name="status" defaultValue={operation?.status||"PLANIFICADO"}>{STATUSES.map(value=><option key={value} value={value}>{statusLabel(value)}</option>)}</select></Field>
    <Field label="ETD"><input type="date" name="etd" defaultValue={operation?.etd||""}/></Field>
    <Field label="ETA"><input type="date" name="eta" defaultValue={operation?.eta||""}/></Field>
    <Field label="Fecha real de arribo"><input type="date" name="arrivalDate" defaultValue={operation?.arrivalDate||""}/></Field>
    <Field label="Recepción en bodega"><input type="date" name="warehouseReceiptDate" defaultValue={operation?.warehouseReceiptDate||""}/></Field>
    <Field label="Ingreso a bodega SAP"><input type="date" name="sapEntryDate" defaultValue={operation?.sapEntryDate||""}/></Field>
    <Field label="ETA → recepción (días)"><input type="number" name="etaToWarehouseDays" defaultValue={operation?.etaToWarehouseDays??""}/></Field>
    <Field label="Recepción → SAP (días)"><input type="number" name="warehouseToSapDays" defaultValue={operation?.warehouseToSapDays??""}/></Field>
    <Field label="ETA → SAP (días)"><input type="number" name="etaToSapDays" defaultValue={operation?.etaToSapDays??""}/></Field>

    <FormSection title="Compras y Orden de Compra"/>
    <Field label="Fecha de aviso"><input type="date" name="noticeDate" defaultValue={operation?.noticeDate||""}/></Field>
    <Field label="Fecha creación de OC"><input type="date" name="ocCreationDate" defaultValue={operation?.ocCreationDate||""}/></Field>
    <Field label="Envío novedad valor/cantidad"><input type="date" name="valueQuantitySentDate" defaultValue={operation?.valueQuantitySentDate||""}/></Field>
    <Field label="Fecha OC cuadrada"><input type="date" name="ocBalancedDate" defaultValue={operation?.ocBalancedDate||""}/></Field>
    <Field label="Aviso OC retenida"><input type="date" name="ocRetentionNoticeDate" defaultValue={operation?.ocRetentionNoticeDate||""}/></Field>
    <Field label="Liberación OC retenida"><input type="date" name="ocReleaseDate" defaultValue={operation?.ocReleaseDate||""}/></Field>
    <Field label="Aprobación 1"><input type="date" name="approval1Date" defaultValue={operation?.approval1Date||""}/></Field>
    <Field label="Aprobación 2"><input type="date" name="approval2Date" defaultValue={operation?.approval2Date||""}/></Field>
    <Field label="Aprobación 3 / final"><input type="date" name="approval3Date" defaultValue={operation?.approval3Date||""}/></Field>
    <Field label="Resultado creación OC"><select name="ocCompliance" defaultValue={operation?.ocCompliance||"PENDIENTE"}><option value="PENDIENTE">Pendiente</option><option value="CUMPLE">Cumple</option><option value="NO CUMPLE">No cumple</option></select></Field>
    <Field label="Observación OC" wide><textarea name="ocComplianceNotes" defaultValue={operation?.ocComplianceNotes||""} placeholder="Obligatoria si no cumple"/></Field>

    <FormSection title="Gestión In-House"/>
    <Field label="Envío a CXP"><input type="date" name="cxpSentDate" defaultValue={operation?.cxpSentDate||""}/></Field>
    <Field label="Registro CXP"><input type="date" name="cxpRegisteredDate" defaultValue={operation?.cxpRegisteredDate||""}/></Field>
    <Field label="Solicitud ingreso a bodega"><input type="date" name="warehouseEntryRequestedDate" defaultValue={operation?.warehouseEntryRequestedDate||""}/></Field>
    <Field label="Costo almacenaje USD"><input type="number" step="0.01" min="0" name="storageCostUsd" defaultValue={operation?operation.storageCostCents/100:""}/></Field>
    <Field label="Peso kg"><input type="number" min="0" name="weightKg" defaultValue={operation?.weightKg||""}/></Field>
    <Field label="Vía"><select name="transportMode" defaultValue={operation?.transportMode||""}><option value="">Seleccione</option><option value="AEREO">Aéreo</option><option value="MARITIMO">Marítimo</option><option value="TERRESTRE">Terrestre</option></select></Field>
    <Field label="Recepción documentos (aéreo)"><input type="datetime-local" name="documentsReceivedAt" defaultValue={operation?.documentsReceivedAt||""}/></Field>
    <Field label="Envío documentos a Ejecutivo"><input type="datetime-local" name="documentsSentExecutiveAt" defaultValue={operation?.documentsSentExecutiveAt||""}/></Field>

    <FormSection title="Financiero y Ejecutivo de Cuenta"/>
    <Field label="Solicitud de valores"><input type="date" name="valuesRequestedDate" defaultValue={operation?.valuesRequestedDate||""}/></Field>
    <Field label="Pago realizado por MACOBSA"><input type="date" name="macobsaPaymentDate" defaultValue={operation?.macobsaPaymentDate||""}/></Field>
    <Field label="Observaciones generales" wide><textarea name="notes" defaultValue={operation?.notes||""}/></Field>
  </div><footer><button type="button" onClick={onClose}>Cancelar</button><button className="une-primary">Guardar operación</button></footer></form></div>;
}

function FormSection({title}:{title:string}){return <h4 className="une-form-section">{title}</h4>}
function OperationsTable({rows,loading,onView,onEdit}:{rows:Operation[];loading:boolean;onView:(row:Operation)=>void;onEdit?: (row:Operation)=>void}){return <div className="une-table-wrap"><table><thead><tr><th>Orden de compra</th><th>Empresa</th><th>Proveedor / producto</th><th>ETA</th><th>Estado</th><th>Creación OC</th><th>Trámite</th><th>Acciones</th></tr></thead><tbody>{loading?<tr><td colSpan={8}>Cargando información…</td></tr>:rows.length?rows.map(row=><tr key={row.id}><td><strong>{row.purchaseOrder}</strong></td><td>{row.company}</td><td><strong>{row.supplier||"—"}</strong><small>{row.product||"Sin descripción"}</small></td><td>{formatDate(row.eta)}</td><td><span className={`une-status ${row.status.toLowerCase().replaceAll(" ","-")}`}>{statusLabel(row.status)}</span></td><td><span className={`une-status ${row.ocCompliance==="CUMPLE"?"finalizado":row.ocCompliance==="NO CUMPLE"?"cancelado":"planificado"}`}>{ocLabel(row.ocCompliance)}</span></td><td>{row.customsReference||"—"}</td><td><div className="une-row-actions"><button className="une-view" onClick={()=>onView(row)}><Eye/>Ver detalle</button>{onEdit&&<button className="une-edit" onClick={()=>onEdit(row)}>Editar</button>}</div></td></tr>):<tr><td colSpan={8}>No existen operaciones para este filtro.</td></tr>}</tbody></table></div>}
function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}){return <label className={wide?"wide":""}><span>{label}</span>{children}</label>}
function timeKpi(rows:Operation[],start:keyof Operation,end:keyof Operation,label:string,target:number){const values=rows.map(row=>businessDayDifference(String(row[start]||""),String(row[end]||""))).filter((value):value is number=>value!==null);return{label,target,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,compliance:values.length?values.filter(value=>value<=target).length/values.length*100:null,sample:values.length}}
function businessDayDifference(start:string,end:string){if(!start||!end)return null;const a=new Date(`${start}T00:00:00Z`),b=new Date(`${end}T00:00:00Z`);if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<a)return null;let result=0;for(let t=a.getTime()+86400000;t<=b.getTime();t+=86400000){const day=new Date(t).getUTCDay();if(day!==0&&day!==6)result+=1}return result}
function kpiValue(start:string|null,end:string|null,fallback:number|null){return start&&end?businessDayDifference(start,end):fallback}
function dateDiff(start:string,end:string){if(!start||!end)return null;return Math.round((new Date(`${end}T12:00:00Z`).getTime()-new Date(`${start}T12:00:00Z`).getTime())/86400000)}
function durationKpi(rows:Operation[],start:keyof Operation,end:keyof Operation,label:string,note:string){const values=rows.map(row=>dateDiff(String(row[start]||""),String(row[end]||""))).filter((value):value is number=>value!==null);return{label,note,value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,unit:"días",sample:values.length,compliance:null}}
function targetDurationKpi(rows:Operation[],start:keyof Operation,end:keyof Operation,label:string,note:string,passes:(value:number)=>boolean){const values=rows.map(row=>dateDiff(String(row[start]||""),String(row[end]||""))).filter((value):value is number=>value!==null);return{label,note,value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,unit:"días",sample:values.length,compliance:values.length?values.filter(passes).length/values.length*100:null}}
function costPerTmKpi(rows:Operation[]){const values=rows.filter(row=>row.storageCostCents>0&&row.weightKg>0).map(row=>(row.storageCostCents/100)/(row.weightKg/1000));return{label:"Costo de almacenaje / TM",note:"Pendiente de validación con Jessenia",value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,unit:"USD/TM",sample:values.length,compliance:null}}
function hoursKpi(rows:Operation[]){const values=rows.filter(row=>row.transportMode==="AEREO"&&row.documentsReceivedAt&&row.documentsSentExecutiveAt).map(row=>(new Date(row.documentsSentExecutiveAt).getTime()-new Date(row.documentsReceivedAt).getTime())/3600000).filter(value=>Number.isFinite(value));return{label:"Documentos aéreos → Ejecutivo",note:"Respuesta del equipo In-House",value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,unit:"horas",sample:values.length,compliance:null}}
function statusLabel(value:string){return ({"PLANIFICADO":"Planificado","EN CURSO":"En curso","EN ESPERA":"En espera","TRAMITADO":"Tramitado","FINALIZADO":"Finalizado","CANCELADO":"Cancelado"} as Record<string,string>)[value]||value}
function ocLabel(value:string){return value==="CUMPLE"?"Cumple":value==="NO CUMPLE"?"No cumple":"Pendiente"}
function formatDate(value:string|null){if(!value)return"—";return new Intl.DateTimeFormat("es-EC",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`))}
function formatDateTime(value:string|null){if(!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?"—":new Intl.DateTimeFormat("es-EC",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
function plainDays(value:number|null){return value===null?"Sin datos":`${value} días`}
function dayValue(value:number|null,target:number){return value===null?"Sin datos":`${value} días · ${value<=target?"CUMPLE":"NO CUMPLE"} (meta ≤ ${target})`}
function monthLabel(value:string){const [year,month]=value.split("-").map(Number);return new Intl.DateTimeFormat("es-EC",{month:"long",year:"numeric"}).format(new Date(Date.UTC(year,month-1,1))).replace(/^./,letter=>letter.toUpperCase())}

function sameCompany(actual:string,target:string){
  const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
  const aliases:Record<string,string>={"FADESA":"FADESA GYE","FADESA MANTA":"FADESA MANTA","FADESA MANTA ":"FADESA MANTA"};
  const a=normalize(actual);const b=normalize(target);return (aliases[a]||a)===(aliases[b]||b);
}

async function parseFadesaWorkbook(file:File){
  const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  if(!sheet)throw new Error("El archivo no tiene una hoja con datos.");
  const sourceRows=XLSX.utils.sheet_to_json<Record<string,unknown>>(sheet,{defval:"",raw:true});
  const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toUpperCase();
  const dateValue=(value:unknown)=>{
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return value.toISOString().slice(0,10);
    if(typeof value==="number"&&value>0){const parts=XLSX.SSF.parse_date_code(value);if(parts)return `${String(parts.y).padStart(4,"0")}-${String(parts.m).padStart(2,"0")}-${String(parts.d).padStart(2,"0")}`;}
    const raw=String(value??"").trim();if(!raw||/^N\/?A$/i.test(raw))return "";
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const match=raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(match)return `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;
    return "";
  };
  const clean=(value:unknown)=>value instanceof Date?dateValue(value):String(value??"").trim().replace(/\.0$/," ").trim();
  const aliases:Record<string,string>={"FADESA GYE":"FADESA GYE","FADESA MANTA":"FADESA MANTA","ECUABARNICES":"ECUABARNICES"};
  return sourceRows.flatMap(source=>{
    const row=new Map(Object.entries(source).map(([key,value])=>[normalize(key),value]));
    const get=(key:string)=>row.get(normalize(key))??"";
    const purchaseOrder=clean(get("OC FADESA"));if(!purchaseOrder)return [];
    const rawCompany=normalize(clean(get("EMPRESA")));const company=aliases[rawCompany];if(!company)return [];
    const extras = ([
      ["Bodega",clean(get("BODEGA"))],["Distrito",clean(get("DISTRITO"))],["Régimen",clean(get("REGIMEN"))],["Póliza",clean(get("POLIZA"))],
      ["Agente de carga",clean(get("NAVIERA-AGENTE DE CARGA"))],["Documento de embarque",clean(get("DOCUMENTO DE EMBARQUE"))],
      ["Documentos recibidos del proveedor",clean(get("DOCUMENTOS RECIBIDOS DEL PROVEEDOR"))],["Documentos enviados a digitación",clean(get("DOCUMENTOS ENVIADOS A DIGITAR"))],
      ["Refrendo",clean(get("No. REFRENDO"))],["Fecha refrendo",dateValue(get("FECHA DE REFRENDO2"))],["Salida autorizada DAI",dateValue(get("FECHA SALIDA AUTORIZADA DAI"))],
      ["Pago garantizado",dateValue(get("FECHA PAGO GARANTIZADO"))],["Primer envío a bodega",dateValue(get("1ER ENVIO A BODEGA"))],
      ["Instrucción de ingreso SAP",dateValue(get("SE INSTRUYE A BODEGA INGRESO EN SAP"))],["Almacenera",clean(get("ALMACENERA"))],
      ["Bultos",clean(get("CANT. DE BULTOS"))],["Peso kg",clean(get("PESO EN KG"))],["Canal de aforo",clean(get("CANAL DE AFORO"))],
    ] as [string, string][]).filter(([, value]) => Boolean(value));
    const novelty=clean(get("NOVEDADES"));
    const notes=["Tipo de matriz: aéreos y couriers.",novelty?`Novedades: ${novelty}`:"",extras.length?`Datos complementarios del archivo: ${extras.map(([label,value])=>`${label}: ${value}`).join(" · ")}`:"","Remitente de la matriz: Katherine Pluas, In-House Grupo UNE."].filter(Boolean).join("\n");
    return [{company,purchaseOrder,customsReference:clean(get("REF. MCB")),supplier:clean(get("PROVEEDOR")),product:clean(get("PRODUCTO")),status:normalize(clean(get("STATUS")))||"TRAMITADO",etd:dateValue(get("ETD")),eta:dateValue(get("ETA")),warehouseReceiptDate:dateValue(get("FECHA RECEPCION EN BODEGA")),sapEntryDate:dateValue(get("FECHA INGRESO A BODEGA SAP")),incoterm:clean(get("INCOTERM")),originCountry:clean(get("PAIS EMBARQUE")),loadingPort:clean(get("PTO EMBARQUE")),arrivalPort:clean(get("PUERTO LLEGADA")),cxpSentDate:dateValue(get("FECHA ENVIO ASOC CXP")),cxpRegisteredDate:dateValue(get("FECHA REGISTRO ASOC CXP")),notes}];
  });
}
