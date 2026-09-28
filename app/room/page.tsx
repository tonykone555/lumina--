import type {Metadata} from "next";
import QuickRoomExperience from "./QuickRoomExperience";
import RoomDesktopInteractionFix from "./RoomDesktopInteractionFix";
import RoomCommerceBridge from "./RoomCommerceBridge";
import UnifiedBag from "../../components/lumina/UnifiedBag";

export const metadata:Metadata={
  title:"YNOT Room — Tap your room. Shop anything.",
  description:"Take one photo and let YNOT identify objects, suggest what to add, and find matching products automatically.",
  alternates:{canonical:"https://ynotworld.app/room"},
};

export default function RoomPage(){return <><QuickRoomExperience/><RoomDesktopInteractionFix/><RoomCommerceBridge/><UnifiedBag/></>}
