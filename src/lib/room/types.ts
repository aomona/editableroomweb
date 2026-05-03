export type RoomObjectType = "furniture" | "light" | "mirror" | "prop";

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type Size3 = {
  width: number;
  height: number;
  depth: number;
};

export type PrefabDefinition = {
  id: string;
  name: string;
  type: RoomObjectType;
  maxInstances: number;
  defaultSize: Size3;
  light?: {
    intensity: number;
    color: string;
  };
};

export type RoomObjectInstance = {
  instanceId: string;
  prefabId: string;
  name: string;
  position: Vector3;
  rotation: {
    y: number;
  };
  scale: Vector3;
  enabled: boolean;
};

export type PersonalToggleDefault = {
  instanceId: string;
  defaultEnabled: boolean;
};

export type RoomProject = {
  schemaVersion: 2;
  id: string;
  name: string;
  room: {
    width: number;
    depth: number;
    gridSize: number;
  };
  prefabs: PrefabDefinition[];
  instances: RoomObjectInstance[];
  personalToggleDefaults: PersonalToggleDefault[];
};
