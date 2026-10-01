import ordersData from "../../data/orders-august.json";
import {getChatGPTUser} from "../../chatgpt-auth";
import {isAuthorizedCRMUser,resolveCRMUser} from "../../access-control";
type Order=(typeof ordersData)[number];
function isoDate(value:string){
 const match=/^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
 return match?`${match[3]}-${match[2]}-${match[1]}`:"";
}
export async function GET(request:Request){
 const authenticated=await getChatGPTUser();
 const user=authenticated?resolveCRMUser(authenticated):null;
 if(!user)return Response.json({error:"Debe iniciar sesión"},{status:401});
 if(!isAuthorizedCRMUser(user))return Response.json({error:"Acceso no autorizado"},{status:403});
 const url=new URL(request.url),q=(url.searchParams.get("q")??"").trim().toLowerCase(),status=url.searchParams.get("status")??"Todos",page=Math.max(1,Number(url.searchParams.get("page"))||1),size=25,from=url.searchParams.get("from")??"",to=url.searchParams.get("to")??"",client=(url.searchParams.get("client")??"").trim();
 const allOrders=ordersData as Order[];
 const inRange=(o:Order)=>{const date=isoDate(o.fechaCreacion);return (!from||date>=from)&&(!to||date<=to)};
 const filtered=allOrders.filter(o=>(status==="Todos"||o.estadoGeneral===status)&&(!client||o.cliente===client)&&inRange(o)&&(!q||`${o.tramite} ${o.pedido} ${o.cliente} ${o.responsable} ${o.proveedor}`.toLowerCase().includes(q)));
 const districts=Object.values((ordersData as Order[]).reduce<Record<string,{district:string,total:number,active:number,finished:number,withRefrendo:number}>>((acc,o)=>{
  const district=(o.aduana||"Sin distrito informado").trim();
  const row=acc[district]??{district,total:0,active:0,finished:0,withRefrendo:0};
  row.total+=1;
  if(o.estadoGeneral==="Trámite finalizado")row.finished+=1;else row.active+=1;
  if((o.refrendo||"").trim())row.withRefrendo+=1;
  acc[district]=row;
  return acc;
 },{})).sort((a,b)=>b.total-a.total);
 const clients=Array.from(new Set(allOrders.map(o=>o.cliente).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"es"));
 const cumulativeByClientDate=new Map<string,{date:string;client:string;daily:number;cumulative:number}>();
 const running=new Map<string,number>();
 for(const order of [...filtered].sort((a,b)=>isoDate(a.fechaCreacion).localeCompare(isoDate(b.fechaCreacion)))){
   const date=isoDate(order.fechaCreacion); const key=`${date}::${order.cliente}`;
   const next=(running.get(order.cliente)??0)+1; running.set(order.cliente,next);
   const row=cumulativeByClientDate.get(key)??{date,client:order.cliente,daily:0,cumulative:next}; row.daily+=1; row.cumulative=next; cumulativeByClientDate.set(key,row);
 }
 return Response.json({orders:filtered.slice((page-1)*size,page*size),total:filtered.length,page,pages:Math.max(1,Math.ceil(filtered.length/size)),districts,clients,cumulativeByClientDate:Array.from(cumulativeByClientDate.values()).sort((a,b)=>b.date.localeCompare(a.date)||a.client.localeCompare(b.client,"es"))});
}
