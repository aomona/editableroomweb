import { Liveblocks } from "@liveblocks/node";

export const dynamic = "force-dynamic";

type AuthBody = {
  room?: string;
  user?: {
    id?: string;
    name?: string;
    color?: string;
  };
};

export async function POST(request: Request) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return Response.json(
      { error: "missing_secret", reason: "LIVEBLOCKS_SECRET_KEY is not configured" },
      { status: 500 },
    );
  }

  const { room, user } = (await request.json()) as AuthBody;
  const roomId = room || "default-room";
  const userId = user?.id || crypto.randomUUID();
  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: user?.name || "Editor",
      color: user?.color || "#64748b",
    },
  });

  session.allow(roomId, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
