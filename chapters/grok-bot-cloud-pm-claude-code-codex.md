---
title: "把 Grok Bot 當雲端 PM：用手機派工給 Claude Code 和 Codex"
slug: grok-bot-cloud-pm-claude-code-codex
description: "Grok Bot 能不能搭配 Claude Code 和 Codex 用？我的設計是讓一個 PM bot 只負責派工，實作交給 Claude Code，review 交給 Codex，任務和交付全部走 GitHub issue 與 PR。附原始碼裡學到的三個編排機制。"
date: 2026-11-08
lang: zh-TW
query: "Grok Bot Claude Code"
tags: [ai-agents, tools]
canonical: ""
publish: false
source_notes: ["Engineering & Tools/Grok Bot 編排使用手冊.md", "Engineering & Tools/Grok Bot 任務交接清單.md", "AI & Prompts/Super-agent 架構：讓 agent 脫離單一 session.md", "Engineering & Tools/herdr vs cmux 評估.md"]
order: 3
---

我平常在電腦上同時開四五個 coding agent，一邊做新功能、一邊修 bug。效率很高，但很耗腦：我得自己記得哪個 agent 在做什麼、哪個在等我。離開電腦，整條線就停了。

Grok Bot 是 xAI 和 Cursor 的母公司 Anysphere 合作的 agent 產品。每個 bot 像一個「AI 同事」，你在手機上傳訊息給它，它在一台雲端 Linux 電腦上做事。我想用它解一個具體問題：**讓一個 bot 當我的雲端 PM，我在手機上派工，它去指揮 Claude Code 和 Codex 寫程式。**

這篇是我的設計和調研筆記，適合已經在用 Claude Code 或 Codex、想把派工搬到手機上的人。先說清楚：寫這篇時我還沒完整跑過一輪，Grok Bot 桌面版的登入卡住了，還在等客服。所以下面是架構、理由和從原始碼讀到的東西，不是使用心得。


> **TODO(Morris)**：如果發布前已經跑通，把上面這段改成實測，並補數字：從手機派一個小任務到 PR 出現花多久、中途被叫回來幾次、有沒有一次成功。這是整篇最缺的東西。


## 架構：PM bot 只派工，不寫程式

```
手機（Grok App）
   │ 派工 / 審批 / 接手登入
   ▼
PM Bot ── 拆任務、寫 spec、彙總回報；不改程式碼
   │
   ├──► Claude Code（裝在雲端電腦）── 主力實作
   ├──► Codex CLI（同一台電腦）── review、第二意見
   │
   └──► GitHub ── issue = 任務單，PR = 交付物，我在手機上 merge
```

兩條原則：

1. **PM bot 只派工，不親自做。** 這條要寫死在 bot 的指令裡，不能讓它自己判斷。DeepSeek Harness 團隊做過實驗：讓單一 session 自己決定「這件事要不要交出去」，中性 prompt 下 5 次它全都自己做，最慢那 5% 任務的耗時（p95）是 29.5 分鐘；把「主 session 不幹活」寫成系統規則的兩層架構，p95 是 15.7 分鐘。他們的測試是合成負載，數字只能參考，但方向很清楚。
2. **GitHub 是唯一的事實來源。** 聊天紀錄會丟，issue 和 PR 會留痕。這樣就算哪天不用 Grok Bot 了，整套流程還是能用。

Claude Code 和 Codex 怎麼放，我分兩種情況：

| 路線 | 做法 | 適合 |
|---|---|---|
| A. 雲端跑 | Claude Code / Codex 直接裝在雲端電腦，clone repo 實作 | Side project、不敏感的 repo |
| B. 只當 PM | Grok Bot 只開 issue，實作在我本機用 Claude Code 接 issue | 敏感 repo |

公司的 repo 一律不碰 Grok Bot。

## PM bot 的指令

Grok Bot 每個 bot 有名字、頭銜、描述三個欄位，描述就是它的 prompt，每次執行都會讀一次。我的草稿：

```
You are my PM for side projects. You do not write code yourself.
- Turn my phone messages into GitHub issues with: goal, acceptance criteria, out-of-scope.
- Dispatch implementation to Claude Code (default) or Codex (review / second opinion) in the terminal.
- Every change goes through a PR. Never push to main. Never merge.
- Ask me before: installing new tools, spending money, touching secrets, deleting anything.
- Report in Traditional Chinese, short: what was done, PR link, what needs my decision.
- One project per conversation thread.
```

另外參考了 Lauren（@poteto）分享的建 bot 心法，我採用了三條：bot 不用多，少數幾個好 bot 比一大群好管；教它做一件事時，叫它順手存成 skill，之後才做得一致；能寫成 script 的就叫它寫成 script，比每次讓 bot 親手操作省很多 token。

有一條我刻意不照做：她建議把工作用的工具都授權給 bot。我的 GitHub 只授權指定的 repo，金鑰也不放進雲端電腦。原因在下一節。

## 安全：所有 bot 共用一台電腦

