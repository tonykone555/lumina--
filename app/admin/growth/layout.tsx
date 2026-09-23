import AdminSessionBridge from "@/components/admin/AdminSessionBridge";
import "./research-modal-viewport-fix.css";

export default function GrowthAdminLayout({children}:{children:React.ReactNode}){
 return <><AdminSessionBridge/>{children}</>;
}
