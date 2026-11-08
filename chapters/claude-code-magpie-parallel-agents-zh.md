---
title: "Claude Code 接免費模型多開平行跑：我的 Magpie + cmux 做法"
slug: claude-code-magpie-parallel-agents-zh
description: "用本機 gateway Magpie 讓 Claude Code 接免費或便宜的模型，在 cmux 多開窗格平行跑小任務：設定、選模型、記帳和踩過的坑。"
date: 2026-11-08
lang: zh-TW
query: "Claude Code 免費模型 多開"
tags: [ai-agents, tools]
canonical: ""
publish: false
source_notes: ["Engineering & Tools/Magpie 多 Agent 使用手冊.md"]
order: 2
---

我平常一次開四五個 agent，同時改需求、修 bug。效率很高，但有兩個問題：主力的 Claude Code 額度有限，而且很多小任務其實用不到最強的模型。寫測試、改文案、查資料、處理個人 repo 的雜事，丟給免費模型就夠了。

這篇記錄我怎麼用 Claude Code 接免費和便宜的模型，在 cmux 裡多開窗格平行跑。適合已經在用 Claude Code、想讓更多 agent 同時工作又不想多花錢的人。所有指令我都實測過，標「未實測」的除外。

## 先講清楚 Magpie 是什麼

[Magpie](https://github.com/yetone/magpie) 是一個跑在自己電腦上的轉接站（gateway），位址是 `127.0.0.1:3425`。Agent 把請求送給它，它再轉給 OpenRouter、Cloudflare 這類平台，中間負責翻譯 API 格式（Anthropic、OpenAI、Gemini 三種格式互轉）。所以 Claude Code 以為自己在跟 Anthropic 講話，實際回答的是別家模型。

有三件事一開始容易誤會：

1. **它不會讓單一 agent 變快。** 它不是調度器，不會幫你拆任務。提速靠的是同時開很多窗格。
2. **它不會自己攔截 agent。** 只有主動送到它這裡的請求才會經過它。平常打 `claude` 開的 session 完全不受影響。
3. **模型的寫法是 `provider/model`。** provider 是在 Magpie 裡設定好的一家平台，例如 `openrouter/deepseek/deepseek-v4.1-flash-1017`。

## 我的日常流程

1. **主窗格**：照舊用一般的 `claude`。規劃、拆任務、重要判斷都在這裡做。品質最好，只是慢。
2. **拆任務**：挑出彼此獨立的小任務。
3. **開副窗格**：每個小任務開一個 cmux 窗格，輸入 `cc-magpie`。幾個窗格同時跑。
4. **回主窗格驗收**：免費模型品質不穩，合併前讓主窗格看一眼。

`cc-magpie` 是我自己寫的啟動腳本。它在目前這個窗格開一個 Claude Code，讓它經過 Magpie 用外部模型，只影響這個窗格。為什麼要自己包一層，下面「一定要守的規則」會講。

## 該用哪個模型

這是 2026-11-04 實測的結果：

| 任務 | 指令 | 為什麼 |
|---|---|---|
| 一般雜事、小改動 | `cc-magpie`（預設 OpenRouter 上的 nemotron 免費版） | 免費。實測能用工具讀檔，約 8 秒 |
| 想快一點、穩一點 | `cc-magpie openrouter/deepseek/deepseek-v4.1-flash-1017` | 從 OpenRouter 儲值扣款，一次讀檔測試約 $0.007 |
| OpenRouter 用到上限時的最後備用 | `cc-magpie zai/glm-4.7-flash` | 免費，但讀檔測試要 122 秒，一次只處理一個請求 |
| 很短的一次性問答 | 直接打 Cerebras | 約 0.5 秒，但塞不進 Claude Code |

幾家平台的實際狀況：

- **OpenRouter 是主力。** 我儲值了 $10，免費模型的每日上限就從 50 次升到 1000 次，而且是永久的。這是整套做法裡最划算的一筆。
- **Z.ai 免費 API 能跑 Claude Code，但會排隊。** 同時送 3 個請求，分別等了 4 秒、20 秒、40 秒。多窗格同時用的情境不適合。
- **Cerebras 最快，但 Claude Code 用不了。** 免費版每分鐘只收 3 萬 token，Claude Code 第一個請求就回 429。
- **Cloudflare Workers AI 額度太小。** 免費方案只有少數幾個模型，好一點的要付費方案。

查有哪些模型可用：`magpie providers`，或 `magpie provider openrouter`。

## 三條一定要守的規則

1. **免費模型只用在個人專案。** 免費模型可能保存你送出的內容，或拿去訓練。公司的 repo 一律用主窗格。
2. **不要用 `magpie claude <模型>`，也不要在 Magpie 面板的 Agents 頁按 connect。** 這兩個做法都會改寫 Claude Code 的全域設定，連主窗格一起切走。這就是我寫 `cc-magpie` 的原因：換模型只影響當下那個窗格。
3. **不要讓 Magpie 走 Claude 或 Codex 的訂閱。** 下一節說明。

## 一個撤回的設計：用訂閱當第一順位

2026-11-07 我做過一版「額度用完自動換下一家」的路由群組（routing group，把幾個模型綁成一個名字，Magpie 依規則挑一個回答）。順序是 Claude 訂閱 → Codex 訂閱 → 免費模型 → OpenRouter 餘額。

當天就撤掉了。原因是 Anthropic 已經明文禁止用第三方工具使用 Claude 訂閱，而 Magpie 用訂閱的方式（在背後另外啟動一個 `claude` 程序）正好是被禁止的那種。


> **TODO(Morris)**：補 Anthropic 這條政策的官方出處連結（條款或公告頁）。這是對外部規則的陳述，沒有來源讀者無法查證。


現在的分工很單純：

| 要用的額度 | 怎麼用 |
|---|---|
| Claude 訂閱 | 直接打 `claude` |
| Codex 訂閱 | 在 Claude Code 對話裡交給 Codex（`/codex:rescue`） |
| 免費和付費 API | `cc-magpie` |

我另外加了兩道保險，都實測過，送出請求都會被拒絕：

- `magpie accounts switch-only claude on`：Magpie 拒絕用 Claude 帳號回答任何請求。
- `magpie provider rm codex`：Magpie 不再認得 Codex 的模型。

另外，就算路由合法，我也沒有全域開啟 Magpie。原因是經過 Magpie 時，claude.ai 的 connectors（Slack、Gmail、Figma 等）會被停用。

## 每個窗格分開記帳

平行跑最怕的是不知道哪個窗格花了錢。我的做法：

- 每次執行 `cc-magpie`，它會向 Magpie 申請一把專屬的 gateway key（agent 呼叫 Magpie 用的通行碼），有效 7 天。窗格啟動時會印出標籤，格式是「repo 名稱-月日-時分」。
- 在 Magpie 面板的 **Usage → Overview → Gateway keys** 可以看到每個窗格一列，有請求數、token 數和花費。
- key 過期或刪掉之後，帳目還在。我刪過測試用的 key，紀錄仍然保留。
- 實際花了多少以 OpenRouter 的 Activity 頁為準。Magpie 顯示的金額是估算，免費模型一律顯示 $0。


> **TODO(Morris)**：放一張 Gateway keys 頁的截圖（遮掉 key 尾碼），讓讀者看到「一個窗格一列」長什麼樣子。


## key 放哪裡

API key 的正本只放在我的密碼管理工具（Bitwarden Secrets Manager）。Magpie 不支援從環境變數讀 key，所以它的設定資料夾裡會有一份明文副本，權限設成 0600。這些都是免費平台的 key，我接受這個風險。換 key 的流程是：存進密碼管理工具 → 用同步腳本寫進 Magpie → `magpie provider test <provider>` 實測。

## 出問題時先看哪裡

- **`cc-magpie` 說 gateway not running**：執行 `magpie tray`。
- **Claude Code 卡住很久**：看 `magpie log -n 30`。出現 `429 ... Tokens per minute`，代表那家平台每分鐘上限太小，換模型。
- **回 402 Insufficient Balance**：那家平台沒錢了。
- **回 403 not available on the Free plan**：選到 Cloudflare 的付費模型，換免費清單裡的。
- **面板 Routing 頁出現紅叉**：代表最近一次經過它的請求失敗，下一次成功就會變回綠點。

## 還沒做的事

我也規劃了主力額度用完時的配置：把模型依品質由高到低排成一個群組，用 `routing=order`，最強的用到見底才換下一個。不用 `rotate` 或 `usage`，是因為它們會讓同一個任務在強弱模型之間跳來跳去，結果不一致。這部分還沒套用，也還沒實測。

Magpie 還有一個意圖路由功能，讓小模型判斷每一輪該送強模型還是便宜模型。這裡我不確定它判斷得準不準，所以先不用。

## 結論

這套做法省的不是單一任務的時間，而是讓我可以同時開更多 agent，又不用為每個 agent 付頂級模型的錢。關鍵只有兩個：換模型只影響單一窗格，以及每個窗格分開記帳。至於哪些工具值得留、哪些試完就丟，我用另一套方法管，寫在 [[Claude Code skill 怎麼評估要不要留？我用實驗看板把 X 書籤變成限時實驗]]。