這是我讀文件時最在意的一點。同一個帳號下的所有 bot 共用同一台雲端電腦：各自有自己的螢幕，但檔案、瀏覽器 cookie、登入狀態、CLI 憑證全部共用。官方文件直接寫：「Do not use separate Bots as a security boundary.」

也就是說，「PM bot」「研究 bot」這種角色分工只是 prompt 層的區分，不是安全邊界。我的硬性規則：

1. GitHub 只授權指定的 repo。
2. 不把任何 API 金鑰放進雲端電腦。
3. Claude Code、Codex 用訂閱登入，不放 API key。
4. 只能開 PR，不能 push main，merge 由我按。
5. 每月清一次雲端電腦裡的登入狀態。刪掉 bot 不會清掉它留下的檔案和登入狀態。
6. 不在雲端電腦登入銀行或主要的社群帳號。

很多人好奇 bot 怎麼處理登入。答案是沒有繞過：遇到密碼、兩步驟驗證、CAPTCHA、付款確認，它會把雲端電腦的畫面交給你操作，你做完再交還給它。登入一次之後，狀態留在那台電腦裡，所有 bot 都能用。

## 從原始碼學到的三個編排機制

Grok Bot 0.18 版打包時沒關 source map，有人據此還原出可讀的 TypeScript。我只讀、學概念，不把程式碼複製進自己的 repo。三個機制對我做產品最有啟發：

**1. 多 bot 群組對話不是「主管規劃」，是有上限的輪流迴圈。** 最多 3 輪、總共最多 10 次發言、每次只帶最近 24 則訊息。每個 bot 只看到自己上次發言之後的新訊息，可以選擇 pass。某一輪沒人說話就結束，我一發新訊息整輪就取消。編排的核心是「有上限的迴圈 + 每個人能 pass」，簡單、成本可控，而且一定會停。

**2. 示範錄製只錄畫面。** 你在雲端電腦上示範一次，它用 ffmpeg 錄成 15fps 的影片，交給模型看完寫出 skill 草稿，再給人審。它不錄結構化事件，例如點了哪個元素、填了什麼欄位。如果同時錄 DOM 事件和網路請求，重播就能每次照同樣步驟走，不用每次讓模型重看影片，更穩也更便宜。

**3. 交接給人是寫死的狀態機。** bot 發出請求時附上說明、網域和一張截圖，我透過 VNC 接手，按「完成」或「取消」，bot 再接著做。每個 bot 同一時間只能有一個待處理的交接。「人在迴圈裡」被寫進程式，不是靠 prompt 拜託模型記得停下來。

## 手機派工到我自己的 Mac

如果 agent 跑在我自己的 Mac 上，我比較了三條路：

| 路線 | 怎麼連 | 我的判斷 |
|---|---|---|
| A. 官方本機執行 | Mac 上的 Grok Bot 桌面版主動往外連，雲端 bot 從這條連線下指令 | 先做。官方支援，審批卡片直接出現在手機上 |
| B. Tailscale + SSH | 雲端電腦加入我的 Tailscale 網路，SSH 進 Mac | A 跑通後再考慮。能把 bot 能跑的指令鎖到只剩幾個，但未知數多 |
| C. 不經過 Grok Bot | Claude Code 的 Remote Control + ChatGPT App 控制 Codex | 零成本備案，但兩個 App 分開，沒有統一的 PM |

路線 A 我會讓 bot 只透過終端機工具 herdr 做三件事：開窗格、把 prompt 送進去、看狀態。herdr 會標示每個 agent 是 working、blocked 還是 idle，bot 一個指令就知道誰在等我。審批設定保持「Ask every time」，只有唯讀指令設成自動允許。審批卡片是擋 prompt injection（網頁或文件裡藏的惡意指令）的唯一一道門，不能省。herdr 和 cmux 的比較見 [[herdr vs cmux 比較：跑 coding agent 的終端機，我為什麼留在 cmux]]。


> **TODO(Morris)**：放一張手機上審批卡片的截圖，或一次派工到 PR 的對話截圖（遮掉 repo 名和帳號）。讀者想知道「手機上實際看到什麼」。


## 我要驗證的事

試用期間我會照這個順序跑，一次只加一個新變數：

1. 建 PM bot，GitHub 只授權一個 side project repo。
2. 在雲端電腦裝 Claude Code，用訂閱登入，確認能跑。
3. 從手機派一個小任務，走完「issue → Claude Code → PR → 我 merge」。
4. 叫 Codex review 同一個 PR。
5. 看用量頁，確認 Claude Code 在雲端電腦裡沒有吃 Grok 的額度。第三方教學說不會吃，我還沒親眼確認。
6. 基準流程跑通後，才把 herdr 裝進去。

完成的標準只有一條：用手機走完一次「派工 → PR → merge」，全程不碰電腦。

## 小結

Grok Bot 對我最有價值的地方，不一定是當生產工具，而是它是一個做得很完整、可以拿來研究的商業化編排產品。目前讀到的設計都很克制：迴圈有上限、交接寫成狀態機、bot 分工不當安全邊界。我自己在本機管 agent 也照這個方向走：先做簡單、一定會停的版本，聰明的規劃以後再說。
