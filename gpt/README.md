# gpt：給 ChatGPT 的檔案

這個資料夾只放**要丟給 ChatGPT 生圖**的 md。
遊戲的想法、待辦與做了什麼放在 `docs/`、`status.md`，不放這裡。

## 生一個斑龜動作

在 ChatGPT 依序上傳：

1. `reference/character/bangui_character.png`：角色參考圖
2. `rules/rules_bangui_v3.6.md`：規則，包括三視角（正面俯看 45°／側面／背面俯看 45°）和 3 × 4 版面
3. `actions/bangui_v3/action_NN_xxx.md`：要生的那一個動作

產出的圖存成 `reference/sheets/bangui/action_NN_xxx.png`，再執行下面兩行：

```bash
python tools/slice_poses_v4.py bangui
```

```bash
python tools/asset_status.py
```

進度看根目錄的 `bangui_asset_status.md`。

## 內容

| 位置 | 內容 |
|---|---|
| `rules/rules_bangui_v3.6.md` | **斑龜目前的規則** |
| `rules/rules_aurocapitata_v3.5.md` | 金頭閉殼龜的規則（之後的品種） |
| `rules/archive/` | 舊版規則（v3.1～v3.5、最早的 rules.md） |
| `actions/bangui_v3/` | **斑龜 v3 動作 23 個**（水上 13、水下 10），清單在 `README.md` |
| `character/PROMPTS_STRIPE_NECKED_TURTLE_MASTER.md` | 斑龜 26 方向定裝照 |
| `character/character_design_bangui.md` | 斑龜角色設計（最早生 `bangui_character.png` 用的） |
| `scene/outdoor/` | **戶外池場景**：全景、土層剖面、草地（說明在該資料夾的 `README.md`） |
| `back_fill/back_fill_B.md` | 舊 4 視角時期補背面用 |
| `archive/` | 舊版動作（v1 的 32 個、v2 的 27 個）、4 視角共用動作、v4 規格 |

## 注意

- `actions/bangui_v3/` 是由 `tools/make_actions_v3.py` 產生的。如果直接改 md，就不要再執行那支工具，否則會被覆蓋；要大改的話就改工具。
- `character/character_design_bangui.md` 和 `rules/archive/` 裡的舊檔把斑龜寫成「三線閉殼龜／*Mauremys reevesii*」，這是錯的。v3.6 已更正為 *Mauremys sinensis*。
