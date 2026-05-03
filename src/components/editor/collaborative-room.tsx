"use client";

import { ReactNode, useState } from "react";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";

import type { RoomProject } from "@/lib/room/types";

type CollaborativeRoomProps = {
  initialProject: RoomProject;
  children: ReactNode;
};

const roomId = "default-room";

export function CollaborativeRoom({ initialProject, children }: CollaborativeRoomProps) {
  const [user] = useState(getOrCreateUser);
  const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

  const providerProps = publicApiKey
    ? { publicApiKey }
    : {
        authEndpoint: async (room?: string) => {
          const response = await fetch("/api/liveblocks-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, user }),
          });
          return response.json();
        },
      };

  return (
    <LiveblocksProvider {...providerProps} throttle={32} preventUnsavedChanges>
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          selectedId: null,
          name: user.name,
          color: user.color,
        }}
        initialStorage={{ projectJson: JSON.stringify(initialProject) }}
      >
        <ClientSideSuspense fallback={<LoadingRoom />}>{children}</ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function LoadingRoom() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/35 p-4">
      <div className="rounded-xl border bg-background px-4 py-3 text-sm shadow-sm">
        共同編集ルームに接続中...
      </div>
    </main>
  );
}

function getOrCreateUser() {
  if (typeof window === "undefined") {
    return { id: "server", name: "Editor", color: "#64748b" };
  }

  const storageKey = "editable-room-user";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return JSON.parse(existing) as { id: string; name: string; color: string };
  }

  const palette = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
  const id = window.crypto.randomUUID();
  const user = {
    id,
    name: `Editor ${id.slice(0, 4)}`,
    color: palette[Math.floor(Math.random() * palette.length)] ?? "#64748b",
  };
  window.localStorage.setItem(storageKey, JSON.stringify(user));
  return user;
}
