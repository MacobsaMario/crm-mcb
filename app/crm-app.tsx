"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import LogoutButton from "./logout-button";
import { strFromU8, unzipSync } from "fflate";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  BrainCircuit,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Copy,
  FileDown,
  FileSpreadsheet,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CRMUser } from "./access-control";
import GrupoPicaDashboard from "./grupo-pica-dashboard";
import GrupoUneDashboard from "./grupo-une-dashboard";
import ElRosadoControl from "./el-rosado-control";
import TariffClassification from "./tariff-classification";
import { parseCommercialReport, type CommercialAnalysis } from "./commercial-parser";
import { parseRegulatoryReport, type RegulatoryAnalysis } from "./regulatory-parser";
import type { FinancialAnalysis } from "./financial-parser";
import { latestValidBillingCut } from "./dashboard-cut";
import LegalNormativoIA from "./legal-normativo-ia";
import { canAccessLegalModule } from "./access-control";
type Opportunity = {
  id: number | string;
  client: string;
  title: string;
  value: number;
  stage: string;
  owner: string;
  nextAction: string;
  dueDate: string;
  source?: string;
  submittedBy?: string;
};
type Order = {
  tramite: string;
  pedido: string;
  estado: string;
  estadoGeneral: string;
  cliente: string;
  proveedor: string;
  via: string;
  responsable: string;
  delegado: string;
  fechaCreacion: string;
  aduana: string;
  regimen: string;
  refrendo: string;
  fechaRefrendo: string;
  canal: string;
  fechaFinalizado: string;
};
type DistrictSummary = { district:string; total:number; active:number; finished:number; withRefrendo:number };
type CumulativeOrderRow = { date:string; client:string; daily:number; cumulative:number };
type ClientOrderSummary = { name:string; today:number; current:number; previous:number|null; lastOrder:string; district:string; alert:string; reportDate:string };
type ClientControl = { id:number; reportDate:string; client:string; cutoffDate:string; nextCutoffDate:string; unbilledCents:number; carryoverCents:number; fundAssignedCents:number; fundUsedCents:number; fundStatus:string; responsible:string; source:string; note:string; submittedBy:string; createdAt:string };
type DeptUpdate = {
  id: number;
  area: string;
  title: string;
  detail: string;
  metric: string;
  status: string;
  responsible: string;
  reportDate: string;
  submittedBy: string;
  createdAt: string;
};
type DailyReportUpload = {
  id: number;
  area: string;
  reportDate: string;
  responsible: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
  submittedBy: string;
  createdAt: string;
  processingStatus?: string;
  processingError?: string;
  nextAction?: string;
};
type VoidedReport = Pick<DailyReportUpload, "id" | "area" | "reportDate" | "responsible" | "originalName" | "submittedBy"> & { reason: string };
type RegulatorySnapshot = RegulatoryAnalysis & {
  id: number;
  reportDate: string;
  responsible: string;
  originalName: string;
  submittedBy: string;
  createdAt: string;
};
type FinancialSnapshot = FinancialAnalysis & {
  id: number;
  reportDate: string;
  responsible: string;
  originalName: string;
  submittedBy: string;
  createdAt: string;
};
type CommercialSnapshot = CommercialAnalysis & {
  id: number;
  reportDate: string;
  responsible: string;
  originalName: string;
  submittedBy: string;
  createdAt: string;
};
type DocumentAuthorization = {
  id: number;
  authorizationCode: string;
  authorizedBy: string;
  createdAt: string;
};
type ReceivableSnapshot = {
  id: number;
  reportDate: string;
  portfolioTotalCents: number;
  contractualOverdueCents: number;
  collectedTodayCents: number;
  newBillingCents: number;
  confirmedPendingCents: number;
  projectedPortfolioCents: number;
  reimbursementsOverdueCents: number;
  over90Cents: number;
  responsible: string;
  source: string;
  note: string;
  submittedBy: string;
  createdAt: string;
};
type CollectionUpdate = {
  id: number;
  reportDate: string;
  client: string;
  committedCents: number;
  collectedCents: number;
  pendingCents: number;
  status: string;
  responsible: string;
  commitmentDate: string;
  nextAction: string;
  source: string;
  submittedBy: string;
  createdAt: string;
};
type InhouseSnapshot = {
  id: number;
  reportDate: string;
  client: string;
  davPending: number;
  urgentDav: number;
  readyForPickup: number;
  checklistPending: number;
  storageAlerts: number;
  responsible: string;
  nextAction: string;
  source: string;
  note: string;
  submittedBy: string;
};
type PayrollSnapshot = {
  id: number;
  reportMonth: string;
  headcount: number;
  basePayrollCents: number;
  employerCostCents: number;
  newHires: number;
  exits: number;
  source: string;
  note: string;
  submittedBy: string;
};
type BillingSnapshot = {
  id: number;
  reportDate: string;
  daiAccumulatedCents: number;
  regulatoryAccumulatedCents: number;
  extrasAccumulatedCents: number;
  invoicedTodayCents: number;
  invoicesToday: number;
  readyToInvoice: number | null;
  completedPending: number | null;
  blocked: number | null;
  responsible: string;
  source: string;
  note: string;
  submittedBy: string;
  createdAt: string;
};
type DispatchSnapshot = {
  id: number;
  reportDate: string;
  referencesLive: number;
  highRisk: number;
  readyToInvoice: number;
  complianceBasisPoints: number;
  groupWongPending: number;
  ecuasigadStatus: string;
  responsible: string;
  nextAction: string;
  source: string;
  note: string;
  submittedBy: string;
  createdAt: string;
};
const reportedOpportunities: Opportunity[] = [
  ["NEPROPAC", "Agente de aduana", 1200, "En seguimiento", ""],
  ["GRUPO DIFARE", "Agente de aduana", 5000, "En seguimiento", ""],
  [
    "NEUMAC",
    "Agente de aduana y flete internacional",
    2500,
    "En seguimiento",
    "",
  ],
  ["PROBRISA", "Agente de aduana", 2500, "En seguimiento", ""],
  ["INTACO", "Flete internacional", 2000, "En seguimiento", ""],
  ["CASA DEL RULIMAN", "Flete internacional", 2000, "En seguimiento", ""],
  ["INTEROC", "Flete terrestre", 1000, "En seguimiento", ""],
  ["NIRSA", "Flete terrestre", 1000, "En seguimiento", ""],
  [
    "BIOMAR",
    "Agenciamiento de aduana y flete terrestre",
    20000,
    "En seguimiento",
    "",
  ],
  [
    "YILPORT",
    "Agenciamiento de aduana",
    1000,
    "En seguimiento",
    "Reunión próxima semana",
  ],
  [
    "DE PRATI",
    "Servicio integral",
    2000,
    "En seguimiento",
    "Seguimiento de reunión",
  ],
  ["INFEGAS", "Servicio integral", 1000, "Cotización aprobada", ""],
  ["ZEILAND", "Agenciamiento de aduana", 1000, "En seguimiento", ""],
  ["TIERRA SANTA", "Agenciamiento de aduana", 1000, "En seguimiento", ""],
  ["HAID", "Agenciamiento de aduana", 5000, "En seguimiento", ""],
  ["OMARSA", "Agenciamiento de aduana", 2000, "En cotización", ""],
].map(([client, title, value, stage, nextAction], index) => ({
  id: `r-${index}`,
  client: String(client),
  title: String(title),
  value: Number(value),
  stage: String(stage),
  owner: "Carolina Herrera",
  nextAction: String(nextAction),
  dueDate: "",
  source: "Reporte de Carolina · 01-sep-2026",
}));
const clients = [
  {name:"GISIS",rank:1,current:178,previous:166,lastOrder:"31-ago-2026",note:"+7,2% vs. julio (166)"},
  {name:"GRUPO ROSADO",rank:2,current:120,previous:118,lastOrder:"31-ago-2026",note:"+1,7% vs. julio (118)"},
  {name:"GRUPO IASA",rank:3,current:100,previous:125,lastOrder:"31-ago-2026",note:"-20,0% vs. julio (125)"},
  {name:"GRUPO FADESA",rank:4,current:86,previous:null,lastOrder:"31-ago-2026",note:"Cierre agosto 2026"},
  {name:"SONGA",rank:5,current:58,previous:null,lastOrder:"Agosto 2026",note:"Ingreso al top 5"},
  {name:"GRUPO PYCCA",rank:6,current:58,previous:null,lastOrder:"Agosto 2026",note:"Cierre agosto 2026"},
  {name:"GRUPO WONG",rank:7,current:47,previous:null,lastOrder:"Agosto 2026",note:"Cierre agosto 2026"},
  {name:"TUVAL",rank:8,current:33,previous:null,lastOrder:"Agosto 2026",note:"Cierre agosto 2026"},
  {name:"PAPELERA NACIONAL",rank:9,current:32,previous:null,lastOrder:"31-ago-2026",note:"Cierre agosto 2026"},
  {name:"LUBRIVAL",rank:10,current:32,previous:null,lastOrder:"Agosto 2026",note:"Cierre agosto 2026"},
];
const clientPortfolio = [
  "GISIS · Skretting",
  "Corporación El Rosado",
  "Grupo UNE · FADESA / Ecuabarnices",
  "Grupo PICA · PICA / PYCCA",
  "Grupo IASA · CAT",
  "Grupo Favorita · Wong",
  "Favorita Fruit",
  "Papelera Nacional",
  "Interoc",
  "Quimpac",
  "Songa",
  "Tuval",
  "Lubrival",
  "La Reforma",
  "La Ganga",
  "Disialec",
] as const;
function normalizeClientName(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();}
function parseClientOrderSummaries(update:DeptUpdate):ClientOrderSummary[]{
  if(update.area!=="Despacho")return [];
  const text=`${update.title}\n${update.detail}`;
  const previousByClient=new Map(clients.map((client)=>[normalizeClientName(client.name),client.current]));
  const rows:ClientOrderSummary[]=[];
  for(const rawLine of text.split(/\r?\n/)){
    const line=rawLine.replace(/^[\s•*-]+/,"").trim();
    if(!line)continue;
    const labeled=line.match(/(?:cliente\s*:\s*)?([^|;]+?)(?:\s*[|;]\s*|\s+-\s+).*?(?:hoy|pedidos?\s+(?:del\s+)?d[ií]a)\s*:\s*(\d+).*?(?:acumulado(?:\s+del\s+mes)?|mes)\s*:\s*(\d+)/i);
    const simple=line.match(/^(.{2,80}?)\s+(?:lleva|registra|acumula|tiene)\s+(\d+)\s+(?:pedidos?|tr[aá]mites?)(?:\s+(?:en|durante)\s+(?:el\s+)?mes)?/i);
    if(!labeled&&!simple)continue;
    const name=(labeled?.[1]??simple?.[1]??"").replace(/^(?:cliente\s*:\s*)/i,"").trim();
    const today=labeled?Number(labeled[2]):0;
    const current=Number(labeled?.[3]??simple?.[2]??0);
    const get=(label:string)=>line.match(new RegExp(`${label}\\s*:\\s*([^|;]+)`,"i"))?.[1]?.trim()??"";
    const key=normalizeClientName(name);
    const prior=clients.find((client)=>key.includes(normalizeClientName(client.name))||normalizeClientName(client.name).includes(key));
    rows.push({name,today,current,previous:prior?.current??previousByClient.get(key)??null,lastOrder:get("[uú]ltimo pedido")||update.reportDate,district:get("distrito")||"Pendiente de confirmar",alert:get("alerta"),reportDate:update.reportDate});
  }
  return rows;
}
const activities = [
  [
    "Pendiente",
    "Sostener facturación mensual mínima de $396.477",
    "Meta anual $4 MM",
    "Por asignar en Comité",
    "Sep–Dic 2026",
  ],
  [
    "Pendiente",
    "Dar seguimiento a la caída operativa de Víctor Simancas por vacaciones",
    "Desempeño ejecutivo",
    "Por asignar en Comité",
    "Sin fecha confirmada",
  ],
  [
    "Pendiente",
    "Capitalizar repunte de Francisco Anastacio",
    "Desempeño ejecutivo",
    "Por asignar en Comité",
    "Sin fecha confirmada",
  ],
  [
    "Pendiente",
    "Replicar las acciones que lograron 4 clientes nuevos",
    "Gestión comercial",
    "Por asignar en Comité",
    "Sin fecha confirmada",
  ],
];
const executives = [
  ["AM", "Alex Molina", "147 trámites", "+2,8%", "1.039 acumulados"],
  ["AA", "Ariel Angulo", "98 trámites", "+48,5%", "574 acumulados"],
  ["NG", "Noemí Galán", "95 trámites", "+23,4%", "576 acumulados"],
  ["GN", "Gisella Núñez", "94 trámites", "-10,5%", "585 acumulados"],
  ["CL", "Caroline León", "83 trámites", "+48,2%", "323 acumulados"],
  ["NN", "Nemesis Naranjo", "76 trámites", "+5,6%", "529 acumulados"],
  ["NG", "Noemí Gonzalez", "64 trámites", "-1,5%", "519 acumulados"],
  ["GC", "Gigi Cano", "62 trámites", "+8,8%", "451 acumulados"],
  ["EL", "Emily Lozano", "61 trámites", "+3,4%", "488 acumulados"],
  ["EA", "Eliana Alejandro", "58 trámites", "-6,5%", "496 acumulados"],
];
const committeeAreas = [
  {
    area: "Comercial",
    owner: "Carolina Herrera",
    cut: "Corte conciliado 8-sep",
    tone: "blue",
    metrics: [
      "$120.899,80 DAI acumulado",
      "39,0% de $310.000",
      "$50.200 en oportunidades · último registro",
    ],
    register:
      "Ventas, prospectos, licitaciones, próxima acción y dependencia de otra área.",
    alert: "QUIMPAC, INTEROC y AGRIPAC requieren respuesta financiera.",
  },
  {
    area: "Operaciones",
    owner: "Vanessa",
    cut: "Corte conciliado 8-sep",
    tone: "green",
    metrics: [
      "$2.905 en Extras",
      "14,5% de la meta",
      "Meta extras: $20.000",
    ],
    register:
      "Capacidad, visitas, incidentes, servicios adicionales y fecha de solución.",
    alert: "Falta cuantificar el avance de extras frente a la nueva meta.",
  },
  {
    area: "Despacho",
    owner: "María Fernanda Manrique",
    cut: "Corte confirmado 8-sep",
    tone: "amber",
    metrics: [
      "453 referencias vivas",
      "25 en riesgo alto",
      "76,4% cumplimiento",
    ],
    register:
      "Referencias en riesgo, hitos aduaneros, bloqueos, responsable y vencimiento.",
    alert: "43 trámites listos por facturar; 28 pendientes de Grupo Wong. Ecuasigad resuelto.",
  },
  {
    area: "Regulatorio",
    owner: "Lilibeth Terranova",
    cut: "Corte confirmado 8-sep",
    tone: "purple",
    metrics: [
      "$12.270 acumulados",
      "40,9% de la meta $30.000",
      "Meta oficial $30.000",
    ],
    register:
      "Trámites, ingresos, prospectos, estado, siguiente contacto y evidencia.",
    alert: "Mantener trazabilidad individual de trámites, prospectos y fechas de próxima acción.",
  },
  {
    area: "Facturación",
    owner: "Rebeca Sánchez",
    cut: "Corte conciliado 8-sep",
    tone: "navy",
    metrics: [
      "$136.074,80 total acumulado",
      "37,8% de $360.000",
      "DAI $310K · Reg. $30K · Extras $20K",
    ],
    register:
      "Facturación por línea, pendiente, bloqueada, causa, dueño y hora del corte.",
    alert: "Próximo corte debe identificar producción del día y conservar evidencia conciliada.",
  },
  {
    area: "Financiero",
    owner: "Bryan Quinde",
    cut: "Último dato confirmado 2-sep",
    tone: "red",
    metrics: [
      "$1.055,43 disponible",
      "$11.298,72 por cobrar",
      "$12.354,15 proyectado",
    ],
    register:
      "Caja, cobros, pagos a terceros, compromisos, responsable y comprobante.",
    alert: "Debe aceptar y resolver QUIMPAC, INTEROC y AGRIPAC.",
  },
];
const persistentAlerts = [
  ["QUIMPAC", "Financiero", "Sin responsable ni fecha", "Abierta"],
  ["INTEROC", "Financiero", "Solicitud de valores sin respuesta", "Abierta"],
  [
    "AGRIPAC",
    "Financiero",
    "Cliente atendido; gestión interna pendiente",
    "Abierta",
  ],
  [
    "ECUASIGAD · María Fernanda",
    "Despacho / Aduana",
    "Acceso restablecido el 8-sep tras 11+ días",
    "Resuelta",
  ],
  [
    "GISIS · licitación",
    "Carolina / Vanessa",
    "Estados contradictorios: pausa vs. trabajo activo",
    "Por conciliar",
  ],
  [
    "IASA · fondo $30.000",
    "Financiero",
    "Atendido; resolución registrada",
    "Resuelta",
  ],
];
const committeeManuals = [
  ["Mario Coka", "Dirección General", "Revisar alertas y contradicciones; decidir, asignar dueño y fecha. No alterar el dato fuente: aprobarlo o devolverlo."],
  ["Francisco Jaramillo", "Auditoría y Control", "Cruzar cifras entre áreas, registrar hallazgo, evidencia, impacto, responsable y plazo. Marcar contradicciones sin reemplazar el dato original."],
  ["Bryan Quinde", "Financiero", "Actualizar cartera, caja, cobros, pagos y fondos. Cada valor exige comprobante o fuente, cliente, próxima acción y fecha."],
  ["Vanessa Naranjo", "Operaciones", "Registrar capacidad, recursos, incidentes, visitas y Extras; indicar impacto, dueño, fecha de solución y evidencia."],
  ["María Fernanda Manrique", "Despacho", "Actualizar referencias, riesgo, trámites por facturar, indicadores y bloqueos; incluir cantidad, cliente, causa, responsable y fecha estimada."],
  ["Rebeca Sánchez", "Facturación", "Cargar DAI, Regulatorio y Extras por separado; conciliar Subtotal + IVA = Total y adjuntar la fuente del corte."],
  ["Lilibeth Terranova", "Regulatorio", "Actualizar trámites, licencias, prospectos e ingresos; ningún prospecto desaparece: cambia de estado con nota y próxima acción."],
  ["Carolina Herrera", "Comercial", "Registrar oportunidades, clientes, valor, etapa, responsable, próxima acción y fecha; escalar dependencias sin borrar el historial."],
  ["Oliver Lay", "Inhouse Corporación El Rosado", "Actualizar DAV pendientes y urgentes, trámites listos para retiro, checklist, permanencia en depósito, próxima acción y evidencia."],
] as const;

const latestDispatchUpdate = {
  reportDate: "03-sep-2026",
  owner: "María Fernanda Manrique",
  title: "Seguimiento de cumplimiento de Despacho",
  facts: [
    "Se mantiene presión a los ejecutivos por el cumplimiento de los indicadores de trámite anticipado.",
    "Se remitió internamente y se gestiona la facturación de 45 trámites pendientes.",
    "Se mantiene seguimiento al equipo de Grupo Wong por facturaciones pendientes.",
    "Para hoy se informó la ejecución de otra hoja de cambio.",
  ],
  attributed:
    "Según la información recibida por María Fernanda sobre los sistemas de la Aduana, la demora responde a mejoras de manuales y a controles de Infraestructura de Aduana para evitar lentitud o caída de ECUAPASS. Pendiente de respaldo o confirmación directa de Aduana.",
};
const money = (n: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const exactMoney = (cents: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
const receivableBaseline = {
  portfolio: 60850251,
  overdue: 31565962,
  projected: 29018077,
  residual: 2547885,
  reimbursements: 20343460,
  over90: 2423888,
};
const receivableUpdate03Sep = {
  reportDate: "03-sep-2026",
  basePortfolio: 60850251,
  effectiveCollections: 578805,
  newBilling: 28651745,
  accountingPortfolio: 88923191,
  confirmedPending: 2585627,
  overduePending: 23910582,
  additionalPotential: 26496209,
  projectedPortfolio: 62426982,
  identifiedRecovery: 27075014,
  initialProjection: 29018077,
  projectionGap: 1943063,
  source: "Informe Gerencial de Cartera MACOBSA · 03-09-2026",
};
const billingComposition03Sep = [
  ["01/09/2026", 5553861, 7053991, 4687962, 17295814],
  ["02/09/2026", 3024247, 4993304, 3338380, 11355931],
  ["TOTAL", 8578108, 12047295, 8026342, 28651745],
] as const;
const projectedCollections = [
  ["01/09/2026", 641963, "2,21%"],
  ["02/09/2026", 1549418, "5,34%"],
  ["03/09/2026", 1645433, "5,67%"],
  ["04/09/2026", 25181263, "86,78%"],
] as const;
const principalReceivables = [
  ["GISIS S.A.", 21808866, "35,84%", 18848955],
  ["IASA S.A.", 4112761, "6,76%", 1303796],
  ["FÁBRICA DE ENVASES S.A. - FADESA", 2770913, "4,55%", 575493],
  [
    "PAPELES ABSORBENTES LA REFORMA ABSOREFORMA S.A.",
    2527505,
    "4,15%",
    882671,
  ],
  ["MACOBCARGO S.A.S.", 1892042, "3,11%", 0],
] as const;
const rosadoCut03Sep = {
  reportDate: "03-sep-2026",
  davPending: 32,
  urgentDav: 9,
  readyForPickup: 7,
  checklistPending: 2,
  storageAlerts: 1,
  checklistOnTime: "93,8%",
  davSentOnTime: "71,1%",
  davApprovedOnTime: "0%",
  earlyDispatch: "5,9%",
  pickupOnTime: "13,8%",
  source: "Control Interno de Nacionalización y Reporte Diario MACOBSA · 03-09-2026",
};
const rosadoCut09Sep = {
  reportDate: "09-sep-2026",
  total: 217,
  retired: 42,
  inProgress: 175,
  davSent: { compliance: "81,9%", meets: 77, outside: 17, noData: 123 },
  earlyDispatch: { compliance: "23,6%", meets: 17, outside: 55, noData: 145 },
  pickup: { compliance: "16,7%", meets: 7, outside: 35, noData: 175 },
  checklist: { compliance: "100%", meets: 57, outside: 0, noData: 160 },
  arrivingNext7Days: 20,
  source: "Rosado sept 9 .pdf",
};
const rosadoCustomsBottlenecks = [
  ["2026-0927", "Arribó hace más de 7 días", "Sin salida autorizada"],
  ["2026-2034", "Arribó hace más de 7 días", "Sin salida autorizada"],
] as const;
const rosadoPickupRisks = [
  ["2026-0045", "Salida autorizada hace más de 5 días", "Pendiente de retiro"],
  ["2026-1200", "Salida autorizada hace más de 5 días", "Pendiente de retiro"],
] as const;
const rosadoUrgentDav = [
  ["2026-1703", "Corp. El Rosado", "Bestway (HK) International", "25/08 → 30/08"],
  ["2026-0622", "Corp. El Rosado", "Happy Line Limited", "25/08 → 31/08"],
  ["2026-2709", "Tricomnor", "Wilhelm Reuss GmbH & Co.", "25/08 → 31/08"],
  ["2026-2034", "Tricomnor", "DNTX Corp.", "25/08 → 31/08"],
  ["2025-4905", "Corp. El Rosado", "Foshan JBN Industrial", "25/08 → 30/08"],
  ["CONS. 5646", "Corp. El Rosado", "Consolidado 5646 Meridian", "27/08 → 30/08"],
  ["2026-3131", "Corp. El Rosado", "Reynolds Consumer Products", "27/08 → 31/08"],
  ["CONS. 5751", "Corp. El Rosado", "Consolidado 5751", "28/08 → 31/08"],
  ["2026-1908", "Corp. El Rosado", "Comi Pak Engineering", "31/08 → 02/09"],
] as const;
const rosadoPickup = [
  ["2026-2607", "Corp. El Rosado", "28/08", "Riesgo sobrestadía · 6 días"],
  ["2026-2794", "Tricomnor", "01/09", "Salida autorizada"],
  ["2026-2793", "Tricomnor", "01/09", "Salida autorizada"],
  ["2026-1311", "Tricomnor", "01/09", "Salida autorizada"],
  ["2026-0822", "Corp. El Rosado", "01/09", "Salida autorizada"],
  ["CONS. 5775", "Tricomnor", "02/09", "Salida autorizada"],
  ["CONS. 5842", "Restaunsa", "02/09", "Salida autorizada"],
] as const;
const rosadoChecklist = [
  ["2026-1861", "Corp. El Rosado", "Lansay France SAS", "27/08"],
  ["2026-2096", "Tricomnor", "Guangdong Yusheng Food Industries", "27/08"],
] as const;
const payrollVerifiedCut = {
  receivedDate: "03-sep-2026",
  headcount: 74,
  basePayroll: 8343545,
  averageSalary: 112751,
  medianSalary: 90000,
  newHireDates: 7,
  source: "PERSONAL MACOBSA SUELDOS.xlsx",
};
const payrollBands = [
  ["Menos de $470", 1],
  ["$470 a $599", 5],
  ["$600 a $999", 36],
  ["$1.000 a $1.499", 21],
  ["$1.500 o más", 11],
] as const;
const billingCut03Sep = {
  reportDate: "03-sep-2026",
  dai: 7898980,
  regulatory: 857000,
  extras: 141000,
  total: 8896980,
  today: 1410260,
  invoices: 53,
  priorTotal: 7486720,
  source: "NUEVO _MACOBSA Rebeca Facturacion(3).pdf",
};
const reconciledDashboardCut08Sep = {
  reportDate: "2026-09-08",
  dai: 12089980,
  regulatory: 1227000,
  extras: 290500,
  total: 13607480,
  source: "Diario sept 9 Macobsa.html · conciliado y confirmado por Mario Coka",
};
const verifiedBillingCut10Sep = {
  reportDate: "2026-09-10",
  daiAccumulatedCents: 15048800,
  regulatoryAccumulatedCents: 1292000,
  extrasAccumulatedCents: 389500,
  invoicedTodayCents: 1590480,
  invoicesToday: 59,
  readyToInvoice: null,
  completedPending: null,
  blocked: null,
  responsible: "Rebeca Sánchez",
  source: "NUEVO _MACOBSA Rebeca Facturacion_(1).pdf · contingencia validada por Mario Coka",
  note: "Corte validado desde el PDF adjunto mientras se resuelve la carga de Rebeca.",
};
const ECUADOR_TIME_ZONE = "America/Guayaquil";
const MARIO_EMAIL = "k2v5nc8k7s@privaterelay.appleid.com";
const reportResponsibles = {
  Comercial: { name: "Carolina Herrera", email: "carolina@mariocoka.com" },
  Operaciones: { name: "Vanessa Naranjo", email: "vanessa@mariocoka.com" },
  Despacho: { name: "María Fernanda Manrique", email: "manrique@mariocoka.com" },
  Regulatorio: { name: "Lilibeth Terranova", email: "lilibeth@mariocoka.com" },
  Facturación: { name: "Rebeca Sánchez", email: "rebeca@mariocoka.com" },
  Financiero: { name: "Bryan Quinde", email: "bquinde@mariocoka.com" },
  "Inhouse El Rosado": { name: "Oliver Lay", email: "oliver@mariocoka.com" },
} as const;
type ReportArea = keyof typeof reportResponsibles;
type IndividualReportEntry = {
  id: string;
  area: ReportArea;
  title: string;
  detail: string;
  metric: string;
  status: string;
  responsible: string;
  reportDate: string;
  submittedBy: string;
  createdAt: string;
};
function decodeWordXml(xml: string) {
  const withBreaks = xml
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<w:br\s*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n");
  const text = withBreaks.replace(/<[^>]+>/g, "");
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value.replace(/\n{3,}/g, "\n\n").trim();
}
async function extractDocxText(file: File) {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const documentXml = files["word/document.xml"];
  if (!documentXml) throw new Error("El Word no contiene un documento legible");
  return decodeWordXml(strFromU8(documentXml));
}

const MAX_REPORT_FILE_SIZE = 15 * 1024 * 1024;
const DIRECT_UPLOAD_LIMIT = 1024 * 1024;
const REPORT_CHUNK_SIZE = 512 * 1024;

async function readApiResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    throw new Error(response.ok
      ? "El CRM recibió una respuesta incompleta. El informe no quedó registrado; intente nuevamente."
      : "La carga fue interrumpida antes de registrarse. El informe no quedó recibido; intente nuevamente.");
  }
}

