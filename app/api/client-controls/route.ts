import { desc } from "drizzle-orm";
import { getDb } from "@macobsa-db";
import { clientControls } from "@macobsa-schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { isAuthorizedCRMUser, resolveCRMUser } from "../../access-control";

const cents=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n*100):-1};
export async function GET(){
 const authenticated=await getChatGPTUser();
 const user=authenticated?resolveCRMUser(authenticated):null;
 if(!user)return Response.json({error:"Debe iniciar sesión"},{status:401});
 if(!isAuthorizedCRMUser(user))return Response.json({error:"Acceso no autorizado"},{status:403});
 try{return Response.json({controls:await getDb().select().from(clientControls).orderBy(desc(clientControls.reportDate),desc(clientControls.id)).limit(250)});}catch{return Response.json({controls:[]});}
}
export async function POST(request:Request){
 const authenticated=await getChatGPTUser();
 const user=authenticated?resolveCRMUser(authenticated):null;
 if(!user)return Response.json({error:"Debe iniciar sesión"},{status:401});
 if(!user.canManageClientControls)return Response.json({error:`Su rol (${user.role}) no puede modificar cortes y fondos por cliente`},{status:403});
 try{
  const p=await request.json() as Record<string,unknown>;
  const required=["reportDate","client","cutoffDate","nextCutoffDate","responsible","source"];
  if(required.some(k=>!String(p[k]??"").trim()))return Response.json({error:"Complete cliente, fechas de corte, responsable y fuente"},{status:400});
  const values=[cents(p.unbilled),cents(p.carryover),cents(p.fundAssigned),cents(p.fundUsed)];
  if(values.some(v=>v<0))return Response.json({error:"Los valores deben ser iguales o mayores a cero"},{status:400});
  if(values[3]>values[2])return Response.json({error:"El fondo utilizado no puede superar el fondo asignado"},{status:400});
  const [control]=await getDb().insert(clientControls).values({reportDate:String(p.reportDate),client:String(p.client).trim(),cutoffDate:String(p.cutoffDate),nextCutoffDate:String(p.nextCutoffDate),unbilledCents:values[0],carryoverCents:values[1],fundAssignedCents:values[2],fundUsedCents:values[3],fundStatus:String(p.fundStatus??"Pendiente de confirmar"),responsible:String(p.responsible).trim(),source:String(p.source).trim(),note:String(p.note??"").trim(),submittedBy:user.email}).returning();
  return Response.json({control},{status:201});
 }catch{return Response.json({error:"No fue posible guardar el control por cliente"},{status:500});}
}
