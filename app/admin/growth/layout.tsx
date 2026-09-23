import AdminSessionBridge from "@/components/admin/AdminSessionBridge";

export default function GrowthAdminLayout({children}:{children:React.ReactNode}){
 return <><AdminSessionBridge/>{children}</>;
}
