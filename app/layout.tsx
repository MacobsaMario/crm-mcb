import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"MACOBSA CRM",description:"Centro de control comercial y gerencial de MACOBSA",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
