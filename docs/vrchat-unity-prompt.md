# Unity/UdonSharp Implementation Prompt

VRChat SDK3 Worlds + UdonSharpで、外部URLから部屋レイアウトJSONを読み込み、Unityシーン内のPrefab Poolからソファのインスタンスを有効化し、位置/回転/スケールを反映する実装を作ってください。

## 前提

- Web側はNext.jsで作成済みです。
- Web側はVRChat向けJSONを `/api/public/room-layout` で配信します。
- VRChat側では `VRCStringDownloader.LoadUrl` を使ってJSONを取得したいです。
- JSONは `VRCJson.TryDeserializeFromJson` で `DataDictionary` / `DataList` として読む想定です。
- VRChat実行中にWebから新規Prefabアセットを動的ロードする設計ではありません。
- Unity側にPrefab RegistryとPrefabごとのObject Poolを事前配置します。
- まずは `sofa` prefab 1種類、pool数10で検証します。
- 家具の位置・回転・スケールは全員共通です。
- ミラーON/OFF、ライトON/OFF、演出ON/OFFなどの個人トグルは後から追加予定です。
- 個人トグルは同期しません。
- 個人トグルを永続化する場合は `PlayerData` / Persistence を使いたいです。
- `UdonSynced` は必要最小限にしたいです。
- Late Joinerにも共通レイアウトが反映される設計にしたいです。

## Unity側の想定階層

```text
RoomLayoutManager
├── PrefabRegistry
│   └── id: sofa -> Pool_sofa
├── Pool_sofa
│   ├── sofa_001
│   ├── sofa_002
│   ├── sofa_003
│   └── ... sofa_010
```

## 想定JSON

```json
{
  "schemaVersion": 2,
  "id": "default-room",
  "name": "Default Room",
  "room": {
    "width": 8,
    "depth": 6,
    "gridSize": 0.25
  },
  "prefabs": [
    {
      "id": "sofa",
      "name": "Sofa",
      "type": "furniture",
      "maxInstances": 10,
      "defaultSize": { "width": 2.2, "height": 0.8, "depth": 0.9 }
    }
  ],
  "instances": [
    {
      "instanceId": "sofa-001",
      "prefabId": "sofa",
      "name": "Sofa 1",
      "position": { "x": -1.4, "y": 0, "z": 1.4 },
      "rotation": { "y": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "enabled": true
    }
  ],
  "personalToggleDefaults": []
}
```

## 作ってほしいもの

1. UdonSharpの `RoomLayoutLoader`
2. `prefabId` とUnity上のPoolを対応付ける `PrefabRegistry`
3. Pool内のGameObject配列から `instances` の順番に割り当てる仕組み
4. `VRCStringDownloader.LoadUrl` でJSONを取得する処理
5. `VRCJson.TryDeserializeFromJson` でJSONを安全にパースする処理
6. `position` / `rotation.y` / `scale` / `enabled` をPool内GameObjectへ反映する処理
7. JSONに存在しない余りPoolオブジェクトを無効化する処理
8. `maxInstances` よりJSON上のインスタンス数が多い場合のログと無視処理
9. 失敗時のログとフォールバック
10. VRChatの信頼済みURL制限、5秒制限、容量制限、Udon同期制限への注意
11. Unity Inspectorで設定する項目の説明

## 制約

- UdonSharpで動くコードにしてください。
- Unity通常C#で動いてもUdonSharp非対応のAPIは避けてください。
- `DataDictionary` / `DataList` の型チェックを丁寧にしてください。
- JSONの数値はdoubleとして読まれる可能性に注意してください。
- Webから未登録Prefabを追加できるようにしないでください。
- `prefabId` がRegistryに存在しない場合は無視して警告ログを出してください。
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
