import LuminaWorld from "@/components/lumina/LuminaWorld";
import YnotDrawer from "@/components/lumina/YnotDrawer";
import YnotIntentBridge from "@/components/lumina/YnotIntentBridge";
import SubcategoryNavigator from "@/components/lumina/SubcategoryNavigator";
import SavedNotebook from "@/components/lumina/SavedNotebook";

export default function Home() {
  return <><LuminaWorld/><SubcategoryNavigator/><YnotDrawer/><YnotIntentBridge/><SavedNotebook/></>;
}
