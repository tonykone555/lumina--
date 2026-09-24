import type {Metadata} from "next";
import InteriorMasterExperience from "./InteriorMasterExperience";

export const metadata: Metadata = {
  title: "AURELIA — Interior Architecture",
  description: "A cinematic interior architecture master website with a scroll-controlled spatial tour.",
};

export default function InteriorMasterPage(){
  return <InteriorMasterExperience/>;
}
