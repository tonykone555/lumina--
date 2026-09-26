import ReviewClient from "./ReviewClient";

export const dynamic="force-dynamic";

export default async function RoomReviewPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <ReviewClient id={id}/>;
}
