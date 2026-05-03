import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { initialProject } from "./initial-project";
import type { RoomProject } from "./types";

const dataDirectory = path.join(process.cwd(), "data");
const projectPath = path.join(dataDirectory, "room-project.json");
const blobPath = "room-project.json";

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readProject(): Promise<RoomProject> {
  if (hasBlobToken()) {
    return readProjectFromBlob();
  }

  return readProjectFromFile();
}

export async function writeProject(project: RoomProject): Promise<void> {
  if (hasBlobToken()) {
    await put(blobPath, JSON.stringify(project, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await writeProjectToFile(project);
}

async function readProjectFromBlob(): Promise<RoomProject> {
  const result = await get(blobPath, { access: "private", useCache: false });

  if (!result?.stream) {
    await writeProject(initialProject);
    return initialProject;
  }

  const text = await new Response(result.stream).text();
  return JSON.parse(text) as RoomProject;
}

async function readProjectFromFile(): Promise<RoomProject> {
  try {
    const file = await readFile(projectPath, "utf8");
    return JSON.parse(file) as RoomProject;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    await writeProjectToFile(initialProject);
    return initialProject;
  }
}

async function writeProjectToFile(project: RoomProject): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`, "utf8");
}

export function toVrchatExport(project: RoomProject): RoomProject {
  return {
    ...project,
    objects: project.objects.map((object) => ({
      ...object,
      position: roundVector(object.position),
      rotation: { y: roundNumber(object.rotation.y) },
      size: {
        width: roundNumber(object.size.width),
        height: roundNumber(object.size.height),
        depth: roundNumber(object.size.depth),
      },
    })),
  };
}

function roundVector(vector: { x: number; y: number; z: number }) {
  return {
    x: roundNumber(vector.x),
    y: roundNumber(vector.y),
    z: roundNumber(vector.z),
  };
}

function roundNumber(value: number) {
  return Number(value.toFixed(4));
}
