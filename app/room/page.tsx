import type {Metadata} from "next";
import QuickRoomExperience from "./QuickRoomExperience";
import RoomDesktopInteractionFix from "./RoomDesktopInteractionFix";
import RoomCommerceBridge from "./RoomCommerceBridge";
import RoomPhotoBackdrop from "./RoomPhotoBackdrop";
import RoomSearchBar from "./RoomSearchBar";
import RoomLiveCamera from "./RoomLiveCamera";
import RoomScanHandoff from "./RoomScanHandoff";
import UnifiedBag from "../../components/lumina/UnifiedBag";
import AuthGate from "../../components/lumina/AuthGate";

export const metadata:Metadata={
  title:"YNOT Room — Tap your room. Shop anything.",
  description:"Take one photo and let YNOT identify objects, suggest what to add, and find matching products automatically.",
  alternates:{canonical:"https://ynotworld.app/room"},
};

export default function RoomPage(){return <><QuickRoomExperience/><RoomLiveCamera/><RoomScanHandoff/><RoomDesktopInteractionFix/><RoomCommerceBridge/><RoomPhotoBackdrop/><RoomSearchBar/><UnifiedBag/><AuthGate/></>}
