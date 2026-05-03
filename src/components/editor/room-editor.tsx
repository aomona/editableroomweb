"use client";

import { PointerEvent, useRef, useState, useTransition } from "react";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid3X3,
  Lightbulb,
  Move,
  RotateCw,
  Save,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RoomObject, RoomObjectType, RoomProject } from "@/lib/room/types";

type DragMode = "move" | "rotate";

type DragState = {
  objectId: string;
  mode: DragMode;
};

type RoomEditorProps = {
  initialProject: RoomProject;
};

const objectTypeLabels: Record<RoomObjectType, string> = {
  furniture: "家具",
  light: "ライト",
  mirror: "ミラー",
  prop: "小物",
};

const objectTypeStyles: Record<RoomObjectType, string> = {
  furniture: "border-stone-500 bg-stone-200/90 text-stone-950",
  light: "border-amber-500 bg-amber-200/90 text-amber-950",
  mirror: "border-sky-500 bg-sky-200/90 text-sky-950",
  prop: "border-emerald-500 bg-emerald-200/90 text-emerald-950",
};

export function RoomEditor({ initialProject }: RoomEditorProps) {
  const [project, setProject] = useState(initialProject);
  const [selectedId, setSelectedId] = useState(initialProject.objects[0]?.id ?? "");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [status, setStatus] = useState("未保存の変更はありません");
  const [exportJson, setExportJson] = useState("");
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedObject = project.objects.find((object) => object.id === selectedId);
  const publicUrl = typeof window === "undefined" ? "" : `${window.location.origin}/api/public/room-layout`;

  function updateProject(nextProject: RoomProject) {
    setProject(nextProject);
    setStatus("未保存の変更があります");
  }

  function updateObject(objectId: string, patch: Partial<RoomObject>) {
    updateProject({
      ...project,
      objects: project.objects.map((object) =>
        object.id === objectId ? { ...object, ...patch } : object,
      ),
    });
  }

  function updateSelectedNumber(path: string, value: string) {
    if (!selectedObject) return;

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return;

    if (path === "position.x") {
      updateObject(selectedObject.id, {
        position: { ...selectedObject.position, x: numericValue },
      });
    }
    if (path === "position.y") {
      updateObject(selectedObject.id, {
        position: { ...selectedObject.position, y: numericValue },
      });
    }
    if (path === "position.z") {
      updateObject(selectedObject.id, {
        position: { ...selectedObject.position, z: numericValue },
      });
    }
    if (path === "rotation.y") {
      updateObject(selectedObject.id, { rotation: { y: numericValue } });
    }
    if (path === "size.width") {
      updateObject(selectedObject.id, {
        size: { ...selectedObject.size, width: numericValue },
      });
    }
    if (path === "size.height") {
      updateObject(selectedObject.id, {
        size: { ...selectedObject.size, height: numericValue },
      });
    }
    if (path === "size.depth") {
      updateObject(selectedObject.id, {
        size: { ...selectedObject.size, depth: numericValue },
      });
    }
  }

  function getCanvasPosition(event: PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeZ = (event.clientY - rect.top) / rect.height;
    const x = relativeX * project.room.width - project.room.width / 2;
    const z = relativeZ * project.room.depth - project.room.depth / 2;

    return {
      x: clamp(snap(x), -project.room.width / 2, project.room.width / 2),
      z: clamp(snap(z), -project.room.depth / 2, project.room.depth / 2),
    };
  }

  function snap(value: number) {
    if (!snapToGrid) return round(value);
    return round(Math.round(value / project.room.gridSize) * project.room.gridSize);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>, objectId: string, mode: DragMode) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(objectId);
    setDragState({ objectId, mode });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState) return;

    const position = getCanvasPosition(event);
    if (!position) return;

    const object = project.objects.find((item) => item.id === dragState.objectId);
    if (!object) return;

    if (dragState.mode === "move") {
      updateObject(object.id, {
        position: { ...object.position, x: position.x, z: position.z },
      });
      return;
    }

    const angle = Math.atan2(position.x - object.position.x, position.z - object.position.z);
    updateObject(object.id, { rotation: { y: round((angle * 180) / Math.PI) } });
  }

  function duplicateSelectedObject() {
    if (!selectedObject) return;

    const id = makeUniqueId(
      `${selectedObject.id}-copy`,
      project.objects.map((object) => object.id),
    );
    const duplicate: RoomObject = {
      ...selectedObject,
      id,
      name: `${selectedObject.name} Copy`,
      position: {
        ...selectedObject.position,
        x: clamp(selectedObject.position.x + project.room.gridSize, -project.room.width / 2, project.room.width / 2),
        z: clamp(selectedObject.position.z + project.room.gridSize, -project.room.depth / 2, project.room.depth / 2),
      },
    };

    updateProject({
      ...project,
      objects: [...project.objects, duplicate],
      personalToggleDefaults: shouldHavePersonalToggle(duplicate)
        ? [...project.personalToggleDefaults, { objectId: duplicate.id, defaultEnabled: true }]
        : project.personalToggleDefaults,
    });
    setSelectedId(duplicate.id);
  }

  function deleteSelectedObject() {
    if (!selectedObject) return;

    const nextObjects = project.objects.filter((object) => object.id !== selectedObject.id);
    updateProject({
      ...project,
      objects: nextObjects,
      personalToggleDefaults: project.personalToggleDefaults.filter(
        (toggle) => toggle.objectId !== selectedObject.id,
      ),
    });
    setSelectedId(nextObjects[0]?.id ?? "");
  }

  function addObject(type: RoomObjectType) {
    const id = makeUniqueId(
      `new-${type}`,
      project.objects.map((object) => object.id),
    );
    const object: RoomObject = {
      id,
      name: `New ${type}`,
      type,
      position: { x: 0, y: type === "mirror" ? 1.2 : 0, z: 0 },
      rotation: { y: 0 },
      size: type === "mirror" ? { width: 1.8, height: 1.2, depth: 0.05 } : { width: 0.8, height: 0.8, depth: 0.8 },
      enabled: true,
      light: type === "light" ? { intensity: 1, color: "#fff4dd" } : undefined,
    };

    updateProject({
      ...project,
      objects: [...project.objects, object],
      personalToggleDefaults: shouldHavePersonalToggle(object)
        ? [...project.personalToggleDefaults, { objectId: object.id, defaultEnabled: true }]
        : project.personalToggleDefaults,
    });
    setSelectedId(id);
  }

  function togglePersonalDefault(objectId: string, defaultEnabled: boolean) {
    const exists = project.personalToggleDefaults.some((toggle) => toggle.objectId === objectId);
    updateProject({
      ...project,
      personalToggleDefaults: exists
        ? project.personalToggleDefaults.map((toggle) =>
            toggle.objectId === objectId ? { ...toggle, defaultEnabled } : toggle,
          )
        : [...project.personalToggleDefaults, { objectId, defaultEnabled }],
    });
  }

  function saveProject() {
    startTransition(async () => {
      setStatus("保存中...");
      const response = await fetch("/api/project", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      setStatus(response.ok ? "保存しました" : "保存に失敗しました");
    });
  }

  function reloadProject() {
    startTransition(async () => {
      const response = await fetch("/api/project");
      const nextProject = (await response.json()) as RoomProject;
      setProject(nextProject);
      setSelectedId(nextProject.objects[0]?.id ?? "");
      setStatus("JSONファイルから読み込みました");
    });
  }

  function loadExportJson() {
    startTransition(async () => {
      const response = await fetch("/api/export/vrchat");
      setExportJson(JSON.stringify(await response.json(), null, 2));
    });
  }

  return (
    <main className="min-h-screen bg-muted/35 p-4 text-foreground lg:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Editable Room Web</h1>
              <Badge variant="secondary">VRChat layout JSON</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              位置・回転・サイズは共有レイアウト、ミラー/ライト系トグルは個人初期値として管理します。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={reloadProject} disabled={isPending}>
              読み込み
            </Button>
            <Button onClick={saveProject} disabled={isPending}>
              <Save className="size-4" />
              保存
            </Button>
          </div>
        </header>

        <Tabs defaultValue="editor" className="flex flex-col gap-4">
          <TabsList className="w-fit">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="personal">Personal Defaults</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="m-0">
            <div className="grid gap-4 xl:grid-cols-[280px_minmax(520px,1fr)_320px]">
              <Card>
                <CardHeader>
                  <CardTitle>Objects</CardTitle>
                  <CardDescription>共通位置を編集するオブジェクト</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["furniture", "light", "mirror", "prop"] as RoomObjectType[]).map((type) => (
                      <Button key={type} variant="outline" size="sm" onClick={() => addObject(type)}>
                        + {objectTypeLabels[type]}
                      </Button>
                    ))}
                  </div>
                  <Separator />
                  <ScrollArea className="h-[560px] pr-3">
                    <div className="space-y-2">
                      {project.objects.map((object) => (
                        <button
                          key={object.id}
                          type="button"
                          onClick={() => setSelectedId(object.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition hover:bg-accent",
                            selectedId === object.id && "border-primary bg-accent",
                          )}
                        >
                          <span>
                            <span className="block font-medium">{object.name}</span>
                            <span className="text-xs text-muted-foreground">{object.id}</span>
                          </span>
                          <Badge variant="outline">{objectTypeLabels[object.type]}</Badge>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Room Canvas</CardTitle>
                    <CardDescription>
                      ドラッグでX/Z移動、右上ハンドルでY回転。グリッド吸着は {project.room.gridSize}m です。
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Grid3X3 className="size-4 text-muted-foreground" />
                    <Label htmlFor="snap-grid">吸着</Label>
                    <Switch id="snap-grid" checked={snapToGrid} onCheckedChange={setSnapToGrid} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    ref={canvasRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => setDragState(null)}
                    onPointerCancel={() => setDragState(null)}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-background shadow-inner touch-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                      backgroundSize: `${100 / (project.room.width / project.room.gridSize)}% ${100 / (project.room.depth / project.room.gridSize)}%`,
                    }}
                  >
                    <div className="absolute left-1/2 top-0 h-full w-px bg-primary/20" />
                    <div className="absolute left-0 top-1/2 h-px w-full bg-primary/20" />
                    {project.objects.map((object) => (
                      <div
                        key={object.id}
                        className="absolute"
                        style={{
                          left: `${((object.position.x + project.room.width / 2) / project.room.width) * 100}%`,
                          top: `${((object.position.z + project.room.depth / 2) / project.room.depth) * 100}%`,
                          width: `${(object.size.width / project.room.width) * 100}%`,
                          height: `${(object.size.depth / project.room.depth) * 100}%`,
                          minWidth: 20,
                          minHeight: 20,
                          transform: `translate(-50%, -50%) rotate(${object.rotation.y}deg)`,
                        }}
                      >
                        <div
                          onPointerDown={(event) => handlePointerDown(event, object.id, "move")}
                          className={cn(
                            "flex h-full w-full cursor-grab items-center justify-center rounded-md border-2 px-2 text-center text-[11px] font-medium shadow-sm active:cursor-grabbing",
                            objectTypeStyles[object.type],
                            selectedId === object.id && "ring-2 ring-primary ring-offset-2",
                            !object.enabled && "opacity-35 grayscale",
                          )}
                          title="Drag to move"
                        >
                          {object.type === "light" ? <Lightbulb className="mr-1 size-3" /> : <Move className="mr-1 size-3" />}
                          <span className="truncate">{object.name}</span>
                        </div>
                        {selectedId === object.id ? (
                          <div
                            onPointerDown={(event) => handlePointerDown(event, object.id, "rotate")}
                            className="absolute -right-3 -top-3 flex size-7 cursor-crosshair items-center justify-center rounded-full border bg-background text-primary shadow-sm"
                            title="Drag to rotate"
                          >
                            <RotateCw className="size-4" />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{status}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                  <CardDescription>選択中オブジェクトの詳細値</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedObject ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={selectedObject.name}
                          onChange={(event) => updateObject(selectedObject.id, { name: event.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <Label>共有 enabled</Label>
                          <p className="text-xs text-muted-foreground">ワールド上に存在するか</p>
                        </div>
                        <Switch
                          checked={selectedObject.enabled}
                          onCheckedChange={(enabled) => updateObject(selectedObject.id, { enabled })}
                        />
                      </div>
                      <NumberGrid
                        values={[
                          ["X", "position.x", selectedObject.position.x],
                          ["Y", "position.y", selectedObject.position.y],
                          ["Z", "position.z", selectedObject.position.z],
                          ["Rot Y", "rotation.y", selectedObject.rotation.y],
                          ["Width", "size.width", selectedObject.size.width],
                          ["Height", "size.height", selectedObject.size.height],
                          ["Depth", "size.depth", selectedObject.size.depth],
                        ]}
                        onChange={updateSelectedNumber}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={duplicateSelectedObject}>
                          <Copy className="size-4" />
                          複製
                        </Button>
                        <Button variant="destructive" onClick={deleteSelectedObject}>
                          <Trash2 className="size-4" />
                          削除
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">オブジェクトを選択してください。</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="personal" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Personal Toggle Defaults</CardTitle>
                <CardDescription>
                  VRChat内ではユーザーごとにローカル管理する想定の初期値です。位置はここでは変更しません。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {project.objects.filter(shouldHavePersonalToggle).map((object) => {
                  const toggle = project.personalToggleDefaults.find((item) => item.objectId === object.id);
                  const enabled = toggle?.defaultEnabled ?? true;
                  return (
                    <div key={object.id} className="flex items-center justify-between rounded-lg border bg-background p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          {enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                          {object.name}
                        </div>
                        <p className="text-xs text-muted-foreground">{object.id} / {objectTypeLabels[object.type]}</p>
                      </div>
                      <Switch checked={enabled} onCheckedChange={(checked) => togglePersonalDefault(object.id, checked)} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="m-0">
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>VRChat Export</CardTitle>
                  <CardDescription>UdonSharp側が読むJSONです。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={loadExportJson} disabled={isPending}>
                    <Download className="size-4" />
                    JSONを生成
                  </Button>
                  <div className="space-y-2">
                    <Label>配信用URL</Label>
                    <Input value={publicUrl} readOnly />
                    <p className="text-xs text-muted-foreground">
                      VRChatの信頼済みURL制限があるため、本番はGitHub Pages/Gist/VRCDN等への配置も検討してください。
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>JSON Preview</CardTitle>
                  <CardDescription>/api/export/vrchat の内容</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-[560px] font-mono text-xs"
                    value={exportJson || JSON.stringify(project, null, 2)}
                    readOnly
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function NumberGrid({
  values,
  onChange,
}: {
  values: [string, string, number][];
  onChange: (path: string, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {values.map(([label, path, value]) => (
        <div key={path} className="space-y-2">
          <Label>{label}</Label>
          <Input
            type="number"
            step="0.05"
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function shouldHavePersonalToggle(object: RoomObject) {
  return object.type === "mirror" || object.type === "light";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function makeUniqueId(base: string, existingIds: string[]) {
  let index = 1;
  let id = `${base}-${index.toString().padStart(2, "0")}`;

  while (existingIds.includes(id)) {
    index += 1;
    id = `${base}-${index.toString().padStart(2, "0")}`;
  }

  return id;
}
