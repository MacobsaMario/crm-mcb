import { getChatGPTUser } from "../../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../../access-control";
import classifications from "../../../data/grupo-une-classifications.json";

export const dynamic = "force-dynamic";

type Classification = typeof classifications[number];
const normalized = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const companyCounts = Object.entries(classifications.reduce<Record<string,number>>((totals,row)=>{totals[row.company]=(totals[row.company]||0)+1;return totals;},{}));

export async function GET(request: Request) {
  const authenticated=await getChatGPTUser();
  if(!authenticated) return Response.json({error:"Debe iniciar sesión"},{status:401});
  const user=resolveCRMUser(authenticated);
  if(!isAuthorizedCRMUser(user)) return Response.json({error:"Acceso no autorizado"},{status:403});
  const url=new URL(request.url);
  const query=normalized(url.searchParams.get("q"));
  const company=String(url.searchParams.get("company")||"").trim();
  const restricted=url.searchParams.get("restricted")==="1";
  const page=Math.max(1,Number(url.searchParams.get("page")||1)||1);
  const pageSize=50;
  const rows=(classifications as Classification[]).filter(row=>{
    if(company&&row.company!==company)return false;
    if(restricted&&!row.restrictions)return false;
    if(!query)return true;
    return [row.classificationCode,row.brand,row.model,row.description,row.characteristic,row.tariffSubheading,row.originCountry,row.restrictions]
      .some(value=>normalized(value).includes(query));
  });
  const start=(page-1)*pageSize;
  return Response.json({
    rows:rows.slice(start,start+pageSize),
    total:rows.length,
    page,
    pageSize,
    pages:Math.max(1,Math.ceil(rows.length/pageSize)),
    summary:{total:classifications.length,companies:Object.fromEntries(companyCounts),restricted:classifications.filter(row=>Boolean(row.restrictions)).length},
    source:{ecuabarnices:"BASE ECUABARNICES KC (2).xlsx",fadesaGye:"BASE FADESA GYE.xlsx",fadesaManta:"BASE FADESA MANTA.xlsx"},
  });
}
