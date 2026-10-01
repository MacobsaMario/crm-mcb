"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  Network,
  Search,
  Share2,
  ShieldCheck,
  Ship,
  Users,
} from "lucide-react";
import {
  grupoPicaCutoff,
  grupoPicaOperations,
  grupoPicaSummary,
  grupoPicaSourceName,
  type GrupoPicaView,
} from "./grupo-pica-data";
import { PICA_REPORT_BASE64, PICA_REPORT_NAME, PICA_REPORT_SIZE } from "./grupo-pica-report";
import { validateGrupoPicaData } from "./grupo-pica-integrity";
import GrupoPicaCatalog from "./grupo-pica-catalog";

const views: GrupoPicaView[] = ["Consolidado", "PICA Plásticos", "PYCCA"];

function loadReportFile() {
  const binary = window.atob(PICA_REPORT_BASE64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
  if (bytes.byteLength !== PICA_REPORT_SIZE || signature !== "%PDF-") {
    throw new Error("El PDF no superó la validación interna. No se entregó un archivo vacío.");
  }
  return new File([bytes], PICA_REPORT_NAME, { type: "application/pdf" });
}

function formatDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function GrupoPicaDashboard({ onOpenLegal }: { onOpenLegal: () => void }) {
  const [moduleView, setModuleView] = useState<"dashboard" | "fomex" | "catalog">("dashboard");
  const [view, setView] = useState<GrupoPicaView>("Consolidado");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("Todos");
  const [visibleRows, setVisibleRows] = useState(25);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [delivering, setDelivering] = useState<"download" | "share" | null>(null);
  const summary = grupoPicaSummary[view];
  const integrity = useMemo(() => validateGrupoPicaData(), []);

  const operations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return grupoPicaOperations.filter((operation) => {
      if (view !== "Consolidado" && operation.society !== view) return false;
      if (stateFilter === "Activos" && !operation.generalState.toLocaleLowerCase("es").includes("activo")) return false;
      if (stateFilter === "Finalizados" && !operation.generalState.toLocaleLowerCase("es").includes("finalizado")) return false;
      if (!normalized) return true;
      return [operation.tramite, operation.society, operation.invoiceNumbers.join(" "), operation.state, operation.subheadings.join(" "), operation.productNames.join(" ")]
        .some((value) => value.toLocaleLowerCase("es").includes(normalized));
    });
  }, [query, stateFilter, view]);

  const activeOperations = useMemo(
    () => operations.filter((operation) => operation.generalState.toLocaleLowerCase("es").includes("activo")),
    [operations],
  );

  async function downloadReport() {
    setDelivering("download");
    setDeliveryMessage("");
    try {
      const file = loadReportFile();
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        setDeliveryMessage("En iPhone, seleccione “Guardar en Archivos” para conservar el PDF.");
        await navigator.share({ files: [file], title: "Guardar Dashboard Grupo PICA" });
        setDeliveryMessage("PDF entregado correctamente al destino seleccionado.");
        return;
      }
      const href = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = PICA_REPORT_NAME;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 3000);
      setDeliveryMessage("PDF descargado y validado. Revise la carpeta Descargas.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setDeliveryMessage("Se cerró el menú. Pulse nuevamente y elija “Guardar en Archivos”.");
      } else {
        setDeliveryMessage(error instanceof Error ? error.message : "No fue posible descargar el informe.");
      }
    } finally {
      setDelivering(null);
    }
  }

  async function shareReport() {
    setDelivering("share");
    setDeliveryMessage("");
    try {
      const file = loadReportFile();
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: "Dashboard Ejecutivo Grupo PICA" });
        setDeliveryMessage("Informe entregado a la opción seleccionada.");
        return;
      }
      const href = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = PICA_REPORT_NAME;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 3000);
      setDeliveryMessage("Este dispositivo no ofrece Compartir; el PDF fue descargado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setDeliveryMessage("Se cerró Compartir. Puede intentarlo nuevamente.");
      } else {
        setDeliveryMessage(error instanceof Error ? error.message : "No fue posible compartir el informe.");
      }
    } finally {
      setDelivering(null);
    }
  }

  const timeCards = [
    ["Creación → refrendo", summary.times.creationToRefrendo],
    ["Llegada → refrendo", summary.times.arrivalToRefrendo],
    ["Refrendo → salida", summary.times.refrendoToExit],
    ["Llegada → salida", summary.times.arrivalToExit],
  ] as const;
  const aforos = [
    ["Automático", summary.aforos.automatic, "automatic"],
    ["Físico", summary.aforos.physical, "physical"],
    ["Documental", summary.aforos.documentary, "documentary"],
    ["Canales múltiples", summary.aforos.multiple, "multiple"],
    ["Sin canal informado", summary.aforos.missing, "missing"],
  ] as const;

  const directionTeam = [
    ["Directora de Operaciones", "Vanessa Naranjo"],
    ["Directora de Despacho", "María Fernanda Manrique"],
    ["Directora de Regulatorio", "Lilibeth Terranova"],
    ["Director de Finanzas", "Bryan Quinde"],
  ] as const;
  const specialistTeam = [
    ["Estudio Jurídico", "Abg. Daniela Buraye"],
    ["Clasificación Arancelaria", "Francisco Anastacio"],
  ] as const;
  const pyccaTeam = [
    ["Ejecutiva de Cuenta — PYCCA", "Noemí Galán"],
    ["Ejecutivo In House", "Estefany Andrade"],
    ["Ejecutivo In House", "Karla Gonzalez"],
  ] as const;

  return (
    <section className="section-body pica-dashboard-page">
      <nav className="pica-module-switch" aria-label="Opciones de Grupo PICA">
        <button type="button" className={moduleView === "dashboard" ? "active" : ""} onClick={() => setModuleView("dashboard")}>
          <Gauge size={18}/> Dashboard Ejecutivo
        </button>
        <button type="button" className={moduleView === "fomex" ? "active" : ""} onClick={() => setModuleView("fomex")}>
          <Network size={18}/> Equipo asignado PYCCA
        </button>
        <button type="button" className={moduleView === "catalog" ? "active" : ""} onClick={() => setModuleView("catalog")}>
          <Search size={18}/> Subpartidas / Data Entry
        </button>
      </nav>

      {moduleView === "catalog" ? <GrupoPicaCatalog/> : moduleView === "fomex" ? (
        <>
          <div className="pica-hero fomex-hero">
            <div>
              <span>EQUIPO ASIGNADO · GRUPO PICA</span>
              <h2>Equipo asignado PYCCA</h2>
              <p>Equipo matriz, jefatura y personal in house dedicado.</p>
            </div>
            <a className="pica-download fomex-download" href="/reports/Estructura_Cuenta_PYCCA_FOMEX.pptx" download>
              <Download size={18}/> DESCARGAR POWERPOINT
            </a>
          </div>

          <article className="panel fomex-structure-panel">
            <div className="panel-head">
              <h3>Organización del servicio</h3>
              <span>Vista interna del CRM · Fuente: estructura validada</span>
            </div>

            <div className="fomex-account-root">
              <Building2 size={24}/>
              <span>Cuenta atendida</span>
              <strong>PYCCA S.A. · Grupo PICA</strong>
              <small>Coordinación integral MACOBSA para la cuenta</small>
            </div>

            <div className="fomex-org-section">
              <div className="fomex-section-label"><Users size={18}/><span>Dirección matriz</span></div>
              <div className="fomex-role-grid directors">
                {directionTeam.map(([role, name]) => <article key={role}><span>{role}</span><strong>{name}</strong></article>)}
              </div>
            </div>

            <div className="fomex-org-section">
              <div className="fomex-section-label"><Network size={18}/><span>Apoyo especializado</span></div>
              <div className="fomex-role-grid specialists">
                {specialistTeam.map(([role, name]) => <article key={role}><span>{role}</span><strong>{name}</strong></article>)}
              </div>
            </div>

            <div className="fomex-org-section">
              <div className="fomex-section-label"><Building2 size={18}/><span>Equipo dedicado PYCCA</span></div>
              <div className="fomex-role-grid pycca">
                {pyccaTeam.map(([role, name]) => <article key={`${role}-${name}`}><span>{role}</span><strong>{name}</strong></article>)}
              </div>
            </div>
          </article>

          <div className="fomex-source-note">
            <FileText size={18}/>
            <p><strong>Documento fuente disponible.</strong><span>La presentación original de 2 páginas permanece descargable para réplica, presentación o archivo.</span></p>
          </div>

          <footer className="pica-confidential-footer">
            Información para fines del importador | Autor: MACOBSA | Información confidencial – uso exclusivo de Grupo PICA
          </footer>
        </>
      ) : (
      <>
      <div className={`pica-integrity-banner ${integrity.ok ? "verified" : "blocked"}`} role="status">
        {integrity.ok ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
        <div>
          <strong>{integrity.ok ? "Corte operativo cotejado y reconciliado" : "Corte bloqueado por inconsistencias"}</strong>
          <span>{integrity.checkedRows} operaciones · {integrity.checksPassed} controles estructurales aprobados · fuente limitada al corte del 25-sep-2026.</span>
        </div>
      </div>
      <div className="pica-hero">
        <div>
          <span>CONTROL ADUANERO 2026 · FUENTE MAESTRA</span>
          <h2>Dashboard Ejecutivo Grupo PICA</h2>
          <p>PICA Plásticos Industriales C.A. · PYCCA S.A. · Corte: {grupoPicaCutoff}</p>
        </div>
        <div className="pica-report-actions">
          <button type="button" className="pica-share" onClick={onOpenLegal}><ShieldCheck size={18}/> INTELIGENCIA LEGAL / ADUANERA</button>
          <button type="button" className="pica-download" onClick={downloadReport} disabled={delivering !== null}>
            <Download size={18} /> {delivering === "download" ? "DESCARGANDO…" : "DESCARGAR PDF"}
          </button>
          <button type="button" className="pica-share" onClick={shareReport} disabled={delivering !== null}>
            <Share2 size={18} /> {delivering === "share" ? "ABRIENDO…" : "COMPARTIR INFORME"}
          </button>
          <small>En iPhone, “Descargar PDF” abre el menú del sistema: elija “Guardar en Archivos”.</small>
        </div>
      </div>
      {deliveryMessage && <div className="pica-delivery-message" role="status">{deliveryMessage}</div>}

      <div className={`pica-integrity-banner ${integrity.ok ? "verified" : "blocked"}`} role="status">
        {integrity.ok ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
        <div>
          <strong>{integrity.ok ? "Fuente maestra cotejada y reconciliada" : "Corte bloqueado por inconsistencias"}</strong>
          <span>{summary.created} trámites únicos · {summary.itemRows.toLocaleString("es-EC")} renglones de ítems · {grupoPicaSourceName}. {summary.dateConflictCount} trámites con campos de fecha contradictorios en origen.</span>
        </div>
      </div>

      {integrity.warnings.length > 0 && <div className="pica-integrity-warning" role="status"><AlertTriangle size={20}/><div><strong>Revisión de fechas pendiente</strong><span>{integrity.warnings.join(" · ")}</span></div></div>}

      <div className="pica-view-tabs" role="tablist" aria-label="Sociedad Grupo PICA">
        {views.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            className={view === item ? "active" : ""}
            onClick={() => { setView(item); setVisibleRows(25); }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="pica-kpi-grid">
        <article><FileText/><span>Trámites únicos</span><strong>{summary.created}</strong><small>{summary.itemRows.toLocaleString("es-EC")} líneas de productos / ítems</small></article>
        <article><CheckCircle2/><span>Refrendados</span><strong>{summary.refrendados}</strong><small>Declaraciones con refrendo informado</small></article>
        <article><Gauge/><span>Finalizados</span><strong>{summary.finished}</strong><small>{summary.closureRate}% sobre creados</small></article>
        <article className="alert"><AlertTriangle/><span>Activos</span><strong>{summary.active}</strong><small>Requieren seguimiento</small></article>
      </div>

      <article className="panel pica-transmission-panel">
        <div className="panel-head">
          <h3>Alcance verificado de esta fuente</h3>
          <span>Conteos por trámite único</span>
        </div>
        <div className="pica-transmission-grid">
          <div>
            <FileText size={20}/><span>Ítems registrados</span>
            <strong>{summary.itemRows.toLocaleString("es-EC")}</strong>
            <small>Cada fila representa un renglón de ítem; los KPI cuentan trámites únicos.</small>
          </div>
          <div>
            <ShieldCheck size={20}/><span>Canal de aforo observado</span>
            <strong>{summary.aforos.total - summary.aforos.missing} de {summary.aforos.total}</strong>
            <small>Se informa como aparece en la hoja maestra, no como predicción por producto.</small>
          </div>
          <div><AlertTriangle size={20}/><span>Datos no presentes en el maestro</span><strong>Sin validar</strong><small>Transporte, peso, proveedor, responsable, garantía y modalidad requieren fuente propia.</small></div>
        </div>
        <div className="pica-transmission-note">
          Este archivo no permite confirmar requisitos de transmisión, cupo de garantía ni despacho anticipado. Consulte el módulo de inteligencia legal y la evidencia oficial SENAE antes de registrar una conclusión.
        </div>
      </article>

      <div className="pica-two-column">
        <article className="panel pica-times-panel">
          <div className="panel-head"><h3>Tiempos operativos observados</h3><span>Solo fechas válidas · 0 a 365 días</span></div>
          <div className="pica-time-grid">
            {timeCards.map(([label, metric]) => (
              <div key={label}>
                <Clock3 size={18}/><span>{label}</span><strong>{metric.average} días</strong>
                <small>Mediana {metric.median} · {metric.cases} casos</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel pica-aforo-panel">
          <div className="panel-head"><h3>Canal de aforo</h3><span>{summary.aforos.total} refrendados</span></div>
          <div className="pica-aforo-list">
            {aforos.map(([label, value, className]) => {
              const percentage = summary.aforos.total ? (value / summary.aforos.total) * 100 : 0;
              return <div key={label} className={className}>
                <span>{label}</span><strong>{value} · {percentage.toFixed(1)}%</strong>
                <i><b style={{ width: `${percentage}%` }}/></i>
              </div>;
            })}
          </div>
        </article>
      </div>

      <article className="panel pica-alerts-panel">
        <div className="panel-head"><h3>Alertas y conciliación</h3><span>Lectura automática del archivo 2026</span></div>
        <div className="pica-alert-list">
          <div className="critical"><AlertTriangle/><p><strong>{summary.active} trámites activos</strong><span>{activeOperations.slice(0, 4).map((item) => item.tramite).join(" · ")}{summary.active > 4 ? " · …" : ""}</span></p></div>
          <div className="warning"><AlertTriangle/><p><strong>{summary.aforos.missing} refrendados sin canal de aforo informado</strong><span>La cobertura del dato es {((summary.aforos.total - summary.aforos.missing) * 100 / Math.max(summary.aforos.total, 1)).toFixed(1)}%.</span></p></div>
          <div className="warning"><Clock3/><p><strong>{summary.oldActiveTramites.length} activos con 15 días o más desde su creación</strong><span>{summary.oldActiveTramites.length ? summary.oldActiveTramites.join(" · ") : "No existen casos para esta vista."}</span></p></div>
          <div className="info"><Ship/><p><strong>Resumen transaccional por sociedad</strong><span>PICA Plásticos: 312 trámites, 2.966 ítems. PYCCA: 148 trámites, 7.892 ítems. El total de ítems nunca se presenta como cantidad de trámites.</span></p></div>
        </div>
      </article>

      <article className="panel pica-detail-panel">
        <div className="panel-head"><h3>Detalle de trámites</h3><span>{operations.length} trámites encontrados</span></div>
        <div className="pica-detail-filters">
          <label><Search size={17}/><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleRows(25); }} placeholder="Trámite, factura, producto o subpartida"/></label>
          <select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setVisibleRows(25); }} aria-label="Filtrar por estado">
            <option>Todos</option><option>Activos</option><option>Finalizados</option>
          </select>
        </div>
        <div className="table-wrap pica-table-wrap">
          <table>
            <thead><tr><th>Trámite</th><th>Sociedad</th><th>Estado</th><th>Factura(s)</th><th>Ítems / productos y subpartidas</th><th>Creación</th><th>Llegada</th><th>Refrendo</th><th>Aforo observado</th><th>Salida autorizada</th><th>Finalizado</th></tr></thead>
            <tbody>
              {operations.slice(0, visibleRows).map((operation) => (
                <tr key={`${operation.tramite}-${operation.society}`}>
                  <td><strong>{operation.tramite}</strong><small>{operation.itemCount} líneas de ítems</small></td>
                  <td>{operation.society}</td>
                  <td><span className={`pica-state ${operation.generalState.toLocaleLowerCase("es").includes("activo") ? "active" : "finished"}`}>{operation.state}</span></td>
                  <td>{operation.invoiceNumbers.join(" · ") || "—"}</td>
                  <td><strong>{operation.productNames.slice(0,3).join(" · ") || "Nombre comercial no informado"}</strong><small>{operation.subheadings.join(" · ") || "Subpartida no informada"}{operation.productNameCount > 3 ? ` · +${operation.productNameCount - 3} nombres de producto` : ""}</small></td>
                  <td>{formatDate(operation.creationDate)}</td>
                  <td>{formatDate(operation.arrivalDate)}</td>
                  <td><strong>{operation.refrendoNumbers.join(" · ") || "—"}</strong><small>{formatDate(operation.refrendoDate)}</small></td>
                  <td>{operation.aforo}</td>
                  <td>{formatDate(operation.exitDate)}</td>
                  <td>{formatDate(operation.finishedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleRows < operations.length && <button type="button" className="pica-more" onClick={() => setVisibleRows((value) => value + 25)}>Mostrar 25 operaciones más</button>}
      </article>

      <footer className="pica-confidential-footer">
        Información para fines del importador | Autor: MACOBSA | Información confidencial – uso exclusivo de Grupo PICA
      </footer>
      </>
      )}
    </section>
  );
}
