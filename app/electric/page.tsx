import {redirect} from "next/navigation";
export default async function ElectricRedirect({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
 const sp=searchParams?await searchParams:{};
 const raw=sp.q;
 const q=Array.isArray(raw)?raw[0]:raw;
 redirect(q? `/shop/${encodeURIComponent(q)}` : "/worlds/electric");
}
