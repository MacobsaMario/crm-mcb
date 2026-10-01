"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, CheckCircle2, ExternalLink, FileCheck2, FileSearch, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { internalDocumentMatrix, priorityProducts } from "./legal-pica-data";

const OFFICIAL = {
  tariff: "https://mesadeservicios.aduana.gob.ec/arancel/",
  guaranteedPayment: "https://www.aduana.gob.ec/servicios-para-oces/pago-garantizado/",
  prevalidation: "https://servicios.aduana.gob.ec/servicios/ui/consulta_pago_garantizado.xhtml",
  resolution2023: "https://www.aduana.gob.ec/gacnorm/data/2023/11/23/10/SENAE-SENAE-2023-0103-RE.pdf",
  resolution2025: "https://www.aduana.gob.ec/resolucion/senae-senae-2025-0054-re/",
  reform2025: "https://www.aduana.gob.ec/gacnorm/data/2025/10/31/15/SENAE-SENAE-2025-0114-RE.pdf",
  reformBulletin: "https://www.aduana.gob.ec/gaceta-boletin/entrada-en-vigencia-de-la-resolucion-nro-senae-senae-2025-0114-re-reforma-a-la-resolucion-nro-senae-senae-2025-0054-re-manual-general-de-garantias-aduaneras-generales/",
  copci: "https://www.aduana.gob.ec/la-institucion/codigo-organico-copci/",
  regulation: "https://www.aduana.gob.ec/la-institucion/reglamento-copci/",
  exportGuide: "https://www.aduana.gob.ec/servicio-al-ciudadano/para-exportar/",
  vue: "https://portal.aduana.gob.ec/",
};

type LegalRecord = {
  id: number;
  entityName: string;
  ruc: string;
  product: string;
  subheading: string;
  sourceLabel: string;
  sourceUrl: string;
  resultStatus: string;
  resultSummary: string;
  evidenceName: string;
  evidenceSha256: string;
  checkedByName: string;
  checkedAt: string;
};

const tabs = ["Productos PICA / PYCCA", "Normativa oficial", "Consultas registradas"] as const;

function fmtCount(value: number) {
  return new Intl.NumberFormat("es-EC").format(value);
}

