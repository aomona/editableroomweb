import { readProject, writeProject } from "@/lib/room/store";
import type { RoomProject } from "@/lib/room/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const project = await readProject();
  return Response.json(project);
}

export async function PUT(request: Request) {
  const project = (await request.json()) as RoomProject;

  if (project.schemaVersion !== 2 || !Array.isArray(project.prefabs) || !Array.isArray(project.instances)) {
    return Response.json({ error: "Invalid room project" }, { status: 400 });
  }

  await writeProject(project);
  return Response.json({ ok: true, project });
}
