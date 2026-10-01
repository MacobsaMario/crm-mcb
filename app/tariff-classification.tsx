"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, BookOpen, BrainCircuit, CheckCircle2, Clipboard, Download,
  ExternalLink, FileSearch, FileText, Layers3, Search, ShieldCheck,
} from "lucide-react";

const SENAE_ARANCEL_URL = "https://mesadeservicios.aduana.gob.ec/arancel/";
const TARIFF_PDF = "/documents/arancel-ecuador-comex-002-2023-reformado-2026-05-26.pdf";

const TARIFF_SECTIONS = [
  { roman: "I", chapters: "1–5", first: 1, last: 5, page: 13, title: "Animales vivos y productos del reino animal", keywords: "carne pescado leche miel animales" },
  { roman: "II", chapters: "6–14", first: 6, last: 14, page: 17, title: "Productos del reino vegetal", keywords: "plantas flores hortalizas frutas café cereales semillas" },
  { roman: "III", chapters: "15", first: 15, last: 15, page: 24, title: "Grasas, aceites y ceras", keywords: "animal vegetal microbiano grasas aceites" },
  { roman: "IV", chapters: "16–24", first: 16, last: 24, page: 25, title: "Alimentos, bebidas, tabaco y nicotina", keywords: "preparaciones cacao azúcar bebidas residuos tabaco" },
  { roman: "V", chapters: "25–27", first: 25, last: 27, page: 32, title: "Productos minerales", keywords: "sal azufre cemento minerales combustibles aceites" },
  { roman: "VI", chapters: "28–38", first: 28, last: 38, page: 37, title: "Industrias químicas y conexas", keywords: "químicos farmacéuticos abonos cosmética jabón explosivos" },
  { roman: "VII", chapters: "39–40", first: 39, last: 40, page: 52, title: "Plástico y caucho", keywords: "plástico caucho manufacturas" },
  { roman: "VIII", chapters: "41–43", first: 41, last: 43, page: 61, title: "Pieles, cueros y peletería", keywords: "cuero bolsos viaje talabartería" },
  { roman: "IX", chapters: "44–46", first: 44, last: 46, page: 64, title: "Madera, corcho y cestería", keywords: "madera carbón corcho espartería" },
  { roman: "X", chapters: "47–49", first: 47, last: 49, page: 66, title: "Pasta, papel, cartón y productos editoriales", keywords: "celulosa reciclaje impresos prensa planos" },
  { roman: "XI", chapters: "50–63", first: 50, last: 63, page: 77, title: "Materias textiles y manufacturas", keywords: "seda lana algodón fibras tejidos prendas alfombras" },
  { roman: "XII", chapters: "64–67", first: 64, last: 67, page: 90, title: "Calzado, tocados, paraguas y plumas", keywords: "zapatos sombreros bastones flores artificiales cabello" },
  { roman: "XIII", chapters: "68–70", first: 68, last: 70, page: 93, title: "Piedra, cemento, cerámica y vidrio", keywords: "yeso asbesto mica cerámica vidrio" },
  { roman: "XIV", chapters: "71", first: 71, last: 71, page: 95, title: "Perlas, piedras y metales preciosos", keywords: "joyería bisutería monedas oro plata" },
  { roman: "XV", chapters: "72–83", first: 72, last: 83, page: 101, title: "Metales comunes y sus manufacturas", keywords: "hierro acero cobre níquel aluminio herramientas" },
  { roman: "XVI", chapters: "84–85", first: 84, last: 85, page: 114, title: "Máquinas, aparatos y material eléctrico", keywords: "reactores calderas mecánica electrónica sonido televisión" },
  { roman: "XVII", chapters: "86–89", first: 86, last: 89, page: 126, title: "Material de transporte", keywords: "ferrocarril vehículos tractores aeronaves barcos" },
  { roman: "XVIII", chapters: "90–92", first: 90, last: 92, page: 130, title: "Óptica, medición, medicina, relojería e instrumentos", keywords: "fotografía precisión médico quirúrgico música" },
  { roman: "XIX", chapters: "93", first: 93, last: 93, page: 133, title: "Armas y municiones", keywords: "armas partes accesorios" },
  { roman: "XX", chapters: "94–96", first: 94, last: 96, page: 134, title: "Mercancías y productos diversos", keywords: "muebles luminarias juguetes deporte manufacturas" },
  { roman: "XXI", chapters: "97–98", first: 97, last: 98, page: 138, title: "Arte, colección y tratamiento especial", keywords: "antigüedades objetos mercancías especiales" },
] as const;

