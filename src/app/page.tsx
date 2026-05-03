import { CollaborativeRoom } from "@/components/editor/collaborative-room";
import { RoomEditor } from "@/components/editor/room-editor";
import { readProject } from "@/lib/room/store";

export default async function Home() {
  const project = await readProject();

  return (
    <CollaborativeRoom initialProject={project}>
      <RoomEditor initialProject={project} />
    </CollaborativeRoom>
  );
}
