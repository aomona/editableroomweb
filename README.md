# Editable Room Web

VRChat向けの部屋レイアウトJSONを編集・保存・配信するNext.jsアプリです。

## Features

- 2D平面上で家具、ライト、ミラー、小物をドラッグ移動
- 回転ハンドルでY回転を編集
- グリッド表示/吸着
- 位置、回転、サイズの数値編集
- オブジェクト追加、複製、削除
- ミラー/ライト系トグルの個人初期値管理
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

## API

- `GET /api/project`: 編集中プロジェクトを取得
- `PUT /api/project`: 編集中プロジェクトを保存
- `GET /api/export/vrchat`: VRChat向けJSONを取得
- `GET /api/public/room-layout`: VRChat側から読む想定の公開JSON

## Vercel Deployment

1. Vercelにプロジェクトを作成します。
2. Project SettingsのStorageからVercel Blob Storeを作成します。
3. Blob Storeをこのプロジェクトに接続します。
4. `BLOB_READ_WRITE_TOKEN` がEnvironment Variablesに追加されていることを確認します。
5. Build Commandを `pnpm build` にします。
6. Install Commandを `pnpm install` にします。
7. デプロイします。

デプロイ後のVRChat配信用URL例:

```text
https://your-app.vercel.app/api/public/room-layout
```

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
