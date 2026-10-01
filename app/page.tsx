import CRMApp from "./crm-app";
import {requireChatGPTUser} from "./chatgpt-auth";
import {isAuthorizedCRMUser, resolveCRMUser} from "./access-control";
export const dynamic="force-dynamic";
export default async function Home(){
  const user=resolveCRMUser(await requireChatGPTUser("/"));
  if(!isAuthorizedCRMUser(user)) return <main className="access-denied"><div><strong>Acceso no autorizado</strong><p>Esta cuenta no pertenece a los usuarios autorizados del Comité MACOBSA.</p><a href="/signout-with-chatgpt?return_to=%2F">Ingresar con otro correo</a></div></main>;
  return <CRMApp currentUser={user}/>;
}
