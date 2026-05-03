import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { initialProject } from "./initial-project";
import { normalizeProject } from "./normalize";
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
  const normalizedProject = normalizeProject(project);

  if (hasBlobToken()) {
    await put(blobPath, JSON.stringify(normalizedProject, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await writeProjectToFile(normalizedProject);
}

async function readProjectFromBlob(): Promise<RoomProject> {
  const result = await get(blobPath, { access: "private", useCache: false });

  if (!result?.stream) {
    await writeProject(initialProject);
    return initialProject;
  }

  const text = await new Response(result.stream).text();
  return normalizeProject(JSON.parse(text));
}

async function readProjectFromFile(): Promise<RoomProject> {
  try {
    const file = await readFile(projectPath, "utf8");
    return normalizeProject(JSON.parse(file));
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
  const normalized = normalizeProject(project);

  return {
    ...normalized,
    instances: normalized.instances.map((instance) => ({
      ...instance,
      position: roundVector(instance.position),
      rotation: { y: roundNumber(instance.rotation.y) },
      scale: roundVector(instance.scale),
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
