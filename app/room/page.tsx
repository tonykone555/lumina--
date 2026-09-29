import type {Metadata} from "next";
import QuickRoomExperience from "./QuickRoomExperience";
import RoomDesktopInteractionFix from "./RoomDesktopInteractionFix";
import RoomCommerceBridge from "./RoomCommerceBridge";
import RoomChannel3Bridge from "./RoomChannel3Bridge";
import RoomPhotoBackdrop from "./RoomPhotoBackdrop";
import RoomSearchBar from "./RoomSearchBar";
import RoomLiveCamera from "./RoomLiveCamera";
import RoomScanHandoff from "./RoomScanHandoff";
import RoomScanLine from "./RoomScanLine";
import RoomDrawerScrollFix from "./RoomDrawerScrollFix";
import RoomPlus from "./RoomPlus";
import RoomOnboarding from "./RoomOnboarding";
import RoomProductFullscreen from "./RoomProductFullscreen";
import UnifiedBag from "../../components/lumina/UnifiedBag";
import AuthGate from "../../components/lumina/AuthGate";

export const metadata:Metadata={
  title:"YNOT Room — Tap your room. Shop anything.",
  description:"Take one photo and let YNOT identify objects, suggest what to add, and find matching products automatically.",
  alternates:{canonical:"https://ynotworld.app/room"},
};

/* Keep the core scan/render path free of components that monkey-patch window.fetch.
   The previous insight card intercepted the vision response in parallel with the
   scanner and was introduced immediately before the post-scan client crash.
   Scene copy can be reintroduced from QuickRoomExperience state rather than by
   intercepting fetch globally. */
export default function RoomPage(){return <><RoomChannel3Bridge/><QuickRoomExperience/><RoomProductFullscreen/><RoomLiveCamera/><RoomScanHandoff/><RoomScanLine/><RoomDrawerScrollFix/><RoomDesktopInteractionFix/><RoomCommerceBridge/><RoomPhotoBackdrop/><RoomSearchBar/><RoomPlus/><UnifiedBag/><AuthGate/><RoomOnboarding/></>}
