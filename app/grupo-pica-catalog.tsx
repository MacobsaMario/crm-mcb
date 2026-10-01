"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCopy, Database, Download, FilePlus2, Search, ShieldAlert } from "lucide-react";

type CatalogRow = {
  id: string;
  subheading: string;
  currentSubheading: string;
  commercialName: string;
  advPercent: number;
  fodinfaPercent: number;
  ivaPercent: number;
  restriction: string;
  observation: string;
  sourceRows: number[];
  societies: string[];
  observedItems: number;
  aforo: { automatic: number; documentary: number; physical: number; missing: number };
};

type CatalogResponse = {
  rows: CatalogRow[];
  total: number;
  page: number;
  pages: number;
  summary: {
    products: number;
    uniqueSubheadings: number;
    restricted: number;
    updatedSubheadings: number;
    observedItems: number;
  };
  source: { source: string; cutoff: string; duplicateAliasesConsolidated: number; warning: string };
};

const emptyResponse: CatalogResponse = {
  rows: [], total: 0, page: 1, pages: 1,
  summary: { products: 0, uniqueSubheadings: 0, restricted: 0, updatedSubheadings: 0, observedItems: 0 },
  source: { source: "", cutoff: "", duplicateAliasesConsolidated: 0, warning: "" },
};

function displaySubheading(value: string) {
  return value.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1.$2.$3.$4");
}