const CHAPTER_PAGES = [0,13,13,14,14,16,17,17,17,19,19,20,21,22,22,24,25,25,26,27,27,29,30,31,32,32,33,34,37,39,41,43,45,46,46,47,48,48,49,52,56,61,62,63,64,65,65,66,66,70,77,77,78,78,78,79,79,80,81,81,84,84,87,89,90,91,91,92,93,93,94,95,101,106,106,108,108,109,109,109,110,111,111,112,114,118,126,127,129,129,130,132,132,133,134,135,137,138,139];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function TariffClassification() {
  const [view, setView] = useState<"analysis" | "library">("analysis");
  const [copied, setCopied] = useState(false);
  const [documentQuery, setDocumentQuery] = useState("");
  const [documentPage, setDocumentPage] = useState(4);
  const [product, setProduct] = useState({ name: "", function: "", composition: "", presentation: "", origin: "", brandModel: "" });
  const [result, setResult] = useState({ subheading: "", complementary: "", supplementary: "", description: "", unit: "", validity: "", legalBasis: "", restrictions: "" });

  const sectionMatches = useMemo(() => {
    const query = normalize(documentQuery);
    if (!query) return TARIFF_SECTIONS;
    const chapter = Number(query.replace(/\D/g, ""));
    return TARIFF_SECTIONS.filter((section) => {
      const haystack = normalize(`${section.roman} ${section.chapters} ${section.title} ${section.keywords}`);
      return haystack.includes(query) || (chapter >= section.first && chapter <= section.last);
    });
  }, [documentQuery]);

  function updateProduct(key: keyof typeof product, value: string) {
    setProduct((current) => ({ ...current, [key]: value }));
    setCopied(false);
  }

  function updateResult(key: keyof typeof result, value: string) {
    setResult((current) => ({ ...current, [key]: value }));
  }

  function openSection(firstChapter: number, lastChapter: number, page: number) {
    const requestedChapter = Number(documentQuery.replace(/\D/g, ""));
    const targetPage = requestedChapter >= firstChapter && requestedChapter <= lastChapter ? CHAPTER_PAGES[requestedChapter] || page : page;
    setDocumentPage(targetPage);
    document.getElementById("tariff-document-viewer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyProductBrief() {
    const brief = [
      "SOLICITUD DE ANÁLISIS DE CLASIFICACIÓN ARANCELARIA",
      `Mercancía: ${product.name || "Pendiente de completar"}`,
      `Función: ${product.function || "Pendiente de completar"}`,
      `Composición: ${product.composition || "Pendiente de completar"}`,
      `Presentación: ${product.presentation || "Pendiente de completar"}`,
      `País de origen: ${product.origin || "Pendiente de completar"}`,
      `Marca / modelo: ${product.brandModel || "Pendiente de completar"}`,
      "Revisar alternativas y fundamento antes de aprobar. Contrastar nomenclatura, subpartida, tributos y vigencia en SENAE.",
      SENAE_ARANCEL_URL,
    ].join("\n");
    try { await navigator.clipboard.writeText(brief); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <section className="section-body tariff-page">
      <div className="section-heading">
        <div><p>COMEX · NOMENCLATURA Y CLASIFICACIÓN</p><h2>Arancel y clasificación</h2><span>Prepare la ficha técnica, consulte la base documental incorporada y valide el resultado vigente en SENAE.</span></div>
      </div>

      <div className="tariff-view-tabs" role="tablist" aria-label="Herramientas arancelarias">
        <button type="button" className={view === "analysis" ? "active" : ""} onClick={() => setView("analysis")}><BrainCircuit size={17} />Clasificar mercancía</button>
        <button type="button" className={view === "library" ? "active" : ""} onClick={() => setView("library")}><BookOpen size={17} />Biblioteca arancelaria <span>Nuevo</span></button>
      </div>

      {view === "analysis" ? <>
        <div className="tariff-source-banner">
          <FileSearch size={22} /><div><strong>Consulta oficial del Arancel SENAE</strong><span>Verifique subpartida, códigos complementario y suplementario, tributos, restricciones y vigencia antes de registrar el resultado.</span></div>
          <a href={SENAE_ARANCEL_URL} target="_blank" rel="noopener noreferrer">Abrir SENAE <ExternalLink size={16} /></a>
        </div>
        <div className="tariff-grid">
          <article className="panel tariff-panel">
            <div className="tariff-panel-head"><div><BrainCircuit size={20} /><h3>Datos para el análisis</h3></div><span>Expediente técnico</span></div>
            <p className="tariff-help">Complete las características esenciales. Una descripción comercial por sí sola puede no ser suficiente para sustentar una clasificación.</p>
            <div className="tariff-form-grid">
              <label className="tariff-field tariff-wide">Producto / descripción comercial *<input value={product.name} onChange={(e) => updateProduct("name", e.target.value)} placeholder="Nombre y descripción precisa" /></label>
              <label className="tariff-field">Función y principio de funcionamiento<input value={product.function} onChange={(e) => updateProduct("function", e.target.value)} placeholder="Qué hace y cómo funciona" /></label>
              <label className="tariff-field">Composición / materiales<input value={product.composition} onChange={(e) => updateProduct("composition", e.target.value)} placeholder="Componentes y porcentajes, si se conocen" /></label>
              <label className="tariff-field">Presentación al importar<input value={product.presentation} onChange={(e) => updateProduct("presentation", e.target.value)} placeholder="Unidad, conjunto, mezcla, envase o estado" /></label>
              <label className="tariff-field">País de origen<input value={product.origin} onChange={(e) => updateProduct("origin", e.target.value)} placeholder="País" /></label>
              <label className="tariff-field tariff-wide">Marca, modelo y referencia técnica<input value={product.brandModel} onChange={(e) => updateProduct("brandModel", e.target.value)} placeholder="Marca, modelo, ficha o referencia" /></label>
            </div>
            <div className="tariff-actions">
              <button type="button" className="primary" onClick={copyProductBrief}><Clipboard size={17} />{copied ? "Ficha copiada" : "Copiar ficha técnica"}</button>
              <button type="button" className="tariff-secondary-button" onClick={() => setView("library")}><BookOpen size={15} />Consultar base documental</button>
              <a className="tariff-secondary-link" href={SENAE_ARANCEL_URL} target="_blank" rel="noopener noreferrer">Consultar en SENAE <ExternalLink size={15} /></a>
              {copied && <span className="tariff-success"><CheckCircle2 size={16} /> Lista para pegar en el análisis autorizado.</span>}
            </div>
          </article>
          <aside className="tariff-side">
            <article className="panel tariff-ai-panel">
              <BrainCircuit size={22} /><h3>Asistencia IA</h3><p>La ficha queda integrada al CRM. El motor que proponga partidas con IA todavía debe conectarse; esta pantalla no inventa ni aprueba códigos. Toda recomendación futura deberá mostrar su fundamento y pasar por aprobación técnica MACOBSA.</p>
              <div className="tariff-status"><ShieldCheck size={16} /> Aprobación humana requerida</div><small>La consulta oficial SENAE se abre por enlace. No se atribuye a SENAE una API automática.</small>
            </article>
            <article className="panel tariff-result-panel">
              <div className="tariff-panel-head"><div><CheckCircle2 size={19} /><h3>Resultado revisado</h3></div><span>Registro de consulta</span></div>
              <label className="tariff-field">Subpartida<input value={result.subheading} onChange={(e) => updateResult("subheading", e.target.value)} placeholder="Código consultado" /></label>
              <div className="tariff-form-grid tariff-two"><label className="tariff-field">Código complementario<input value={result.complementary} onChange={(e) => updateResult("complementary", e.target.value)} placeholder="Si aplica" /></label><label className="tariff-field">Código suplementario<input value={result.supplementary} onChange={(e) => updateResult("supplementary", e.target.value)} placeholder="Si aplica" /></label></div>
              <label className="tariff-field">Descripción SENAE<textarea value={result.description} onChange={(e) => updateResult("description", e.target.value)} placeholder="Descripción del resultado consultado" /></label>
              <div className="tariff-form-grid tariff-two"><label className="tariff-field">Unidad física<input value={result.unit} onChange={(e) => updateResult("unit", e.target.value)} placeholder="Unidad" /></label><label className="tariff-field">Vigencia<input value={result.validity} onChange={(e) => updateResult("validity", e.target.value)} placeholder="Inicio / fin" /></label></div>
              <label className="tariff-field">Base legal / restricciones revisadas<textarea value={result.legalBasis} onChange={(e) => updateResult("legalBasis", e.target.value)} placeholder="Norma, permisos y observaciones" /></label>
              <p className="tariff-footnote">Ficha de trabajo. La persistencia en el expediente ERP y la conexión a un motor IA requieren integración técnica.</p>
            </article>
          </aside>
        </div>
      </> : <div className="tariff-library">
        <div className="tariff-document-hero">
          <div><span className="tariff-document-kicker"><FileText size={16} /> FUENTE DOCUMENTAL COTEJADA</span><h3>Arancel del Ecuador</h3><p>Resolución COMEX No. 002-2023 · Segundo Suplemento del Registro Oficial No. 301 · estado declarado en el documento: <strong>Reformado</strong>.</p><div className="tariff-document-meta"><span>Archivo original íntegro · 143 páginas</span><span>Última reforma declarada: 26-may-2026</span><span>NANDINA + aperturas nacionales</span></div></div>
          <div className="tariff-document-actions"><a href={`${TARIFF_PDF}#page=1`} target="_blank" rel="noopener noreferrer">Abrir PDF <ExternalLink size={15} /></a><a href={TARIFF_PDF} download><Download size={15} />Descargar</a></div>
        </div>
        <div className="tariff-validation-grid" aria-label="Control de vigencia normativa">
          <article><CheckCircle2 size={19} /><div><span>Integridad documental</span><strong>Cotejada</strong><small>PDF incorporado completo · 143 páginas</small></div></article>
          <article><FileText size={19} /><div><span>Corte del documento</span><strong>26-may-2026</strong><small>Última reforma declarada dentro del archivo</small></div></article>
          <article><ShieldCheck size={19} /><div><span>Uso por operación</span><strong>Validación oficial obligatoria</strong><small>SENAE y VUE antes de aprobar código, tributo o permiso</small></div></article>
        </div>
        <div className="tariff-library-grid">
          <article className="panel tariff-index-panel">
            <div className="tariff-panel-head"><div><Search size={19} /><h3>Índice inteligente</h3></div><span>21 secciones · 98 capítulos</span></div>
            <p className="tariff-help">Busque por capítulo, familia o palabra clave. El resultado abre las notas legales correspondientes dentro del documento.</p>
            <label className="tariff-search"><Search size={17} /><input value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} placeholder="Ej.: capítulo 85, vehículos, químicos, textiles…" /></label>
            <div className="tariff-quick-links"><button type="button" onClick={() => setDocumentPage(4)}>Índice general</button><button type="button" onClick={() => setDocumentPage(10)}>Consideraciones</button><button type="button" onClick={() => setDocumentPage(12)}>Reglas generales</button><button type="button" onClick={() => setDocumentPage(139)}>Tratamiento especial</button></div>
            <div className="tariff-section-list">
              {sectionMatches.length ? sectionMatches.map((section) => <button type="button" key={section.roman} onClick={() => openSection(section.first, section.last, section.page)}><span>Sección {section.roman}</span><div><strong>{section.title}</strong><small>Capítulos {section.chapters}</small></div><ExternalLink size={15} /></button>) : <div className="tariff-empty">No hay coincidencias. Pruebe con un capítulo del 1 al 98 o una familia de productos.</div>}
            </div>
          </article>
          <aside className="tariff-library-side">
            <article className="panel tariff-source-card"><Layers3 size={21} /><h3>Cómo usar esta fuente</h3><ol><li>Ubique la sección o capítulo probable.</li><li>Revise las notas y Reglas Generales de Interpretación.</li><li>Contraste subpartida, tributos, restricciones y vigencia en SENAE.</li><li>Registre el resultado revisado en la ficha del CRM.</li></ol></article>
            <article className="panel tariff-warning-card"><AlertTriangle size={21} /><div><strong>Control legal activo</strong><p>El CRM separa integridad documental de vigencia jurídica. El archivo fue cotejado y declara reformas hasta el 26-may-2026; ninguna subpartida, tributo, restricción o permiso queda aprobado sin validación vigente en SENAE y VUE para la operación concreta. No sustituye una resolución de clasificación.</p></div></article>
            <a className="tariff-senae-card" href={SENAE_ARANCEL_URL} target="_blank" rel="noopener noreferrer"><ShieldCheck size={21} /><div><strong>Validar en SENAE</strong><span>Subpartida, códigos, tributos, restricciones y vigencia</span></div><ExternalLink size={17} /></a>
          </aside>
        </div>
        <article id="tariff-document-viewer" className="panel tariff-viewer-panel"><div className="tariff-panel-head"><div><BookOpen size={19} /><h3>Visor documental</h3></div><span>Página {documentPage} de 143</span></div><iframe title="Arancel del Ecuador · Resolución COMEX 002-2023" src={`${TARIFF_PDF}#page=${documentPage}&view=FitH`} /><div className="tariff-viewer-fallback">Si el visor de su dispositivo no abre el PDF, <a href={`${TARIFF_PDF}#page=${documentPage}`} target="_blank" rel="noopener noreferrer">ábralo en una pestaña nueva</a>.</div></article>
      </div>}
    </section>
  );
}
