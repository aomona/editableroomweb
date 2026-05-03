import type { RoomProject } from "@/lib/room/types";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      selectedId: string | null;
      name: string;
      color: string;
    };
    Storage: {
      projectJson: string;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
      };
    };
  }
}

export type LiveRoomProject = RoomProject;
