import { initialProject, prefabCatalog } from "./initial-project";
import type { PrefabDefinition, RoomObjectType, RoomProject, Size3 } from "./types";

export function normalizeProject(input: unknown): RoomProject {
  if (isRoomProject(input)) {
    return {
      ...input,
      prefabs: input.prefabs.length > 0 ? input.prefabs : prefabCatalog,
    };
  }

  if (isLegacyProject(input)) {
    return {
      schemaVersion: 2,
      id: input.id,
      name: input.name,
      room: input.room,
      prefabs: prefabCatalog,
      instances: input.objects.map((object) => {
        const prefab = legacyPrefabFor(object.type, object.name);
        return {
          instanceId: object.id,
          prefabId: prefab.id,
          name: object.name,
          position: object.position,
          rotation: object.rotation,
          scale: sizeToScale(object.size, prefab.defaultSize),
          enabled: object.enabled,
        };
      }),
      personalToggleDefaults: input.personalToggleDefaults.map((toggle) => ({
        instanceId: toggle.objectId,
        defaultEnabled: toggle.defaultEnabled,
      })),
    };
  }

  return initialProject;
}

function isRoomProject(value: unknown): value is RoomProject {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as RoomProject).schemaVersion === 2 &&
      Array.isArray((value as RoomProject).prefabs) &&
      Array.isArray((value as RoomProject).instances),
  );
}

type LegacyRoomObject = {
  id: string;
  name: string;
  type: RoomObjectType;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  size: Size3;
  enabled: boolean;
};

type LegacyProject = {
  schemaVersion: 1;
  id: string;
  name: string;
  room: RoomProject["room"];
  objects: LegacyRoomObject[];
  personalToggleDefaults: { objectId: string; defaultEnabled: boolean }[];
};

function isLegacyProject(value: unknown): value is LegacyProject {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as LegacyProject).schemaVersion === 1 &&
      Array.isArray((value as LegacyProject).objects),
  );
}

function legacyPrefabFor(type: RoomObjectType, name: string): PrefabDefinition {
  const normalizedName = name.toLowerCase();
  const exact = prefabCatalog.find((prefab) => normalizedName.includes(prefab.id));
  if (exact) return exact;
  if (normalizedName.includes("table")) return byId("low-table");
  if (normalizedName.includes("mirror")) return byId("wall-mirror");
  if (normalizedName.includes("light")) return byId("key-light");
  if (normalizedName.includes("plant")) return byId("plant");
  return prefabCatalog.find((prefab) => prefab.type === type) ?? prefabCatalog[0];
}

function byId(id: string) {
  return prefabCatalog.find((prefab) => prefab.id === id) ?? prefabCatalog[0];
}

function sizeToScale(size: Size3, defaultSize: Size3) {
  return {
    x: roundNumber(size.width / defaultSize.width),
    y: roundNumber(size.height / defaultSize.height),
    z: roundNumber(size.depth / defaultSize.depth),
  };
}

function roundNumber(value: number) {
  return Number(value.toFixed(4));
}