export default function LegalNormativoIA() {
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0]);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<LegalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ entityName: "", ruc: "", product: "", subheading: "", sourceLabel: "Arancel SENAE", sourceUrl: OFFICIAL.tariff, resultStatus: "Pendiente de revisión técnica", resultSummary: "" });
  const [evidence, setEvidence] = useState<File | null>(null);

  const visibleProducts = useMemo(() => {
    const q = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    return priorityProducts.filter((item) => !q || `${item.client} ${item.product} ${item.subheading} ${item.priority}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q));
  }, [query]);

  async function loadRecords() {
    setLoading(true);
    try {
      const response = await fetch("/api/legal-consultations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las consultas.");
      setRecords(data.consultations ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las consultas.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadRecords(); }, []);

  async function submitConsultation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!evidence) { setError("Adjunte la captura o el PDF original de la consulta oficial."); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.set(key, value));
      payload.set("evidence", evidence);
      const response = await fetch("/api/legal-consultations", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el registro.");
      setMessage(`Consulta registrada con evidencia y huella digital ${data.consultation.evidenceSha256.slice(0, 16)}…`);
      setForm({ entityName: "", ruc: "", product: "", subheading: "", sourceLabel: "Arancel SENAE", sourceUrl: OFFICIAL.tariff, resultStatus: "Pendiente de revisión técnica", resultSummary: "" });
      setEvidence(null);
      const input = document.getElementById("legal-evidence") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadRecords();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el registro.");
    } finally { setSaving(false); }
  }

  return <section className="section-body legal-page">
    <div className="section-heading"><div><p>MACOBSA · CONTROL ADUANERO Y NORMATIVO</p><h2>LEGAL / NORMATIVO IA</h2><span>Fuentes oficiales, matriz prioritaria PICA / PYCCA y evidencia de cada consulta.</span></div></div>

    <div className="legal-status-banner"><ShieldCheck size={22}/><div><strong>Consulta humana en fuente oficial · evidencia auditable</strong><span>La consulta SENAE / VUE requiere identificación y verificación en el portal oficial. Aquí se conserva el resultado y su respaldo; el CRM no automatiza ni salta ese control.</span></div><a href={OFFICIAL.prevalidation} target="_blank" rel="noreferrer">Prevalidación SENAE <ExternalLink size={15}/></a></div>

    <div className="legal-kpi-grid">
      <article><BookOpenCheck/><span>Productos en matriz interna</span><strong>{priorityProducts.length}</strong><small>Catálogo de inteligencia, no fuente transaccional</small></article>
      <article><FileSearch/><span>Trámites en fuente maestra</span><strong>460</strong><small>312 PICA + 148 PYCCA · trámites únicos</small></article>
      <article><FileCheck2/><span>Consultas con evidencia</span><strong>{records.length}</strong><small>Registro de operador, fecha y huella SHA‑256</small></article>
      <article className="legal-kpi-warning"><AlertTriangle/><span>Clasificaciones aprobadas por IA</span><strong>0</strong><small>La IA no aprueba subpartidas ni permisos</small></article>
    </div>

    <div className="legal-tabs" role="tablist" aria-label="Legal / Normativo IA">
      {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}
    </div>

    {tab === "Productos PICA / PYCCA" && <>
      <div className="legal-matrix-note"><AlertTriangle size={20}/><p><strong>Los códigos y respaldos siguientes provienen de una matriz interna.</strong> Su presencia no confirma clasificación, permiso, requisito obligatorio ni vigencia. HDPE y Cestas / Organizadores quedan pendientes de conciliación del criterio de agrupación.</p></div>
      <label className="legal-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, producto, código o criterio"/></label>
      <div className="legal-product-list">{visibleProducts.map((item) => <article key={item.position} className="panel legal-product-card">
        <header><span>#{item.position} · {item.client}</span><span className="legal-unverified">{item.validationStatus}</span></header>
        <h3>{item.product}</h3>
        <div className="legal-product-facts"><div><small>Subpartida propuesta</small><strong>{item.subheading}</strong></div><div><small>Ítems en catálogo interno</small><strong>{fmtCount(item.catalogItems)}</strong></div><div><small>Aforo predominante del catálogo</small><strong>{item.catalogAforo}</strong></div><div><small>Prioridad declarada</small><strong>{item.priority}</strong></div></div>
        <div className="legal-observed-aforo"><strong>Aforo observado por código en la fuente maestra</strong><span>{item.observedAforoRowsBySubheading.rowCount ? `${fmtCount(item.observedAforoRowsBySubheading.automatic)} automáticos · ${fmtCount(item.observedAforoRowsBySubheading.documentary)} documentales · ${fmtCount(item.observedAforoRowsBySubheading.physical)} físicos` : "Sin coincidencia exacta de subpartida en la fuente maestra"}</span><small>Conteo de renglones que comparten el código; no demuestra que todos pertenezcan a este nombre comercial.</small></div>
        <div className="legal-product-docs"><strong>Texto de la matriz interna · pendiente de validar</strong><p>{item.documentsFromInternalMatrix}</p></div>
        <footer>{item.groupingStatus}</footer>
      </article>)}</div>
    </>}

    {tab === "Normativa oficial" && <div className="legal-content-grid">
      <div className="legal-source-list">
        <article className="panel legal-source-card"><span className="legal-source-status">MARCO ADUANERO · SENAE</span><h3>COPCI y Reglamento</h3><p>Acceso directo al Código Orgánico de la Producción, Comercio e Inversiones y al Reglamento al Título de Facilitación Aduanera publicados por SENAE. Verifique la reforma y vigencia aplicable a cada operación antes de emitir una conclusión.</p><a href={OFFICIAL.copci} target="_blank" rel="noreferrer">COPCI en SENAE <ExternalLink size={15}/></a><a href={OFFICIAL.regulation} target="_blank" rel="noreferrer">Reglamento COPCI en SENAE <ExternalLink size={15}/></a></article>
        <article className="panel legal-source-card"><span className="legal-source-status">EXPORTACIÓN · DAE</span><h3>Regularización de DAE</h3><p>SENAE establece que la DAE debe regularizarse dentro de los 30 días posteriores a la asociación del último documento de transporte. Este plazo corresponde a DAE de exportación; no debe aplicarse automáticamente a DAI ni a otros regímenes.</p><a href={OFFICIAL.exportGuide} target="_blank" rel="noreferrer">Proceso de exportación y regularización <ExternalLink size={15}/></a></article>
        <article className="panel legal-source-card"><span className="legal-source-status">SENAE · PORTAL OPERATIVO</span><h3>Despacho con pago garantizado</h3><p>SENAE publica los requisitos del beneficio y enlaza el procedimiento SENAE-SENAE-2023-0103-RE. La página consultada declara actualización en diciembre de 2025.</p><a href={OFFICIAL.guaranteedPayment} target="_blank" rel="noreferrer">Abrir requisitos oficiales <ExternalLink size={15}/></a><a href={OFFICIAL.prevalidation} target="_blank" rel="noreferrer">Abrir herramienta de prevalidación <ExternalLink size={15}/></a></article>
        <article className="panel legal-source-card"><span className="legal-source-status">RESOLUCIÓN SENAE-SENAE-2023-0103-RE</span><h3>Procedimiento de pago garantizado</h3><p>El PDF oficial establece la garantía general anual y el cálculo de cobertura del procedimiento. Cualquier elegibilidad debe contrastarse con la versión aplicable y el resultado actual de prevalidación del OCE.</p><a href={OFFICIAL.resolution2023} target="_blank" rel="noreferrer">Abrir resolución oficial <ExternalLink size={15}/></a><div className="legal-amount-callout"><strong>120% indicado en el texto de la resolución</strong><span>Verificar monto, saldo, plazo y aplicabilidad con SENAE antes de usarlo para un trámite.</span></div></article>
        <article className="panel legal-source-card"><span className="legal-source-status">MANUAL GENERAL · GARANTÍAS</span><h3>SENAE-SENAE-2025-0054-RE</h3><p>SENAE comunica su entrada en vigencia y publica el manual general de garantías aduaneras generales.</p><a href={OFFICIAL.resolution2025} target="_blank" rel="noreferrer">Ficha oficial SENAE <ExternalLink size={15}/></a></article>
        <article className="panel legal-source-card"><span className="legal-source-status">REFORMA VIGENTE · BOLETÍN SENAE 111-2025</span><h3>SENAE-SENAE-2025-0114-RE</h3><p>SENAE comunicó su entrada en vigencia el 31-oct-2025 como reforma del manual 2025-0054-RE. El aviso y el PDF oficial quedan enlazados.</p><a href={OFFICIAL.reformBulletin} target="_blank" rel="noreferrer">Aviso de vigencia <ExternalLink size={15}/></a><a href={OFFICIAL.reform2025} target="_blank" rel="noreferrer">PDF oficial <ExternalLink size={15}/></a></article>
      </div>
      <aside className="legal-source-aside"><article className="panel"><h3>Ruta de verificación por mercancía</h3><ol><li>Reunir ficha técnica, composición, función, presentación, marca y origen.</li><li>Consultar subpartida, tributos, restricciones y fechas en el Arancel SENAE.</li><li>Revisar requisitos en SENAE / VUE según el producto y la fecha de declaración.</li><li>Adjuntar la respuesta oficial y registrar quién consultó, cuándo y con qué fuente.</li></ol></article><a className="legal-official-link" href={OFFICIAL.tariff} target="_blank" rel="noreferrer"><ShieldCheck/><span><strong>Arancel y clasificación SENAE</strong><small>Consulta oficial de código, tributos y restricciones</small></span><ExternalLink/></a><a className="legal-official-link" href={OFFICIAL.vue} target="_blank" rel="noreferrer"><ExternalLink/><span><strong>ECUAPASS / VUE</strong><small>Portal oficial de comercio exterior</small></span><ExternalLink/></a><div className="legal-disclaimer"><strong>Fuentes consultadas al 29-sep-2026.</strong><span>La presencia de un documento oficial no sustituye revisar reformas posteriores, alcance por mercancía ni la respuesta vigente del SENAE para el RUC de la operación.</span></div></aside>
    </div>}

    {tab === "Consultas registradas" && <div className="legal-query-grid">
      <form className="panel legal-query-form" onSubmit={submitConsultation}>
        <div className="panel-head"><h3>Registrar consulta oficial</h3><span>Registro histórico · solo añadir</span></div>
        <p>Abra SENAE o VUE en su portal, complete allí el RUC y la verificación de seguridad, y adjunte la respuesta en PDF o captura. No escriba contraseñas ni códigos de verificación en este CRM.</p>
        <div className="legal-form-grid">
          <label>Importador / empresa<input required maxLength={180} value={form.entityName} onChange={(e) => setForm({...form,entityName:e.target.value})} placeholder="Nombre de la empresa"/></label>
          <label>RUC consultado<input required inputMode="numeric" maxLength={13} minLength={13} pattern="[0-9]{13}" value={form.ruc} onChange={(e) => setForm({...form,ruc:e.target.value.replace(/\D/g,"").slice(0,13)})} placeholder="13 dígitos"/></label>
          <label>Producto / trámite<input required maxLength={220} value={form.product} onChange={(e) => setForm({...form,product:e.target.value})} placeholder="Descripción o número de trámite"/></label>
          <label>Subpartida consultada<input value={form.subheading} maxLength={20} onChange={(e) => setForm({...form,subheading:e.target.value})} placeholder="Código si aplica"/></label>
          <label>Fuente oficial<select value={form.sourceLabel} onChange={(e) => { const sourceLabel=e.target.value; const sourceUrl=sourceLabel.includes("VUE") ? OFFICIAL.vue : sourceLabel.includes("Prevalidación") ? OFFICIAL.prevalidation : OFFICIAL.tariff; setForm({...form,sourceLabel,sourceUrl}); }}><option>Arancel SENAE</option><option>Prevalidación SENAE</option><option>VUE / ECUAPASS</option></select></label>
          <label>Resultado<select value={form.resultStatus} onChange={(e) => setForm({...form,resultStatus:e.target.value})}><option>Pendiente de revisión técnica</option><option>Coincide con expediente</option><option>Requiere corrección</option><option>Sin resultado concluyente</option></select></label>
          <label className="legal-wide">URL oficial consultada<input type="url" required value={form.sourceUrl} onChange={(e) => setForm({...form,sourceUrl:e.target.value})}/></label>
          <label className="legal-wide">Resultado observado<textarea required minLength={20} maxLength={3000} value={form.resultSummary} onChange={(e) => setForm({...form,resultSummary:e.target.value})} placeholder="Resumen fiel de la respuesta oficial, incluido el estado mostrado y cualquier observación."/></label>
          <label className="legal-wide legal-evidence-input">Captura o PDF oficial *<input id="legal-evidence" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required onChange={(e) => setEvidence(e.target.files?.[0] ?? null)}/><small>{evidence ? `${evidence.name} · ${fmtCount(evidence.size)} bytes` : "PDF, PNG o JPG · máximo 12 MB"}</small></label>
        </div>
        <button type="submit" className="primary" disabled={saving}><UploadCloud size={17}/>{saving ? "Guardando evidencia…" : "Registrar consulta y evidencia"}</button>
        {error && <div className="legal-feedback error" role="alert">{error}</div>}{message && <div className="legal-feedback success" role="status">{message}</div>}
      </form>
      <article className="panel legal-history-panel"><div className="panel-head"><h3>Historial de consultas</h3><button type="button" onClick={() => void loadRecords()} disabled={loading}>Actualizar</button></div>
        {loading ? <p className="legal-empty">Cargando registros…</p> : records.length ? <div className="legal-history-list">{records.map((record) => <article key={record.id}><header><strong>{record.entityName}</strong><span>{record.resultStatus}</span></header><p>{record.product}{record.subheading ? ` · ${record.subheading}` : ""}</p><small>RUC {record.ruc} · {new Date(record.checkedAt).toLocaleString("es-EC",{timeZone:"America/Guayaquil"})} · {record.checkedByName}</small><p className="legal-history-summary">{record.resultSummary}</p><div className="legal-history-evidence"><span>{record.evidenceName}</span><a href={`/api/legal-consultations/${record.id}/evidence`} target="_blank" rel="noreferrer">Abrir evidencia <ExternalLink size={14}/></a></div><small className="legal-hash">SHA-256: {record.evidenceSha256}</small></article>)}</div> : <p className="legal-empty">Todavía no hay consultas registradas con evidencia.</p>}
        <div className="legal-immutable-note"><CheckCircle2 size={16}/>Desde el CRM no se editan ni eliminan registros; una corrección se agrega como nueva consulta.</div>
      </article>
    </div>}

    <details className="panel legal-internal-matrix"><summary>Respaldos sugeridos por matriz interna · no confirmados como requisito legal</summary>{internalDocumentMatrix.map((row) => <article key={row.category}><strong>{row.category}</strong><span>{row.entity}</span><p>{row.documents}</p><small>{row.status}</small></article>)}</details>
  </section>;
}
