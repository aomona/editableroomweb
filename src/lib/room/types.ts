export type RoomObjectType = "furniture" | "light" | "mirror" | "prop";

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type RoomObject = {
  id: string;
  name: string;
  type: RoomObjectType;
  position: Vector3;
  rotation: {
    y: number;
  };
  size: {
    width: number;
    height: number;
    depth: number;
  };
  enabled: boolean;
  light?: {
    intensity: number;
    color: string;
  };
};

export type PersonalToggleDefault = {
  objectId: string;
  defaultEnabled: boolean;
};

export type RoomProject = {
  schemaVersion: 1;
  id: string;
  name: string;
  room: {
    width: number;
    depth: number;
    gridSize: number;
  };
  objects: RoomObject[];
  personalToggleDefaults: PersonalToggleDefault[];
};
