"use client";

import { PointerEvent, useRef, useState, useTransition } from "react";
import {
  useMutation,
  useOthers,
  useSelf,
  useStatus,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
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
import { normalizeProject } from "@/lib/room/normalize";
import type {
  PrefabDefinition,
  RoomObjectInstance,
  RoomObjectType,
  RoomProject,
  Size3,
} from "@/lib/room/types";

type DragMode = "move" | "rotate";

type DragState = {
  instanceId: string;
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
  const projectJson = useStorage((root) => root.projectJson);
  const project = parseProject(projectJson, initialProject);
  const others = useOthers();
  const self = useSelf();
  const syncStatus = useStatus();
  const updateMyPresence = useUpdateMyPresence();
  const setSharedProject = useMutation(
    ({ storage }, nextProject: RoomProject) => {
      storage.set("projectJson", JSON.stringify(nextProject));
    },
    [],
  );
  const [selectedId, setSelectedId] = useState(initialProject.instances[0]?.instanceId ?? "");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [status, setStatus] = useState("未保存の変更はありません");
  const [exportJson, setExportJson] = useState("");
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedInstance = project.instances.find((instance) => instance.instanceId === selectedId);
  const selectedPrefab = selectedInstance ? getPrefab(project, selectedInstance.prefabId) : undefined;
  const publicUrl = typeof window === "undefined" ? "" : `${window.location.origin}/api/public/room-layout`;

  function updateProject(nextProject: RoomProject) {
    setSharedProject(nextProject);
    setStatus("未保存の変更があります");
  }

  function selectInstance(instanceId: string) {
    setSelectedId(instanceId);
    updateMyPresence({ selectedId: instanceId });
  }

  function updateInstance(instanceId: string, patch: Partial<RoomObjectInstance>) {
    updateProject({
      ...project,
      instances: project.instances.map((instance) =>
        instance.instanceId === instanceId ? { ...instance, ...patch } : instance,
      ),
    });
  }

  function updateSelectedNumber(path: string, value: string) {
    if (!selectedInstance) return;

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return;

    if (path === "position.x") {
      updateInstance(selectedInstance.instanceId, {
        position: { ...selectedInstance.position, x: numericValue },
      });
    }
    if (path === "position.y") {
      updateInstance(selectedInstance.instanceId, {
        position: { ...selectedInstance.position, y: numericValue },
      });
    }
    if (path === "position.z") {
      updateInstance(selectedInstance.instanceId, {
        position: { ...selectedInstance.position, z: numericValue },
      });
    }
    if (path === "rotation.y") {
      updateInstance(selectedInstance.instanceId, { rotation: { y: numericValue } });
    }
    if (path === "scale.x") {
      updateInstance(selectedInstance.instanceId, {
        scale: { ...selectedInstance.scale, x: numericValue },
      });
    }
    if (path === "scale.y") {
      updateInstance(selectedInstance.instanceId, {
        scale: { ...selectedInstance.scale, y: numericValue },
      });
    }
    if (path === "scale.z") {
      updateInstance(selectedInstance.instanceId, {
        scale: { ...selectedInstance.scale, z: numericValue },
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

  function handlePointerDown(event: PointerEvent<HTMLDivElement>, instanceId: string, mode: DragMode) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectInstance(instanceId);
    setDragState({ instanceId, mode });
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      updateMyPresence({
        cursor: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
      });
    }

    if (!dragState) return;

    const position = getCanvasPosition(event);
    if (!position) return;

    const instance = project.instances.find((item) => item.instanceId === dragState.instanceId);
    if (!instance) return;

    if (dragState.mode === "move") {
      updateInstance(instance.instanceId, {
        position: { ...instance.position, x: position.x, z: position.z },
      });
      return;
    }

    const angle = Math.atan2(position.x - instance.position.x, position.z - instance.position.z);
    updateInstance(instance.instanceId, { rotation: { y: round((angle * 180) / Math.PI) } });
  }

  function addPrefab(prefabId: string) {
    const prefab = getPrefab(project, prefabId);
    if (!prefab || !canAddPrefab(project, prefab.id)) return;

    const instanceId = nextInstanceId(project, prefab.id);
    const instance: RoomObjectInstance = {
      instanceId,
      prefabId: prefab.id,
      name: `${prefab.name} ${countInstances(project, prefab.id) + 1}`,
      position: { x: 0, y: prefab.type === "mirror" ? 1.2 : 0, z: 0 },
      rotation: { y: 0 },
      scale: { x: 1, y: 1, z: 1 },
      enabled: true,
    };

    updateProject({
      ...project,
      instances: [...project.instances, instance],
      personalToggleDefaults: shouldHavePersonalToggle(prefab)
        ? [...project.personalToggleDefaults, { instanceId, defaultEnabled: true }]
        : project.personalToggleDefaults,
    });
    selectInstance(instanceId);
  }

  function duplicateSelectedInstance() {
    if (!selectedInstance || !selectedPrefab || !canAddPrefab(project, selectedPrefab.id)) return;

    const instanceId = nextInstanceId(project, selectedPrefab.id);
    const duplicate: RoomObjectInstance = {
      ...selectedInstance,
      instanceId,
      name: `${selectedPrefab.name} ${countInstances(project, selectedPrefab.id) + 1}`,
      position: {
        ...selectedInstance.position,
        x: clamp(selectedInstance.position.x + project.room.gridSize, -project.room.width / 2, project.room.width / 2),
        z: clamp(selectedInstance.position.z + project.room.gridSize, -project.room.depth / 2, project.room.depth / 2),
      },
    };

    updateProject({
      ...project,
      instances: [...project.instances, duplicate],
      personalToggleDefaults: shouldHavePersonalToggle(selectedPrefab)
        ? [...project.personalToggleDefaults, { instanceId, defaultEnabled: true }]
        : project.personalToggleDefaults,
    });
    selectInstance(instanceId);
  }

  function deleteSelectedInstance() {
    if (!selectedInstance) return;

    const nextInstances = project.instances.filter((instance) => instance.instanceId !== selectedInstance.instanceId);
    updateProject({
      ...project,
      instances: nextInstances,
      personalToggleDefaults: project.personalToggleDefaults.filter(
        (toggle) => toggle.instanceId !== selectedInstance.instanceId,
      ),
    });
    selectInstance(nextInstances[0]?.instanceId ?? "");
  }

  function togglePersonalDefault(instanceId: string, defaultEnabled: boolean) {
    const exists = project.personalToggleDefaults.some((toggle) => toggle.instanceId === instanceId);
    updateProject({
      ...project,
      personalToggleDefaults: exists
        ? project.personalToggleDefaults.map((toggle) =>
            toggle.instanceId === instanceId ? { ...toggle, defaultEnabled } : toggle,
          )
        : [...project.personalToggleDefaults, { instanceId, defaultEnabled }],
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
      const nextProject = normalizeProject(await response.json());
      setSharedProject(nextProject);
      selectInstance(nextProject.instances[0]?.instanceId ?? "");
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
              <Badge variant="secondary">Prefab Pool Layout</Badge>
              <Badge variant="outline">{others.length + 1} online</Badge>
              <Badge variant="outline">Liveblocks: {syncStatus}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Unity側に事前登録したPrefab Poolを、Web JSONで配置します。pool上限を超える複製はできません。
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
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(520px,1fr)_320px]">
              <Card>
                <CardHeader>
                  <CardTitle>Prefab Catalog</CardTitle>
                  <CardDescription>Unity側Poolに登録する固定Prefab</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[260px] pr-3">
                    <div className="space-y-2">
                      {project.prefabs.map((prefab) => {
                        const used = countInstances(project, prefab.id);
                        const disabled = used >= prefab.maxInstances;
                        return (
                          <div key={prefab.id} className="rounded-lg border p-3 text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-medium">{prefab.name}</div>
                                <div className="text-xs text-muted-foreground">{prefab.id}</div>
                              </div>
                              <Badge variant="outline">{objectTypeLabels[prefab.type]}</Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Pool {used}/{prefab.maxInstances}</span>
                              <Button size="sm" variant="outline" disabled={disabled} onClick={() => addPrefab(prefab.id)}>
                                + 配置
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <Separator />
                  <div>
                    <CardTitle className="text-base">Placed Objects</CardTitle>
                    <CardDescription>配置済みインスタンス</CardDescription>
                  </div>
                  <ScrollArea className="h-[300px] pr-3">
                    <div className="space-y-2">
                      {project.instances.map((instance) => {
                        const prefab = getPrefab(project, instance.prefabId);
                        return (
                          <button
                            key={instance.instanceId}
                            type="button"
                            onClick={() => selectInstance(instance.instanceId)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm transition hover:bg-accent",
                              selectedId === instance.instanceId && "border-primary bg-accent",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{instance.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{instance.instanceId}</span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                              <Badge variant="outline">{prefab ? objectTypeLabels[prefab.type] : instance.prefabId}</Badge>
                              {others.some((other) => other.presence.selectedId === instance.instanceId) ? (
                                <Badge variant="secondary">編集中</Badge>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
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
                    onPointerMove={handleCanvasPointerMove}
                    onPointerLeave={() => updateMyPresence({ cursor: null })}
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
                    {project.instances.map((instance) => {
                      const prefab = getPrefab(project, instance.prefabId);
                      if (!prefab) return null;
                      const size = instanceSize(prefab.defaultSize, instance.scale);
                      return (
                        <div
                          key={instance.instanceId}
                          className="absolute"
                          style={{
                            left: `${((instance.position.x + project.room.width / 2) / project.room.width) * 100}%`,
                            top: `${((instance.position.z + project.room.depth / 2) / project.room.depth) * 100}%`,
                            width: `${(size.width / project.room.width) * 100}%`,
                            height: `${(size.depth / project.room.depth) * 100}%`,
                            minWidth: 20,
                            minHeight: 20,
                            transform: `translate(-50%, -50%) rotate(${instance.rotation.y}deg)`,
                          }}
                        >
                          <div
                            onPointerDown={(event) => handlePointerDown(event, instance.instanceId, "move")}
                            className={cn(
                              "flex h-full w-full cursor-grab items-center justify-center rounded-md border-2 px-2 text-center text-[11px] font-medium shadow-sm active:cursor-grabbing",
                              objectTypeStyles[prefab.type],
                              selectedId === instance.instanceId && "ring-2 ring-primary ring-offset-2",
                              !instance.enabled && "opacity-35 grayscale",
                            )}
                            title="Drag to move"
                          >
                            {prefab.type === "light" ? <Lightbulb className="mr-1 size-3" /> : <Move className="mr-1 size-3" />}
                            <span className="truncate">{instance.name}</span>
                          </div>
                          {selectedId === instance.instanceId ? (
                            <div
                              onPointerDown={(event) => handlePointerDown(event, instance.instanceId, "rotate")}
                              className="absolute -right-3 -top-3 flex size-7 cursor-crosshair items-center justify-center rounded-full border bg-background text-primary shadow-sm"
                              title="Drag to rotate"
                            >
                              <RotateCw className="size-4" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {others.map((other) =>
                      other.presence.cursor ? (
                        <div
                          key={other.connectionId}
                          className="pointer-events-none absolute z-20 rounded-full px-2 py-1 text-[11px] font-medium text-white shadow-sm"
                          style={{
                            left: other.presence.cursor.x,
                            top: other.presence.cursor.y,
                            backgroundColor: other.presence.color,
                            transform: "translate(8px, 8px)",
                          }}
                        >
                          {other.presence.name}
                        </div>
                      ) : null,
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {status} / あなた: {self.presence.name}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Properties</CardTitle>
                  <CardDescription>選択中インスタンスの詳細値</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedInstance && selectedPrefab ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border p-3 text-sm">
                        <div className="font-medium">{selectedPrefab.name}</div>
                        <div className="text-xs text-muted-foreground">
                          prefabId: {selectedPrefab.id} / pool {countInstances(project, selectedPrefab.id)}/{selectedPrefab.maxInstances}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={selectedInstance.name}
                          onChange={(event) => updateInstance(selectedInstance.instanceId, { name: event.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <Label>共有 enabled</Label>
                          <p className="text-xs text-muted-foreground">Pool内で有効化するか</p>
                        </div>
                        <Switch
                          checked={selectedInstance.enabled}
                          onCheckedChange={(enabled) => updateInstance(selectedInstance.instanceId, { enabled })}
                        />
                      </div>
                      <NumberGrid
                        values={[
                          ["X", "position.x", selectedInstance.position.x],
                          ["Y", "position.y", selectedInstance.position.y],
                          ["Z", "position.z", selectedInstance.position.z],
                          ["Rot Y", "rotation.y", selectedInstance.rotation.y],
                          ["Scale X", "scale.x", selectedInstance.scale.x],
                          ["Scale Y", "scale.y", selectedInstance.scale.y],
                          ["Scale Z", "scale.z", selectedInstance.scale.z],
                        ]}
                        onChange={updateSelectedNumber}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={duplicateSelectedInstance}
                          disabled={!canAddPrefab(project, selectedPrefab.id)}
                        >
                          <Copy className="size-4" />
                          複製
                        </Button>
                        <Button variant="destructive" onClick={deleteSelectedInstance}>
                          <Trash2 className="size-4" />
                          削除
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">インスタンスを選択してください。</p>
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
                {project.instances
                  .filter((instance) => {
                    const prefab = getPrefab(project, instance.prefabId);
                    return prefab ? shouldHavePersonalToggle(prefab) : false;
                  })
                  .map((instance) => {
                    const prefab = getPrefab(project, instance.prefabId);
                    const toggle = project.personalToggleDefaults.find((item) => item.instanceId === instance.instanceId);
                    const enabled = toggle?.defaultEnabled ?? true;
                    return (
                      <div key={instance.instanceId} className="flex items-center justify-between rounded-lg border bg-background p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-medium">
                            {enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            {instance.name}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {instance.instanceId} / {prefab ? objectTypeLabels[prefab.type] : instance.prefabId}
                          </p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={(checked) => togglePersonalDefault(instance.instanceId, checked)} />
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
                  <CardDescription>UdonSharp側が読むPrefab Pool JSONです。</CardDescription>
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

function getPrefab(project: RoomProject, prefabId: string) {
  return project.prefabs.find((prefab) => prefab.id === prefabId);
}

function countInstances(project: RoomProject, prefabId: string) {
  return project.instances.filter((instance) => instance.prefabId === prefabId).length;
}

function canAddPrefab(project: RoomProject, prefabId: string) {
  const prefab = getPrefab(project, prefabId);
  return Boolean(prefab && countInstances(project, prefabId) < prefab.maxInstances);
}

function nextInstanceId(project: RoomProject, prefabId: string) {
  let index = 1;
  let instanceId = `${prefabId}-${index.toString().padStart(3, "0")}`;

  while (project.instances.some((instance) => instance.instanceId === instanceId)) {
    index += 1;
    instanceId = `${prefabId}-${index.toString().padStart(3, "0")}`;
  }

  return instanceId;
}

function instanceSize(defaultSize: Size3, scale: { x: number; y: number; z: number }) {
  return {
    width: defaultSize.width * scale.x,
    height: defaultSize.height * scale.y,
    depth: defaultSize.depth * scale.z,
  };
}

function shouldHavePersonalToggle(prefab: PrefabDefinition) {
  return prefab.type === "mirror" || prefab.type === "light";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function parseProject(projectJson: string, fallback: RoomProject) {
  try {
    return normalizeProject(JSON.parse(projectJson));
  } catch {
    return fallback;
  }
}
