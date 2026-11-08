---
title: "herdr vs cmux 比較：跑 coding agent 的終端機，我為什麼留在 cmux"
slug: herdr-vs-cmux
description: "herdr 和 cmux 都是給 coding agent 用的終端機。我把兩者放在自己的多 agent 工作流裡比較：herdr 贏在背景常駐和 agent 狀態，cmux 贏在內建瀏覽器和 markdown 檢視器。結論是不換，但可以並用。"
date: 2026-11-08
lang: zh-TW
query: "herdr cmux 比較"
tags: [ai-agents, tools]
canonical: ""
publish: false
source_notes: ["Engineering & Tools/herdr vs cmux 評估.md", "Engineering & Tools/Grok Bot 編排使用手冊.md", "AI & Prompts/Super-agent 架構：讓 agent 脫離單一 session.md"]
order: 1
---

我平常同時開四五個 coding agent：有的做新功能，有的修 bug，大一點的功能用 git worktree 開獨立環境跑，另一個螢幕拿來測試。效率很高，代價是認知成本：哪個 agent 在跑、哪個卡住在等我，全靠我自己記。DeepSeek Harness 團隊也寫過類似的觀察：一個人最多同時顧 3–5 個活躍 session，多任務的瓶頸是人的注意力，不是模型。

所以「跑 agent 的終端機」對我來說不是小事。2026 年 11 月初，有人在 X 上推薦 herdr，說它是「第一的 vibe coding 終端」。我正在用的是 cmux，就花了一個下午把兩個放在一起比。比較時的版本是 herdr 0.9.5、cmux 0.65.2。

這篇適合正在挑終端機跑 Claude Code、Codex 這類 agent 的人。先講結論：**我不換，但會在特定情境並用。**

## 它們是什麼

- **herdr**：用 Rust 寫的開源專案（Apache-2.0），自稱「coding agent 住的 runtime」。它有一個背景伺服器幫你保管終端機，關掉視窗或 SSH 斷線，agent 照跑。可以在任何終端機裡執行，也有獨立的桌面 App。
- **cmux**：macOS 原生的終端機 App，用 workspace / pane / surface 組織畫面，內建瀏覽器和 markdown 檢視器，agent 可以透過 socket 操作它。

## herdr 比 cmux 強的地方

1. **背景常駐。** 視窗關掉，終端機還在跑；重開機後會恢復版面，但程序本身不會活下來。cmux 關掉就沒了，我得自己寫腳本把 agent 一個個開回來。
2. **agent 狀態一覽。** 每個窗格標示 working（工作中）、blocked（卡住，等人處理）、idle（閒置），哪個 agent 在等我一眼就知道。這正好打在我上面說的痛點。
3. **多台機器一個視窗。** SSH 遠端機器和本機的 agent 放在同一個清單裡。
4. **agent 能互相指揮。** agent 可以透過 CLI 開新窗格、互相送 prompt，或用 `herdr agent wait` 等另一個 agent 真的卡住再動作。
5. **跨平台。** macOS、Linux、Windows 都有，一支執行檔，沒有 Electron。

## cmux 比 herdr 強的地方

這幾點對我是決定性的：

1. **內建瀏覽器。** 比較那天我開著 23 個瀏覽器分頁。我最常用的版面是「左邊 agent、右上 dev server、右下網頁預覽」，全靠 cmux 的內建瀏覽器。herdr 沒有。
2. **markdown 檢視器。** 那天開著 9 個，用來看筆記和 agent 交出來的文件。herdr 也沒有。
3. **按資料夾自動分組 workspace。** 同一個專案的 session 自動歸在一起。
4. **我已經長在 cmux 上的工具。** 啟動 agent 的腳本、開機後恢復 agent 的腳本、開 dev 預覽版面的腳本、記錄焦點切換的 Claude Code hook，加上 5 個 cmux 相關的 skill。換掉就要全部重寫。


> **TODO(Morris)**：放一張 cmux「左邊 agent、右上 dev server、右下預覽」的實際版面截圖。這是 cmux 贏的核心理由，用看的比用講的快。


## 一個常見的誤會：API key

兩個終端機都不管 API key。我的金鑰放在 secrets 管理工具裡，執行指令時才注入，跟用哪個終端機無關。herdr 的支援清單裡有 grok，但那是 xAI 的終端機 agent Grok CLI，在 cmux 裡一樣跑得起來，不是 herdr 獨有的能力。

## 為什麼不換

遷移成本遠大於收益：

- cmux 的瀏覽器、markdown 檢視器和我寫的那幾支腳本，herdr 都沒有對應的東西。
- 設定不能直接搬。兩邊的設定格式、概念（workspace 對 space）、腳本 API 都不一樣，只能手動重建。
- herdr 的背景常駐，我在 cmux 上已經用腳本補了一部分。cmux 的瀏覽器和檢視器，我在 herdr 上補不回來。

## 可以並用：herdr 是一支程式，不是一定要換掉的 App

herdr 本身就是一支能在 cmux 分頁裡跑的 CLI，兩個不衝突。我裝了 CLI，從 GitHub release 下載，sha256 跟官方 digest 比對過。我覺得值得用 herdr 的情境有兩種：

1. **跑很久、關掉視窗也不能停的 agent。**
2. **遠端到 VPS 或雲端電腦的工作。** 例如我在設計用 Grok Bot 當雲端 PM，就打算把 herdr 裝進它的雲端電腦，讓 PM bot 用一個指令查哪個 agent 卡住，不用一個一個螢幕看過去。細節在 [[把 Grok Bot 當雲端 PM：用手機派工給 Claude Code 和 Codex]]。

有兩件事我刻意沒做：

- **沒裝 herdr 桌面 App**，因為它預設開啟遙測（自動回傳使用資料）。
- **沒跑 `herdr integration install`**，因為這個指令會改 Claude Code 的 hooks。我不想讓工具自動改本機的 hooks。

## 怎麼選

- 你主要在 Linux 或 Windows 上跑，或 agent 常跑在遠端機器、需要斷線不停：herdr 很適合。
- 你在 macOS 上，工作流裡常要邊跑 agent 邊看網頁預覽、看文件：cmux 的內建瀏覽器和檢視器很難取代。
- 兩個都想要：在 cmux 裡跑 herdr CLI，處理長時間和遠端的 agent。

我目前打算走第三種。另外，cmux 裡怎麼多開平行跑 Claude Code，我寫在 [[Claude Code 接免費模型多開平行跑：我的 Magpie + cmux 做法]]。
