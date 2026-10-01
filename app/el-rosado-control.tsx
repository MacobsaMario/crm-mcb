"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FileSpreadsheet,
  Search,
  Ship,
  Upload,
  Users,
} from "lucide-react";

type Operation = {
  id: number;
  operationKey: string;
  operation: string;
  society: string;
  supplier: string;
  responsible: string;
  receivedAt: string;
  checklistAt: string;
  davSentAt: string;
  arrivalAt: string;
  davApprovedAt: string;
  transmittedAt: string;
  authorizedExitAt: string;
  pickupAt: string;
  ecasExpiresAt: string;
  containers: string;
  customsStatus: string;
  observations: string;
  documentsCompleteAt: string;
  delivered: boolean;
  source: string;
  updatedAt: string;
};

type ImportRow = Omit<Operation, "id" | "operationKey" | "source" | "updatedAt">;
type View = "panel" | "operations" | "team" | "import";

const SOCIETIES = ["Corp El Rosado", "Tricomnor", "Restaunsa", "Supercines"];
const FIELD_HEADERS: Record<keyof ImportRow, string[]> = {
  operation: ["operacion/consolidado", "operacion", "orden"],
  society: ["razon social", "sociedad"],
  supplier: ["proveedor", "proveedor/consolidado"],
  responsible: ["responsable"],
  receivedAt: ["f/recepcion de tramite", "f/recepcion tramite/dai", "fecha recepcion"],
  checklistAt: ["f/check list", "fecha checklist"],
  davSentAt: ["f/envio dav/pre-liq", "fecha envio dav"],
  arrivalAt: ["fecha arribo a puerto", "fecha arribo"],
  davApprovedAt: ["fecha dav ok"],
  transmittedAt: ["f/ transmision", "f/ de transmision", "fecha transmision"],
  authorizedExitAt: ["salida autorizada", "fecha salida autorizada"],
  pickupAt: ["fecha de retiro", "fecha retiro"],
  ecasExpiresAt: ["vigencia ecas", "fecha vigencia ecas"],
  containers: ["contenedores"],
  customsStatus: ["estado por nacionalizar", "estado en aduana", "estado"],
  observations: ["observaciones"],
  documentsCompleteAt: ["f/ documentacion completa", "fecha documentacion completa"],
  delivered: [],
};

const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
const operationKey = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
const parseDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw || ["-", "--", "n/a", "na"].includes(raw.toLowerCase())) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoPrefix = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};
const dateFields = new Set<keyof ImportRow>([
  "receivedAt", "checklistAt", "davSentAt", "arrivalAt", "davApprovedAt", "transmittedAt",
  "authorizedExitAt", "pickupAt", "ecasExpiresAt", "documentsCompleteAt",
]);
const canonicalSociety = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const found = SOCIETIES.find((society) => normalize(society) === normalize(raw));
  if (normalize(raw) === "corp el rosado" || normalize(raw) === "corporacion el rosado") return "Corp El Rosado";
  return found || raw || "Corp El Rosado";
};
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
const days = (from: string, to: string) => Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000);
const businessDays = (from: string, to: string) => {
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  let count = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (![0, 6].includes(cursor.getUTCDay())) count += 1;
  }
  return count;
};
const fmt = (value: string) => value ? new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "—";
const isRetired = (item: Operation) => Boolean(item.delivered || (item.pickupAt && item.pickupAt < today()));

function metric(list: Operation[], calc: (item: Operation) => boolean | null) {
  const applicable = list.map(calc).filter((value): value is boolean => value !== null);
  const compliant = applicable.filter(Boolean).length;
  return { compliant, total: applicable.length, pct: applicable.length ? compliant / applicable.length * 100 : null };
}

function MetricCard({ label, note, value }: { label: string; note: string; value: ReturnType<typeof metric> }) {
  const tone = value.pct === null ? "neutral" : value.pct >= 90 ? "good" : value.pct >= 75 ? "watch" : "bad";
  return <article className={`rosado-metric ${tone}`}>
    <strong>{value.pct === null ? "—" : `${value.pct.toFixed(1)}%`}</strong>
    <span>{label}</span>
    <small>{value.total ? `${value.compliant} de ${value.total} medibles` : "Sin datos medibles"} · {note}</small>
  </article>;
}