export default function GrupoPicaCatalog() {
  const [query, setQuery] = useState("");
  const [society, setSociety] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CatalogResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CatalogRow | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("q", query.trim());
      if (society) params.set("society", society);
      if (restricted) params.set("restricted", "1");
      if (updated) params.set("updated", "1");
      const response = await fetch(`/api/grupo-pica/catalog?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as CatalogResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible consultar el catálogo.");
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible consultar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [page, query, restricted, society, updated]);

  useEffect(() => { void load(); }, [load]);

  async function copyDraft() {
    if (!selected) return;
    const text = [
      `Cliente: ${selected.societies.join(" / ")}`,
      `Producto: ${selected.commercialName}`,
      `Subpartida histórica: ${displaySubheading(selected.subheading)}`,
      `Subpartida para revisión: ${displaySubheading(selected.currentSubheading)}`,
      `ADV: ${selected.advPercent}% | FODINFA: ${selected.fodinfaPercent}% | IVA: ${selected.ivaPercent}%`,
      `Restricción registrada: ${selected.restriction || "No registrada"}`,
      `Observación: ${selected.observation || "Sin observación"}`,
      "Estado: pendiente de validación oficial SENAE/VUE",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopyMessage("Ficha copiada. Puede pegarla en una consulta o revisión aduanera.");
  }

  return (
    <section className="pica-catalog-page">
      <div className="pica-hero pica-catalog-hero">
        <div>
          <span>CATÁLOGO HISTÓRICO · BASE PICA / PYCCA</span>
          <h2>Subpartidas y productos</h2>
          <p>Consulta inmediata y estructura preparada para el futuro Data Entry.</p>
        </div>
        <a className="pica-download fomex-download" href="/documents/Subpartidas_PICA_PYCCA_2026-09-29.xlsx" download>
          <Download size={18}/> DESCARGAR FUENTE
        </a>
      </div>

      <div className="pica-catalog-warning" role="status">
        <ShieldAlert size={22}/><p><strong>Control aduanero obligatorio.</strong><span>{data.source.warning || "Los datos deben confirmarse en SENAE y VUE antes de una declaración."}</span></p>
      </div>

      <div className="pica-catalog-kpis">
        <article><Database/><span>Productos únicos</span><strong>{data.summary.products.toLocaleString("es-EC")}</strong><small>50 duplicados de escritura consolidados</small></article>
        <article><Search/><span>Subpartidas</span><strong>{data.summary.uniqueSubheadings}</strong><small>Cobertura total de PICA y PYCCA</small></article>
        <article><ShieldAlert/><span>Con restricciones</span><strong>{data.summary.restricted}</strong><small>Según la fuente entregada</small></article>
        <article><FilePlus2/><span>Ítems observados</span><strong>{data.summary.observedItems.toLocaleString("es-EC")}</strong><small>PICA fábrica y PYCCA almacén</small></article>
      </div>

      <div className="pica-catalog-layout">
        <article className="panel pica-catalog-panel">
          <div className="panel-head"><h3>Buscar en el catálogo</h3><span>{loading ? "Consultando…" : `${data.total.toLocaleString("es-EC")} resultados`}</span></div>
          <div className="pica-catalog-filters">
            <label className="pica-catalog-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setPage(1); void load(); } }} placeholder="Producto, subpartida, restricción u observación"/></label>
            <select value={society} onChange={(event) => { setSociety(event.target.value); setPage(1); }} aria-label="Filtrar por empresa"><option value="">PICA y PYCCA</option><option value="PICA Plásticos">PICA fábrica</option><option value="PYCCA">PYCCA almacén</option></select>
            <label className="pica-catalog-check"><input type="checkbox" checked={restricted} onChange={(event) => { setRestricted(event.target.checked); setPage(1); }}/>Con restricciones</label>
            <label className="pica-catalog-check"><input type="checkbox" checked={updated} onChange={(event) => { setUpdated(event.target.checked); setPage(1); }}/>Con equivalencia vigente</label>
            <button type="button" onClick={() => { setPage(1); void load(); }}><Search size={16}/>Buscar</button>
          </div>
          {error && <p className="pica-catalog-error">{error}</p>}
          <div className="table-wrap pica-catalog-table-wrap">
            <table>
              <thead><tr><th>Producto / empresa</th><th>Subpartida</th><th>Tributos fuente</th><th>Restricción / observación</th><th>Uso observado</th><th>Data Entry</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6}>Consultando catálogo…</td></tr> : data.rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.commercialName}</strong><small>{row.societies.join(" · ")}</small></td>
                    <td><strong>{displaySubheading(row.currentSubheading)}</strong>{row.currentSubheading !== row.subheading && <small>Anterior: {displaySubheading(row.subheading)}</small>}</td>
                    <td><strong>ADV {row.advPercent}%</strong><small>FODINFA {row.fodinfaPercent}% · IVA {row.ivaPercent}%</small></td>
                    <td>{row.restriction ? <span className="pica-restriction">{row.restriction}</span> : <span>Sin restricción registrada</span>}<small>{row.observation || "Sin observación"}</small></td>
                    <td><strong>{row.observedItems.toLocaleString("es-EC")} ítems</strong><small>A: {row.aforo.automatic} · D: {row.aforo.documentary} · F: {row.aforo.physical}</small></td>
                    <td><button type="button" className="pica-prepare-entry" onClick={() => { setSelected(row); setCopyMessage(""); }}><FilePlus2 size={15}/>Preparar ficha</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pica-catalog-pagination"><button disabled={data.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {data.page} de {data.pages}</span><button disabled={data.page >= data.pages} onClick={() => setPage((value) => Math.min(data.pages, value + 1))}>Siguiente</button></div>
        </article>

        <aside className="panel pica-entry-preview">
          <div className="panel-head"><h3>Preparación Data Entry</h3><span>Vista previa</span></div>
          {selected ? <>
            <label>Empresa<input value={selected.societies.join(" / ")} readOnly/></label>
            <label>Nombre comercial<textarea value={selected.commercialName} readOnly/></label>
            <label>Subpartida para revisión<input value={displaySubheading(selected.currentSubheading)} readOnly/></label>
            <label>Restricción registrada<textarea value={selected.restriction || "No registrada"} readOnly/></label>
            <label>Observación<textarea value={selected.observation || "Sin observación"} readOnly/></label>
            <button type="button" onClick={copyDraft}><ClipboardCopy size={16}/>Copiar ficha</button>
            {copyMessage && <small className="pica-copy-message">{copyMessage}</small>}
            <p>Esta ficha facilita la revisión. El registro definitivo deberá guardar usuario, fecha, evidencia y validación SENAE/VUE.</p>
          </> : <div className="pica-entry-empty"><FilePlus2 size={30}/><strong>Seleccione “Preparar ficha”</strong><span>El producto quedará listo para copiar y revisar antes del futuro registro definitivo.</span></div>}
        </aside>
      </div>

      <footer className="pica-confidential-footer">Fuente: Subpartidas PICA PYCCA.xlsx · Corte operativo 25/09/2026 · Información confidencial de Grupo PICA</footer>
    </section>
  );
}
