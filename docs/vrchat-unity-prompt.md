# Unity/UdonSharp Implementation Prompt

VRChat SDK3 Worlds + UdonSharpで、外部URLから部屋レイアウトJSONを読み込み、Unityシーン内の家具・ライト・ミラーの位置/回転/サイズを反映する実装を作ってください。

## 前提

- Web側はNext.jsで作成済みです。
- Web側はVRChat向けJSONを `/api/public/room-layout` で配信します。
- VRChat側では `VRCStringDownloader.LoadUrl` を使ってJSONを取得したいです。
- JSONは `VRCJson.TryDeserializeFromJson` で `DataDictionary` / `DataList` として読む想定です。
- 家具、ライト、ミラーの位置・回転・サイズは全員共通です。
- ミラーON/OFF、ライトON/OFF、演出ON/OFFなどのトグルはユーザーごとのローカル設定です。
- 個人トグルは同期しません。
- 個人トグルを永続化する場合は `PlayerData` / Persistence を使いたいです。
- `UdonSynced` は必要最小限にしたいです。
- Late Joinerにも共通レイアウトが反映される設計にしたいです。

## 想定JSON

```json
{
  "schemaVersion": 1,
  "id": "default-room",
  "name": "Default Room",
  "room": {
    "width": 8,
    "depth": 6,
    "gridSize": 0.25
  },
  "objects": [
    {
      "id": "mirror-01",
      "name": "Wall Mirror",
      "type": "mirror",
      "position": { "x": 3.35, "y": 1.2, "z": 0 },
      "rotation": { "y": -90 },
      "size": { "width": 1.8, "height": 1.2, "depth": 0.05 },
      "enabled": true
    },
    {
      "id": "key-light-01",
      "name": "Key Light",
      "type": "light",
      "position": { "x": -2.4, "y": 2.4, "z": -1.5 },
      "rotation": { "y": 45 },
      "size": { "width": 0.35, "height": 0.35, "depth": 0.35 },
      "enabled": true,
      "light": { "intensity": 1, "color": "#fff4dd" }
    }
  ],
  "personalToggleDefaults": [
    { "objectId": "mirror-01", "defaultEnabled": true },
    { "objectId": "key-light-01", "defaultEnabled": true }
  ]
}
```

## 作ってほしいもの

1. UdonSharpの `RoomLayoutLoader`
2. `id` とUnity上の `GameObject` を対応付ける仕組み
3. `VRCStringDownloader.LoadUrl` でJSONを取得する処理
4. `VRCJson.TryDeserializeFromJson` でJSONを安全にパースする処理
5. `position` / `rotation` / `size` / `enabled` をGameObjectへ反映する処理
6. ミラーやライトのローカルON/OFFを切り替えるUIまたはメソッド
7. 個人トグルを`PlayerData`へ保存/読み込みする設計案
8. 失敗時のログとフォールバック
9. VRChatの信頼済みURL制限、5秒制限、容量制限、Udon同期制限への注意
10. Unity Inspectorで設定する項目の説明

## 制約

- UdonSharpで動くコードにしてください。
- Unity通常C#で動いてもUdonSharp非対応のAPIは避けてください。
- `DataDictionary` / `DataList` の型チェックを丁寧にしてください。
- JSONの数値はdoubleとして読まれる可能性に注意してください。
- ミラーON/OFFなど個人設定は他プレイヤーに同期しないでください。
- 共通レイアウトは外部URLから読む案を優先してください。
- 必要なら `UdonSynced` のJSON文字列でインスタンス内共有する案も比較してください。

## 回答形式

- 推奨アーキテクチャ
- Unity階層例
- Inspector設定例
- UdonSharpコード
- PlayerDataを使う個人設定コードまたは疑似コード
- 注意点
- テスト手順