export default function ElRosadoControl({ canManage }: { canManage: boolean }) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [view, setView] = useState<View>("panel");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [society, setSociety] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/inhouse/control", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible cargar el control");
      setOperations(data.operations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar el control");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active && document.visibilityState === "visible") void load(false);
    };
    void load();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const metrics = useMemo(() => ({
    checklist: metric(operations, (item) => item.receivedAt && item.checklistAt ? businessDays(item.receivedAt, item.checklistAt) <= 1 : null),
    dav: metric(operations, (item) => item.arrivalAt && item.davSentAt ? days(item.davSentAt, item.arrivalAt) >= 3 : null),
    anticipated: metric(operations, (item) => item.arrivalAt && item.transmittedAt ? item.transmittedAt <= item.arrivalAt : null),
    pickup: metric(operations, (item) => item.authorizedExitAt && item.pickupAt ? days(item.authorizedExitAt, item.pickupAt) >= 0 && days(item.authorizedExitAt, item.pickupAt) <= 5 : null),
  }), [operations]);

  const active = useMemo(() => operations.filter((item) => !isRetired(item)), [operations]);
  const customsBottlenecks = active.filter((item) => item.arrivalAt && item.arrivalAt < today() && !item.authorizedExitAt && days(item.arrivalAt, today()) > 7);
  const pickupRisks = active.filter((item) => item.authorizedExitAt && !item.pickupAt && days(item.authorizedExitAt, today()) > 5);
  const monthPrefix = today().slice(0, 7);
  const receivedMonth = operations.filter((item) => item.receivedAt.startsWith(monthPrefix)).length;
  const transmittedMonth = operations.filter((item) => item.transmittedAt.startsWith(monthPrefix)).length;

  const filtered = operations.filter((item) => {
    const needle = search.trim().toLowerCase();
    const matches = !needle || [item.operation, item.supplier, item.responsible].some((value) => value.toLowerCase().includes(needle));
    return matches && (!society || item.society === society) && (!activeOnly || !isRetired(item));
  });

  const team = useMemo(() => {
    const names = [...new Set(operations.map((item) => item.responsible || "Sin asignar"))];
    return names.map((name) => {
      const rows = operations.filter((item) => (item.responsible || "Sin asignar") === name);
      const checklist = metric(rows, (item) => item.receivedAt && item.checklistAt ? businessDays(item.receivedAt, item.checklistAt) <= 1 : null);
      return { name, total: rows.length, active: rows.filter((item) => !isRetired(item)).length, checklist: checklist.pct };
    }).sort((a, b) => b.active - a.active);
  }, [operations]);

  async function parseWorkbook(file: File) {
    setBusy(true);
    setMessage("Analizando y conciliando el archivo…");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheets = workbook.SheetNames.filter((name) => ["grupo el rosado", "entrega de cargas"].includes(normalize(name)));
      if (!sheets.length) throw new Error('No se encontraron las hojas "Grupo El Rosado" o "Entrega de cargas".');
      const merged = new Map<string, ImportRow>();
      for (const sheetName of sheets) {
        const deliveredSheet = normalize(sheetName) === "entrega de cargas";
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName], { header: 1, raw: false, dateNF: "yyyy-mm-dd", defval: "" });
        const header = (rows[0] || []).map(normalize);
        const index = Object.fromEntries(Object.entries(FIELD_HEADERS).map(([field, candidates]) => [field, candidates.map(normalize).map((candidate) => header.indexOf(candidate)).find((position) => position >= 0) ?? -1]));
        for (const cells of rows.slice(1)) {
          const operation = String(cells[index.operation] ?? "").trim().replace(/\s+/g, " ");
          const opKey = operationKey(operation);
          if (!opKey || ["OPERACION", "OPERACION/CONSOLIDADO", "ORDEN"].includes(opKey)) continue;
          const current = merged.get(opKey) || {
            operation, society: "Corp El Rosado", supplier: "", responsible: "", receivedAt: "", checklistAt: "", davSentAt: "", arrivalAt: "", davApprovedAt: "", transmittedAt: "", authorizedExitAt: "", pickupAt: "", ecasExpiresAt: "", containers: "", customsStatus: "", observations: "", documentsCompleteAt: "", delivered: false,
          };
          for (const field of Object.keys(FIELD_HEADERS) as (keyof ImportRow)[]) {
            if (field === "delivered" || index[field] < 0) continue;
            const raw = cells[index[field]];
            const value = dateFields.has(field) ? parseDate(raw) : String(raw ?? "").trim();
            if (!value) continue;
            if (field === "society") current.society = canonicalSociety(value);
            else (current as unknown as Record<string, unknown>)[field] = value;
          }
          current.delivered = current.delivered || deliveredSheet;
          merged.set(opKey, current);
        }
      }
      const rows = [...merged.values()];
      if (!rows.length) throw new Error("El archivo no contiene operaciones reconocibles.");
      const response = await fetch("/api/inhouse/control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows, source: file.name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible importar el archivo");
      setMessage(`${data.imported} trámites conciliados: ${data.created} nuevos y ${data.updated} actualizados.`);
      setView("panel");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible importar el archivo");
    } finally {
      setBusy(false);
    }
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = operations.map((item) => ({
      Operación: item.operation, Sociedad: item.society, Proveedor: item.supplier, Responsable: item.responsible,
      Recepción: item.receivedAt, Checklist: item.checklistAt, "Envío DAV": item.davSentAt, Arribo: item.arrivalAt,
      "DAV aprobada": item.davApprovedAt, Transmisión: item.transmittedAt, "Salida autorizada": item.authorizedExitAt,
      Retiro: item.pickupAt, "Vigencia ECAS": item.ecasExpiresAt, Contenedores: item.containers,
      "Estado aduana": item.customsStatus, Observaciones: item.observations,
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Control El Rosado");
    XLSX.writeFile(book, `Control_Grupo_El_Rosado_${today()}.xlsx`);
  }

  return <div className="rosado-control">
    <div className="rosado-control-head">
      <div>
        <strong>Control operativo completo</strong>
        <span>Información viva desde la base del CRM · última conciliación por operación</span>
      </div>
      <button type="button" className="secondary-action" onClick={() => void exportExcel()} disabled={!operations.length}><Download size={16}/> Descargar Excel</button>
    </div>
    <div className="rosado-tabs" role="tablist">
      {([[
        "panel", "Panel", ClipboardList,
      ], ["operations", "Trámites", Ship], ["team", "Evaluación equipo", Users], ["import", "Actualizar Excel", Upload]] as [View, string, typeof ClipboardList][]).map(([key, label, Icon]) =>
        <button type="button" key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}><Icon size={16}/>{label}</button>
      )}
    </div>
    {message && <div className="rosado-message"><CheckCircle2 size={17}/><span>{message}</span></div>}
    {loading ? <div className="empty-state"><Clock3 size={28}/><strong>Cargando control de El Rosado…</strong></div> : view === "panel" ? <>
      <div className="rosado-summary">
        <article><ClipboardList/><span>Trámites totales</span><strong>{operations.length}</strong><small>{operations.length - active.length} retirados</small></article>
        <article><Clock3/><span>En curso</span><strong>{active.length}</strong><small>operación activa</small></article>
        <article className={customsBottlenecks.length ? "risk" : "ok"}><AlertTriangle/><span>Cuellos aduaneros</span><strong>{customsBottlenecks.length}</strong><small>más de 7 días sin salida</small></article>
        <article className={pickupRisks.length ? "risk" : "ok"}><Ship/><span>Riesgo de retiro</span><strong>{pickupRisks.length}</strong><small>más de 5 días con salida</small></article>
      </div>
      <div className="rosado-month"><span>Este mes</span><b>{receivedMonth} recepcionados</b><b>{transmittedMonth} transmitidos</b></div>
      <div className="rosado-metrics">
        <MetricCard label="Checklist" note="≤ 1 día hábil" value={metrics.checklist}/>
        <MetricCard label="Envío DAV" note="≥ 3 días antes del arribo" value={metrics.dav}/>
        <MetricCard label="Despacho anticipado" note="transmisión a más tardar al arribo" value={metrics.anticipated}/>
        <MetricCard label="Retiro" note="≤ 5 días calendario" value={metrics.pickup}/>
      </div>
      {(customsBottlenecks.length > 0 || pickupRisks.length > 0) && <div className="rosado-alert-grid">
        <div className="panel"><h3>Cuellos de botella aduaneros</h3>{customsBottlenecks.slice(0, 8).map((item) => <p key={item.id}><b>{item.operation}</b><span>{days(item.arrivalAt, today())} días · {item.customsStatus || "sin causa registrada"}</span></p>)}</div>
        <div className="panel"><h3>Riesgo de sobreestadía o bodegaje</h3>{pickupRisks.slice(0, 8).map((item) => <p key={item.id}><b>{item.operation}</b><span>{days(item.authorizedExitAt, today())} días desde salida autorizada</span></p>)}</div>
      </div>}
      {!operations.length && <div className="empty-state"><FileSpreadsheet size={30}/><strong>Control listo para recibir la fuente vigente</strong><span>Importe el archivo ESTATUS GRUPO EL ROSADO.xlsx para crear el primer corte operativo.</span></div>}
    </> : view === "operations" ? <>
      <div className="rosado-filters"><label><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar operación, proveedor o responsable"/></label><select value={society} onChange={(event) => setSociety(event.target.value)}><option value="">Todas las sociedades</option>{SOCIETIES.map((item) => <option key={item}>{item}</option>)}</select><label className="check"><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)}/> Solo activos</label></div>
      <div className="table-scroll rosado-table"><table><thead><tr><th>Operación</th><th>Sociedad</th><th>Proveedor</th><th>Responsable</th><th>Arribo</th><th>Transmisión</th><th>Salida</th><th>Retiro</th><th>Etapa</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.operation}</strong></td><td>{item.society}</td><td>{item.supplier || "—"}</td><td>{item.responsible || "—"}</td><td>{fmt(item.arrivalAt)}</td><td>{fmt(item.transmittedAt)}</td><td>{fmt(item.authorizedExitAt)}</td><td>{fmt(item.pickupAt)}</td><td><span className={`rosado-stage ${isRetired(item) ? "done" : "active"}`}>{isRetired(item) ? "Retirado" : item.authorizedExitAt ? "Salida autorizada" : item.transmittedAt ? "Transmitido" : item.arrivalAt && item.arrivalAt <= today() ? "Arribado" : "Por arribar"}</span></td></tr>)}</tbody></table></div>
    </> : view === "team" ? <div className="table-scroll rosado-team"><table><thead><tr><th>Responsable</th><th>Total</th><th>Activos</th><th>Checklist en meta</th></tr></thead><tbody>{team.map((item) => <tr key={item.name}><td><strong>{item.name}</strong></td><td>{item.total}</td><td>{item.active}</td><td>{item.checklist === null ? "—" : `${item.checklist.toFixed(1)}%`}</td></tr>)}</tbody></table></div> : <div className="rosado-import panel">
      <FileSpreadsheet size={34}/><h3>Actualizar desde ESTATUS GRUPO EL ROSADO.xlsx</h3><p>Lee las hojas <b>Grupo El Rosado</b> y <b>Entrega de cargas</b>. La operación identifica cada trámite: los existentes se actualizan y los nuevos se agregan sin duplicarse. Los campos vacíos no borran información ya registrada.</p>
      {canManage ? <label className={`primary file-import ${busy ? "disabled" : ""}`}><Upload size={17}/>{busy ? "Procesando…" : "Seleccionar archivo Excel"}<input type="file" accept=".xlsx,.xls" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void parseWorkbook(file); event.currentTarget.value = ""; }}/></label> : <div className="data-note">Su perfil puede consultar el control, pero no reemplazar la fuente.</div>}
      <small>La carga registra archivo fuente, usuario y fecha. La información permanece protegida por los permisos del CRM.</small>
    </div>}
  </div>;
}
