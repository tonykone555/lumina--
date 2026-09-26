import type {Metadata} from "next";
import RoomExperience from "./RoomExperience";

export const metadata:Metadata={
  title:"YNOT Room — Turn your room into a shoppable world",
  description:"Upload photos of a room, prepare a 3D reconstruction and explore a shoppable room with YNOT.",
  alternates:{canonical:"https://ynotworld.app/room"},
};

export default function RoomPage(){
  return <RoomExperience/>;
}
