# Editable Room Web

VRChat向けの部屋レイアウトJSONを編集・保存・配信するNext.jsアプリです。

## Features

- 2D平面上でPrefab Poolの配置インスタンスをドラッグ移動
- 回転ハンドルでY回転を編集
- グリッド表示/吸着
- 位置、回転、サイズの数値編集
- オブジェクト追加、複製、削除
- ミラー/ライト系トグルの個人初期値管理に対応
- Liveblocksによるリアルタイム共同編集
- 他ユーザーのカーソル/選択オブジェクト表示
- 固定Prefabカタログから配置インスタンスを追加
- Prefabごとのpool上限で追加/複製を制限
- VRChat向けJSONエクスポート
- Vercel Blobへのprivate保存
- Vercel APIからJSON配信

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

`BLOB_READ_WRITE_TOKEN` が未設定のローカル環境では、`data/room-project.json` に保存します。
`BLOB_READ_WRITE_TOKEN` がある環境では、Blob本体はprivateで保存し、Next.js API経由でJSONを配信します。

リアルタイム共同編集にはLiveblocksが必要です。推奨はSecret key方式です。

- `LIVEBLOCKS_SECRET_KEY`: `/api/liveblocks-auth` で匿名ユーザーにroom書き込み権限を発行します。

`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` はプロトタイプ用の代替手段です。ブラウザに公開されるキーなので、このアプリでは基本的に設定しないでください。

このアプリは現状、編集者の制限をしていません。公開URLを知っている人は共同編集できます。

## API

- `GET /api/project`: 編集中プロジェクトを取得
- `PUT /api/project`: 編集中プロジェクトを保存
- `POST /api/liveblocks-auth`: Liveblocks匿名共同編集トークンを発行
- `GET /api/export/vrchat`: VRChat向けJSONを取得
- `GET /api/public/room-layout`: VRChat側から読む想定の公開JSON

## Vercel Deployment

1. Vercelにプロジェクトを作成します。
2. Project SettingsのStorageからVercel Blob Storeを作成します。
3. Blob Storeをこのプロジェクトに接続します。
4. `BLOB_READ_WRITE_TOKEN` がEnvironment Variablesに追加されていることを確認します。
5. Liveblocks projectを作成します。
6. `LIVEBLOCKS_SECRET_KEY` をEnvironment Variablesに追加します。
7. Build Commandを `pnpm build` にします。
8. Install Commandを `pnpm install` にします。
9. デプロイします。

デプロイ後のVRChat配信用URL例:

```text
https://your-app.vercel.app/api/public/room-layout
```

共同編集中のLiveblocks上の変更は即時に他ブラウザへ反映されます。VRChat配信用JSONは、画面上の保存ボタンでVercel Blobへ保存したタイミングで更新されます。

## Prefab Pool Model

VRChat実行中にWebから新しいPrefabアセットを動的追加するのではなく、Unity側に事前登録したPrefab PoolをWeb JSONで配置します。

- Webの `prefabs` はUnity側のPrefab Registryと同じIDにします。
- Webの `instances` はPool内の何個目を有効化して配置するかを表します。
- `maxInstances` を超える追加/複製はWeb UIで止めます。
- 現在の検証用固定カタログは `sofa` 1種類のみで、pool上限は10です。
- ミラー/ライトのON/OFF初期値は `personalToggleDefaults` に `instanceId` 参照で保存します。

## VRChat URL Note

VRChatのString Loadingには信頼済みURL制限があります。VercelのURLは信頼済みURLに含まれない可能性が高いため、VRChat側で `Allow Untrusted URLs` が必要になる場合があります。

本番運用でユーザーに確実に読ませたい場合は、GitHub Pages、Gist、VRCDNなど、VRChatの信頼済みURLへJSONを公開する導線を追加してください。

## Unity Prompt

Unity/UdonSharp側を別AIに実装させるためのプロンプトは `docs/vrchat-unity-prompt.md` にあります。

## Scripts

```bash
pnpm lint
pnpm build
pnpm start
```
