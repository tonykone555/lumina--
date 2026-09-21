import CreatorDashboard from "../CreatorDashboard";
import AuthGate from "@/components/lumina/AuthGate";
export const metadata={title:"Creator Dashboard — Earn with YNOT"};
export default function CreatorDashboardPage(){return <><CreatorDashboard/><AuthGate/></>;}
