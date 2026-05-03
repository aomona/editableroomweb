import { RoomEditor } from "@/components/editor/room-editor";
import { readProject } from "@/lib/room/store";

export default async function Home() {
  const project = await readProject();

  return <RoomEditor initialProject={project} />;
}
