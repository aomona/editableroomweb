import { readProject, toVrchatExport } from "@/lib/room/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const project = await readProject();
  return Response.json(toVrchatExport(project), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
