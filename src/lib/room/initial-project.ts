import type { RoomProject } from "./types";

export const initialProject: RoomProject = {
  schemaVersion: 1,
  id: "default-room",
  name: "Default Room",
  room: {
    width: 8,
    depth: 6,
    gridSize: 0.25,
  },
  objects: [
    {
      id: "sofa-01",
      name: "Sofa",
      type: "furniture",
      position: { x: -1.4, y: 0, z: 1.4 },
      rotation: { y: 0 },
      size: { width: 2.2, height: 0.8, depth: 0.9 },
      enabled: true,
    },
    {
      id: "table-01",
      name: "Low Table",
      type: "furniture",
      position: { x: 0.4, y: 0, z: 0.6 },
      rotation: { y: 0 },
      size: { width: 1.2, height: 0.4, depth: 0.75 },
      enabled: true,
    },
    {
      id: "key-light-01",
      name: "Key Light",
      type: "light",
      position: { x: -2.4, y: 2.4, z: -1.5 },
      rotation: { y: 45 },
      size: { width: 0.35, height: 0.35, depth: 0.35 },
      enabled: true,
      light: { intensity: 1, color: "#fff4dd" },
    },
    {
      id: "mirror-01",
      name: "Wall Mirror",
      type: "mirror",
      position: { x: 3.35, y: 1.2, z: 0 },
      rotation: { y: -90 },
      size: { width: 1.8, height: 1.2, depth: 0.05 },
      enabled: true,
    },
    {
      id: "plant-01",
      name: "Plant",
      type: "prop",
      position: { x: -3.1, y: 0, z: -2.1 },
      rotation: { y: 25 },
      size: { width: 0.55, height: 1.4, depth: 0.55 },
      enabled: true,
    },
  ],
  personalToggleDefaults: [
    { objectId: "mirror-01", defaultEnabled: true },
    { objectId: "key-light-01", defaultEnabled: true },
  ],
};