async function uploadReportInParts(file: File, fields: Record<string, string>) {
  const uploadId = crypto.randomUUID();
  const count = Math.ceil(file.size / REPORT_CHUNK_SIZE);
  for (let index = 0; index < count; index += 1) {
    const chunk = file.slice(index * REPORT_CHUNK_SIZE, Math.min(file.size, (index + 1) * REPORT_CHUNK_SIZE));
    const body = new FormData();
    body.set("area", fields.area);
    body.set("uploadId", uploadId);
    body.set("index", String(index));
    body.set("count", String(count));
    body.set("chunk", new File([chunk], `${file.name}.part-${index}`, { type: "application/octet-stream" }));
    const response = await fetch("/api/report-upload-chunks", { method: "POST", body });
    const data = await readApiResponse(response);
    if (!response.ok) throw new Error(data.error || `No fue posible cargar la parte ${index + 1} del archivo.`);
  }

  return fetch("/api/report-upload-finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...fields,
      uploadId,
      count,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    }),
  });
}
function ecuadorAuditTime(value: string) {
  if (!value) return "Hora no disponible";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ECUADOR_TIME_ZONE,
  }).format(date);
}
type DashboardExportFormat = "PDF" | "PPTX" | "HTML";
type PreparedDashboardPdf = { blob: Blob; fileName: string };
function safeExportName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareOrDownloadBlob(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      // Share only the file. On iPhone, WhatsApp may discard the attachment
      // when a text payload is included and send the text by itself.
      await navigator.share({ files: [file] });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    }
  }
  downloadBlob(blob, fileName);
  return "downloaded" as const;
}
function openPdfForReview(blob: Blob, fileName: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/export-file";
  form.enctype = "multipart/form-data";
  form.target = "_self";
  form.hidden = true;
  const input = document.createElement("input");
  input.type = "file";
  input.name = "file";
  const transfer = new DataTransfer();
  transfer.items.add(new File([blob], fileName, { type: "application/pdf" }));
  input.files = transfer.files;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}
function loadExportImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No fue posible preparar la imagen del Dashboard"));
    image.src = dataUrl;
  });
}
function cropExportImage(image: HTMLImageElement, top: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = Math.max(1, Math.ceil(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No fue posible preparar la página del Dashboard");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, top, image.naturalWidth, height, 0, 0, image.naturalWidth, height);
  return canvas.toDataURL("image/png");
}
function updateOrigin(update: Pick<IndividualReportEntry, "area" | "submittedBy">) {
  const areaOwner = reportResponsibles[update.area as ReportArea];
  const email = update.submittedBy.toLowerCase();
  if (areaOwner && email === areaOwner.email) return "Cargado por el responsable";
  if (email === MARIO_EMAIL) return "Importado por Mario";
  return "Cargado por usuario autorizado";
}
function ecuadorClock(date = new Date()) {
  const dateLabel = new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ECUADOR_TIME_ZONE,
  }).format(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ECUADOR_TIME_ZONE,
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  return {
    dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
    timeLabel: `${get("hour")}:${get("minute")}`,
    dateInput: `${get("year")}-${get("month")}-${get("day")}`,
    greeting:
      hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches",
  };
}
function compactReportDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value.toUpperCase();
  const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return `${Number(match[3])}-${months[Number(match[2]) - 1]}-${match[1]}`;
}
export default function CRMApp({ currentUser }: { currentUser: CRMUser }) {
  const isAuditOwner = currentUser.email.trim().toLowerCase() === "k2v5nc8k7s@privaterelay.appleid.com";
  const canUseCeo = currentUser.role === "Dirección General" || currentUser.role === "Auditoría y Control";
  const [section, setSection] = useState(() =>
      currentUser.role === "Inhouse El Rosado"
        ? "Inhouse El Rosado"
        : currentUser.role === "Dirección General"
        ? "Comité diario"
        : currentUser.role === "Auditoría y Control"
        ? "Control CEO"
        : "Actualizaciones",
    ),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(false),
    [query, setQuery] = useState(""),
    [saved, setSaved] = useState<Opportunity[]>([]),
    [saving, setSaving] = useState(false),
    [copied, setCopied] = useState(false),
    [exportingFormat, setExportingFormat] = useState<DashboardExportFormat | null>(null),
    [exportMessage, setExportMessage] = useState(""),
    [preparedDashboardPdf, setPreparedDashboardPdf] = useState<PreparedDashboardPdf | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [ceoUnlocked, setCeoUnlocked] = useState(false);
  const [ceoGateOpen, setCeoGateOpen] = useState(currentUser.role === "Auditoría y Control");
  const [ceoPin, setCeoPin] = useState("");
  const [ceoGateError, setCeoGateError] = useState("");
  const [ceoUnlocking, setCeoUnlocking] = useState(false);
  const [form, setForm] = useState({
    client: "",
    title: "",
    value: "",
    stage: "Calificación",
    owner: "",
    nextAction: "",
    dueDate: "",
    source: "",
  });
  const [orderStatus, setOrderStatus] = useState("Todos"),
    [orderPage, setOrderPage] = useState(1),
    [orderRows, setOrderRows] = useState<Order[]>([]),
    [districts, setDistricts] = useState<DistrictSummary[]>([]),
    [orderClients, setOrderClients] = useState<string[]>([]),
    [orderCumulative, setOrderCumulative] = useState<CumulativeOrderRow[]>([]),
    [orderTotal, setOrderTotal] = useState(1140),
    [orderPages, setOrderPages] = useState(46),
    [updates, setUpdates] = useState<DeptUpdate[]>([]);
  const [orderFrom, setOrderFrom] = useState(""), [orderTo, setOrderTo] = useState(""), [orderClient, setOrderClient] = useState("");
  const [selectedCRMClient, setSelectedCRMClient] = useState("");
  const [clock, setClock] = useState(() => ecuadorClock());
  const [lastLiveSync, setLastLiveSync] = useState<Date | null>(null);
  const liveClientOrders=useMemo(()=>{
    const latest=new Map<string,ClientOrderSummary>();
    [...updates].sort((a,b)=>b.reportDate.localeCompare(a.reportDate)||b.id-a.id).forEach((update)=>{
      parseClientOrderSummaries(update).forEach((row)=>{const key=normalizeClientName(row.name);if(!latest.has(key))latest.set(key,row);});
    });
    return [...latest.values()].sort((a,b)=>b.current-a.current);
  },[updates]);
  const visibleClients=liveClientOrders.length?liveClientOrders.map((row,index)=>({name:row.name,rank:index+1,current:row.current,previous:row.previous,lastOrder:row.lastOrder,note:`${row.today} hoy · ${row.district}`})):clients;
  const clientsWithoutOrders=visibleClients.filter((client)=>client.current===0);
  const clientsWithVolumeDrop=visibleClients.filter((client)=>client.previous!==null&&client.current<client.previous);
  const clientDirectory=useMemo(()=>{
    const names=[...clientPortfolio,...visibleClients.map((item)=>item.name),...saved.map((item)=>item.client)].filter(Boolean);
    return [...new Map(names.map((name)=>[normalizeClientName(name),name])).values()].sort((a,b)=>a.localeCompare(b,"es"));
  },[visibleClients,saved]);
  const reportAreas = useMemo<ReportArea[]>(() => {
    const all: ReportArea[] = [
      "Comercial",
      "Operaciones",
      "Despacho",
      "Regulatorio",
      "Facturación",
      "Financiero",
      "Inhouse El Rosado",
    ];
    if (
      currentUser.role === "Dirección General" ||
      currentUser.role === "Auditoría y Control"
    ) return all;
    return all.filter((area) => currentUser.allowedAreas.includes(area));
  }, [currentUser.allowedAreas, currentUser.role]);
  const [reportArea, setReportArea] = useState<ReportArea>(() => {
    if (currentUser.role === "Operaciones") return "Operaciones";
    if (currentUser.role === "Despacho") return "Despacho";
    if (currentUser.role === "Regulatorio") return "Regulatorio";
    if (currentUser.role === "Facturación") return "Facturación";
    if (currentUser.role === "Financiero") return "Financiero";
    if (currentUser.role === "Inhouse El Rosado") return "Inhouse El Rosado";
    return "Comercial";
  });
  const [reportResponsible, setReportResponsible] = useState<string>(() => {
    if (currentUser.role === "Operaciones") return reportResponsibles.Operaciones.name;
    if (currentUser.role === "Despacho") return reportResponsibles.Despacho.name;
    if (currentUser.role === "Regulatorio") return reportResponsibles.Regulatorio.name;
    if (currentUser.role === "Facturación") return reportResponsibles.Facturación.name;
    if (currentUser.role === "Financiero") return reportResponsibles.Financiero.name;
    if (currentUser.role === "Inhouse El Rosado") return reportResponsibles["Inhouse El Rosado"].name;
    return reportResponsibles.Comercial.name;
  });
  const [reportFrom, setReportFrom] = useState(""), [reportTo, setReportTo] = useState("");
  const [uploadedAreaFilter, setUploadedAreaFilter] = useState("Todas las áreas");
  const [uploadedResponsibleFilter, setUploadedResponsibleFilter] = useState("Todos los usuarios");
  const [uploadedExactDate, setUploadedExactDate] = useState("");
  const [uploadArea, setUploadArea] = useState<ReportArea>(() => {
    if (currentUser.role === "Operaciones") return "Operaciones";
    if (currentUser.role === "Despacho") return "Despacho";
    if (currentUser.role === "Regulatorio") return "Regulatorio";
    if (currentUser.role === "Facturación") return "Facturación";
    if (currentUser.role === "Financiero") return "Financiero";
    if (currentUser.role === "Inhouse El Rosado") return "Inhouse El Rosado";
    return "Comercial";
  });
  const [uploadDate, setUploadDate] = useState(() => ecuadorClock().dateInput);
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [uploadSummary, setUploadSummary] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [dailyReports, setDailyReports] = useState<DailyReportUpload[]>([]);
  const [voidedReports, setVoidedReports] = useState<VoidedReport[]>([]);
  const [correctionHistory, setCorrectionHistory] = useState<Record<number, { id: number; originalName: string; voidedAt: string; reason: string }[]>>({});
  const [voidingReportId, setVoidingReportId] = useState<number | null>(null);
  const commercialSnapshots = useMemo<CommercialSnapshot[]>(() => {
    const reports = dailyReports
      .filter((report) => report.area === "Comercial")
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate) || b.id - a.id);
    const snapshots: CommercialSnapshot[] = [];
    for (const report of reports) {
      const analysis = parseCommercialReport(report.extractedText);
      if (analysis) snapshots.push({ ...analysis, ...report });
    }
    return snapshots;
  }, [dailyReports]);
  const latestCommercial = commercialSnapshots[0] ?? null;
  const [reportToRead, setReportToRead] = useState<DailyReportUpload | null>(null);
  const [reportDownloadError, setReportDownloadError] = useState("");
  const [lastSeenReportId, setLastSeenReportId] = useState(0);
  const [lastSeenUpdateId, setLastSeenUpdateId] = useState(0);
  const [regulatorySnapshots, setRegulatorySnapshots] = useState<RegulatorySnapshot[]>([]);
  const [regulatoryPreview, setRegulatoryPreview] = useState<RegulatoryAnalysis | null>(null);
  const [financialSnapshots, setFinancialSnapshots] = useState<FinancialSnapshot[]>([]);
  const [financialPreview, setFinancialPreview] = useState<FinancialAnalysis | null>(null);
  const [previewingReport, setPreviewingReport] = useState(false);
  const [documentAuthorization, setDocumentAuthorization] = useState<DocumentAuthorization | null>(null);
  const [authorizingDocument, setAuthorizingDocument] = useState(false);
  const [updateForm, setUpdateForm] = useState(() => ({
    area: currentUser.allowedAreas[0] ?? "",
    title: "",
    detail: "",
    metric: "",
    status: "En seguimiento",
    responsible: currentUser.role === "Inhouse El Rosado" ? "Oliver Lay" : "",
    reportDate: ecuadorClock().dateInput,
  }));
  const [commercialLiveForm, setCommercialLiveForm] = useState(() => ({
    client: "",
    subject: "",
    situation: "",
    actionTaken: "",
    clientResponse: "",
    nextAction: "",
    commitmentDate: "",
    evidence: "",
    metric: "",
  }));
  const [receivableSnapshots, setReceivableSnapshots] = useState<
    ReceivableSnapshot[]
  >([]);
  const [collectionUpdates, setCollectionUpdates] = useState<
    CollectionUpdate[]
  >([]);
  const [clientControls, setClientControls] = useState<ClientControl[]>([]);
  const [clientControlForm, setClientControlForm] = useState(() => ({reportDate:ecuadorClock().dateInput,client:"",cutoffDate:"",nextCutoffDate:"",unbilled:"",carryover:"",fundAssigned:"",fundUsed:"",fundStatus:"Pendiente de confirmar",responsible:"",source:"",note:""}));
  const [inhouseSnapshots, setInhouseSnapshots] = useState<InhouseSnapshot[]>([]);
  const [payrollSnapshots, setPayrollSnapshots] = useState<PayrollSnapshot[]>([]);
  const [billingSnapshots, setBillingSnapshots] = useState<BillingSnapshot[]>([]);
  const [dispatchSnapshots, setDispatchSnapshots] = useState<DispatchSnapshot[]>([]);
  const [snapshotForm, setSnapshotForm] = useState(() => ({
    reportDate: ecuadorClock().dateInput,
    portfolioTotal: "",
    contractualOverdue: "",
    collectedToday: "",
    newBilling: "",
    confirmedPending: "",
    projectedPortfolio: "",
    reimbursementsOverdue: "",
    over90: "",
    responsible: "",
    source: "",
    note: "",
  }));
  const [collectionForm, setCollectionForm] = useState(() => ({
    reportDate: ecuadorClock().dateInput,
    client: "",
    committed: "",
    collected: "",
    pending: "",
    status: "Pendiente",
    responsible: "",
    commitmentDate: "",
    nextAction: "",
    source: "",
  }));
  const [inhouseForm, setInhouseForm] = useState(() => ({
    reportDate: ecuadorClock().dateInput,
    davPending: "",
    urgentDav: "",
    readyForPickup: "",
    checklistPending: "",
    storageAlerts: "",
    responsible: "",
    nextAction: "",
    source: "",
    note: "",
  }));
  const [payrollForm, setPayrollForm] = useState(() => ({
    reportMonth: ecuadorClock().dateInput.slice(0, 7),
    headcount: "",
    basePayroll: "",
    employerCost: "",
    newHires: "",
    exits: "",
    source: "",
    note: "",
  }));
  const [billingForm, setBillingForm] = useState(() => ({
    reportDate: ecuadorClock().dateInput,
    daiAccumulated: "",
    regulatoryAccumulated: "",
    extrasAccumulated: "",
    invoicedToday: "",
    invoicesToday: "",
    readyToInvoice: "",
    completedPending: "",
    blocked: "",
    responsible: "",
    source: "",
    note: "",
  }));
  const [dispatchForm, setDispatchForm] = useState(() => ({
    reportDate: ecuadorClock().dateInput,
    referencesLive: "",
    highRisk: "",
    readyToInvoice: "",
    compliancePercent: "",
    groupWongPending: "",
    ecuasigadStatus: "Sin respuesta de ECUASIGAD",
    responsible: "María Fernanda Manrique",
    nextAction: "",
    source: "",
    note: "",
  }));
  useEffect(() => {
    fetch("/api/opportunities")
      .then((r) => (r.ok ? r.json() : { opportunities: [] }))
      .then((d) => setSaved(d.opportunities ?? []))
      .catch(() => {});
    fetch("/api/updates")
      .then((r) => (r.ok ? r.json() : { updates: [] }))
      .then((d) => setUpdates(d.updates ?? []))
      .catch(() => {});
    fetch("/api/report-uploads")
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d) => { setDailyReports(d.reports ?? []); setVoidedReports(d.voidedReports ?? []); })
      .catch(() => {});
    fetch("/api/regulatory")
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then((d) => setRegulatorySnapshots(d.snapshots ?? []))
      .catch(() => {});
    fetch("/api/financial")
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then((d) => setFinancialSnapshots(d.snapshots ?? []))
      .catch(() => {});
    fetch("/api/receivables")
      .then((r) =>
        r.ok ? r.json() : { snapshots: [], collections: [] },
      )
      .then((d) => {
        setReceivableSnapshots(d.snapshots ?? []);
        setCollectionUpdates(d.collections ?? []);
      })
      .catch(() => {});
    fetch("/api/client-controls").then((r)=>r.ok?r.json():{controls:[]}).then((d)=>setClientControls(d.controls??[])).catch(()=>{});
    fetch("/api/inhouse")
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then((d) => setInhouseSnapshots(d.snapshots ?? []))
      .catch(() => {});
    fetch("/api/billing")
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then((d) => setBillingSnapshots(d.snapshots ?? []))
      .catch(() => {});
    fetch("/api/dispatch")
      .then((r) => (r.ok ? r.json() : { snapshots: [] }))
      .then((d) => setDispatchSnapshots(d.snapshots ?? []))
      .catch(() => {});
    if (currentUser.canManagePayroll) {
      fetch("/api/payroll")
        .then((r) => (r.ok ? r.json() : { snapshots: [] }))
        .then((d) => setPayrollSnapshots(d.snapshots ?? []))
        .catch(() => {});
    }
  }, [currentUser.canManagePayroll]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(ecuadorClock()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const savedLastSeen = Number(window.localStorage.getItem(`macobsa:last-seen-report:${currentUser.email}`) ?? 0);
    if (Number.isFinite(savedLastSeen)) setLastSeenReportId(savedLastSeen);
    const savedLastSeenUpdate = Number(window.localStorage.getItem(`macobsa:last-seen-update:${currentUser.email}`) ?? 0);
    if (Number.isFinite(savedLastSeenUpdate)) setLastSeenUpdateId(savedLastSeenUpdate);
  }, [currentUser.email]);
  useEffect(() => {
    let active = true;
    const refreshLiveRecords = async () => {
      try {
        const [updatesResponse, reportsResponse, opportunitiesResponse, billingResponse, regulatoryResponse, dispatchResponse, financialResponse, inhouseResponse, receivablesResponse, clientControlsResponse, payrollResponse] = await Promise.all([
          fetch("/api/updates", { cache: "no-store" }),
          fetch("/api/report-uploads", { cache: "no-store" }),
          fetch("/api/opportunities", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
          fetch("/api/regulatory", { cache: "no-store" }),
          fetch("/api/dispatch", { cache: "no-store" }),
          fetch("/api/financial", { cache: "no-store" }),
          fetch("/api/inhouse", { cache: "no-store" }),
          fetch("/api/receivables", { cache: "no-store" }),
          fetch("/api/client-controls", { cache: "no-store" }),
          currentUser.canManagePayroll ? fetch("/api/payroll", { cache: "no-store" }) : Promise.resolve(null),
        ]);
        const [updatesData, reportsData, opportunitiesData, billingData, regulatoryData, dispatchData, financialData, inhouseData, receivablesData, clientControlsData, payrollData] = await Promise.all([
          updatesResponse.ok ? updatesResponse.json() : Promise.resolve(null),
          reportsResponse.ok ? reportsResponse.json() : Promise.resolve(null),
          opportunitiesResponse.ok ? opportunitiesResponse.json() : Promise.resolve(null),
          billingResponse.ok ? billingResponse.json() : Promise.resolve(null),
          regulatoryResponse.ok ? regulatoryResponse.json() : Promise.resolve(null),
          dispatchResponse.ok ? dispatchResponse.json() : Promise.resolve(null),
          financialResponse.ok ? financialResponse.json() : Promise.resolve(null),
          inhouseResponse.ok ? inhouseResponse.json() : Promise.resolve(null),
          receivablesResponse.ok ? receivablesResponse.json() : Promise.resolve(null),
          clientControlsResponse.ok ? clientControlsResponse.json() : Promise.resolve(null),
          payrollResponse?.ok ? payrollResponse.json() : Promise.resolve(null),
        ]);
        if (!active) return;
        if (updatesData) setUpdates(updatesData.updates ?? []);
        if (reportsData) { setDailyReports(reportsData.reports ?? []); setVoidedReports(reportsData.voidedReports ?? []); }
        if (opportunitiesData) setSaved(opportunitiesData.opportunities ?? []);
        if (billingData) setBillingSnapshots(billingData.snapshots ?? []);
        if (regulatoryData) setRegulatorySnapshots(regulatoryData.snapshots ?? []);
        if (dispatchData) setDispatchSnapshots(dispatchData.snapshots ?? []);
        if (financialData) setFinancialSnapshots(financialData.snapshots ?? []);
        if (inhouseData) setInhouseSnapshots(inhouseData.snapshots ?? []);
        if (receivablesData) {
          setReceivableSnapshots(receivablesData.snapshots ?? []);
          setCollectionUpdates(receivablesData.collections ?? []);
        }
        if (clientControlsData) setClientControls(clientControlsData.controls ?? []);
        if (payrollData) setPayrollSnapshots(payrollData.snapshots ?? []);
        setLastLiveSync(new Date());
      } catch {
        // Preserve the last valid data when connectivity is temporarily unavailable.
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshLiveRecords();
    };
    const timer = window.setInterval(refreshLiveRecords, 10000);
    window.addEventListener("focus", refreshLiveRecords);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    void refreshLiveRecords();
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshLiveRecords);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [currentUser.canManagePayroll]);
  useEffect(() => {
    if (section !== "Pedidos agosto") return;
    const params = new URLSearchParams({
      page: String(orderPage),
      status: orderStatus,
      q: query,
    });
    if (orderFrom) params.set("from", orderFrom);
    if (orderTo) params.set("to", orderTo);
    if (orderClient) params.set("client", orderClient);
    fetch(`/api/orders?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setOrderRows(d.orders);
          setOrderTotal(d.total);
          setOrderPages(d.pages);
          setDistricts(d.districts ?? []);
          setOrderClients(d.clients ?? []);
          setOrderCumulative(d.cumulativeByClientDate ?? []);
        }
      })
      .catch(() => {});
  }, [section, orderPage, orderStatus, query, orderFrom, orderTo, orderClient]);
  const filtered = useMemo(
      () =>
        [...saved, ...reportedOpportunities].filter((o) =>
          `${o.client} ${o.title} ${o.owner}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      [saved, query],
    );
  const opportunityAlerts = useMemo(() => {
    const today = ecuadorClock().dateInput;
    return filtered.filter((o) => o.dueDate && o.dueDate < today && !["Ganada", "Perdida"].includes(o.stage));
  }, [filtered]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/opportunities", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...form, value: Number(form.value) }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSaved((p) => [d.opportunity, ...p]);
      setModal(false);
      setForm({
        client: "",
        title: "",
        value: "",
        stage: "Calificación",
        owner: "",
        nextAction: "",
        dueDate: "",
        source: "",
      });
    } finally {
      setSaving(false);
    }
  }
  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isCommercial = updateForm.area === "Comercial";
      const commercialDetail = isCommercial
        ? [
            `Cliente u oportunidad: ${commercialLiveForm.client}`,
            `Situación y antecedente: ${commercialLiveForm.situation}`,
            `Gestión realizada: ${commercialLiveForm.actionTaken}`,
            `Respuesta o resultado: ${commercialLiveForm.clientResponse}`,
            `Próxima acción: ${commercialLiveForm.nextAction}`,
            `Fecha compromiso: ${commercialLiveForm.commitmentDate}`,
            `Evidencia o fuente: ${commercialLiveForm.evidence}`,
          ].join("\n")
        : updateForm.detail;
      const payload = isCommercial ? {
        ...updateForm,
        title: `${commercialLiveForm.client} · ${commercialLiveForm.subject}`,
        detail: commercialDetail,
        metric: commercialLiveForm.metric,
        responsible: reportResponsibles.Comercial.name,
      } : updateForm;
      const r = await fetch("/api/updates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setUpdates((p) => [d.update, ...p]);
      setUpdateForm({ ...updateForm, title: "", detail: "", metric: "" });
      if (isCommercial) setCommercialLiveForm({ client: "", subject: "", situation: "", actionTaken: "", clientResponse: "", nextAction: "", commitmentDate: "", evidence: "", metric: "" });
    } finally {
      setSaving(false);
    }
  }
  async function selectDailyReport(file: File | null) {
    setDailyFile(file);
    setRegulatoryPreview(null);
    setFinancialPreview(null);
    if (!file || (uploadArea !== "Regulatorio" && uploadArea !== "Financiero")) {
      setUploadMessage("");
      return;
    }
    if (file.size > MAX_REPORT_FILE_SIZE) {
      setUploadMessage("El archivo supera el máximo de 15 MB.");
      return;
    }
    if (uploadArea === "Financiero") {
      if (file.name.split(".").pop()?.toLowerCase() !== "pdf") {
        setUploadMessage("Para automatizar Cartera utilice el informe PDF.");
        return;
      }
      if (file.size > DIRECT_UPLOAD_LIMIT) {
        setUploadMessage("Archivo grande listo. Se cargará automáticamente por partes y se validará al confirmar.");
        return;
      }
      setPreviewingReport(true);
      setUploadMessage("Leyendo y conciliando el informe de cartera…");
      try {
        const body = new FormData();
        body.set("area", "Financiero");
        body.set("file", file);
        const response = await fetch("/api/report-analysis", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No fue posible leer el PDF de cartera.");
        setFinancialPreview(data.analysis);
        setUploadMessage("Lectura terminada. Revise las cifras antes de confirmar.");
      } catch (error) {
        const reason = error instanceof Error ? error.message : "No fue posible leer automáticamente el informe.";
        setUploadMessage(`${reason} Puede confirmar la carga para conservar el PDF como evidencia y revisarlo posteriormente.`);
      } finally {
        setPreviewingReport(false);
      }
      return;
    }
    if (file.name.split(".").pop()?.toLowerCase() !== "docx") {
      setUploadMessage("Para automatizar Regulatorio utilice el informe Word .docx.");
      return;
    }
    setPreviewingReport(true);
    setUploadMessage("Leyendo y validando el informe…");
    try {
      const analysis = parseRegulatoryReport(await extractDocxText(file));
      if (!analysis) throw new Error("No fue posible identificar todos los indicadores obligatorios de Regulatorio.");
      setRegulatoryPreview(analysis);
      setUploadMessage("Lectura terminada. Revise la vista previa antes de confirmar.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "No fue posible leer el informe.");
    } finally {
      setPreviewingReport(false);
    }
  }
  async function submitDailyReport(e: React.FormEvent) {
    e.preventDefault();
    if (!dailyFile) {
      setUploadMessage("Seleccione el informe Word o PDF.");
      return;
    }
    if (dailyFile.size > MAX_REPORT_FILE_SIZE) {
      setUploadMessage("El archivo supera el máximo de 15 MB.");
      return;
    }
    setSaving(true);
    setUploadMessage("Preparando el informe…");
    try {
      const extension = dailyFile.name.split(".").pop()?.toLowerCase();
      let extractedText = uploadSummary.trim();
      if (extension === "docx") {
        const wordText = await extractDocxText(dailyFile);
        extractedText = [wordText, uploadSummary.trim()].filter(Boolean).join("\n\nNota adicional:\n");
      }
      const analysis = uploadArea === "Regulatorio" ? parseRegulatoryReport(extractedText) : null;
      if (uploadArea === "Regulatorio" && !analysis) {
        throw new Error("El Word no contiene los indicadores obligatorios de Regulatorio.");
      }
      const fields = {
        area: uploadArea,
        reportDate: uploadDate,
        responsible: reportResponsibles[uploadArea].name,
        extractedText,
      };
      let response: Response;
      if (dailyFile.size > DIRECT_UPLOAD_LIMIT) {
        setUploadMessage("Cargando archivo grande en partes seguras…");
        response = await uploadReportInParts(dailyFile, fields);
      } else {
        const body = new FormData();
        Object.entries(fields).forEach(([key, value]) => body.set(key, value));
        body.set("file", dailyFile);
        response = await fetch("/api/report-uploads", { method: "POST", body });
      }
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "No fue posible cargar el informe");
      setUpdates((previous) => [data.update, ...previous]);
      setDailyReports((previous) => [data.report, ...previous.filter((report) => report.id !== data.report.id)]);
      setVoidedReports((previous) => previous.filter((report) => report.id !== data.report.id));
      if (data.regulatoryAnalysis) {
        setRegulatorySnapshots((previous) => [{
          ...data.regulatoryAnalysis,
          id: data.report.id,
          reportDate: data.report.reportDate,
          responsible: data.report.responsible,
          originalName: data.report.originalName,
          submittedBy: data.report.submittedBy,
          createdAt: data.report.createdAt,
        }, ...previous]);
      }
      if (data.financialAnalysis) {
        setFinancialSnapshots((previous) => [{
          ...data.financialAnalysis,
          id: data.report.id,
          reportDate: data.report.reportDate,
          responsible: data.report.responsible,
          originalName: data.report.originalName,
          submittedBy: data.report.submittedBy,
          createdAt: data.report.createdAt,
        }, ...previous]);
      }
      if (data.billingSnapshot) {
        setBillingSnapshots((previous) => [data.billingSnapshot, ...previous]);
      }
      if (data.dispatchSnapshot) {
        setDispatchSnapshots((previous) => [data.dispatchSnapshot, ...previous]);
      }
      if (data.inhouseSnapshot) {
        setInhouseSnapshots((previous) => [data.inhouseSnapshot, ...previous]);
      }
      setDailyFile(null);
      setRegulatoryPreview(null);
      setFinancialPreview(null);
      setUploadSummary("");
      setFileInputKey((value) => value + 1);
      setUploadMessage(uploadArea === "Facturación"
        ? "Informe recibido y cifras de Facturación actualizadas. Verifique la evidencia en Archivos recibidos recientemente."
        : uploadArea === "Inhouse El Rosado"
          ? data.inhouseSnapshot
            ? "Informe recibido, leído y aplicado automáticamente al control de Inhouse El Rosado."
            : "Informe recibido y conservado. El sistema no identificó todos los indicadores y lo dejó señalado para revisión interna; no debe volver a cargarlo ni llenar campos adicionales."
          : data.processingStatus === "Procesado automáticamente"
            ? "Informe recibido, procesado automáticamente y aplicado a las métricas del área."
            : data.processingStatus === "Procesado documental"
              ? "Informe recibido y leído. El contenido ya consta en el historial para seguimiento."
              : "Informe recibido y conservado. Los indicadores no identificados quedaron señalados para revisión interna; no debe repetir la carga.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "No fue posible cargar el informe");
    } finally {
      setSaving(false);
    }
  }
  async function annulBillingReport(report: DailyReportUpload) {
    const reason = window.prompt(`Motivo para anular el informe de ${report.responsible} del ${report.reportDate}:`, "Informe equivocado; se cargará la versión corregida.");
    if (reason === null) return;
    if (reason.trim().length < 10) { setUploadMessage("Explique el motivo en al menos 10 caracteres."); return; }
    if (!window.confirm(`¿Anular el informe del ${report.reportDate}? Sus cifras dejarán de alimentar el CRM.`)) return;
    setVoidingReportId(report.id);
    try {
      const response = await fetch(`/api/report-uploads/${report.id}/void`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "No fue posible anular el informe");
      const endpoints = ["report-uploads", "updates", "billing"];
      const refreshed = await Promise.all(endpoints.map(async (endpoint) => {
        const result = await fetch(`/api/${endpoint}`, { cache: "no-store" });
        if (!result.ok) throw new Error(`No se pudo actualizar ${endpoint}`);
        return result.json();
      }));
      setDailyReports(refreshed[0].reports ?? []);
      setVoidedReports(refreshed[0].voidedReports ?? []);
      setUpdates(refreshed[1].updates ?? []);
      setBillingSnapshots(refreshed[2].snapshots ?? []);
      setReportToRead(null);
      setUploadArea("Facturación");
      setUploadDate(report.reportDate);
      setDailyFile(null);
      setFileInputKey((value) => value + 1);
      setUploadMessage("Informe anulado y retirado de los tableros. Seleccione el PDF corregido y cárguelo para la misma fecha.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "No se pudo confirmar la anulación.");
    } finally { setVoidingReportId(null); }
  }
  async function loadCorrectionHistory(reportId: number) {
    try {
      const response = await fetch(`/api/report-uploads/${reportId}/history`, { cache: "no-store" });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "No se pudo leer el historial");
      setCorrectionHistory((current) => ({ ...current, [reportId]: data.versions ?? [] }));
    } catch (error) { setUploadMessage(error instanceof Error ? error.message : "No se pudo leer el historial"); }
  }
  async function submitSnapshot(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/receivables", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "snapshot", ...snapshotForm }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setReceivableSnapshots((previous) => [d.snapshot, ...previous]);
      setSnapshotForm({
        ...snapshotForm,
        portfolioTotal: "",
        contractualOverdue: "",
        collectedToday: "",
        newBilling: "",
        confirmedPending: "",
        projectedPortfolio: "",
        reimbursementsOverdue: "",
        over90: "",
        source: "",
        note: "",
      });
    } finally {
      setSaving(false);
    }
  }
  async function submitCollection(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/receivables", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "collection", ...collectionForm }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setCollectionUpdates((previous) => [d.collection, ...previous]);
      setCollectionForm({
        ...collectionForm,
        client: "",
        committed: "",
        collected: "",
        pending: "",
        commitmentDate: "",
        nextAction: "",
        source: "",
      });
    } finally {
      setSaving(false);
    }
  }
  async function submitClientControl(e:React.FormEvent){
    e.preventDefault();setSaving(true);
    try{const r=await fetch("/api/client-controls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(clientControlForm)}),d=await r.json();if(!r.ok)throw Error(d.error);setClientControls((p)=>[d.control,...p]);setClientControlForm({...clientControlForm,client:"",cutoffDate:"",nextCutoffDate:"",unbilled:"",carryover:"",fundAssigned:"",fundUsed:"",fundStatus:"Pendiente de confirmar",source:"",note:""});}finally{setSaving(false);}
  }
  async function submitInhouse(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/inhouse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inhouseForm),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setInhouseSnapshots((previous) => [d.snapshot, ...previous]);
      setInhouseForm({
        ...inhouseForm,
        davPending: "",
        urgentDav: "",
        readyForPickup: "",
        checklistPending: "",
        storageAlerts: "",
        nextAction: "",
        source: "",
        note: "",
      });
    } finally {
      setSaving(false);
    }
  }
  async function submitPayroll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/payroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payrollForm),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setPayrollSnapshots((previous) => [d.snapshot, ...previous]);
      setPayrollForm({
        ...payrollForm,
        headcount: "",
        basePayroll: "",
        employerCost: "",
        newHires: "",
        exits: "",
        source: "",
        note: "",
      });
    } finally {
      setSaving(false);
    }
  }
  async function submitBilling(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(billingForm) });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setBillingSnapshots((previous) => [d.snapshot, ...previous]);
      setBillingForm({ ...billingForm, daiAccumulated: "", regulatoryAccumulated: "", extrasAccumulated: "", invoicedToday: "", invoicesToday: "", readyToInvoice: "", completedPending: "", blocked: "", source: "", note: "" });
    } finally {
      setSaving(false);
    }
  }
  async function submitDispatch(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/dispatch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dispatchForm) });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setDispatchSnapshots((previous) => [d.snapshot, ...previous]);
      setDispatchForm({ ...dispatchForm, referencesLive: "", highRisk: "", readyToInvoice: "", compliancePercent: "", groupWongPending: "", nextAction: "", source: "", note: "" });
    } finally {
      setSaving(false);
    }
  }
  const latestDispatch = dispatchSnapshots[0] ?? {
    referencesLive: 468,
    highRisk: 7,
    readyToInvoice: 45,
    complianceBasisPoints: 7560,
    groupWongPending: 21,
    reportDate: "2026-09-02",
    responsible: "Pendiente de actualización",
    source: "Corte histórico de respaldo; requiere actualización",
  };
  const openPersistentAlertCount = persistentAlerts.filter((alert) => alert[3] !== "Resuelta").length;
  const latestRegulatory = regulatorySnapshots[0] ?? null;
  const latestFinancial = financialSnapshots[0] ?? null;
  const financialIsCashControl = latestFinancial?.format === "cash_control";
  const currentReceivable = latestFinancial ?? {
    reportDate: "2026-09-03",
    accountingPortfolioCents: receivableUpdate03Sep.accountingPortfolio,
    effectiveCollectionsCents: receivableUpdate03Sep.effectiveCollections,
    newBillingCents: receivableUpdate03Sep.newBilling,
    confirmedPendingCents: receivableUpdate03Sep.confirmedPending,
    overduePendingCents: receivableUpdate03Sep.overduePending,
    projectedPortfolioCents: receivableUpdate03Sep.projectedPortfolio,
    basePortfolioCents: receivableUpdate03Sep.basePortfolio,
    additionalPotentialCents: receivableUpdate03Sep.additionalPotential,
    originalName: receivableUpdate03Sep.source,
    responsible: "Bryan Quinde",
    submittedBy: MARIO_EMAIL,
    createdAt: "",
    warnings: [] as string[],
  };
  const latestBilling = billingSnapshots[0] ?? null;
  const availableBilling = latestBilling && latestBilling.reportDate >= verifiedBillingCut10Sep.reportDate
    ? billingSnapshots
    : [verifiedBillingCut10Sep, ...billingSnapshots];
  const effectiveBilling = latestValidBillingCut(availableBilling, clock.dateInput) ?? verifiedBillingCut10Sep;
  const previousBillingCut = [...availableBilling]
    .filter((cut) => cut.reportDate < effectiveBilling.reportDate)
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0] ?? null;
  const statedExtrasIncrease = effectiveBilling.note.match(/(?:Adicionales|Extras)\s+aumentan\s+USD\s*([\d.,]+)/i)?.[1];
  const statedExtrasIncreaseValue = statedExtrasIncrease
    ? Number(statedExtrasIncrease.includes(",") ? statedExtrasIncrease.replace(/\./g, "").replace(",", ".") : statedExtrasIncrease)
    : null;
  const statedExtrasIncreaseCents = statedExtrasIncreaseValue === null ? null : Math.round(statedExtrasIncreaseValue * 100);
  const actualExtrasIncreaseCents = previousBillingCut
    ? effectiveBilling.extrasAccumulatedCents - previousBillingCut.extrasAccumulatedCents
    : null;
  const billingReconciliationWarning = statedExtrasIncreaseCents !== null
    && actualExtrasIncreaseCents !== null
    && statedExtrasIncreaseCents !== actualExtrasIncreaseCents
    ? `La observación del corte declara un aumento de ${exactMoney(statedExtrasIncreaseCents)}. Los acumulados de Extras al ${previousBillingCut.reportDate} (${exactMoney(previousBillingCut.extrasAccumulatedCents)}) y al ${effectiveBilling.reportDate} (${exactMoney(effectiveBilling.extrasAccumulatedCents)}) implican ${exactMoney(actualExtrasIncreaseCents)}: hay ${exactMoney(Math.abs(statedExtrasIncreaseCents - actualExtrasIncreaseCents))} de diferencia. Confirme los comprobantes del 25-sep antes de cambiar la cifra fuente.`
    : effectiveBilling.note && /conciliaci[oó]n/i.test(effectiveBilling.note) && /(?:pendiente|confirmar|requiere|requieren|sin cerrar|antes de marcar)/i.test(effectiveBilling.note)
      ? effectiveBilling.note
      : "";
  const dashboardReportDate = effectiveBilling.reportDate;
  const dashboardRegulatory = regulatorySnapshots.find((snapshot) => snapshot.reportDate === dashboardReportDate) ?? null;
  const dashboardCommercial = commercialSnapshots.find((snapshot) => snapshot.reportDate === dashboardReportDate) ?? null;
  const currentDispatch = dispatchSnapshots.find((snapshot) => snapshot.reportDate === dashboardReportDate) ?? latestDispatch;
  const billingReportDate = effectiveBilling.reportDate;
  const dashboardDaiCents = effectiveBilling.daiAccumulatedCents;
  const dashboardExtrasCents = effectiveBilling.extrasAccumulatedCents;
  const billingRegulatoryCents = effectiveBilling.regulatoryAccumulatedCents;
  const dashboardRegulatoryCents = billingRegulatoryCents;
  const dashboardTotalCents = dashboardDaiCents + dashboardRegulatoryCents + dashboardExtrasCents;
  const dashboardCoreDates = [billingReportDate, latestRegulatory?.reportDate, latestCommercial?.reportDate, latestDispatch.reportDate].filter(Boolean) as string[];
  const dashboardCutIsConsistent = dashboardReportDate === billingReportDate && dashboardTotalCents > 0;
  const dashboardHeaderIsValidated = dashboardCutIsConsistent && !billingReconciliationWarning;
  const regulatoryConflict = !!dashboardRegulatory && dashboardRegulatory.billedAccumulatedCents !== billingRegulatoryCents;
  const billingTodayCents = effectiveBilling.invoicedTodayCents;
  const billingTodayInvoices = effectiveBilling.invoicesToday;
  const commercialConflict = !!dashboardCommercial && dashboardCommercial.billedAccumulatedCents !== dashboardDaiCents;
  const daiProgress = (dashboardDaiCents / 31_000_000) * 100;
  const regulatoryProgress = (dashboardRegulatoryCents / 3_000_000) * 100;
  const extrasProgress = (dashboardExtrasCents / 2_000_000) * 100;
  const totalProgress = (dashboardTotalCents / 36_000_000) * 100;
  const liveCommitteeAreas = committeeAreas.map((area) => {
    if (area.area === "Comercial") return {
      ...area,
      cut: latestCommercial ? `Corte Comercial ${compactReportDate(latestCommercial.reportDate)}` : `Corte Facturación ${compactReportDate(billingReportDate)}`,
      metrics: [
        `${exactMoney(latestCommercial?.billedAccumulatedCents ?? dashboardDaiCents)} facturación comercial`,
        latestCommercial ? `${latestCommercial.ordersAccumulated} pedidos · ${latestCommercial.ordersToday} hoy` : `${daiProgress.toFixed(1).replace(".", ",")}% de $310.000`,
        latestCommercial ? `${latestCommercial.newClientsAccumulated} clientes nuevos · ${latestCommercial.activeTenders} licitaciones activas` : area.metrics[2],
      ],
      alert: commercialConflict
        ? `Diferencia de ${exactMoney(Math.abs(latestCommercial!.billedAccumulatedCents - dashboardDaiCents))} frente a Facturación; requiere conciliación sin alterar las fuentes.`
        : latestCommercial ? `Informe procesado desde ${latestCommercial.originalName}.` : area.alert,
    };
    if (area.area === "Operaciones") return {
      ...area,
      cut: `Corte Facturación ${compactReportDate(billingReportDate)}`,
      metrics: [
        `${exactMoney(dashboardExtrasCents)} en Extras`,
        `${extrasProgress.toFixed(1).replace(".", ",")}% de la meta`,
        "Meta extras: $20.000",
      ],
    };
    if (area.area === "Despacho") return {
      ...area,
      cut: `Corte ${compactReportDate(currentDispatch.reportDate)}`,
      metrics: [
        `${currentDispatch.referencesLive} referencias vivas`,
        `${currentDispatch.highRisk} en riesgo alto`,
        `${(currentDispatch.complianceBasisPoints / 100).toFixed(1).replace(".", ",")}% cumplimiento`,
      ],
      alert: `${currentDispatch.readyToInvoice} trámites listos por facturar; ${currentDispatch.groupWongPending} pendientes de Grupo Wong.`,
    };
    if (area.area === "Regulatorio") return {
      ...area,
      cut: `Corte ${compactReportDate(latestRegulatory?.reportDate ?? billingReportDate)}`,
      metrics: [
        `${exactMoney(dashboardRegulatoryCents)} acumulados`,
        `${regulatoryProgress.toFixed(1).replace(".", ",")}% de la meta $30.000`,
        "Meta oficial $30.000",
      ],
    };
    if (area.area === "Facturación") return {
      ...area,
      cut: `Corte ${compactReportDate(billingReportDate)}`,
      metrics: [
        `${exactMoney(dashboardTotalCents)} total acumulado`,
        `${totalProgress.toFixed(2).replace(".", ",")}% de $360.000`,
        `${exactMoney(billingTodayCents)} hoy · ${billingTodayInvoices} trámites`,
      ],
      alert: `Corte procesado desde ${effectiveBilling.source}.`,
    };
    if (area.area === "Financiero" && latestFinancial) return {
      ...area,
      cut: `Corte ${compactReportDate(latestFinancial.reportDate)}`,
      metrics: [
        `${exactMoney(latestFinancial.accountingPortfolioCents)} ${financialIsCashControl ? "disponibilidad bancaria" : "cartera contable"}`,
        `${exactMoney(latestFinancial.confirmedPendingCents)} cobros confirmados pendientes`,
        `${exactMoney(latestFinancial.projectedPortfolioCents)} ${financialIsCashControl ? "ingresos + confirmados" : "cartera proyectada"}`,
      ],
      alert: latestFinancial.warnings.length
        ? latestFinancial.warnings.join(" ")
        : `Informe procesado desde ${latestFinancial.originalName}.`,
    };
    return area;
  });
  const liveExecutiveSummary = `MACOBSA · Corte ejecutivo al ${compactReportDate(dashboardReportDate)}\nAcumulado: ${exactMoney(dashboardTotalCents)} de $360.000 (${totalProgress.toFixed(2).replace(".", ",") }%).\nMetas oficiales: DAI/declaraciones $310.000; Regulatorio $30.000; Extras $20.000.\nAvance: DAI ${exactMoney(dashboardDaiCents)} (${daiProgress.toFixed(1).replace(".", ",")}%); Regulatorio ${exactMoney(dashboardRegulatoryCents)} (${regulatoryProgress.toFixed(1).replace(".", ",")}%); Extras ${exactMoney(dashboardExtrasCents)} (${extrasProgress.toFixed(1).replace(".", ",") }%).\nProducción del último informe de Facturación: ${exactMoney(billingTodayCents)} en ${billingTodayInvoices} trámites.\nDespacho: ${currentDispatch.referencesLive} referencias vivas; ${currentDispatch.highRisk} en riesgo alto; ${currentDispatch.readyToInvoice} trámites listos por facturar.\nFuente: ${effectiveBilling.source}.`;
  const intelligencePriorities = [
    currentDispatch.readyToInvoice > 0 ? {
      level: "CRÍTICA", score: 100, area: "Facturación + Despacho",
      title: `Convertir ${currentDispatch.readyToInvoice} trámites listos en facturación`,
      reason: `Existe trabajo terminado que todavía no se refleja en caja. ${currentDispatch.groupWongPending} corresponden a Grupo Wong.`,
      action: "Conciliar el listado, asignar responsable por trámite y confirmar emisión hoy.",
      owner: "Rebeca Sánchez · María Fernanda Manrique",
    } : null,
    currentDispatch.highRisk > 0 ? {
      level: "ALTA", score: 90, area: "Despacho",
      title: `Resolver ${currentDispatch.highRisk} referencias de riesgo alto`,
      reason: "La permanencia sin resolución incrementa costo, retraso y exposición frente al cliente.",
      action: "Presentar causa, impacto, responsable y hora comprometida de solución para cada referencia.",
      owner: "María Fernanda Manrique",
    } : null,
    commercialConflict ? {
      level: "ALTA", score: 88, area: "Comercial + Facturación",
      title: "Conciliar la diferencia de facturación entre áreas",
      reason: `Comercial y Facturación difieren en ${exactMoney(Math.abs(dashboardCommercial!.billedAccumulatedCents - dashboardDaiCents))}.`,
      action: "Identificar el documento origen y confirmar una cifra oficial sin borrar ninguna evidencia.",
      owner: "Carolina Herrera · Rebeca Sánchez",
    } : null,
    regulatoryConflict ? {
      level: "ALTA", score: 86, area: "Regulatorio + Facturación",
      title: "Conciliar el acumulado de Regulatorio",
      reason: "Los informes del mismo corte presentan cifras diferentes.",
      action: "Validar trámites facturados contra el detalle y fijar la cifra conciliada del corte.",
      owner: "Lilibeth Terranova · Rebeca Sánchez",
    } : null,
    currentReceivable.confirmedPendingCents > 0 ? {
      level: "ALTA", score: 84, area: "Financiero",
      title: `Asegurar ${exactMoney(currentReceivable.confirmedPendingCents)} confirmados pendientes`,
      reason: "Un cobro confirmado todavía no acreditado no es caja disponible.",
      action: "Verificar banco, cliente, documento aplicado y hora de acreditación.",
      owner: "Bryan Quinde",
    } : null,
    extrasProgress < totalProgress ? {
      level: "MEDIA", score: 65, area: "Operaciones",
      title: "Acelerar la línea de Extras",
      reason: `Avanza ${extrasProgress.toFixed(1).replace(".", ",")}% y se encuentra por debajo del avance total de ${totalProgress.toFixed(1).replace(".", ",")}%.`,
      action: "Convertir oportunidades inmediatas en servicios facturables y registrar valor y fecha.",
      owner: "Vanessa Naranjo",
    } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.score - a.score);
  const intelligenceScore = Math.max(0, 100
    - Math.min(currentDispatch.highRisk * 2, 24)
    - Math.min(currentDispatch.readyToInvoice, 24)
    - (commercialConflict ? 12 : 0)
    - (regulatoryConflict ? 10 : 0));
  const reportOwner = reportResponsibles[reportArea];
  const allReportEntries = useMemo<IndividualReportEntry[]>(() => {
    const departmentEntries = updates
      .filter((item) => item.area in reportResponsibles)
      .map((item) => ({
        ...item,
        id: `update-${item.id}`,
        area: item.area as ReportArea,
      }));
    const importedBilling: IndividualReportEntry = {
      id: "billing-import-2026-09-03",
      area: "Facturación",
      title: "Corte diario de facturación conciliado",
      detail: `DAI acumulado: ${exactMoney(billingCut03Sep.dai)}. Regulatorio: ${exactMoney(billingCut03Sep.regulatory)}. Extras: ${exactMoney(billingCut03Sep.extras)}. Facturación del día: ${exactMoney(billingCut03Sep.today)} en ${billingCut03Sep.invoices} trámites. Fuente: ${billingCut03Sep.source}.`,
      metric: `${exactMoney(billingCut03Sep.total)} acumulado`,
      status: "Completado",
      responsible: "Rebeca Sánchez",
      reportDate: "2026-09-03",
      submittedBy: MARIO_EMAIL,
      createdAt: "",
    };
    const billingEntries: IndividualReportEntry[] = billingSnapshots.map((item) => ({
      id: `billing-${item.id}`,
      area: "Facturación",
      title: "Corte diario de facturación",
      detail: `DAI: ${exactMoney(item.daiAccumulatedCents)}. Regulatorio: ${exactMoney(item.regulatoryAccumulatedCents)}. Extras: ${exactMoney(item.extrasAccumulatedCents)}. Facturado hoy: ${exactMoney(item.invoicedTodayCents)} en ${item.invoicesToday} trámites.${item.note ? ` Observación: ${item.note}.` : ""} Fuente: ${item.source}.`,
      metric: `${exactMoney(item.daiAccumulatedCents + item.regulatoryAccumulatedCents + item.extrasAccumulatedCents)} acumulado`,
      status: item.blocked && item.blocked > 0 ? "En riesgo" : "En seguimiento",
      responsible: item.responsible,
      reportDate: item.reportDate,
      submittedBy: item.submittedBy,
      createdAt: item.createdAt,
    }));
    const importedDispatch: IndividualReportEntry = {
      id: "dispatch-import-2026-09-03",
      area: "Despacho",
      title: "Seguimiento de Despacho · histórico (03 sep)",
      detail: `${latestDispatchUpdate.facts.join(" ")} ${latestDispatchUpdate.attributed} Fuente: comentario remitido por María Fernanda Manrique.`,
      metric: "45 trámites pendientes de facturación",
      status: "En seguimiento",
      responsible: latestDispatchUpdate.owner,
      reportDate: "2026-09-03",
      submittedBy: MARIO_EMAIL,
      createdAt: "",
    };
    const dispatchEntries: IndividualReportEntry[] = dispatchSnapshots.map((item) => ({
      id: `dispatch-${item.id}`,
      area: "Despacho",
      title: "Corte diario de Despacho",
      detail: `Referencias vivas: ${item.referencesLive}. Riesgo alto: ${item.highRisk}. Listos para facturar: ${item.readyToInvoice}. Cumplimiento: ${(item.complianceBasisPoints / 100).toFixed(1)}%. Grupo Wong pendientes: ${item.groupWongPending}. ECUASIGAD: ${item.ecuasigadStatus}.${item.nextAction ? ` Próxima acción: ${item.nextAction}.` : ""}${item.note ? ` Observación: ${item.note}.` : ""} Fuente: ${item.source}.`,
      metric: `${item.referencesLive} referencias vivas`,
      status: item.highRisk > 0 ? "En riesgo" : "En seguimiento",
      responsible: item.responsible,
      reportDate: item.reportDate,
      submittedBy: item.submittedBy,
      createdAt: item.createdAt,
    }));
    const importedFinance: IndividualReportEntry = {
      id: "finance-import-2026-09-03",
      area: "Financiero",
      title: "Análisis gerencial de cuentas por cobrar",
      detail: `Cartera base: ${exactMoney(receivableUpdate03Sep.basePortfolio)}. Cobros efectivos: ${exactMoney(receivableUpdate03Sep.effectiveCollections)}. Facturación nueva: ${exactMoney(receivableUpdate03Sep.newBilling)}. Cartera contable: ${exactMoney(receivableUpdate03Sep.accountingPortfolio)}. Proyección de cartera: ${exactMoney(receivableUpdate03Sep.projectedPortfolio)}. Fuente: ${receivableUpdate03Sep.source}.`,
      metric: `${exactMoney(receivableUpdate03Sep.identifiedRecovery)} recuperación identificada`,
      status: "En seguimiento",
      responsible: "Bryan Quinde",
      reportDate: "2026-09-03",
      submittedBy: MARIO_EMAIL,
      createdAt: "",
    };
    const financeEntries: IndividualReportEntry[] = receivableSnapshots.map((item) => ({
      id: `receivable-${item.id}`,
      area: "Financiero",
      title: "Corte diario de cuentas por cobrar",
      detail: `Cartera: ${exactMoney(item.portfolioTotalCents)}. Vencido contractual: ${exactMoney(item.contractualOverdueCents)}. Cobrado hoy: ${exactMoney(item.collectedTodayCents)}. Proyección: ${exactMoney(item.projectedPortfolioCents)}.${item.note ? ` Observación: ${item.note}.` : ""} Fuente: ${item.source}.`,
      metric: `${exactMoney(item.portfolioTotalCents)} cartera total`,
      status: item.contractualOverdueCents > 0 ? "En riesgo" : "En seguimiento",
      responsible: item.responsible,
      reportDate: item.reportDate,
      submittedBy: item.submittedBy,
      createdAt: item.createdAt,
    }));
    const uploadedFinanceEntries: IndividualReportEntry[] = financialSnapshots.map((item) => ({
      id: `financial-upload-${item.id}`,
      area: "Financiero",
      title: "Informe de cartera procesado automáticamente",
      detail: `Cartera contable: ${exactMoney(item.accountingPortfolioCents)}. Ingresos efectivos: ${exactMoney(item.effectiveCollectionsCents)}. Nueva facturación: ${exactMoney(item.newBillingCents)}. Confirmado pendiente: ${exactMoney(item.confirmedPendingCents)}. Vencido por confirmar: ${exactMoney(item.overduePendingCents)}. Cartera proyectada: ${exactMoney(item.projectedPortfolioCents)}. Fuente: ${item.originalName}.`,
      metric: `${exactMoney(item.accountingPortfolioCents)} cartera contable`,
      status: item.warnings.length > 0 ? "Revisar" : "Procesado",
      responsible: item.responsible,
      reportDate: item.reportDate,
      submittedBy: item.submittedBy,
      createdAt: item.createdAt,
    }));
    return [
      ...departmentEntries,
      importedBilling,
      ...billingEntries,
      importedDispatch,
      ...dispatchEntries,
      importedFinance,
      ...uploadedFinanceEntries,
      ...financeEntries,
    ].sort((a, b) => b.reportDate.localeCompare(a.reportDate) || b.id.localeCompare(a.id));
  }, [updates, billingSnapshots, dispatchSnapshots, receivableSnapshots, financialSnapshots]);
  const reportResponsibleOptions = useMemo(
    () =>
      Array.from(
        new Set([
          reportOwner.name,
          ...allReportEntries
            .filter((item) => item.area === reportArea)
            .map((item) => item.responsible)
            .filter(Boolean),
        ]),
      ),
    [allReportEntries, reportArea, reportOwner.name],
  );
  const individualUpdates = useMemo(
    () =>
      allReportEntries.filter(
        (item) =>
          item.area === reportArea &&
          item.responsible.toLowerCase() === reportResponsible.toLowerCase() &&
          (!reportFrom || item.reportDate >= reportFrom) && (!reportTo || item.reportDate <= reportTo),
      ),
    [allReportEntries, reportArea, reportResponsible, reportFrom, reportTo],
  );
  const selectedUploadedReports = useMemo(
    () => dailyReports
      .filter((report) => report.area === reportArea && report.responsible.toLowerCase() === reportResponsible.toLowerCase())
      .filter((report) => (!reportFrom || report.reportDate >= reportFrom) && (!reportTo || report.reportDate <= reportTo))
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate) || b.id - a.id),
    [dailyReports, reportArea, reportResponsible, reportFrom, reportTo],
  );
  const individualUploadedReports = useMemo(
    () => dailyReports
      .filter((report) => uploadedAreaFilter === "Todas las áreas" || report.area === uploadedAreaFilter)
      .filter((report) => uploadedResponsibleFilter === "Todos los usuarios" || report.responsible === uploadedResponsibleFilter)
      .filter((report) => !uploadedExactDate || report.reportDate === uploadedExactDate)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate) || b.id - a.id),
    [dailyReports, uploadedAreaFilter, uploadedResponsibleFilter, uploadedExactDate],
  );
  const uploadedAreaOptions = useMemo(() => Array.from(new Set(dailyReports.map((report) => report.area))).sort((a,b)=>a.localeCompare(b,"es")), [dailyReports]);
  const uploadedResponsibleOptions = useMemo(() => Array.from(new Set(dailyReports.filter((report)=>uploadedAreaFilter === "Todas las áreas" || report.area === uploadedAreaFilter).map((report)=>report.responsible))).sort((a,b)=>a.localeCompare(b,"es")), [dailyReports, uploadedAreaFilter]);
  async function generateIndividualReport() {
    if (currentUser.role !== "Dirección General") return;
    setAuthorizingDocument(true);
    try {
      const response = await fetch("/api/document-authorizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: "Informe individual",
          area: reportArea,
          responsible: reportResponsible,
          reportDate: reportFrom || reportTo ? `${reportFrom || "inicio"} a ${reportTo || "actual"}` : "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible autorizar el documento");
      setDocumentAuthorization({
        id: data.authorization.id,
        authorizationCode: data.authorizationCode,
        authorizedBy: data.authorization.authorizedBy,
        createdAt: data.authorization.createdAt,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      const root = document.querySelector(".individual-report") as HTMLElement | null;
      if (!root) throw new Error("No fue posible preparar el informe filtrado");
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(root, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const image = await loadExportImage(dataUrl);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", compress: true });
      const margin = 24;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - 58;
      const scale = contentWidth / image.naturalWidth;
      const sliceHeight = Math.max(1, Math.floor(contentHeight / scale));
      let page = 0;
      for (let top = 0; top < image.naturalHeight; top += sliceHeight) {
        if (page > 0) pdf.addPage("letter", "portrait");
        const height = Math.min(sliceHeight, image.naturalHeight - top);
        pdf.addImage(cropExportImage(image, top, height), "PNG", margin, 18, contentWidth, height * scale, undefined, "FAST");
        pdf.setFontSize(8);
        pdf.setTextColor(70, 88, 105);
        pdf.text(`MACOBSA · Informe ${reportResponsible} · ${data.authorizationCode} · Página ${page + 1}`, margin, pageHeight - 14);
        page += 1;
      }
      const rangeLabel = reportFrom || reportTo ? `${reportFrom || "inicio"}_${reportTo || "actual"}` : "historial";
      const fileName = `MACOBSA_Informe_${safeExportName(reportResponsible)}_${rangeLabel}.pdf`;
      setPreparedDashboardPdf({ blob: pdf.output("blob"), fileName });
      setExportMessage("Informe listo. Pulse “Compartir o guardar PDF”; no se imprimirá la pantalla.");
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "No fue posible generar el informe PDF.");
    } finally {
      setAuthorizingDocument(false);
    }
  }
  async function exportCurrentSection(format: DashboardExportFormat) {
    if (currentUser.role !== "Dirección General" || exportingFormat) return;
    const root = document.getElementById("crm-section-export");
    if (!root) return;
    setExportingFormat(format);
    setExportMessage("");
    if (format === "PDF") setPreparedDashboardPdf(null);
    try {
      const authorizationResponse = await fetch("/api/document-authorizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentType: `Dashboard ${format}`,
          area: section,
          responsible: "Mario Coka",
          reportDate: dashboardReportDate,
        }),
      });
      const authorizationData = await authorizationResponse.json();
      if (!authorizationResponse.ok) throw new Error(authorizationData.error || "No fue posible registrar la autorización");
      const authorizationCode = String(authorizationData.authorizationCode || authorizationData.authorization?.id || "AUTORIZADO");
      const baseName = section === "Control CEO"
        ? `MACOBSA_CEO_Dashboard_${dashboardReportDate}`
        : `MACOBSA_${safeExportName(section)}_${dashboardReportDate}`;

      if (format === "HTML") {
        const styles = Array.from(document.styleSheets).map((sheet) => {
          try { return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n"); }
          catch { return ""; }
        }).join("\n");
        const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${baseName}</title><style>${styles}body{margin:0;background:#f4f7fa}.export-document-meta{font:600 12px Arial;padding:12px 24px;background:#0b2943;color:#fff}</style></head><body><div class="export-document-meta">MACOBSA S.A. · CONFIDENCIAL · Autorizado por Mario Coka · ${authorizationCode}</div><main class="main"><div id="crm-section-export">${root.innerHTML}</div></main></body></html>`;
        const delivery = await shareOrDownloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${baseName}.html`);
        if (delivery === "cancelled") {
          setExportMessage("Se cerró Compartir sin guardar el archivo.");
          return;
        }
      } else {
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(root, { cacheBust: true, pixelRatio: 2, backgroundColor: "#f4f7fa" });
        const image = await loadExportImage(dataUrl);
        if (format === "PDF") {
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", compress: true });
          const margin = 24;
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const contentWidth = pageWidth - margin * 2;
          const contentHeight = pageHeight - 58;
          const scale = contentWidth / image.naturalWidth;
          const sliceHeight = Math.max(1, Math.floor(contentHeight / scale));
          let page = 0;
          for (let top = 0; top < image.naturalHeight; top += sliceHeight) {
            if (page > 0) pdf.addPage("letter", "portrait");
            const height = Math.min(sliceHeight, image.naturalHeight - top);
            const slice = cropExportImage(image, top, height);
            pdf.addImage(slice, "PNG", margin, 18, contentWidth, height * scale, undefined, "FAST");
            pdf.setFontSize(8);
            pdf.setTextColor(70, 88, 105);
            pdf.text(`MACOBSA · ${section} · Autorización ${authorizationCode} · Página ${page + 1}`, margin, pageHeight - 14);
            page += 1;
          }
          setPreparedDashboardPdf({ blob: pdf.output("blob"), fileName: `${baseName}.pdf` });
          setExportMessage("PDF listo. Pulse “Compartir o guardar” y elija WhatsApp o Guardar en Archivos.");
          return;
        } else {
          const module = await import("pptxgenjs");
          const PptxGenJS = module.default;
          const pptx = new PptxGenJS();
          pptx.layout = "LAYOUT_WIDE";
          pptx.author = "Mario Coka · MACOBSA S.A.";
          pptx.subject = section;
          pptx.title = `${section} · ${dashboardReportDate}`;
          pptx.company = "MACOBSA S.A.";
          const contentWidth = 12.73;
          const contentHeight = 6.55;
          const scale = contentWidth / image.naturalWidth;
          const sliceHeight = Math.max(1, Math.floor(contentHeight / scale));
          let page = 0;
          for (let top = 0; top < image.naturalHeight; top += sliceHeight) {
            const height = Math.min(sliceHeight, image.naturalHeight - top);
            const slide = pptx.addSlide();
            slide.background = { color: "F4F7FA" };
            slide.addText(`${section} · ${dashboardReportDate}`, { x: 0.3, y: 0.12, w: 9.7, h: 0.25, fontFace: "Arial", fontSize: 10, bold: true, color: "0B2943", margin: 0 });
            slide.addText(`CONFIDENCIAL · ${authorizationCode} · ${page + 1}`, { x: 10.1, y: 0.12, w: 2.9, h: 0.25, fontFace: "Arial", fontSize: 7, color: "526579", align: "right", margin: 0 });
            slide.addImage({ data: cropExportImage(image, top, height), x: 0.3, y: 0.48, w: contentWidth, h: height * scale });
            page += 1;
          }
          await pptx.writeFile({ fileName: `${baseName}.pptx` });
        }
      }
      setExportMessage(`${format} generado y autorizado correctamente.`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "No fue posible generar el archivo.");
    } finally {
      setExportingFormat(null);
    }
  }
  async function sharePreparedDashboardPdf() {
    if (!preparedDashboardPdf) return;
    setExportMessage("");
    const delivery = await shareOrDownloadBlob(preparedDashboardPdf.blob, preparedDashboardPdf.fileName);
    if (delivery === "shared") {
      setExportMessage("PDF entregado a la opción seleccionada.");
    } else if (delivery === "cancelled") {
      setExportMessage("Se cerró Compartir. El PDF continúa listo para intentarlo nuevamente.");
    } else {
      setExportMessage("El dispositivo descargó el PDF. Revise Descargas en la aplicación Archivos.");
    }
  }
  const nav = [
    ["Control CEO", LayoutDashboard],
    ["GRUPO PICA", Building2],
    ["GRUPO UNE", Building2],
    ["LEGAL / NORMATIVO IA", BookOpenCheck],
    ["Arancel y clasificación", BrainCircuit],
    ["Inteligencia IA", BrainCircuit],
    ["Comité diario", Users],
    ["Operación agosto", BriefcaseBusiness],
    ["Pedidos agosto", FileSpreadsheet],
    ["Cuentas por cobrar", CircleDollarSign],
    ["Facturación diaria", TrendingUp],
    ["Despacho diario", BriefcaseBusiness],
    ["Inhouse El Rosado", Building2],
    ["Talento y nómina", Users],
    ["Actualizaciones", ClipboardList],
    ["Informes por responsable", FileDown],
    ["Guías por rol", Users],
    ["Clientes", Building2],
    ["Oportunidades", Target],
    ["Actividades", CalendarDays],
    ["Equipo", Users],
    ...(isAuditOwner ? [["Auditoría", ShieldCheck] as const] : []),
  ] as const;
  const confidentialSections = new Set(["Control CEO", "Cuentas por cobrar", "Facturación diaria", "Talento y nómina"]);
  function selectSection(nextSection: typeof nav[number][0]) {
    if (nextSection === "Control CEO" && !ceoUnlocked) {
      setCeoGateError("");
      setCeoPin("");
      setCeoGateOpen(true);
      setMobile(false);
      return;
    }
    setSection(nextSection);
    setMobile(false);
  }
  function openClientWorkspace(clientName:string) {
    setSelectedCRMClient(clientName);
    if(!clientName)return;
    const key=normalizeClientName(clientName);
    if(key.includes("UNE")||key.includes("FADESA")||key.includes("ECUABARNICES"))setSection("GRUPO UNE");
    else if(key.includes("PICA")||key.includes("PYCCA"))setSection("GRUPO PICA");
    else if(key.includes("ROSADO"))setSection("Inhouse El Rosado");
    else setSection("Clientes");
    setMobile(false);
  }
  async function lockCeo() {
    setCeoUnlocked(false);
    await fetch("/api/ceo-access", { method: "DELETE" }).catch(() => undefined);
  }
  async function togglePresentationMode() {
    if (presentationMode) {
      setPresentationMode(false);
      return;
    }
    setPresentationMode(true);
    if (confidentialSections.has(section)) setSection("Comité diario");
    await lockCeo();
  }
  async function unlockCeo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCeoUnlocking(true);
    setCeoGateError("");
    try {
      const response = await fetch("/api/ceo-access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin: ceoPin }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo validar la clave");
      setCeoUnlocked(true);
      setCeoGateOpen(false);
      setCeoPin("");
      setSection("Control CEO");
    } catch (error) {
      setCeoGateError(error instanceof Error ? error.message : "No se pudo validar la clave");
    } finally {
      setCeoUnlocking(false);
    }
  }
  useEffect(() => {
    if (!ceoUnlocked) return;
    const timer = window.setTimeout(() => { void lockCeo(); if (section === "Control CEO") setSection("Comité diario"); }, 30 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [ceoUnlocked, section]);
  const recentCommercialActivity = updates
    .filter((update) => update.area === "Comercial")
    .slice(0, 5);
  const liveSyncLabel = lastLiveSync
    ? `En línea · ${lastLiveSync.toLocaleTimeString("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit" })}`
    : "Conectando…";
  const unreadReports = dailyReports.filter((report) => report.id > lastSeenReportId);
  const unreadUpdates = updates.filter((update) => update.id > lastSeenUpdateId);
  const notificationUpdates = [...updates]
    .sort((a, b) => b.id - a.id)
    .slice(0, 20);
  const reportForUpdate = (update: DeptUpdate) => dailyReports.find((report) =>
    report.area === update.area &&
    report.reportDate === update.reportDate &&
    report.responsible === update.responsible &&
    update.title.includes(report.originalName),
  );
  const openNotificationCenter = () => {
    setSection("Actualizaciones");
    setMobile(false);
    const newestUpdateId = updates.reduce((max, update) => Math.max(max, update.id), 0);
    if (newestUpdateId > lastSeenUpdateId) {
      setLastSeenUpdateId(newestUpdateId);
      window.localStorage.setItem(`macobsa:last-seen-update:${currentUser.email}`, String(newestUpdateId));
    }
  };
  const openReport = (report: DailyReportUpload) => {
    setReportToRead(report);
    if (report.id > lastSeenReportId) {
      setLastSeenReportId(report.id);
      window.localStorage.setItem(`macobsa:last-seen-report:${currentUser.email}`, String(report.id));
    }
  };
  const shareReport = async (report: DailyReportUpload) => {
    try {
      const response = await fetch(`/api/report-uploads/${report.id}?download=1`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("download");
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("empty-download");
      const file = new File([bytes], report.originalName, { type: report.mimeType || response.headers.get("content-type") || "application/octet-stream" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: report.originalName });
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(file);
      anchor.download = report.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
    } catch { setReportDownloadError("No se pudo abrir la hoja de compartir. Intente nuevamente."); }
  };
  return (
    <div className="crm-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>MACOBSA</strong>
            <span>CRM · Centro de control</span>
          </div>
        </div>
        <nav>
          {nav
            .filter(
              ([label]) => presentationMode && confidentialSections.has(label)
                ? false
                : label === "Control CEO"
                ? canUseCeo
                : currentUser.role === "Soporte IT"
                ? ["GRUPO UNE", "Actualizaciones", "Informes por responsable", "Guías por rol"].includes(label)
                : label === "Auditoría"
                ? isAuditOwner
                : label === "LEGAL / NORMATIVO IA"
                ? canAccessLegalModule(currentUser)
                : label === "Inteligencia IA"
                ? currentUser.role === "Dirección General" || currentUser.role === "Auditoría y Control"
                : currentUser.role === "Inhouse El Rosado"
                ? ["Inhouse El Rosado", "Actualizaciones", "Informes por responsable"].includes(label)
                : label !== "Informes por responsable" || reportAreas.length > 0,
            )
            .map(([l, I]) => (
            <button
              key={l}
              className={`${section === l ? "active" : ""} ${l === "Control CEO" ? "ceo-nav" : ""}`}
              onClick={() => l === "Actualizaciones" ? openNotificationCenter() : selectSection(l)}
            >
              <I size={19} />
              <span>{l === "Control CEO" ? "CEO · Acceso confidencial" : l}</span>
              {l === "Actualizaciones" && unreadUpdates.length > 0 && <em>{unreadUpdates.length}</em>}
              {l === "Actividades" && <em>4</em>}
            </button>
            ))}
        </nav>
        <div className="side-foot">
          <span>GRUPO MARIO COKA BARRIGA</span>
          <p>Comercio exterior desde 1958</p>
        </div>
      </aside>
      <main className="main">
        <header>
          <button
            className="menu-btn"
            onClick={() => setMobile(!mobile)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>
          <div>
            <p>
              {clock.dateLabel} · {clock.timeLabel}
            </p>
            <h1>{section}</h1>
          </div>
          <div className="header-actions">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Buscar"
                placeholder="Buscar en el CRM"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOrderPage(1);
                }}
              />
            </label>
            <button className="icon-btn" aria-label={`${unreadUpdates.length} notificaciones nuevas`} onClick={openNotificationCenter}>
              <Bell size={20} />
              {unreadUpdates.length > 0 && <i />}
            </button>
            {currentUser.role === "Dirección General" && <button className={`presentation-toggle ${presentationMode ? "active" : ""}`} type="button" onClick={togglePresentationMode}><ShieldCheck size={17}/>{presentationMode ? "Presentación protegida" : "Activar presentación"}</button>}
            <span className="role-chip">{currentUser.role}</span>
            <div className="avatar" title={`${currentUser.displayName} · ${currentUser.role}`}>
              {currentUser.displayName
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
              {process.env.NODE_ENV === "production" && <LogoutButton />}
          </div>
        </header>
        <section className="client-context-bar" aria-label="Selector general de clientes y prospectos">
          <div><Building2 size={20}/><span><strong>Clientes y prospectos MACOBSA</strong><small>Seleccione una empresa para abrir su control individual</small></span></div>
          <label><span>Empresa</span><select value={selectedCRMClient} onChange={(event)=>openClientWorkspace(event.target.value)}><option value="">Seleccione cliente o prospecto</option>{clientDirectory.map((name)=><option key={name} value={name}>{name}</option>)}</select></label>
          {canUseCeo&&!presentationMode&&<button className={`ceo-access-shortcut ${ceoUnlocked?"unlocked":""}`} type="button" onClick={()=>selectSection("Control CEO")}><LockKeyhole size={18}/><span><strong>{ceoUnlocked?"CEO desbloqueado":"CEO · Acceso confidencial"}</strong><small>{ceoUnlocked?"Sesión privada activa":"Ingresar con clave privada"}</small></span></button>}
        </section>
        <section className="section-export-toolbar" aria-label="Exportar sección actual">
          <div>
            <strong>Exportar esta sección</strong>
            <span>{section} · documento oficial con autorización registrada</span>
          </div>
          {currentUser.role === "Dirección General" ? (
            <div className="section-export-actions">
              {(["PDF", "PPTX", "HTML"] as DashboardExportFormat[]).map((format) => (
                <button key={format} className={format === "PDF" && section === "Control CEO" ? "ceo-dashboard-export" : undefined} type="button" onClick={() => exportCurrentSection(format)} disabled={!!exportingFormat}>
                  <FileDown size={16}/>{exportingFormat === format ? "Generando…" : format === "PDF" && section === "Control CEO" ? "Preparar Dashboard PDF" : format === "PPTX" ? "PowerPoint" : format}
                </button>
              ))}
              {preparedDashboardPdf && (
                <>
                  <button className="share-ready" type="button" onClick={sharePreparedDashboardPdf}>
                    <Share2 size={17}/> Compartir o guardar PDF
                  </button>
                  <button type="button" onClick={() => openPdfForReview(preparedDashboardPdf.blob, preparedDashboardPdf.fileName)}>
                    <FileDown size={17}/> Abrir PDF
                  </button>
                </>
              )}
            </div>
          ) : <span className="export-owner-only">Descarga reservada para Mario Coka</span>}
          {exportMessage && <p className="section-export-message">{exportMessage}</p>}
        </section>
        <div id="crm-section-export" data-section={section}>
        {section === "Control CEO" && !ceoUnlocked && <section className="ceo-locked-panel"><LockKeyhole size={34}/><div><span>INFORMACIÓN CONFIDENCIAL</span><h2>Control CEO bloqueado</h2><p>Ingrese la clave privada para visualizar indicadores y documentos reservados.</p></div><button className="primary" type="button" onClick={() => setCeoGateOpen(true)}><LockKeyhole size={17}/>Ingresar clave</button></section>}
        {section === "Control CEO" && ceoUnlocked && (
          <>
            <section className="welcome">
              <div>
                <span>CONTROL DIARIO · DATOS CONFIRMADOS HASTA {compactReportDate(dashboardReportDate)}</span>
                <h2>{clock.greeting}, {currentUser.displayName.split(" ")[0]}.</h2>
                <p>
                  Una sola vista para decidir: resultados, riesgos, responsables
                  y compromisos del Comité.
                </p>
              </div>
              <button
                className="primary"
                onClick={() => setSection("Comité diario")}
              >
                <ArrowUpRight size={18} /> Ver Comité
              </button>
            </section>
            <section className="kpi-grid">
              <Kpi
                icon={CircleDollarSign}
                label="Facturación septiembre"
                value={exactMoney(dashboardTotalCents)}
                note={`${((dashboardTotalCents / 36_000_000) * 100).toFixed(1).replace(".", ",")}% de la meta de $360.000`}
                tone="green"
              />
              <Kpi
                icon={BriefcaseBusiness}
                label="Referencias vivas"
                value={String(currentDispatch.referencesLive)}
                note={`${currentDispatch.highRisk} en riesgo alto · corte ${currentDispatch.reportDate}`}
                tone="blue"
              />
              <Kpi
                icon={CircleDollarSign}
                label="Trámites por facturar"
                value={String(currentDispatch.readyToInvoice)}
                note={`Grupo Wong: ${currentDispatch.groupWongPending} pendientes`}
                tone="navy"
              />
              <Kpi
                icon={AlertTriangle}
                label="Alertas abiertas"
                value={String(openPersistentAlertCount)}
                note={`${openPersistentAlertCount} registros no resueltos; incluye GISIS por conciliar`}
                tone="amber"
              />
            </section>
            <div className={`verified-note regulatory-live-note ${dashboardHeaderIsValidated ? "" : "has-warning"}`}>
              {dashboardHeaderIsValidated ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}
              <div>
                <strong>{!dashboardCutIsConsistent ? "Control CEO sin corte válido" : dashboardHeaderIsValidated ? `Control CEO validado al ${compactReportDate(dashboardReportDate)}` : `Corte ${compactReportDate(dashboardReportDate)} · conciliación pendiente`}</strong>
                <span>
                  {dashboardCutIsConsistent
                    ? "La cifra oficial proviene del último informe válido de Facturación. Comercial, Regulatorio y Despacho conservan sus últimos cortes operativos sin bloquear el Dashboard."
                    : `No existe un informe válido de Facturación para confirmar el Dashboard. Últimas fechas disponibles: ${[...new Set(dashboardCoreDates)].map(compactReportDate).join(" · ")}.`}
                </span>
              </div>
            </div>
            {billingReconciliationWarning && (
              <div className="verified-note regulatory-live-note has-warning">
                <AlertTriangle size={20}/>
                <div>
                  <strong>Facturación: conciliación pendiente en Extras</strong>
                  <span>Corte oficial al {compactReportDate(billingReportDate)}. {billingReconciliationWarning} El total cuadra aritméticamente, pero el rubro señalado sigue pendiente de conciliación documental.</span>
                </div>
              </div>
            )}
            {latestRegulatory && (
              <div className={`verified-note regulatory-live-note ${regulatoryConflict ? "has-warning" : ""}`}>
                {regulatoryConflict ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
                <div>
                  <strong>Regulatorio actualizado desde el informe de Lilibeth</strong>
                  <span>
                    {exactMoney(latestRegulatory.billedAccumulatedCents)} acumulado · {latestRegulatory.licensesToday} licencias/trámites hoy · cargado por {latestRegulatory.submittedBy} el {ecuadorAuditTime(latestRegulatory.createdAt)}.
                    {latestRegulatory.warnings.length > 0 && ` Advertencia: ${latestRegulatory.warnings.join(" ")}`}
                    {regulatoryConflict && " La cifra difiere del corte de Facturación y requiere conciliación."}
                  </span>
                </div>
              </div>
            )}
            {latestCommercial && (
              <div className={`verified-note regulatory-live-note ${commercialConflict ? "has-warning" : ""}`}>
                {commercialConflict ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
                <div>
                  <strong>Comercial actualizado desde el informe de Carolina</strong>
                  <span>
                    {exactMoney(latestCommercial.billedAccumulatedCents)} acumulado · {latestCommercial.ordersAccumulated} pedidos en el mes · {latestCommercial.newClientsAccumulated} clientes nuevos.
                    {commercialConflict && ` Existe una diferencia de ${exactMoney(Math.abs(dashboardCommercial!.billedAccumulatedCents - dashboardDaiCents))} frente al corte de Facturación; ambas fuentes permanecen visibles hasta conciliación.`}
                  </span>
                </div>
              </div>
            )}
            {latestFinancial && (
              <div className="verified-note regulatory-live-note">
                <CheckCircle2 size={20}/>
                <div>
                  <strong>Finanzas actualizado desde el informe de Bryan</strong>
                  <span>
                    {financialIsCashControl ? "Disponibilidad bancaria" : "Cartera contable"} {exactMoney(latestFinancial.accountingPortfolioCents)} · cobros confirmados pendientes {exactMoney(latestFinancial.confirmedPendingCents)} · {financialIsCashControl ? "ingresos + confirmados" : "proyección"} {exactMoney(latestFinancial.projectedPortfolioCents)}.
                  </span>
                </div>
              </div>
            )}
            <section className="dashboard-grid">
              <div className="panel daily-focus">
                <PanelHead
                  title="Situación que requiere gestión"
                  action="Persiste hasta su cierre"
                />
                {persistentAlerts.filter((alert) => alert[3] !== "Resuelta").slice(0, 4).map((alert) => (
                  <div className="focus-row" key={alert[0]}>
                    <span className="risk-dot" />
                    <div>
                      <strong>{alert[0]}</strong>
                      <small>{alert[2]}</small>
                    </div>
                    <b>{alert[1]}</b>
                  </div>
                ))}
                <button
                  className="text-action"
                  onClick={() => setSection("Comité diario")}
                >
                  Ver responsables y estado <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="panel progress-panel">
                <PanelHead
                  title="Avance por línea"
                  action={`Corte ${compactReportDate(billingReportDate)}`}
                />
                {[
                  ["DAI / declaraciones · meta $310.000", exactMoney(dashboardDaiCents), daiProgress],
                  ["Regulatorio · meta $30.000", exactMoney(dashboardRegulatoryCents), regulatoryProgress],
                  ["Extras · meta $20.000", exactMoney(dashboardExtrasCents), extrasProgress],
                ].map((x) => (
                  <div className="line-progress" key={String(x[0])}>
                    <div>
                      <span>{x[0]}</span>
                      <strong>{x[1]}</strong>
                      <em>
                        {Number(x[2]).toLocaleString("es-EC", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        %
                      </em>
                    </div>
                    <i>
                      <b
                        style={{ width: `${Math.min(Number(x[2]) * 4, 100)}%` }}
                      />
                    </i>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel activities source-note">
              <CheckCircle2 size={19} />
              <div>
                <strong>Datos trazables</strong>
                <span>
                  Corte actualizado al {compactReportDate(billingReportDate)} desde {effectiveBilling.source}.
                  Las metas oficiales son DAI $310.000, Regulatorio $30.000 y Extras $20.000.
                </span>
              </div>
            </section>
          </>
        )}
        {section === "GRUPO PICA" && <GrupoPicaDashboard onOpenLegal={() => setSection("LEGAL / NORMATIVO IA")} />}
        {section === "GRUPO UNE" && <GrupoUneDashboard onOpenLegal={() => setSection("LEGAL / NORMATIVO IA")} />}
        {section === "LEGAL / NORMATIVO IA" && canAccessLegalModule(currentUser) && <LegalNormativoIA />}
        {section === "Arancel y clasificación" && <TariffClassification />}
        {section === "Inteligencia IA" && (
          <section className="section-body intelligence-page">
            <Heading
              eyebrow={`INTELIGENCIA EJECUTIVA · CORTE ${compactReportDate(dashboardReportDate)}`}
              title="Lo que requiere decisión ahora"
              text="El motor analiza cifras, riesgos y contradicciones del CRM. Prioriza acciones sin modificar los datos fuente."
            />
            <div className="intelligence-hero">
              <div className="intelligence-score">
                <BrainCircuit size={30}/>
                <span>Índice de control</span>
                <strong>{intelligenceScore}<small>/100</small></strong>
                <p>{intelligenceScore >= 80 ? "Control sólido con asuntos puntuales." : intelligenceScore >= 60 ? "Atención ejecutiva requerida hoy." : "Exposición alta: priorizar cierre inmediato."}</p>
              </div>
              <div className="intelligence-brief">
                <span>LECTURA IA</span>
                <h3>{intelligencePriorities.length} decisiones priorizadas</h3>
                <p>El mayor impacto inmediato está en convertir operaciones terminadas en facturación, reducir referencias de riesgo y asegurar que los cobros confirmados lleguen realmente al banco.</p>
                <div><b>{exactMoney(dashboardTotalCents)}</b> facturación acumulada <i/> <b>{currentDispatch.readyToInvoice}</b> por facturar <i/> <b>{currentDispatch.highRisk}</b> riesgos altos</div>
              </div>
            </div>
            <div className="intelligence-list">
              {intelligencePriorities.map((item, index) => (
                <article className="intelligence-card" key={`${item.area}-${item.title}`}>
                  <div className="intelligence-rank">{String(index + 1).padStart(2, "0")}</div>
                  <div className="intelligence-card-main">
                    <div className="intelligence-card-top"><span className={`intelligence-level ${item.level.toLowerCase()}`}>{item.level}</span><em>{item.area}</em></div>
                    <h3>{item.title}</h3>
                    <p>{item.reason}</p>
                    <div className="intelligence-action"><ArrowUpRight size={17}/><div><span>ACCIÓN RECOMENDADA</span><strong>{item.action}</strong></div></div>
                  </div>
                  <div className="intelligence-owner"><span>RESPONSABLE</span><strong>{item.owner}</strong><small>Seguimiento: hoy</small></div>
                </article>
              ))}
            </div>
            <div className="verified-note intelligence-rule"><ShieldCheck size={19}/><div><strong>Control y trazabilidad protegidos</strong><span>Esta lectura se recalcula con los últimos informes disponibles. No reemplaza, corrige ni elimina cifras cargadas por los responsables.</span></div></div>
          </section>
        )}
        {section === "Comité diario" && (
          <section className="section-body">
            <Heading
              eyebrow="CONTROL ESTRUCTURADO POR RESPONSABLE"
              title="Comité diario · Septiembre 2026"
              text="Cada área actualiza datos y excepciones; el CRM conserva historial, dueño y estado."
            />
            <div className="committee-grid">
              {liveCommitteeAreas.map((area) => (
                <DailyAreaCard key={area.area} {...area} />
              ))}
            </div>
            <article className="panel dispatch-update">
              <PanelHead title="Último corte de Despacho" action={latestDispatch.reportDate} />
              <p><strong>{latestDispatch.responsible}</strong> · corte operativo cargado en el CRM</p>
              <ul>
                <li>{latestDispatch.referencesLive} referencias vivas; {latestDispatch.highRisk} de riesgo alto.</li>
                <li>{latestDispatch.readyToInvoice} trámites listos para facturar; Grupo Wong: {latestDispatch.groupWongPending} pendientes.</li>
                <li>Cumplimiento reportado: {(latestDispatch.complianceBasisPoints / 100).toFixed(1).replace(".", ",")}%.</li>
              </ul>
              <div className="attributed-note"><CheckCircle2 size={17}/><span>Fuente: {dispatchSnapshots[0]?.source ?? "no hay informe reciente; dato histórico de respaldo"}. Los comentarios del 3-sep permanecen en el historial con su fecha original.</span></div>
            </article>
            <div className="committee-bottom">
              <div className="panel persistent-panel">
                <PanelHead
                  title="Alertas persistentes"
                  action={`${persistentAlerts.length} registros · ${openPersistentAlertCount} no resueltos`}
                />
                <div className="table-wrap">
                  <table className="alert-table">
                    <thead>
                      <tr>
                        <th>Asunto</th>
                        <th>Área responsable</th>
                        <th>Situación</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {persistentAlerts.map((a) => (
                        <tr key={a[0]}>
                          <td>
                            <strong>{a[0]}</strong>
                          </td>
                          <td>{a[1]}</td>
                          <td>{a[2]}</td>
                          <td>
                            <span
                              className={`alert-status ${a[3].toLowerCase()}`}
                            >
                              {a[3]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel share-panel">
                <PanelHead
                  title="Resumen listo para compartir"
                  action="Corte analizado"
                />
                <pre>{liveExecutiveSummary}</pre>
                <button
                  className="primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(liveExecutiveSummary);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  }}
                >
                  <Copy size={17} />
                  {copied ? "Resumen copiado" : "Copiar resumen"}
                </button>
              </div>
            </div>
          </section>
        )}
        {section === "Cierre agosto" && (
          <>
            <section className="welcome">
              <div>
                <span>CIERRE REAL · AGOSTO 2026</span>
                <h2>{clock.greeting}, Mario.</h2>
                <p>
                  Agosto fue el mejor mes del año en volumen y cumplió la meta
                  mensual de nuevos clientes.
                </p>
              </div>
              <button
                className="primary"
                onClick={() => setSection("Operación agosto")}
              >
                <ArrowUpRight size={18} /> Ver cierre
              </button>
            </section>
            <section className="kpi-grid">
              <Kpi
                icon={BriefcaseBusiness}
                label="Trámites agosto"
                value="1.140"
                note="+5,5% vs. julio · +26,2% anual"
                tone="blue"
              />
              <Kpi
                icon={CircleDollarSign}
                label="Facturación agosto"
                value="$338.078"
                note="+12,0% mensual · +33,2% anual"
                tone="green"
              />
              <Kpi
                icon={TrendingUp}
                label="Meta anual $4 MM"
                value="60,4%"
                note="$2.414.092 acumulados"
                tone="navy"
                progress={60.4}
              />
              <Kpi
                icon={Users}
                label="Nuevos clientes"
                value="4 de 4"
                note="100% de la meta de agosto"
                tone="amber"
              />
            </section>
            <section className="dashboard-grid">
              <div className="panel">
                <PanelHead
                  title="Evolución de trámites"
                  action="Ver operación"
                  onClick={() => setSection("Operación agosto")}
                />
                <div className="funnel">
                  {[
                    ["May-26", "1.084", "86%"],
                    ["Jun-26", "1.004", "78%"],
                    ["Jul-26", "1.081", "85%"],
                    ["Ago-26", "1.140", "100%"],
                  ].map((x) => (
                    <div key={x[0]}>
                      <span>{x[0]}</span>
                      <b>{x[1]}</b>
                      <i style={{ width: x[2] }} />
                    </div>
                  ))}
                </div>
                <div className="forecast">
                  <span>
                    Facturación requerida por mes · septiembre a diciembre
                  </span>
                  <strong>$396.477</strong>
                  <em>Para alcanzar $4 MM</em>
                </div>
              </div>
              <div className="panel alerts">
                <PanelHead title="Alertas CEO" action="Cierre agosto" />
                <Alert
                  icon={AlertTriangle}
                  title="Brecha anual pendiente: $1.585.907,66"
                  text="Se requiere elevar el ritmo mensual"
                  tone="red"
                />
                <Alert
                  icon={Clock3}
                  title="Víctor Simancas cae 58,3%"
                  text="De 48 a 20 trámites en agosto"
                  tone="amber"
                />
                <Alert
                  icon={CheckCircle2}
                  title="4 clientes nuevos captados"
                  text="Primera meta mensual completa del año"
                  tone="green"
                />
              </div>
            </section>
            <section className="panel activities">
              <PanelHead
                title="Prioridades para septiembre"
                action="Ver todas"
                onClick={() => setSection("Actividades")}
              />
              <ActivityTable />
            </section>
          </>
        )}
        {section === "Operación agosto" && (
          <section className="section-body">
            <Heading
              eyebrow="INFORMACIÓN IMPORTADA DEL REPORTE GERENCIAL"
              title="Operación · Agosto 2026"
              text="Corte confirmado al 31 de agosto de 2026."
            />
            <section className="kpi-grid operation-kpis">
              <Kpi
                icon={BriefcaseBusiness}
                label="Trámites del mes"
                value="1.140"
                note="Máximo mensual del año"
                tone="blue"
              />
              <Kpi
                icon={CircleDollarSign}
                label="Honorarios del mes"
                value="$338.078,18"
                note="+$36.224,18 vs. julio"
                tone="green"
              />
              <Kpi
                icon={TrendingUp}
                label="Acumulado Ene-Ago"
                value="$2.414.092,34"
                note="+12,4% vs. 2025"
                tone="navy"
              />
              <Kpi
                icon={Target}
                label="Brecha meta anual"
                value="$1.585.907,66"
                note="39,6% pendiente"
                tone="amber"
              />
            </section>
            <div className="dashboard-grid operation-grid">
              <div className="panel">
                <PanelHead
                  title="Evolución mensual de trámites"
                  action="Datos reales"
                />
                <div className="month-bars">
                  {[
                    ["Dic-25", 1011],
                    ["Ene-26", 1054],
                    ["Feb-26", 1007],
                    ["Mar-26", 1108],
                    ["Abr-26", 1000],
                    ["May-26", 1084],
                    ["Jun-26", 1004],
                    ["Jul-26", 1081],
                    ["Ago-26", 1140],
                  ].map((x) => (
                    <div key={x[0]}>
                      <span>{x[1]}</span>
                      <i
                        style={{ height: `${Math.round(Number(x[1]) / 12)}px` }}
                      />
                      <small>{x[0]}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel report-summary">
                <PanelHead title="Lectura ejecutiva" action="Agosto 2026" />
                <ul>
                  <li>
                    <b>Volumen:</b> +5,5% mensual y +26,2% interanual.
                  </li>
                  <li>
                    <b>Facturación:</b> +12,0% mensual y +33,2% interanual.
                  </li>
                  <li>
                    <b>Captación:</b> 4 clientes obtenidos de 4 proyectados.
                  </li>
                  <li>
                    <b>Meta anual:</b> requiere $396.477 mensuales de septiembre
                    a diciembre.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}
        {section === "Pedidos agosto" && (
          <section className="section-body">
            <Heading
              eyebrow="ARCHIVO CREADOS AGOSTO26.XLSX"
              title="Pedidos creados · Agosto 2026"
              text="1.140 registros importados; creados, refrendados y finalizados se controlan por separado."
            />
            <section className="kpi-grid operation-kpis">
              <Kpi
                icon={FileSpreadsheet}
                label="Pedidos creados"
                value="1.140"
                note="Del 1 al 31 de agosto"
                tone="blue"
              />
              <Kpi
                icon={CheckCircle2}
                label="Finalizados"
                value="589"
                note="51,7% del total creado"
                tone="green"
              />
              <Kpi
                icon={Clock3}
                label="Activos al corte"
                value="551"
                note="48,3% requieren seguimiento"
                tone="amber"
              />
              <Kpi
                icon={BriefcaseBusiness}
                label="Con refrendo"
                value="850"
                note="74,6% de los pedidos"
                tone="navy"
              />
            </section>
            <div className="data-note">
              <AlertTriangle size={18} />
              <div>
                <strong>Definición del indicador</strong>
                <span>
                  Este archivo contiene 1.140 pedidos creados. Al corte, 850
                  registran refrendo y 589 constan finalizados. El CRM preserva
                  las tres métricas para evitar interpretaciones incorrectas.
                </span>
              </div>
            </div>
            <div className="panel district-panel">
              <PanelHead title="Volumen por distrito aduanero" action={`${districts.length} distritos · 1.140 pedidos`} />
              <p className="panel-intro">Distribución calculada directamente del campo Aduana del archivo de pedidos. Permite identificar qué volumen está llegando por cada distrito.</p>
              <div className="table-wrap"><table><thead><tr><th>Distrito / Aduana</th><th>Pedidos</th><th>Activos</th><th>Finalizados</th><th>Con refrendo</th><th>% del total</th></tr></thead><tbody>{districts.map((row)=><tr key={row.district}><td><strong>{row.district}</strong></td><td>{row.total.toLocaleString("es-EC")}</td><td>{row.active.toLocaleString("es-EC")}</td><td>{row.finished.toLocaleString("es-EC")}</td><td>{row.withRefrendo.toLocaleString("es-EC")}</td><td>{((row.total/1140)*100).toFixed(1).replace(".",",")}%</td></tr>)}</tbody></table></div>
            </div>
            <div className="panel orders-filter-panel">
              <PanelHead title="Pedidos acumulados por cliente y fecha" action="Consulta dinámica" />
              <p className="panel-intro">Elija un rango y un cliente para identificar cuántos pedidos se crearon cada día y cuál era el acumulado a esa fecha.</p>
              <div className="report-filter-grid">
                <Field label="Desde"><input type="date" value={orderFrom} onChange={(e)=>{setOrderFrom(e.target.value);setOrderPage(1);}} /></Field>
                <Field label="Hasta"><input type="date" value={orderTo} onChange={(e)=>{setOrderTo(e.target.value);setOrderPage(1);}} /></Field>
                <Field label="Cliente"><select value={orderClient} onChange={(e)=>{setOrderClient(e.target.value);setOrderPage(1);}}><option value="">Todos los clientes</option>{orderClients.map((client)=><option key={client}>{client}</option>)}</select></Field>
                <div className="report-actions"><button type="button" className="secondary-action" onClick={()=>{setOrderFrom("");setOrderTo("");setOrderClient("");setOrderPage(1);}}>Limpiar filtros</button></div>
              </div>
              <div className="table-wrap cumulative-orders-table"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Pedidos del día</th><th>Acumulado</th></tr></thead><tbody>{orderCumulative.length===0?<tr><td colSpan={4}>No existen pedidos para el filtro seleccionado.</td></tr>:orderCumulative.map((row)=><tr key={`${row.date}-${row.client}`}><td>{row.date}</td><td><strong>{row.client}</strong></td><td>{row.daily.toLocaleString("es-EC")}</td><td><strong>{row.cumulative.toLocaleString("es-EC")}</strong></td></tr>)}</tbody></table></div>
            </div>
            <div className="orders-toolbar">
              <div className="status-tabs">
                {["Todos", "Trámite activo", "Trámite finalizado"].map((s) => (
                  <button
                    className={orderStatus === s ? "active" : ""}
                    key={s}
                    onClick={() => {
                      setOrderStatus(s);
                      setOrderPage(1);
                    }}
                  >
                    {s === "Todos" ? "Todos" : s.replace("Trámite ", "")}
                  </button>
                ))}
              </div>
              <span>{orderTotal.toLocaleString("es-EC")} registros</span>
            </div>
            <div className="panel orders-panel">
              <div className="table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Trámite</th>
                      <th>Creación</th>
                      <th>Cliente</th>
                      <th>Responsable</th>
                      <th>Vía</th>
                      <th>Estado</th>
                      <th>Refrendo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderRows.map((o) => (
                      <tr key={o.tramite}>
                        <td>
                          <strong>{o.tramite}</strong>
                          <small>{o.pedido && `Pedido ${o.pedido}`}</small>
                        </td>
                        <td>{o.fechaCreacion}</td>
                        <td>{o.cliente}</td>
                        <td>{o.responsable || "Sin asignar"}</td>
                        <td>{o.via || "Sin dato"}</td>
                        <td>
                          <span
                            className={`record-status ${o.estadoGeneral.includes("finalizado") ? "done" : "open"}`}
                          >
                            {o.estado}
                          </span>
                        </td>
                        <td>{o.refrendo || "Pendiente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button
                  disabled={orderPage === 1}
                  onClick={() => setOrderPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {orderPage} de {orderPages}
                </span>
                <button
                  disabled={orderPage === orderPages}
                  onClick={() => setOrderPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        )}
        {section === "Despacho diario" && (
          <section className="section-body dispatch-page">
            <Heading eyebrow="CONTROL OPERATIVO · ACTUALIZACIÓN POR DESPACHO" title="Despacho diario" text="Las cifras guardadas aquí actualizan directamente los indicadores visibles para Dirección." />
            <div className="verified-note data-rule"><CheckCircle2 size={18}/><div><strong>El aporte de María Fernanda sí quedó registrado</strong><span>El 3-sep informó 52 trámites pendientes en Actualizaciones. Este nuevo módulo permite actualizar además Referencias vivas, riesgo, cumplimiento y Grupo Wong.</span></div></div>
            <section className="kpi-grid operation-kpis">
              <Kpi icon={BriefcaseBusiness} label="Referencias vivas" value={String(latestDispatch.referencesLive)} meta={`Corte ${latestDispatch.reportDate}`} tone="blue" />
              <Kpi icon={AlertTriangle} label="Riesgo alto" value={String(latestDispatch.highRisk)} meta="Casos que requieren acción" tone="amber" />
              <Kpi icon={CircleDollarSign} label="Listos por facturar" value={String(latestDispatch.readyToInvoice)} meta="Actualizar al cambiar la cifra" tone="navy" />
              <Kpi icon={TrendingUp} label="Cumplimiento" value={`${(latestDispatch.complianceBasisPoints / 100).toFixed(1).replace(".", ",")}%`} meta={`Grupo Wong: ${latestDispatch.groupWongPending}`} tone="green" />
            </section>
            <div className="updates-layout dispatch-entry">
              {currentUser.canManageDispatch ? (
                <form className="panel update-form" onSubmit={submitDispatch}>
                  <PanelHead title="Registrar corte diario de Despacho" action="María Fernanda" />
                  <div className="form-grid"><Field label="Fecha del corte"><input required type="date" value={dispatchForm.reportDate} onChange={(e)=>setDispatchForm({...dispatchForm,reportDate:e.target.value})}/></Field><Field label="Responsable"><input required value={dispatchForm.responsible} onChange={(e)=>setDispatchForm({...dispatchForm,responsible:e.target.value})}/></Field></div>
                  <div className="form-grid numeric-fields"><Field label="Referencias vivas"><input required min="0" type="number" value={dispatchForm.referencesLive} onChange={(e)=>setDispatchForm({...dispatchForm,referencesLive:e.target.value})}/></Field><Field label="Riesgo alto"><input required min="0" type="number" value={dispatchForm.highRisk} onChange={(e)=>setDispatchForm({...dispatchForm,highRisk:e.target.value})}/></Field><Field label="Listos por facturar"><input required min="0" type="number" value={dispatchForm.readyToInvoice} onChange={(e)=>setDispatchForm({...dispatchForm,readyToInvoice:e.target.value})}/></Field><Field label="Cumplimiento %"><input required min="0" max="100" step="0.1" type="number" value={dispatchForm.compliancePercent} onChange={(e)=>setDispatchForm({...dispatchForm,compliancePercent:e.target.value})}/></Field></div>
                  <div className="form-grid"><Field label="Grupo Wong sin facturar"><input required min="0" type="number" value={dispatchForm.groupWongPending} onChange={(e)=>setDispatchForm({...dispatchForm,groupWongPending:e.target.value})}/></Field><Field label="Estado ECUASIGAD"><select value={dispatchForm.ecuasigadStatus} onChange={(e)=>setDispatchForm({...dispatchForm,ecuasigadStatus:e.target.value})}><option>Sin respuesta de ECUASIGAD</option><option>Escalado</option><option>En gestión</option><option>Acceso restablecido</option><option>No aplica</option></select></Field></div>
                  <Field label="Próxima acción y fecha"><textarea required value={dispatchForm.nextAction} onChange={(e)=>setDispatchForm({...dispatchForm,nextAction:e.target.value})} placeholder="Acción concreta, responsable y fecha de cumplimiento"/></Field>
                  <Field label="Fuente"><input required value={dispatchForm.source} onChange={(e)=>setDispatchForm({...dispatchForm,source:e.target.value})} placeholder="Reporte diario o archivo conciliado"/></Field>
                  <Field label="Observación"><textarea value={dispatchForm.note} onChange={(e)=>setDispatchForm({...dispatchForm,note:e.target.value})} placeholder="Causa, clientes afectados o explicación de la variación"/></Field>
                  <button className="primary submit" disabled={saving}>{saving ? "Guardando…" : "Guardar y actualizar indicadores"}</button>
                </form>
              ) : <div className="panel read-only-card"><strong>Consulta únicamente</strong><p>Solo María Fernanda y Dirección General pueden registrar el corte de Despacho.</p></div>}
              <div className="panel update-feed"><PanelHead title="Historial de Despacho" action={`${dispatchSnapshots.length + 2} evidencias`}/>
                {dispatchSnapshots.map((item)=><article className="update-item" key={item.id}><div className="area-dot despacho"/><div><span>{item.reportDate} · {item.responsible}</span><strong>{item.referencesLive} referencias · {item.highRisk} riesgo alto</strong><p>Por facturar: {item.readyToInvoice} · Cumplimiento: {(item.complianceBasisPoints/100).toFixed(1).replace(".",",")}% · Wong: {item.groupWongPending}</p><small>{item.ecuasigadStatus} · Fuente: {item.source} · Registrado por {item.submittedBy}</small></div></article>)}
                <article className="update-item verified-import"><div className="area-dot despacho"/><div><span>2026-09-03 · María Fernanda · Aporte comprobado</span><strong>52 trámites pendientes</strong><p>Seguimiento de cumplimiento de Despacho guardado correctamente.</p><small>Registrado por manrique@mariocoka.com</small></div></article>
                <article className="update-item verified-import"><div className="area-dot despacho"/><div><span>2026-09-02 · Línea base</span><strong>468 referencias · 7 riesgo alto</strong><p>45 por facturar · 75,6% cumplimiento · Grupo Wong 21.</p><small>Fuente: Dashboard Ejecutivo Comité MCB 360</small></div></article>
              </div>
            </div>
          </section>
        )}
        {section === "Facturación diaria" && (
          <section className="section-body billing-page">
            <Heading eyebrow={`CONTROL DIARIO · CORTE ${compactReportDate(dashboardReportDate)}`} title="Facturación diaria" text="Avance por rubro, producción del día y asuntos pendientes de facturar." />
            <div className={`verified-note billing-source-note ${billingReconciliationWarning ? "has-warning" : ""}`}>{billingReconciliationWarning ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}<div><strong>Informe de Rebeca procesado · corte {compactReportDate(billingReportDate)}</strong><span>El acumulado es {exactMoney(dashboardTotalCents)}. Fuente: {effectiveBilling.source}. El total cuadra aritméticamente como suma de sus tres líneas.{billingReconciliationWarning && ` Conciliación documental pendiente: ${billingReconciliationWarning}`}</span></div></div>
            <section className="kpi-grid operation-kpis billing-kpis">
              <Kpi icon={FileSpreadsheet} label="DAI acumulado" value={exactMoney(dashboardDaiCents)} meta={`${((dashboardDaiCents / 31_000_000) * 100).toFixed(1).replace(".", ",")}% de $310.000`} tone="blue" />
              <Kpi icon={ClipboardList} label="Regulatorio acumulado" value={exactMoney(dashboardRegulatoryCents)} meta={`${((dashboardRegulatoryCents / 3_000_000) * 100).toFixed(1).replace(".", ",")}% de $30.000`} tone="green" />
              <Kpi icon={Plus} label="Extras acumulado" value={exactMoney(dashboardExtrasCents)} meta={`${((dashboardExtrasCents / 2_000_000) * 100).toFixed(1).replace(".", ",")}% de $20.000`} tone="amber" />
              <Kpi icon={TrendingUp} label="Total acumulado" value={exactMoney(dashboardTotalCents)} meta={`${((dashboardTotalCents / 36_000_000) * 100).toFixed(1).replace(".", ",")}% de $360.000`} tone="blue" />
            </section>
            <div className="billing-summary-grid">
              <div className="panel billing-today"><PanelHead title="Producción del último corte" action={compactReportDate(billingReportDate)}/><strong>{exactMoney(billingTodayCents)}</strong><span>{billingTodayInvoices} trámites facturados</span><p>Promedio por trámite: {exactMoney(Math.round(billingTodayCents / Math.max(billingTodayInvoices, 1)))} · Fuente: {effectiveBilling.source}</p></div>
              <div className="panel billing-alerts"><PanelHead title="Correcciones obligatorias" action="Antes del próximo corte"/><ul><li>Regulatorio debe usar meta de <strong>$30.000</strong>, no $35.000.</li><li>Meta total oficial: <strong>$360.000</strong>, no $365.000.</li><li>La meta diaria anterior de $300.000/31 días está desactualizada.</li><li>Faltan cantidades de listos ECUASIGAD, culminados por remitir y bloqueados.</li></ul></div>
            </div>
            <div className="updates-layout billing-entry">
              {currentUser.canManageBilling ? (
                <form className="panel update-form" onSubmit={submitBilling}>
                  <PanelHead title="Registrar corte de facturación" action="Rebeca Sánchez"/>
                  <div className="form-grid"><Field label="Fecha"><input required type="date" value={billingForm.reportDate} onChange={(e)=>setBillingForm({...billingForm,reportDate:e.target.value})}/></Field><Field label="Responsable"><input required value={billingForm.responsible} onChange={(e)=>setBillingForm({...billingForm,responsible:e.target.value})} placeholder="Rebeca Sánchez"/></Field></div>
                  <div className="form-grid"><Field label="DAI acumulado USD"><input required min="0" step="0.01" type="number" value={billingForm.daiAccumulated} onChange={(e)=>setBillingForm({...billingForm,daiAccumulated:e.target.value})}/></Field><Field label="Regulatorio acumulado USD"><input required min="0" step="0.01" type="number" value={billingForm.regulatoryAccumulated} onChange={(e)=>setBillingForm({...billingForm,regulatoryAccumulated:e.target.value})}/></Field></div>
                  <div className="form-grid"><Field label="Extras acumulado USD"><input required min="0" step="0.01" type="number" value={billingForm.extrasAccumulated} onChange={(e)=>setBillingForm({...billingForm,extrasAccumulated:e.target.value})}/></Field><Field label="Facturado hoy USD"><input required min="0" step="0.01" type="number" value={billingForm.invoicedToday} onChange={(e)=>setBillingForm({...billingForm,invoicedToday:e.target.value})}/></Field></div>
                  <div className="form-grid numeric-fields"><Field label="Trámites facturados"><input required min="0" type="number" value={billingForm.invoicesToday} onChange={(e)=>setBillingForm({...billingForm,invoicesToday:e.target.value})}/></Field><Field label="Listos por facturar"><input min="0" type="number" value={billingForm.readyToInvoice} onChange={(e)=>setBillingForm({...billingForm,readyToInvoice:e.target.value})} placeholder="No dejar vacío"/></Field><Field label="Culminados por remitir"><input min="0" type="number" value={billingForm.completedPending} onChange={(e)=>setBillingForm({...billingForm,completedPending:e.target.value})} placeholder="No dejar vacío"/></Field><Field label="Bloqueados"><input min="0" type="number" value={billingForm.blocked} onChange={(e)=>setBillingForm({...billingForm,blocked:e.target.value})} placeholder="0 si no existen"/></Field></div>
                  <Field label="Fuente"><input required value={billingForm.source} onChange={(e)=>setBillingForm({...billingForm,source:e.target.value})} placeholder="Reporte o archivo conciliado"/></Field>
                  <Field label="Observación y acción"><textarea value={billingForm.note} onChange={(e)=>setBillingForm({...billingForm,note:e.target.value})} placeholder="Bloqueo, dueño, próxima acción y fecha"/></Field>
                  <button className="primary submit" disabled={saving}>{saving ? "Guardando…" : "Guardar corte de facturación"}</button>
                </form>
              ) : <div className="panel read-only-card"><strong>Consulta únicamente</strong><p>Solo Rebeca Sánchez y Dirección General pueden registrar este corte.</p></div>}
              <div className="panel update-feed"><PanelHead title="Historial de cortes" action={`${billingSnapshots.length + 1} registros`}/><article className="update-item verified-import"><div className="area-dot facturación"/><div><span>2026-09-03 · Rebeca Sánchez · Importado</span><strong>{exactMoney(billingCut03Sep.total)} acumulado</strong><p>Hoy: {exactMoney(billingCut03Sep.today)} · 53 trámites</p><small>Fuente: {billingCut03Sep.source}</small></div></article>{billingSnapshots.map((item)=><article className="update-item" key={item.id}><div className="area-dot facturación"/><div><span>{item.reportDate} · {item.responsible}</span><strong>{exactMoney(item.daiAccumulatedCents+item.regulatoryAccumulatedCents+item.extrasAccumulatedCents)} acumulado</strong><p>Hoy: {exactMoney(item.invoicedTodayCents)} · {item.invoicesToday} trámites · Listos: {item.readyToInvoice ?? "Pendiente"} · Bloqueados: {item.blocked ?? "Pendiente"}</p><small>Fuente: {item.source}</small></div></article>)}</div>
            </div>
          </section>
        )}
        {section === "Cuentas por cobrar" && (
          <section className="section-body">
            <Heading
              eyebrow={`FINANZAS · ÚLTIMO CORTE ${currentReceivable.reportDate}`}
              title={financialIsCashControl ? "Control diario financiero" : "Cuentas por cobrar"}
              text={financialIsCashControl ? "Ingresos registrados, disponibilidad bancaria y cobros confirmados pendientes de acreditación." : "Control de cartera, recuperación efectiva y compromisos por cliente con evidencia diaria."}
            />
            {latestFinancial && (
              <div className="verified-note billing-source-note">
                <CheckCircle2 size={18}/><div><strong>Informe de Bryan procesado automáticamente</strong><span>{latestFinancial.originalName} · cargado por {latestFinancial.submittedBy} el {ecuadorAuditTime(latestFinancial.createdAt)}. {latestFinancial.warnings.length ? latestFinancial.warnings.join(" ") : "Las cifras principales fueron identificadas y conciliadas."}</span></div>
              </div>
            )}
            <div className="data-note receivable-rule">
              <AlertTriangle size={18} />
              <div>
                <strong>Proyección no significa cobro</strong>
                <span>
                  Solo {exactMoney(currentReceivable.effectiveCollectionsCents)} constan como ingresos efectivos.
                  Los {exactMoney(currentReceivable.confirmedPendingCents)} confirmados y los {exactMoney(currentReceivable.overduePendingCents)} vencidos por confirmar permanecen separados hasta que Finanzas confirme su acreditación con evidencia.
                </span>
              </div>
            </div>
            <section className="kpi-grid operation-kpis">
              <Kpi
                icon={CircleDollarSign}
                label={financialIsCashControl ? "Disponibilidad bancaria" : "Cartera contable actualizada"}
                value={exactMoney(currentReceivable.accountingPortfolioCents)}
                note={financialIsCashControl ? `Saldo bancario reportado · corte ${currentReceivable.reportDate}` : `Incluye facturación nueva · corte ${currentReceivable.reportDate}`}
                tone="navy"
              />
              <Kpi
                icon={AlertTriangle}
                label="Ingresos efectivos"
                value={exactMoney(currentReceivable.effectiveCollectionsCents)}
                note="Ingresos efectivos reportados por Finanzas"
                tone="amber"
              />
              <Kpi
                icon={TrendingUp}
                label="Confirmados por acreditar"
                value={exactMoney(currentReceivable.confirmedPendingCents)}
                note="No contabilizados todavía como cobro"
                tone="green"
              />
              <Kpi
                icon={Clock3}
                label="Vencidos por confirmar"
                value={exactMoney(currentReceivable.overduePendingCents)}
                note="Principal foco de recuperación"
                tone="red"
              />
            </section>
            <div className="receivable-baseline latest-cut-strip">
              <span>{financialIsCashControl ? "Facturación no incluida en este corte" : <>Nueva facturación del corte: <b>{exactMoney(currentReceivable.newBillingCents)}</b></>}</span>
              <span>{financialIsCashControl ? "Cobros confirmados aún no acreditados" : <>Recuperación adicional potencial: <b>{currentReceivable.additionalPotentialCents === null ? "No especificada" : exactMoney(currentReceivable.additionalPotentialCents)}</b></>}</span>
              <span>{financialIsCashControl ? "Ingresos registrados + confirmados" : "Cartera proyectada posterior"}: <b>{exactMoney(currentReceivable.projectedPortfolioCents)}</b></span>
              <span>Diferencia vs. proyección inicial: <b>{exactMoney(receivableUpdate03Sep.projectionGap)}</b></span>
            </div>
            <div className="receivable-grid latest-receivable-grid">
              <div className="panel">
                <PanelHead title="Nueva facturación del 1 al 2-sep" action="Dentro del plazo de crédito" />
                <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>FH</th><th>FR</th><th>NCob</th><th>Total</th></tr></thead><tbody>{billingComposition03Sep.map((row) => <tr key={row[0]}><td><strong>{row[0]}</strong></td><td>{exactMoney(row[1])}</td><td>{exactMoney(row[2])}</td><td>{exactMoney(row[3])}</td><td><strong>{exactMoney(row[4])}</strong></td></tr>)}</tbody></table></div>
              </div>
              <div className="panel recovery-check">
                <PanelHead title="Control de recuperación" action="Cierre esperado 04-sep" />
                <p><span>Efectivo + confirmado</span><strong>{exactMoney(currentReceivable.effectiveCollectionsCents + currentReceivable.confirmedPendingCents)}</strong></p>
                <p><span>Identificado incluyendo vencidos por confirmar</span><strong>{exactMoney(currentReceivable.effectiveCollectionsCents + currentReceivable.confirmedPendingCents + currentReceivable.overduePendingCents)}</strong></p>
                <p><span>Proyección inicial 1-4 sep</span><strong>{exactMoney(receivableUpdate03Sep.initialProjection)}</strong></p>
                <div className="attributed-note"><AlertTriangle size={17}/><span>La cartera contable aumentó principalmente por facturación reciente. No corresponde tratar esos documentos como deterioro mientras estén dentro del crédito.</span></div>
              </div>
            </div>
            <div className="receivable-grid">
              <div className="panel">
                <PanelHead
                  title="Validación de cobros programados"
                  action="Fuente: informe 31-ago"
                />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Proyectado</th>
                        <th>% semanal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectedCollections.map((row) => (
                        <tr key={row[0]}>
                          <td>{row[0]}</td>
                          <td><strong>{exactMoney(row[1])}</strong></td>
                          <td>{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="receivable-footnote">
                  Residual teórico si se cumple el 100%: <strong>{exactMoney(receivableBaseline.residual)}</strong>
                </div>
              </div>
              <div className="panel">
                <PanelHead
                  title="Concentración por cliente"
                  action="Cinco principales · 54,42%"
                />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Cartera</th>
                        <th>%</th>
                        <th>Sobre fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {principalReceivables.map((row) => (
                        <tr key={row[0]}>
                          <td><strong>{row[0]}</strong></td>
                          <td>{exactMoney(row[1])}</td>
                          <td>{row[2]}</td>
                          <td>{exactMoney(row[3])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="receivable-baseline">
              <span>Honorarios / facturación propia: <b>$361.777,67</b></span>
              <span>Pagos a terceros y reembolsos: <b>$246.724,84</b></span>
              <span>Reembolsos sobre fecha: <b>{exactMoney(receivableBaseline.reimbursements)}</b></span>
              <span>Promedio posterior al vencimiento: <b>78,4 días</b></span>
            </div>
            <div className="client-control-section">
              <div className="panel client-control-ledger">
                <PanelHead title="Cortes, arrastre y fondos por cliente" action={`${clientControls.length} registros confirmados`} />
                <p className="panel-intro">La fecha de corte determina lo acumulado pendiente de facturar hasta el siguiente mes. Los fondos se muestran por cliente y nunca se infieren de alertas históricas.</p>
                {clientControls.length===0?<div className="empty-state"><CalendarDays size={30}/><strong>Datos pendientes de confirmar</strong><span>IASA continúa como alerta histórica resuelta. Registre aquí cada fondo vigente y su evidencia antes de usarlo como dato financiero.</span></div>:<div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Corte actual</th><th>Próximo corte</th><th>Sin facturar</th><th>Arrastre</th><th>Fondo asignado</th><th>Disponible</th><th>Estado</th></tr></thead><tbody>{clientControls.map((item)=><tr key={item.id}><td><strong>{item.client}</strong><small>{item.responsible} · {item.submittedBy}</small></td><td>{item.cutoffDate}</td><td>{item.nextCutoffDate}</td><td>{exactMoney(item.unbilledCents)}</td><td>{exactMoney(item.carryoverCents)}</td><td>{exactMoney(item.fundAssignedCents)}</td><td><strong>{exactMoney(item.fundAssignedCents-item.fundUsedCents)}</strong></td><td>{item.fundStatus}</td></tr>)}</tbody></table></div>}
              </div>
              {currentUser.canManageClientControls?<form className="panel update-form client-control-form" onSubmit={submitClientControl}>
                <PanelHead title="Registrar control por cliente" action="Finanzas · Facturación · Auditoría"/>
                <div className="form-grid"><Field label="Fecha del reporte"><input required type="date" value={clientControlForm.reportDate} onChange={(e)=>setClientControlForm({...clientControlForm,reportDate:e.target.value})}/></Field><Field label="Cliente"><input required value={clientControlForm.client} onChange={(e)=>setClientControlForm({...clientControlForm,client:e.target.value})} placeholder="Razón social"/></Field></div>
                <div className="form-grid"><Field label="Fecha de corte del cliente"><input required type="date" value={clientControlForm.cutoffDate} onChange={(e)=>setClientControlForm({...clientControlForm,cutoffDate:e.target.value})}/></Field><Field label="Siguiente fecha de corte"><input required type="date" value={clientControlForm.nextCutoffDate} onChange={(e)=>setClientControlForm({...clientControlForm,nextCutoffDate:e.target.value})}/></Field></div>
                <div className="form-grid numeric-fields"><Field label="Acumulado sin facturar USD"><input required min="0" step="0.01" type="number" value={clientControlForm.unbilled} onChange={(e)=>setClientControlForm({...clientControlForm,unbilled:e.target.value})}/></Field><Field label="Arrastre al próximo mes USD"><input required min="0" step="0.01" type="number" value={clientControlForm.carryover} onChange={(e)=>setClientControlForm({...clientControlForm,carryover:e.target.value})}/></Field><Field label="Fondo asignado USD"><input required min="0" step="0.01" type="number" value={clientControlForm.fundAssigned} onChange={(e)=>setClientControlForm({...clientControlForm,fundAssigned:e.target.value})}/></Field><Field label="Fondo utilizado USD"><input required min="0" step="0.01" type="number" value={clientControlForm.fundUsed} onChange={(e)=>setClientControlForm({...clientControlForm,fundUsed:e.target.value})}/></Field></div>
                <div className="form-grid"><Field label="Estado del fondo"><select value={clientControlForm.fundStatus} onChange={(e)=>setClientControlForm({...clientControlForm,fundStatus:e.target.value})}><option>Pendiente de confirmar</option><option>Vigente</option><option>Por reponer</option><option>Agotado</option><option>No aplica</option></select></Field><Field label="Responsable"><input required value={clientControlForm.responsible} onChange={(e)=>setClientControlForm({...clientControlForm,responsible:e.target.value})} placeholder="Nombre completo"/></Field></div>
                <Field label="Fuente o evidencia"><input required value={clientControlForm.source} onChange={(e)=>setClientControlForm({...clientControlForm,source:e.target.value})} placeholder="Contrato, correo, reporte o archivo conciliado"/></Field><Field label="Observación"><textarea value={clientControlForm.note} onChange={(e)=>setClientControlForm({...clientControlForm,note:e.target.value})} placeholder="Condición del corte, excepción o próxima acción"/></Field>
                <button className="primary submit" disabled={saving}>{saving?"Guardando…":"Guardar corte y fondo del cliente"}</button>
              </form>:<div className="panel read-only-card"><strong>Consulta únicamente</strong><p>Bryan, Rebeca, Francisco y Mario pueden registrar fechas de corte, arrastres y fondos con evidencia.</p></div>}
            </div>
            <div className="updates-layout receivable-forms">
              <form className="panel update-form" onSubmit={submitSnapshot}>
                <PanelHead title="Registrar corte diario" action="Totales confirmados" />
                <div className="form-grid">
                  <Field label="Fecha del corte">
                    <input required type="date" value={snapshotForm.reportDate} onChange={(e) => setSnapshotForm({ ...snapshotForm, reportDate: e.target.value })} />
                  </Field>
                  <Field label="Responsable">
                    <input required value={snapshotForm.responsible} onChange={(e) => setSnapshotForm({ ...snapshotForm, responsible: e.target.value })} placeholder="Nombre completo" />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Cartera total USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.portfolioTotal} onChange={(e) => setSnapshotForm({ ...snapshotForm, portfolioTotal: e.target.value })} />
                  </Field>
                  <Field label="Sobre fecha contractual USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.contractualOverdue} onChange={(e) => setSnapshotForm({ ...snapshotForm, contractualOverdue: e.target.value })} />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Cobrado efectivamente hoy USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.collectedToday} onChange={(e) => setSnapshotForm({ ...snapshotForm, collectedToday: e.target.value })} />
                  </Field>
                  <Field label="Nueva facturación del corte USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.newBilling} onChange={(e) => setSnapshotForm({ ...snapshotForm, newBilling: e.target.value })} />
                  </Field>
                  <Field label="Confirmado pendiente de acreditar USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.confirmedPending} onChange={(e) => setSnapshotForm({ ...snapshotForm, confirmedPending: e.target.value })} />
                  </Field>
                  <Field label="Cartera proyectada posterior USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.projectedPortfolio} onChange={(e) => setSnapshotForm({ ...snapshotForm, projectedPortfolio: e.target.value })} />
                  </Field>
                  <Field label="Reembolsos sobre fecha USD">
                    <input required type="number" min="0" step="0.01" value={snapshotForm.reimbursementsOverdue} onChange={(e) => setSnapshotForm({ ...snapshotForm, reimbursementsOverdue: e.target.value })} />
                  </Field>
                </div>
                <Field label="Cartera mayor a 90 días USD">
                  <input required type="number" min="0" step="0.01" value={snapshotForm.over90} onChange={(e) => setSnapshotForm({ ...snapshotForm, over90: e.target.value })} />
                </Field>
                <Field label="Fuente o evidencia">
                  <input required value={snapshotForm.source} onChange={(e) => setSnapshotForm({ ...snapshotForm, source: e.target.value })} placeholder="Reporte CxC, fecha y hora o comprobante" />
                </Field>
                <Field label="Nota del corte">
                  <textarea value={snapshotForm.note} onChange={(e) => setSnapshotForm({ ...snapshotForm, note: e.target.value })} placeholder="Explicar diferencias, conciliaciones o hechos relevantes" />
                </Field>
                <button className="primary submit" disabled={saving}>{saving ? "Guardando…" : "Guardar corte diario"}</button>
              </form>
              <form className="panel update-form" onSubmit={submitCollection}>
                <PanelHead title="Registrar gestión por cliente" action="Compromiso vs. cobro" />
                <div className="form-grid">
                  <Field label="Fecha del reporte">
                    <input required type="date" value={collectionForm.reportDate} onChange={(e) => setCollectionForm({ ...collectionForm, reportDate: e.target.value })} />
                  </Field>
                  <Field label="Cliente">
                    <input required value={collectionForm.client} onChange={(e) => setCollectionForm({ ...collectionForm, client: e.target.value })} />
                  </Field>
                </div>
                <div className="form-grid three-money">
                  <Field label="Comprometido USD"><input required type="number" min="0" step="0.01" value={collectionForm.committed} onChange={(e) => setCollectionForm({ ...collectionForm, committed: e.target.value })} /></Field>
                  <Field label="Cobrado USD"><input required type="number" min="0" step="0.01" value={collectionForm.collected} onChange={(e) => setCollectionForm({ ...collectionForm, collected: e.target.value })} /></Field>
                  <Field label="Pendiente USD"><input required type="number" min="0" step="0.01" value={collectionForm.pending} onChange={(e) => setCollectionForm({ ...collectionForm, pending: e.target.value })} /></Field>
                </div>
                <div className="form-grid">
                  <Field label="Estado">
                    <select value={collectionForm.status} onChange={(e) => setCollectionForm({ ...collectionForm, status: e.target.value })}>
                      {['Pendiente', 'Cobro parcial', 'Cobrado', 'Reprogramado', 'Escalado'].map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </Field>
                  <Field label="Fecha compromiso">
                    <input type="date" value={collectionForm.commitmentDate} onChange={(e) => setCollectionForm({ ...collectionForm, commitmentDate: e.target.value })} />
                  </Field>
                </div>
                <Field label="Responsable"><input required value={collectionForm.responsible} onChange={(e) => setCollectionForm({ ...collectionForm, responsible: e.target.value })} placeholder="Nombre completo" /></Field>
                <Field label="Próxima acción"><input required value={collectionForm.nextAction} onChange={(e) => setCollectionForm({ ...collectionForm, nextAction: e.target.value })} placeholder="Acción concreta y verificable" /></Field>
                <Field label="Fuente o evidencia"><input required value={collectionForm.source} onChange={(e) => setCollectionForm({ ...collectionForm, source: e.target.value })} placeholder="Comprobante, correo o reporte con fecha" /></Field>
                <button className="primary submit" disabled={saving}>{saving ? "Guardando…" : "Guardar gestión"}</button>
              </form>
            </div>
            <div className="receivable-grid history-grid">
              <div className="panel update-feed">
                <PanelHead title="Historial de cortes diarios" action={`${receivableSnapshots.length + financialSnapshots.length + 1} registros`} />
                {financialSnapshots.map((item) => <article className="update-item verified-import" key={`financial-${item.id}`}><div className="area-dot financiero"/><div><span>{item.reportDate} · {item.responsible} · Cargado por el responsable</span><strong>{exactMoney(item.accountingPortfolioCents)} de cartera contable</strong><p>Efectivo: {exactMoney(item.effectiveCollectionsCents)} · Confirmado pendiente: {exactMoney(item.confirmedPendingCents)} · Vencido por confirmar: {exactMoney(item.overduePendingCents)}</p><small>{item.originalName} · {item.submittedBy} · {ecuadorAuditTime(item.createdAt)}</small></div></article>)}
                <article className="update-item verified-import"><div className="area-dot financiero"/><div><span>2026-09-03 · Informe gerencial verificado</span><strong>{exactMoney(receivableUpdate03Sep.accountingPortfolio)} de cartera contable</strong><p>Efectivo: {exactMoney(receivableUpdate03Sep.effectiveCollections)} · Confirmado pendiente: {exactMoney(receivableUpdate03Sep.confirmedPending)} · Vencido por confirmar: {exactMoney(receivableUpdate03Sep.overduePending)}</p><small>Fuente: {receivableUpdate03Sep.source}</small></div></article>
                {receivableSnapshots.map((item) => <article className="update-item" key={item.id}><div className="area-dot financiero"/><div><span>{item.reportDate} · {item.responsible}</span><strong>{exactMoney(item.portfolioTotalCents)} de cartera</strong><p>Cobrado hoy: {exactMoney(item.collectedTodayCents)} · Nueva facturación: {exactMoney(item.newBillingCents)} · Confirmado pendiente: {exactMoney(item.confirmedPendingCents)}</p><small>Fuente: {item.source}</small></div></article>)}
              </div>
              <div className="panel update-feed">
                <PanelHead title="Seguimiento por cliente" action={`${collectionUpdates.length} registros`} />
                {collectionUpdates.length === 0 ? <div className="empty-state"><ClipboardList size={30}/><strong>Sin gestiones cargadas</strong><span>El primer cobro o compromiso aparecerá aquí.</span></div> : collectionUpdates.map((item) => <article className="update-item" key={item.id}><div className="area-dot financiero"/><div><span>{item.reportDate} · {item.status}</span><strong>{item.client}</strong><p>Cobrado: {exactMoney(item.collectedCents)} · Pendiente: {exactMoney(item.pendingCents)}</p><small>{item.responsible} · {item.nextAction} · Fuente: {item.source}</small></div></article>)}
              </div>
            </div>
          </section>
        )}
        {section === "Inhouse El Rosado" && (
          <section className="section-body inhouse-page">
            <Heading
              eyebrow="OPERACIONES INHOUSE · CONTROL ACTUALIZABLE"
              title="Corporación El Rosado"
              text="Control diario de nacionalización, aprobaciones DAV, despacho anticipado, retiros, checklist y trazabilidad por operación."
            />
            <div className="confidential-banner">
              <AlertTriangle size={20} />
              <div><strong>Vista ejecutiva interna · No compartir con el cliente</strong><span>Los porcentajes, causas y comparaciones por sociedad son información reservada de Mario, Vanessa, María Fernanda y Francisco.</span></div>
            </div>
            <ElRosadoControl canManage={currentUser.canManageInhouse} />
            {dailyReports.filter((report) => report.area === "Inhouse El Rosado").length > 0 && (
              <div className="panel daily-report-library inhouse-report-library">
                <PanelHead title="Informes diarios recibidos" action={`${dailyReports.filter((report) => report.area === "Inhouse El Rosado").length} archivos`}/>
                <p className="report-library-help">Los informes históricos permanecen como evidencia. El tablero operativo se actualiza desde el control Excel vigente, sin mezclar cifras anteriores.</p>
                <div className="daily-report-history">
                  {dailyReports.filter((report) => report.area === "Inhouse El Rosado").map((report) => (
                    <article key={report.id}>
                      <div>
                        <span>{report.reportDate} · {report.responsible}</span>
                        <b>{report.originalName}</b>
                        <small>{report.extractedText ? "Contenido disponible para lectura" : "Archivo recibido como evidencia"} · Cargado por {report.submittedBy} · {ecuadorAuditTime(report.createdAt)}</small>
                      </div>
                      <div className="report-file-actions">
                        <button type="button" className="secondary-action" onClick={() => openReport(report)}>Leer informe</button>
                        <button type="button" className="link-button" onClick={() => shareReport(report)}>Guardar / compartir archivo</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {false && <div className="updates-layout inhouse-entry">
              {currentUser.canManageInhouse && currentUser.role !== "Inhouse El Rosado" ? (
                <form className="panel update-form" onSubmit={submitInhouse}>
                  <PanelHead title="Registrar nuevo corte diario" action={currentUser.role === "Inhouse El Rosado" ? "Oliver Lay" : "María Fernanda / Vanessa"} />
                  <div className="form-grid"><Field label="Fecha"><input required type="date" value={inhouseForm.reportDate} onChange={(e) => setInhouseForm({...inhouseForm, reportDate:e.target.value})}/></Field><Field label="Responsable"><input required value={inhouseForm.responsible} disabled={currentUser.role === "Inhouse El Rosado"} onChange={(e) => setInhouseForm({...inhouseForm, responsible:e.target.value})} placeholder="Nombre y apellido"/></Field></div>
                  <div className="form-grid numeric-fields"><Field label="DAV pendientes"><input required min="0" type="number" value={inhouseForm.davPending} onChange={(e) => setInhouseForm({...inhouseForm, davPending:e.target.value})}/></Field><Field label="DAV urgentes"><input required min="0" type="number" value={inhouseForm.urgentDav} onChange={(e) => setInhouseForm({...inhouseForm, urgentDav:e.target.value})}/></Field><Field label="Listos para retiro"><input required min="0" type="number" value={inhouseForm.readyForPickup} onChange={(e) => setInhouseForm({...inhouseForm, readyForPickup:e.target.value})}/></Field><Field label="Checklist pendientes"><input required min="0" type="number" value={inhouseForm.checklistPending} onChange={(e) => setInhouseForm({...inhouseForm, checklistPending:e.target.value})}/></Field><Field label="Alertas de depósito"><input required min="0" type="number" value={inhouseForm.storageAlerts} onChange={(e) => setInhouseForm({...inhouseForm, storageAlerts:e.target.value})}/></Field></div>
                  <Field label="Próxima acción"><textarea required value={inhouseForm.nextAction} onChange={(e) => setInhouseForm({...inhouseForm, nextAction:e.target.value})} placeholder="Acción concreta, dueño y fecha límite"/></Field>
                  <Field label="Fuente o evidencia"><input required value={inhouseForm.source} onChange={(e) => setInhouseForm({...inhouseForm, source:e.target.value})} placeholder="Reporte, correo o control validado"/></Field>
                  <Field label="Observación"><textarea value={inhouseForm.note} onChange={(e) => setInhouseForm({...inhouseForm, note:e.target.value})} placeholder="Bloqueo, dependencia o explicación"/></Field>
                  <button className="primary submit" disabled={saving}>{saving ? "Guardando…" : "Guardar corte inhouse"}</button>
                </form>
              ) : currentUser.role === "Inhouse El Rosado" ? (
                <div className="panel read-only-card"><strong>Proceso automático</strong><p>Oliver únicamente debe cargar un informe completo por día desde Actualizaciones. El CRM lo lee, conserva la evidencia y actualiza el control sin solicitar una segunda digitación.</p></div>
              ) : <div className="panel read-only-card"><strong>Consulta únicamente</strong><p>Su rol puede visualizar este control, pero no modificarlo.</p></div>}
              <div className="panel update-feed">
                <PanelHead title="Historial diario" action={`${inhouseSnapshots.length + 2} cortes`} />
                <article className="update-item verified-import"><div className="area-dot operaciones"/><div><span>2026-09-09 · Importado por Mario</span><strong>{rosadoCut09Sep.total} trámites · {rosadoCut09Sep.inProgress} en curso</strong><p>DAV {rosadoCut09Sep.davSent.compliance} · Anticipado {rosadoCut09Sep.earlyDispatch.compliance} · Retiro {rosadoCut09Sep.pickup.compliance} · Checklist {rosadoCut09Sep.checklist.compliance}</p><small>Fuente: {rosadoCut09Sep.source}</small></div></article>
                <article className="update-item verified-import"><div className="area-dot operaciones"/><div><span>2026-09-03 · Corte verificado</span><strong>32 DAV pendientes · 7 listos para retiro</strong><p>9 urgentes · 2 checklist pendientes · 1 alerta de depósito</p><small>Fuente: {rosadoCut03Sep.source}</small></div></article>
                {inhouseSnapshots.map((item) => <article className="update-item" key={item.id}><div className="area-dot operaciones"/><div><span>{item.reportDate} · {item.responsible}</span><strong>{item.davPending} DAV pendientes · {item.readyForPickup} listos para retiro</strong><p>{item.urgentDav} urgentes · {item.checklistPending} checklist · {item.storageAlerts} alertas de depósito</p><small>{item.nextAction} · Fuente: {item.source}</small></div></article>)}
              </div>
            </div>}
          </section>
        )}
        {section === "Talento y nómina" && (
          <section className="section-body payroll-page">
            <Heading
              eyebrow="INFORMACIÓN LABORAL RESTRINGIDA"
              title="Talento y nómina"
              text="Control agregado de dotación y costo laboral. No contiene nombres ni remuneraciones individuales."
            />
            {!currentUser.canManagePayroll ? (
              <div className="panel payroll-denied">
                <AlertTriangle size={32}/><strong>Acceso restringido</strong>
                <p>Por confidencialidad laboral, este módulo está reservado a Dirección General y Financiero.</p>
              </div>
            ) : (
              <>
                <div className="confidential-banner payroll-security">
                  <AlertTriangle size={20}/>
                  <div><strong>Confidencial · Dirección General y Financiero</strong><span>No copiar, descargar ni compartir cifras fuera de las funciones autorizadas. El archivo individual no fue publicado en el CRM.</span></div>
                </div>
                <section className="kpi-grid operation-kpis payroll-kpis">
                  <Kpi icon={Users} label="Colaboradores registrados" value="74" meta="Archivo recibido 03-sep-2026" tone="blue" />
                  <Kpi icon={CircleDollarSign} label="Nómina base mensual" value={exactMoney(payrollVerifiedCut.basePayroll)} meta="No incluye costo patronal completo" tone="blue" />
                  <Kpi icon={TrendingUp} label="Remuneración promedio" value={exactMoney(payrollVerifiedCut.averageSalary)} meta="Promedio aritmético" tone="green" />
                  <Kpi icon={Target} label="Mediana salarial" value={exactMoney(payrollVerifiedCut.medianSalary)} meta="50% por debajo / 50% por encima" tone="amber" />
                </section>
                <div className="payroll-grid">
                  <div className="panel payroll-bands">
                    <PanelHead title="Distribución agregada" action="74 colaboradores" />
                    {payrollBands.map(([label, count]) => <div className="salary-band" key={label}><span>{label}</span><div><i style={{width:`${(count / 36) * 100}%`}}/></div><strong>{count}</strong></div>)}
                    <small>La distribución se muestra por rangos; no identifica a ningún colaborador.</small>
                  </div>
                  <div className="panel payroll-quality">
                    <PanelHead title="Calidad y alcance del dato" action="Revisión necesaria" />
                    <ul>
                      <li><strong>7</strong> fechas registradas en la columna “Ingresos Nuevos”.</li>
                      <li>Existe una remuneración proporcional de <strong>$186,67</strong>; debe confirmarse su naturaleza.</li>
                      <li>El archivo no clasifica cargos, áreas, tipo de contrato ni estado laboral.</li>
                      <li>No incorpora IESS patronal, décimos, fondos de reserva, vacaciones, bonos ni deducciones.</li>
                    </ul>
                    <div className="data-note"><strong>Conclusión:</strong> {exactMoney(payrollVerifiedCut.basePayroll)} corresponde a remuneraciones registradas, no al costo laboral integral de MACOBSA.</div>
                  </div>
                </div>
                <div className="updates-layout payroll-entry">
                  <form className="panel update-form" onSubmit={submitPayroll}>
                    <PanelHead title="Registrar corte mensual" action="Guardado confidencial" />
                    <div className="form-grid"><Field label="Mes"><input required type="month" value={payrollForm.reportMonth} onChange={(e) => setPayrollForm({...payrollForm, reportMonth:e.target.value})}/></Field><Field label="Número de colaboradores"><input required min="0" type="number" value={payrollForm.headcount} onChange={(e) => setPayrollForm({...payrollForm, headcount:e.target.value})}/></Field></div>
                    <div className="form-grid"><Field label="Nómina base USD"><input required min="0" step="0.01" type="number" value={payrollForm.basePayroll} onChange={(e) => setPayrollForm({...payrollForm, basePayroll:e.target.value})}/></Field><Field label="Costo patronal total USD"><input min="0" step="0.01" type="number" value={payrollForm.employerCost} onChange={(e) => setPayrollForm({...payrollForm, employerCost:e.target.value})} placeholder="Pendiente si no está calculado"/></Field></div>
                    <div className="form-grid"><Field label="Nuevos ingresos"><input min="0" type="number" value={payrollForm.newHires} onChange={(e) => setPayrollForm({...payrollForm, newHires:e.target.value})}/></Field><Field label="Salidas"><input min="0" type="number" value={payrollForm.exits} onChange={(e) => setPayrollForm({...payrollForm, exits:e.target.value})}/></Field></div>
                    <Field label="Fuente"><input required value={payrollForm.source} onChange={(e) => setPayrollForm({...payrollForm, source:e.target.value})} placeholder="Archivo o reporte conciliado"/></Field>
                    <Field label="Observación"><textarea value={payrollForm.note} onChange={(e) => setPayrollForm({...payrollForm, note:e.target.value})} placeholder="Variación, explicación y responsable de revisión"/></Field>
                    <button className="primary submit" disabled={saving}>{saving ? "Guardando…" : "Guardar corte mensual"}</button>
                  </form>
                  <div className="panel update-feed">
                    <PanelHead title="Historial de nómina" action={`${payrollSnapshots.length + 1} cortes`} />
                    <article className="update-item verified-import"><div className="area-dot financiero"/><div><span>Archivo recibido 03-sep-2026 · Corte verificado</span><strong>74 colaboradores · {exactMoney(payrollVerifiedCut.basePayroll)}</strong><p>Promedio: {exactMoney(payrollVerifiedCut.averageSalary)} · Mediana: {exactMoney(payrollVerifiedCut.medianSalary)}</p><small>Fuente: {payrollVerifiedCut.source}</small></div></article>
                    {payrollSnapshots.map((item) => <article className="update-item" key={item.id}><div className="area-dot financiero"/><div><span>{item.reportMonth} · Registro confidencial</span><strong>{item.headcount} colaboradores · {exactMoney(item.basePayrollCents)}</strong><p>Costo patronal: {item.employerCostCents ? exactMoney(item.employerCostCents) : "Pendiente"} · Ingresos: {item.newHires} · Salidas: {item.exits}</p><small>Fuente: {item.source}</small></div></article>)}
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        {section === "Actualizaciones" && (
          <section className="section-body">
            <Heading
              eyebrow="CARGA COLABORATIVA POR ÁREA"
              title="Actualizaciones del equipo"
              text="Cada responsable registra avances, alertas, cifras y compromisos; el CEO los consulta en cualquier momento."
            />
            <div className="panel notification-evidence-panel">
              <div className="notification-evidence-head">
                <div>
                  <span>TRAZABILIDAD EN TIEMPO REAL</span>
                  <h3>Notificaciones y evidencia de cambios</h3>
                  <p>Cada carga o actualización queda identificada por usuario, área, fecha, hora y estado de procesamiento.</p>
                </div>
                <div className="notification-sync">
                  <Bell size={18}/>
                  <strong>{liveSyncLabel}</strong>
                  <small>Verificación automática cada 10 segundos</small>
                </div>
              </div>
              <div className="notification-status-guide">
                <span><i className="status-dot processed"/>Procesado: ya alimentó el tablero</span>
                <span><i className="status-dot received"/>Recibido: existe evidencia, requiere revisión</span>
                <span><i className="status-dot tracked"/>En seguimiento: cambio puntual registrado</span>
              </div>
              <div className="notification-evidence-list">
                {notificationUpdates.length === 0 ? (
                  <p className="empty-notifications">Todavía no existen movimientos registrados.</p>
                ) : notificationUpdates.map((update) => {
                  const evidenceReport = reportForUpdate(update);
                  const statusClass = update.status.toLowerCase().includes("procesado automáticamente")
                    ? "processed"
                    : update.status.toLowerCase().includes("recibido") || update.status.toLowerCase().includes("parcial") || update.status.toLowerCase().includes("documental")
                      ? "received"
                      : "tracked";
                  return (
                    <article key={`notification-${update.id}`} className="notification-evidence-item">
                      <i className={`status-dot ${statusClass}`}/>
                      <div>
                        <span>{update.area} · {update.responsible}</span>
                        <strong>{update.title}</strong>
                        <small>{ecuadorAuditTime(update.createdAt)} · registrado por {update.submittedBy}</small>
                      </div>
                      <div className="notification-evidence-actions">
                        <em className={`notification-status ${statusClass}`}>{update.status}</em>
                        {evidenceReport && <button type="button" onClick={() => openReport(evidenceReport)}>Ver evidencia</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="verified-note data-rule">
              <CheckCircle2 size={18} />
              <div>
                <strong>Regla obligatoria de calidad del dato</strong>
                <span>
                  Registrar únicamente información comprobada. Si un dato no
                  existe, escribir “Pendiente de confirmar”; nunca estimarlo ni
                  inventarlo. Todo asunto debe indicar responsable, fecha y
                  evidencia en el detalle.
                </span>
              </div>
            </div>
            {unreadReports.length > 0 && (
              <button type="button" className="new-report-alert" onClick={() => openReport(unreadReports[0])}>
                <span><Bell size={20}/><strong>{unreadReports.length === 1 ? "Nuevo informe recibido" : `${unreadReports.length} informes nuevos recibidos`}</strong></span>
                <em>Leer ahora</em>
              </button>
            )}
            {currentUser.role !== "Auditoría y Control" && reportAreas.length > 0 && (
              <form className="panel daily-report-upload" onSubmit={submitDailyReport}>
                <div className="daily-upload-heading">
                  <div>
                    <span>CARGA ÚNICA DEL DÍA</span>
                    <h3>Subir informe diario completo</h3>
                    <p>El Word se lee y registra automáticamente como un solo aporte. No copie cada línea del informe.</p>
                  </div>
                  <em>1 archivo por responsable y fecha</em>
                </div>
                <div className="upload-targets">
                  <strong>Metas oficiales de septiembre 2026</strong>
                  <span>DAI $310.000 · Regulatorio $30.000 · Extras $20.000 · Total $360.000</span>
                </div>
                <div className="daily-upload-grid">
                  <Field label="Área responsable">
                    <select
                      value={uploadArea}
                      onChange={(event) => {
                        setUploadArea(event.target.value as ReportArea);
                        setDailyFile(null);
                        setRegulatoryPreview(null);
                        setFinancialPreview(null);
                        setFileInputKey((value) => value + 1);
                        setUploadMessage("");
                      }}
                    >
                      {reportAreas.map((area) => <option key={area}>{area}</option>)}
                    </select>
                  </Field>
                  <Field label="Responsable">
                    <input value={reportResponsibles[uploadArea].name} disabled />
                  </Field>
                  <Field label="Fecha del informe">
                    <input required type="date" value={uploadDate} onChange={(event) => setUploadDate(event.target.value)} />
                  </Field>
                  <Field label={uploadArea === "Regulatorio" || uploadArea === "Comercial" ? "Informe escrito Word .docx" : uploadArea === "Financiero" ? "Informe de cartera PDF" : "Informe Word o PDF"}>
                    <input
                      key={fileInputKey}
                      required
                      type="file"
                      accept={uploadArea === "Regulatorio" || uploadArea === "Comercial" ? ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" : uploadArea === "Financiero" ? ".pdf,application/pdf" : ".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
                      onChange={(event) => void selectDailyReport(event.target.files?.[0] ?? null)}
                    />
                  </Field>
                </div>
                {uploadArea === "Comercial" && (
                  <div className="commercial-live-rule"><CheckCircle2 size={18}/><div><strong>Informe Comercial narrativo obligatorio</strong><span>El Word debe desarrollar clientes, gestiones realizadas, respuestas, riesgos, próximas acciones, fechas y evidencias. Los avances surgidos durante el día se registran abajo en la bitácora móvil y no deben repetirse manualmente en otra sección.</span></div></div>
                )}
                {uploadArea === "Despacho" && (
                  <div className="commercial-live-rule"><CheckCircle2 size={18}/><div><strong>Medición automática de pedidos por cliente habilitada</strong><span>Incluya todos los clientes activos, incluso los que tengan cero movimientos. Formato recomendado por línea: Cliente | Hoy: 0 | Acumulado: 0 | Último pedido: dd/mm/aaaa | Distrito: nombre | Alerta: detalle. No enumere cada trámite salvo excepciones o riesgos.</span></div></div>
                )}
                {uploadArea === "Inhouse El Rosado" && (
                  <div className="commercial-live-rule"><CheckCircle2 size={18}/><div><strong>Carga exclusiva de Corporación El Rosado</strong><span>Incluya el corte diario, DAV pendientes y urgentes, despachos anticipados, retiros, checklist, alertas de depósito, próxima acción, responsable, fecha y evidencia. Esta cuenta no puede cargar informes de otras áreas.</span></div></div>
                )}
                {uploadArea === "Regulatorio" && regulatoryPreview && (
                  <div className="regulatory-preview" aria-live="polite">
                    <div className="regulatory-preview-head">
                      <div><span>LECTURA AUTOMÁTICA</span><strong>Vista previa antes de confirmar</strong></div>
                      <em>Calculado por el CRM</em>
                    </div>
                    <div className="regulatory-preview-grid">
                      <div><span>Facturado hoy</span><strong>{exactMoney(regulatoryPreview.billedTodayCents)}</strong></div>
                      <div><span>Acumulado</span><strong>{exactMoney(regulatoryPreview.billedAccumulatedCents)}</strong></div>
                      <div><span>Meta</span><strong>{exactMoney(regulatoryPreview.monthlyGoalCents)}</strong></div>
                      <div><span>Avance</span><strong>{(regulatoryPreview.calculatedProgressBasisPoints / 100).toFixed(2).replace(".", ",")}%</strong></div>
                      <div><span>Creados sin facturar hoy</span><strong>{exactMoney(regulatoryPreview.createdUnbilledTodayCents)}</strong></div>
                      <div><span>Licencias hoy / acumuladas</span><strong>{regulatoryPreview.licensesToday} / {regulatoryPreview.licensesAccumulated}</strong></div>
                    </div>
                    {regulatoryPreview.warnings.length > 0 ? (
                      <div className="regulatory-preview-warning"><AlertTriangle size={18}/><span>{regulatoryPreview.warnings.join(" ")}</span></div>
                    ) : (
                      <div className="regulatory-preview-ok"><CheckCircle2 size={18}/><span>Indicadores completos y conciliados. Puede confirmar la carga.</span></div>
                    )}
                  </div>
                )}
                {uploadArea === "Financiero" && financialPreview && (
                  <div className="regulatory-preview financial-preview" aria-live="polite">
                    <div className="regulatory-preview-head">
                      <div><span>LECTURA AUTOMÁTICA DE CARTERA</span><strong>Vista previa antes de confirmar</strong></div>
                      <em>Calculado por el CRM</em>
                    </div>
                    <div className="regulatory-preview-grid">
                      <div><span>Cartera contable</span><strong>{exactMoney(financialPreview.accountingPortfolioCents)}</strong></div>
                      <div><span>Ingresos efectivos</span><strong>{exactMoney(financialPreview.effectiveCollectionsCents)}</strong></div>
                      <div><span>Nueva facturación</span><strong>{exactMoney(financialPreview.newBillingCents)}</strong></div>
                      <div><span>Confirmado pendiente</span><strong>{exactMoney(financialPreview.confirmedPendingCents)}</strong></div>
                      <div><span>Vencido por confirmar</span><strong>{exactMoney(financialPreview.overduePendingCents)}</strong></div>
                      <div><span>Cartera proyectada</span><strong>{exactMoney(financialPreview.projectedPortfolioCents)}</strong></div>
                    </div>
                    {financialPreview.warnings.length > 0 ? (
                      <div className="regulatory-preview-warning"><AlertTriangle size={18}/><span>{financialPreview.warnings.join(" ")}</span></div>
                    ) : (
                      <div className="regulatory-preview-ok"><CheckCircle2 size={18}/><span>Cifras principales identificadas y conciliadas. Puede confirmar la carga.</span></div>
                    )}
                  </div>
                )}
                <Field label="Resumen opcional — necesario solo si el PDF no contiene texto legible">
                  <textarea
                    value={uploadSummary}
                    onChange={(event) => setUploadSummary(event.target.value)}
                    placeholder="En una sola nota: principal resultado, alerta y próxima acción. Para Word puede dejarlo vacío."
                  />
                </Field>
                <div className="daily-upload-actions">
                  <p>{uploadMessage || "Formatos: Word .docx o PDF · máximo 15 MB. Para corregir un informe de Facturación, anule el anterior y suba el correcto."}</p>
                  <button className="primary" disabled={saving || previewingReport || (uploadArea === "Regulatorio" && !!dailyFile && !regulatoryPreview)}>
                    <FileDown size={18} /> {saving ? "Procesando…" : previewingReport ? "Validando…" : "Confirmar y actualizar CRM"}
                  </button>
                </div>
              </form>
            )}
            {dailyReports.length > 0 && (
              <div className="panel daily-report-library">
                <PanelHead title="Informes recibidos" action={`${dailyReports.length} archivos`}/>
                <p className="report-library-help">Seleccione “Leer informe” para revisar su contenido dentro del CRM.</p>
                <div className="daily-report-history">
                  {dailyReports.map((report) => (
                    <article key={report.id}>
                      <div>
                        <span>{report.reportDate} · {report.area} · {report.responsible}</span>
                        <b>{report.originalName}</b>
                        <small>Cargado por {report.submittedBy} · {ecuadorAuditTime(report.createdAt)}</small>
                        {report.processingStatus && <small>Sincronización: {report.processingStatus}{report.processingError ? ` · ${report.processingError}` : ""}</small>}
                      </div>
                      <div className="report-file-actions">
                        <button type="button" className="secondary-action" onClick={() => openReport(report)}>Leer informe</button>
                        <button type="button" className="link-button" onClick={() => shareReport(report)}>Guardar / compartir archivo</button>
                        {report.area === "Facturación" && (currentUser.role === "Dirección General" || (currentUser.email.toLowerCase() === report.submittedBy.toLowerCase() && currentUser.allowedAreas.includes(report.area))) && <button type="button" className="secondary-action" disabled={voidingReportId !== null} onClick={() => void annulBillingReport(report)}>{voidingReportId === report.id ? "Anulando…" : "Anular y corregir"}</button>}
                        {report.area === "Facturación" && <button type="button" className="secondary-action" onClick={() => void loadCorrectionHistory(report.id)}>Ver correcciones</button>}
                      </div>
                      {correctionHistory[report.id]?.map((version) => <div key={version.id}><small>Anulado: {version.reason}</small><a href={`/api/report-uploads/${report.id}/history/${version.id}`} download>Descargar original anterior: {version.originalName}</a></div>)}
                    </article>
                  ))}
                </div>
              </div>
            )}
            {voidedReports.some((report) => report.area === "Facturación") && <div className="panel daily-report-library">
              <PanelHead title="Facturación pendiente de reemplazo" action="Informe anulado"/>
              <div className="daily-report-history">{voidedReports.filter((report) => report.area === "Facturación").map((report) => <article key={report.id}>
                <div><span>{report.reportDate} · {report.responsible}</span><b>{report.originalName}</b><small>Motivo: {report.reason}</small></div>
                <button type="button" className="secondary-action" onClick={() => { setUploadArea("Facturación"); setUploadDate(report.reportDate); setUploadMessage("Seleccione el PDF corregido para esa fecha."); }}>Cargar versión corregida</button>
                <button type="button" className="secondary-action" onClick={() => void loadCorrectionHistory(report.id)}>Ver original anulado</button>
                {correctionHistory[report.id]?.map((version) => <a key={version.id} href={`/api/report-uploads/${report.id}/history/${version.id}`} download>Descargar: {version.originalName}</a>)}
              </article>)}</div>
            </div>}
            <div className="updates-layout">
              <form className="panel update-form" onSubmit={submitUpdate}>
                <PanelHead
                  title={updateForm.area === "Comercial" ? "Bitácora comercial en tiempo real" : "Registrar dato puntual"}
                  action={updateForm.area === "Comercial" ? "Guardar cada avance al ocurrir" : "Opcional"}
                />
                <div className="form-grid">
                  <Field label="Área">
                    <select
                      value={updateForm.area}
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, area: e.target.value })
                      }
                    >
                      {currentUser.allowedAreas.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fecha del reporte">
                    <input
                      required
                      type="date"
                      value={updateForm.reportDate}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          reportDate: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                {updateForm.area === "Comercial" ? (
                  <>
                    <div className="commercial-live-rule"><CheckCircle2 size={18}/><div><strong>Registro escrito y completo</strong><span>No basta indicar “en seguimiento”. Describa qué ocurrió, qué gestión realizó, qué respondió el cliente y qué sucederá después.</span></div></div>
                    <div className="form-grid">
                      <Field label="Cliente o prospecto"><input required value={commercialLiveForm.client} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,client:e.target.value})} placeholder="Razón social o nombre del prospecto"/></Field>
                      <Field label="Asunto u oportunidad"><input required value={commercialLiveForm.subject} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,subject:e.target.value})} placeholder="Ej.: propuesta de agente de aduana"/></Field>
                    </div>
                    <Field label="Situación y antecedente"><textarea required minLength={30} value={commercialLiveForm.situation} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,situation:e.target.value})} placeholder="Explique el contexto, necesidad, riesgo o estado previo del negocio."/></Field>
                    <Field label="Gestión realizada hoy"><textarea required minLength={30} value={commercialLiveForm.actionTaken} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,actionTaken:e.target.value})} placeholder="Detalle llamada, reunión, propuesta, visita, coordinación o seguimiento realizado."/></Field>
                    <Field label="Respuesta o resultado obtenido"><textarea required minLength={20} value={commercialLiveForm.clientResponse} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,clientResponse:e.target.value})} placeholder="Indique la respuesta exacta, decisión, objeción o avance comprobado."/></Field>
                    <div className="form-grid">
                      <Field label="Resultado cuantitativo"><input value={commercialLiveForm.metric} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,metric:e.target.value})} placeholder="Valor USD, pedidos, probabilidad o pendiente de confirmar"/></Field>
                      <Field label="Estado"><select value={updateForm.status} onChange={(e)=>setUpdateForm({...updateForm,status:e.target.value})}><option>En seguimiento</option><option>En riesgo</option><option>Completado</option><option>Requiere decisión CEO</option></select></Field>
                    </div>
                    <Field label="Próxima acción concreta"><textarea required minLength={20} value={commercialLiveForm.nextAction} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,nextAction:e.target.value})} placeholder="Qué hará, con quién y cuál es el resultado esperado."/></Field>
                    <div className="form-grid">
                      <Field label="Fecha compromiso"><input required type="date" value={commercialLiveForm.commitmentDate} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,commitmentDate:e.target.value})}/></Field>
                      <Field label="Evidencia o fuente"><input required value={commercialLiveForm.evidence} onChange={(e)=>setCommercialLiveForm({...commercialLiveForm,evidence:e.target.value})} placeholder="Correo, reunión, WhatsApp, propuesta o documento"/></Field>
                    </div>
                    <Field label="Responsable"><input value={reportResponsibles.Comercial.name} disabled/></Field>
                  </>
                ) : (
                  <>
                    <Field label="Título o asunto"><input required value={updateForm.title} onChange={(e)=>setUpdateForm({...updateForm,title:e.target.value})} placeholder="Ej.: Cotización enviada a nuevo prospecto"/></Field>
                    <div className="form-grid"><Field label="Indicador o resultado"><input value={updateForm.metric} onChange={(e)=>setUpdateForm({...updateForm,metric:e.target.value})} placeholder="Ej.: 42 pedidos / $18.500"/></Field><Field label="Estado"><select value={updateForm.status} onChange={(e)=>setUpdateForm({...updateForm,status:e.target.value})}><option>En seguimiento</option><option>En riesgo</option><option>Completado</option><option>Requiere decisión CEO</option></select></Field></div>
                    <Field label="Responsable"><input required value={updateForm.responsible} onChange={(e)=>setUpdateForm({...updateForm,responsible:e.target.value})} placeholder="Nombre del responsable"/></Field>
                    <Field label="Detalle y evidencia"><textarea required value={updateForm.detail} onChange={(e)=>setUpdateForm({...updateForm,detail:e.target.value})} placeholder="Fuente o evidencia, avance, problema, próxima acción y fecha compromiso"/></Field>
                  </>
                )}
                <button className="primary submit" disabled={saving}>
                  {saving ? "Guardando…" : updateForm.area === "Comercial" ? "Guardar avance comercial" : "Guardar actualización"}
                </button>
              </form>
              <div className="panel update-feed">
                <PanelHead
                  title="Registro consolidado"
                  action={`${updates.length} aportes`}
                />
                {updates.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={32} />
                    <strong>Aún no hay actualizaciones</strong>
                    <span>
                      El primer registro aparecerá aquí con área, autor y fecha.
                    </span>
                  </div>
                ) : (
                  updates.map((u) => (
                    <article className="update-item" key={u.id}>
                      <div className={`area-dot ${u.area.toLowerCase()}`} />
                      <div>
                        <span>
                          {u.area} · {u.reportDate}
                        </span>
                        <strong>{u.title}</strong>
                        <p>{u.detail || "Sin detalle adicional"}</p>
                        <small>
                          {u.responsible} · {u.status}
                          {u.metric && ` · ${u.metric}`}
                        </small>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
        {section === "Informes por responsable" && (
          <section className="section-body individual-reports-page">
            <Heading
              eyebrow="EVIDENCIA INDIVIDUAL · TRAZABILIDAD"
              title="Informes por responsable"
              text="Seleccione el área y la fecha. El informe mostrará únicamente los aportes de la persona elegida y conservará correo, hora y origen de cada registro."
            />
            <div className="info-banner report-upload-guidance">
              <div>
                <strong>Esta pantalla es únicamente para consultar informes.</strong>
                <span>Para cargar el informe diario, utilice Actualizaciones. Debe subir un solo archivo completo; el CRM procesa el resto.</span>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setSection("Actualizaciones");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <ClipboardList size={18} /> Subir informe diario
              </button>
            </div>
            <div className="report-controls panel">
              <div className="report-filter-grid">
                <Field label="Área">
                  <select
                    value={reportArea}
                    onChange={(event) => {
                      const nextArea = event.target.value as ReportArea;
                      setReportArea(nextArea);
                      setReportResponsible(reportResponsibles[nextArea].name);
                      setReportFrom("");
                      setReportTo("");
                    }}
                  >
                    {reportAreas.map((area) => (
                      <option key={area}>{area}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Responsable">
                  <select
                    value={reportResponsible}
                    onChange={(event) => setReportResponsible(event.target.value)}
                  >
                    {reportResponsibleOptions.map((responsible) => (
                      <option key={responsible}>{responsible}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Desde"><input type="date" value={reportFrom} onChange={(event)=>setReportFrom(event.target.value)} /></Field>
                <Field label="Hasta"><input type="date" value={reportTo} onChange={(event)=>setReportTo(event.target.value)} /></Field>
              </div>
              <div className="report-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => { setReportFrom(""); setReportTo(""); }}
                >
                  Ver todo el historial
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={generateIndividualReport}
                  disabled={individualUpdates.length === 0 || currentUser.role !== "Dirección General" || authorizingDocument}
                >
                  <FileDown size={18} /> {currentUser.role === "Dirección General" ? authorizingDocument ? "Preparando informe…" : "Autorizar y preparar PDF" : "Requiere autorización de Mario"}
                </button>
              </div>
              <div className="ceo-authorization-rule">
                <AlertTriangle size={18}/><span><strong>Autorización exclusiva:</strong> solo Mario Coka puede generar, descargar o compartir documentos oficiales del CRM.</span>
              </div>
            </div>
            <div className="panel original-report-downloads">
              <PanelHead title="Archivo original del informe" action={`${individualUploadedReports.length} encontrado(s)`}/>
              <p className="panel-intro">Busque directamente entre todos los archivos cargados. Este es el documento exacto recibido por el CRM, sin imprimir ni reconstruir la pantalla.</p>
              <div className="report-filter-grid original-report-filters">
                <Field label="Área"><select value={uploadedAreaFilter} onChange={(e)=>{setUploadedAreaFilter(e.target.value);setUploadedResponsibleFilter("Todos los usuarios");}}><option>Todas las áreas</option>{uploadedAreaOptions.map((area)=><option key={area}>{area}</option>)}</select></Field>
                <Field label="Usuario"><select value={uploadedResponsibleFilter} onChange={(e)=>setUploadedResponsibleFilter(e.target.value)}><option>Todos los usuarios</option>{uploadedResponsibleOptions.map((responsible)=><option key={responsible}>{responsible}</option>)}</select></Field>
                <Field label="Fecha exacta"><input type="date" value={uploadedExactDate} onChange={(e)=>setUploadedExactDate(e.target.value)} /></Field>
                <div className="report-actions"><button type="button" className="secondary-action" onClick={()=>{setUploadedAreaFilter("Todas las áreas");setUploadedResponsibleFilter("Todos los usuarios");setUploadedExactDate("");}}>Ver todos</button></div>
              </div>
              {reportDownloadError && <div className="form-error" role="alert">{reportDownloadError}</div>}
              {individualUploadedReports.length === 0 ? (
                <div className="empty-state"><ClipboardList size={28}/><strong>No existe un archivo cargado para este filtro</strong><span>Pruebe otra fecha o responsable.</span></div>
              ) : (
                <div className="original-report-list">
                  {individualUploadedReports.map((report) => (
                    <article key={report.id}>
                      <div><span>{report.reportDate} · {report.responsible}</span><strong>{report.originalName}</strong><small>{report.mimeType} · {(report.sizeBytes / 1024).toFixed(0)} KB · {ecuadorAuditTime(report.createdAt)}</small></div>
                      <div className="report-card-actions"><button type="button" className="primary" onClick={() => shareReport(report)}><FileDown size={17}/> Guardar / compartir informe</button></div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <article className="panel individual-report">
              <header className="report-header">
                <div>
                  <span>MACOBSA S.A. · CEM 360 · CONFIDENCIAL</span>
                  <h2>Informe individual de {reportArea}</h2>
                  <p>
                    Responsable: <strong>{reportResponsible}</strong>
                    {reportResponsible === reportOwner.name && ` · ${reportOwner.email}`}
                  </p>
                </div>
                <div className="report-period">
                  <span>PERÍODO</span>
                  <strong>{reportFrom || reportTo ? `${reportFrom || "Inicio"} → ${reportTo || "Actual"}` : "Historial completo"}</strong>
                </div>
              </header>
              <div className={`document-authorization-stamp ${documentAuthorization ? "approved" : "draft"}`}>
                {documentAuthorization ? (
                  <><CheckCircle2 size={20}/><div><strong>AUTORIZADO POR MARIO COKA</strong><span>{documentAuthorization.authorizationCode} · {ecuadorAuditTime(documentAuthorization.createdAt)} · {documentAuthorization.authorizedBy}</span></div></>
                ) : (
                  <><AlertTriangle size={20}/><div><strong>BORRADOR NO AUTORIZADO</strong><span>No válido para descargar, compartir ni presentar al Comité.</span></div></>
                )}
              </div>
              <div className="report-summary">
                <div><span>Aportes</span><strong>{individualUpdates.length}</strong></div>
                <div><span>En riesgo</span><strong>{individualUpdates.filter((item) => item.status === "En riesgo").length}</strong></div>
                <div><span>Completados</span><strong>{individualUpdates.filter((item) => item.status === "Completado").length}</strong></div>
              </div>
              <div className="report-scope-note">
                <CheckCircle2 size={18} />
                <span>Contenido aislado automáticamente: este documento excluye todas las demás áreas y responsables que no correspondan al filtro seleccionado.</span>
              </div>
              {individualUpdates.length === 0 && selectedUploadedReports.length === 0 ? (
                <div className="empty-state report-empty">
                  <ClipboardList size={32} />
                  <strong>No existen aportes para este filtro</strong>
                  <span>La ausencia queda visible; no se completa con datos estimados.</span>
                </div>
              ) : individualUpdates.length === 0 ? (
                <div className="individual-report-list">
                  {selectedUploadedReports.map((report) => (
                    <section className="individual-report-entry" key={report.id}>
                      <div className="entry-topline"><span>{report.reportDate} · Archivo original</span><em className="origin direct">Cargado por responsable</em></div>
                      <h3>{report.originalName}</h3>
                      <p>{report.extractedText || "El archivo está disponible para descarga, pero no contiene texto extraíble."}</p>
                      <dl className="audit-trail">
                        <div><dt>Responsable declarado</dt><dd>{report.responsible}</dd></div>
                        <div><dt>Correo que registró</dt><dd>{report.submittedBy}</dd></div>
                        <div><dt>Documento original</dt><dd><button type="button" className="link-button" onClick={() => shareReport(report)}>Guardar / compartir informe</button></dd></div>
                      </dl>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="individual-report-list">
                  {individualUpdates.map((item) => {
                    const origin = updateOrigin(item);
                    return (
                      <section className="individual-report-entry" key={item.id}>
                        <div className="entry-topline">
                          <span>{item.reportDate} · {item.status}</span>
                          <em className={origin === "Importado por Mario" ? "origin imported" : "origin direct"}>{origin}</em>
                        </div>
                        <h3>{item.title}</h3>
                        {item.metric && <strong className="entry-metric">{item.metric}</strong>}
                        <p>{item.detail || "Sin detalle adicional"}</p>
                        <dl className="audit-trail">
                          <div><dt>Responsable declarado</dt><dd>{item.responsible}</dd></div>
                          <div><dt>Correo que registró</dt><dd>{item.submittedBy}</dd></div>
                          <div>
                            <dt>Ingreso al CRM</dt>
                            <dd>{item.createdAt ? `${ecuadorAuditTime(item.createdAt)} · Ecuador` : "Hora no disponible · importación documental"}</dd>
                          </div>
                        </dl>
                      </section>
                    );
                  })}
                </div>
              )}
              <footer className="report-footer">
                Documento generado desde CRM MACOBSA · Área exclusiva: {reportArea} · Confidencial Comité MCB 360
              </footer>
            </article>
          </section>
        )}
        {section === "Guías por rol" && (
          <section className="section-body">
            <Heading
              eyebrow="MANUAL PRÁCTICO · PRUEBA CONTROLADA"
              title="Qué debe hacer cada miembro"
              text="Cada persona registra solo su responsabilidad. Todo aporte queda asociado a su correo, fecha y fuente."
            />
            <div className="access-banner">
              <CheckCircle2 size={20}/>
              <div><strong>Su sesión: {currentUser.displayName}</strong><span>Rol interno: {currentUser.role} · Áreas autorizadas: {currentUser.allowedAreas.join(", ") || "ninguna"}</span></div>
            </div>
            <div className="manual-grid">
              {committeeManuals.map(([name, role, instruction]) => (
                <article className="panel manual-card" key={name}>
                  <span>{role}</span><h3>{name}</h3><p>{instruction}</p>
                  <ol><li>Al cierre de su gestión, abrir “Actualizaciones”.</li><li>En “Subir informe diario”, seleccionar fecha y su Word .docx o PDF.</li><li>Pulsar “Subir y actualizar CRM” una sola vez.</li><li>Usar “Registrar dato puntual” únicamente para una novedad posterior o urgente.</li><li>Comprobar el aporte en “Informes por responsable”.</li></ol>
                </article>
              ))}
            </div>
            <div className="panel security-rules">
              <PanelHead title="Reglas que nadie puede omitir" action="Obligatorias" />
              <ul><li>No estimar ni inventar. Usar “Pendiente de confirmar”.</li><li>No borrar asuntos al cambiar de mes: actualizar estado y conservar historial.</li><li>No compartir el enlace, capturas, exportaciones ni credenciales fuera del Comité autorizado.</li><li>Las contradicciones se marcan “Por conciliar”; no se sobrescribe una versión con otra.</li><li>Los registros no se eliminan desde el CRM; quedan con autor y fecha para auditoría.</li></ul>
            </div>
          </section>
        )}
        {section === "Auditoría" && isAuditOwner && (
          <section className="section-body">
            <Heading
              eyebrow="CONSOLA TEMPORAL · SOLO LECTURA"
              title="Auditoría técnica V49"
              text="Acceso exclusivo del propietario. Las verificaciones consultan D1 y R2 sin modificar registros ni archivos."
            />
            <div className="access-banner">
              <ShieldCheck size={20}/>
              <div>
                <strong>Sesión del propietario verificada</strong>
                <span>Las respuestas no se almacenan y quedan excluidas de caché.</span>
              </div>
            </div>
            <div className="manual-grid">
              <article className="panel manual-card">
                <span>D1 · CONTROL</span>
                <h3>Manifiesto integral</h3>
                <p>Presenta tablas, estructura, relaciones, conteos y huellas de integridad.</p>
                <a className="primary" href="/api/audit/d1/manifest" target="_blank" rel="noreferrer">
                  <FileSpreadsheet size={18}/> Abrir manifiesto
                </a>
              </article>
              <article className="panel manual-card">
                <span>D1 · RESPALDO LÓGICO</span>
                <h3>Exportación completa</h3>
                <p>Descarga una copia JSON verificable con esquema, relaciones y todos los registros.</p>
                <a className="primary" href="/api/audit/d1/export" target="_blank" rel="noreferrer">
                  <FileDown size={18}/> Descargar exportación
                </a>
              </article>
              <article className="panel manual-card">
                <span>R2 · EVIDENCIA</span>
                <h3>Verificar 26 informes</h3>
                <p>Comprueba existencia, lectura completa, tamaño y correspondencia con D1.</p>
                <a className="primary" href="/api/audit/r2/verify" target="_blank" rel="noreferrer">
                  <ShieldCheck size={18}/> Ejecutar verificación
                </a>
              </article>
            </div>
          </section>
        )}
        {section === "Clientes" && (
          <section className="section-body">
            <Heading
              eyebrow={liveClientOrders.length ? "CONTROL EN LÍNEA · PEDIDOS POR CLIENTE" : "RANKING REAL · AGOSTO 2026"}
              title="Clientes"
              text={liveClientOrders.length ? "Acumulados del mes y alertas calculados desde los informes de Despacho." : "Concentración operativa según trámites refrendados."}
            />
            <div className="panel commercial-live-activity">
              <PanelHead title="Actividad comercial en línea" action={liveSyncLabel}/>
              <div className="updates-list">
                {recentCommercialActivity.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList size={32}/>
                    <strong>Aún no hay actividad comercial registrada</strong>
                    <span>Los informes y avances de Carolina aparecerán aquí automáticamente.</span>
                  </div>
                ) : recentCommercialActivity.map((update) => (
                  <article className="update-item" key={`commercial-${update.id}`}>
                    <div className="area-dot comercial"/>
                    <div>
                      <span>{update.reportDate} · {ecuadorAuditTime(update.createdAt)}</span>
                      <strong>{update.title}</strong>
                      <p>{update.detail || "Sin detalle adicional"}</p>
                      <small>{update.responsible} · {update.status}{update.metric && ` · ${update.metric}`}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="client-alert-summary">
              <article className={`client-alert-card ${clientsWithoutOrders.length ? "danger" : "clear"}`}>
                <div><AlertTriangle size={20}/><strong>Clientes sin pedidos en el mes</strong></div>
                <b>{clientsWithoutOrders.length}</b>
                <p>{clientsWithoutOrders.length ? "Requieren contacto inmediato de Comercial." : "No se detectan clientes sin pedidos dentro del universo cargado."}</p>
              </article>
              <article className={`client-alert-card ${clientsWithVolumeDrop.length ? "warning" : "clear"}`}>
                <div><TrendingDown size={20}/><strong>Baja frente al mes anterior</strong></div>
                <b>{clientsWithVolumeDrop.length}</b>
                <p>{clientsWithVolumeDrop.length ? "Requieren explicación, responsable y plan de recuperación." : "No se detectan disminuciones con comparación disponible."}</p>
              </article>
            </div>
            {(clientsWithoutOrders.length > 0 || clientsWithVolumeDrop.length > 0) && (
              <div className="panel client-alert-list">
                <PanelHead title="Alertas comerciales automáticas" action="Acción requerida"/>
                {[...clientsWithoutOrders, ...clientsWithVolumeDrop.filter((client) => !clientsWithoutOrders.includes(client))].map((client) => {
                  const change = client.previous ? ((client.current - client.previous) / client.previous) * 100 : null;
                  return <article key={client.name}>
                    <div><AlertTriangle size={18}/><span><strong>{client.name}</strong><small>{client.current === 0 ? "Sin pedidos durante el mes" : "Disminución frente al mes anterior"}</small></span></div>
                    <dl><div><dt>Último pedido</dt><dd>{client.lastOrder}</dd></div><div><dt>Mes actual</dt><dd>{client.current}</dd></div><div><dt>Mes anterior</dt><dd>{client.previous ?? "Sin dato"}</dd></div><div><dt>Variación</dt><dd>{change === null ? "Sin comparación" : `${change.toFixed(1).replace(".", ",")}%`}</dd></div></dl>
                  </article>;
                })}
              </div>
            )}
            <div className="client-alert-rule"><CheckCircle2 size={18}/><span>El control se recalcula al cargar cada cierre mensual. Para detectar clientes ausentes, el archivo debe incluir el universo completo de clientes activos, no solamente el Top 10.</span></div>
            <div className="panel client-list">
              {visibleClients
                .filter((c) =>
                  c.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((c) => (
                  <div className="client-row" key={c.name}>
                    <div className="client-icon">{c.rank}</div>
                    <div className="client-main">
                      <strong>{c.name}</strong>
                      <span>
                        Posición #{c.rank} · {c.note}
                      </span>
                    </div>
                    <div className="client-value">
                      <small>Trámites</small>
                      <b>{c.current}</b>
                    </div>
                    <span className={`status ${c.previous !== null && c.current < c.previous ? "client-down" : ""}`}>{c.previous !== null && c.current < c.previous ? "Alerta" : "Verificado"}</span>
                    <ChevronRight size={20} />
                  </div>
                ))}
            </div>
          </section>
        )}
        {section === "Oportunidades" && (
          <section className="section-body">
            <Heading
              eyebrow="GESTIÓN COMERCIAL"
              title="Oportunidades"
              text="Seguimiento de cada negocio hasta el cierre."
              button={currentUser.canCreateOpportunities ? () => setModal(true) : undefined}
            />
            <div className="verified-note opportunity-review-note">
              <AlertTriangle size={18} />
              <div>
                <strong>Pipeline importado · pendiente de validación de Carolina</strong>
                <span>
                  16 oportunidades y USD 50.200 reportados el 1 de septiembre
                  de 2026. Los valores no se consideran ingresos confirmados
                  hasta validar alcance, periodicidad, etapa y próxima acción.
                </span>
              </div>
            </div>
            <div className={`client-alert-summary opportunity-alert-summary ${opportunityAlerts.length ? "has-alerts" : "clear"}`}>
              <article className={`client-alert-card ${opportunityAlerts.length ? "danger" : "clear"}`}>
                <div><AlertTriangle size={20}/><strong>Seguimientos vencidos</strong></div>
                <b>{opportunityAlerts.length}</b>
                <p>{opportunityAlerts.length ? "Contactar al responsable y registrar una nueva fecha hoy." : "No hay oportunidades vencidas."}</p>
              </article>
              <article className="client-alert-card clear">
                <div><Bell size={20}/><strong>Canales de presión</strong></div>
                <p>El CRM conserva la alarma y ofrece correo o WhatsApp para ejecutar el seguimiento. El envío externo requiere la acción del responsable.</p>
              </article>
            </div>
            <div className="opportunity-grid">
              {filtered.map((o) => (
                <article className="op-card" key={o.id}>
                  <div className="op-top">
                    <span className={`stage ${o.stage.toLowerCase()}`}>
                      {o.stage}
                    </span>
                    {String(o.id).startsWith("r-") ? (
                      <small className="import-status">Valor por validar</small>
                    ) : (
                      <small>{o.source || "Registro ingresado por el equipo"}</small>
                    )}
                  </div>
                  <p>{o.client}</p>
                  <h3>{o.title}</h3>
                  <strong>{money(Number(o.value))}</strong>
                  {String(o.id).startsWith("r-") && <small className="source-line">Fuente: {o.source}</small>}
                  <div className="op-meta">
                    <span>
                      <Users size={15} />
                      {o.owner}
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      {o.dueDate || "Sin fecha"}
                    </span>
                  </div>
                  <div className="next">
                    <small>PRÓXIMA ACCIÓN</small>
                    <p>{o.nextAction || "Definir próxima acción"}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {section === "Actividades" && (
          <section className="section-body">
            <Heading
              eyebrow="DISCIPLINA DE EJECUCIÓN"
              title="Actividades"
              text="Nada importante queda sin responsable ni fecha."
            />
            <div className="panel">
              <ActivityTable />
            </div>
          </section>
        )}
        {section === "Equipo" && (
          <section className="section-body">
            <Heading
              eyebrow="DESEMPEÑO REAL · AGOSTO 2026"
              title="Ranking de ejecutivos"
              text="Top 10 por trámites refrendados durante agosto."
            />
            <div className="team-grid">
              {executives.map((x) => (
                <article className="team-card" key={x[1]}>
                  <div>{x[0]}</div>
                  <h3>{x[1]}</h3>
                  <p>
                    {x[2]} · {x[3]}
                  </p>
                  <span>{x[4]}</span>
                </article>
              ))}
            </div>
          </section>
        )}
        </div>
      </main>
      {modal && (
        <div className="modal-backdrop" onMouseDown={() => setModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setModal(false)}>
              <X />
            </button>
            <p>NUEVO NEGOCIO</p>
            <h2>Registrar oportunidad</h2>
            <form onSubmit={create}>
              <Field label="Cliente">
                <input
                  required
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </Field>
              <Field label="Oportunidad">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Servicio o proyecto"
                />
              </Field>
              <div className="form-grid">
                <Field label="Valor estimado (USD)">
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                    placeholder="0"
                  />
                </Field>
                <Field label="Etapa">
                  <select
                    value={form.stage}
                    onChange={(e) =>
                      setForm({ ...form, stage: e.target.value })
                    }
                  >
                    <option>Calificación</option>
                    <option>Propuesta</option>
                    <option>Negociación</option>
                    <option>Cierre</option>
                  </select>
                </Field>
              </div>
              <Field label="Responsable">
                <input
                  required
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  placeholder="Nombre del responsable"
                />
              </Field>
              <Field label="Próxima acción">
                <input
                  required
                  value={form.nextAction}
                  onChange={(e) =>
                    setForm({ ...form, nextAction: e.target.value })
                  }
                  placeholder="Acción concreta"
                />
              </Field>
              <Field label="Fecha compromiso">
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Fuente o evidencia">
                <input
                  required
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Ej.: Reporte Comercial 03-sep-2026 o correo del cliente"
                />
              </Field>
              <button className="primary submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar oportunidad"}
              </button>
            </form>
          </div>
        </div>
      )}
      {ceoGateOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCeoGateOpen(false)}>
          <div className="modal ceo-gate-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close" type="button" onClick={() => setCeoGateOpen(false)}><X/></button>
            <p>CONTROL CEO · ACCESO PROTEGIDO</p>
            <h2>Ingrese su clave privada</h2>
            <form onSubmit={unlockCeo}>
              <label>Clave de acceso<input autoFocus inputMode="numeric" autoComplete="one-time-code" type="password" value={ceoPin} onChange={(event) => setCeoPin(event.target.value)} required/></label>
              {ceoGateError && <span className="ceo-gate-error">{ceoGateError}</span>}
              <button className="primary submit" disabled={ceoUnlocking}>{ceoUnlocking ? "Validando…" : "Desbloquear Control CEO"}</button>
            </form>
          </div>
        </div>
      )}
      {reportToRead && (
        <div className="modal-backdrop" onMouseDown={() => setReportToRead(null)}>
          <article className="modal report-reader" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setReportToRead(null)} aria-label="Cerrar informe"><X/></button>
            <p>INFORME RECIBIDO · {reportToRead.area}</p>
            <h2>{reportToRead.responsible}</h2>
            <div className="report-reader-meta">
              <span>Fecha: {reportToRead.reportDate}</span>
              <span>Archivo: {reportToRead.originalName}</span>
              <span>Registro: {ecuadorAuditTime(reportToRead.createdAt)}</span>
            </div>
            <div className="report-reader-content">
              {reportToRead.extractedText || "El archivo fue conservado como evidencia, pero no contiene texto legible. Utilice “Abrir archivo” para revisar el documento original."}
            </div>
            <div className="report-reader-actions">
              <div className="report-reader-actions"><button type="button" className="primary report-reader-original" onClick={() => shareReport(reportToRead)}>Guardar / compartir documento</button></div>
              <button type="button" className="secondary-action" onClick={() => setReportToRead(null)}>Volver al CRM</button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  text,
  button,
}: {
  eyebrow: string;
  title: string;
  text: string;
  button?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{text}</span>
      </div>
      {button && (
        <button className="primary" onClick={button}>
          <Plus size={18} /> Nueva oportunidad
        </button>
      )}
    </div>
  );
}
function DailyAreaCard({
  area,
  owner,
  cut,
  tone,
  metrics,
  register,
  alert,
}: {
  area: string;
  owner: string;
  cut: string;
  tone: string;
  metrics: string[];
  register: string;
  alert: string;
}) {
  return (
    <article className="area-card">
      <div className="area-card-head">
        <span className={`area-badge ${tone}`}>{area.slice(0, 1)}</span>
        <div>
          <h3>{area}</h3>
          <p>
            {owner} · {cut}
          </p>
        </div>
      </div>
      <div className="area-metrics">
        {metrics.map((metric) => (
          <strong key={metric}>{metric}</strong>
        ))}
      </div>
      <div className="area-instruction">
        <span>Qué debe registrar diariamente</span>
        <p>{register}</p>
      </div>
      <div className="area-alert">
        <AlertTriangle size={15} />
        <span>{alert}</span>
      </div>
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
function Kpi({
  icon: I,
  label,
  value,
  meta,
  note,
  tone,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta?: string;
  note?: string;
  tone: string;
  progress?: number;
}) {
  return (
    <article className="kpi">
      <div className={`kpi-icon ${tone}`}>
        <I size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{meta ?? note}</p>
        {progress && (
          <div className="progress">
            <i style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </article>
  );
}
function PanelHead({
  title,
  action,
  onClick,
}: {
  title: string;
  action: string;
  onClick?: () => void;
}) {
  return (
    <div className="panel-head">
      <h3>{title}</h3>
      <button onClick={onClick}>
        {action}
        {onClick && <ArrowUpRight size={15} />}
      </button>
    </div>
  );
}
function Alert({
  icon: I,
  title,
  text,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <div className="alert-row">
      <div className={`alert-icon ${tone}`}>
        <I size={18} />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <ChevronRight size={18} />
    </div>
  );
}
function ActivityTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Estado</th>
            <th>Actividad</th>
            <th>Cliente</th>
            <th>Responsable</th>
            <th>Compromiso</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a[1]}>
              <td>
                <span className={`priority ${a[0].toLowerCase()}`}>{a[0]}</span>
              </td>
              <td>
                <strong>{a[1]}</strong>
              </td>
              <td>{a[2]}</td>
              <td>{a[3]}</td>
              <td>
                <Clock3 size={14} />
                {a[4]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
