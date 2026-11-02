# IGallery

一座可以走進去逛的線上美術館：作品由你在管理頁上傳與編排，訪客可以在首頁瀏覽，或走進 3D 展廳欣賞。

整個專案都在 [`frontend/`](frontend)，部署成同一個 Vercel 專案：

| 位置 | 內容 | 技術 |
|---|---|---|
| `frontend/src/` | 首頁、3D 畫廊（`#gallery`）、管理頁（`#admin`） | React 19、Three.js（React Three Fiber） |
| `frontend/api/` | 後端 API，部署成 Vercel Function | Node.js、TypeScript、Hono |
| 資料庫 | 作品、展位、管理者帳號 | PostgreSQL（正式環境用 Neon） |
| 圖片 | 原圖與預覽圖 | Vercel Blob（瀏覽器直接上傳） |

## 本機開發

不需要任何雲端帳號：資料庫用內嵌的 PGlite，圖片存在 `frontend/.data/`。

```bash
cd frontend
npm install
npm run dev
```

- 網站：http://localhost:3000
- 3D 畫廊：http://localhost:3000/#gallery
- 管理頁：http://localhost:3000/#admin（本機預設帳號 `admin`／`igallery-dev`）

第一次啟動會自動匯入 `public/artworks/` 裡的 7 件範例作品。想重來的話，刪掉 `frontend/.data/` 再啟動即可。

其他指令：

| 指令 | 用途 |
|---|---|
| `npm run typecheck` | 檢查 API 的 TypeScript 型別 |
| `npm run db:seed` | 資料庫是空的時候匯入範例作品（有設定 `DATABASE_URL` 就匯入到 Neon） |
| `npm run build` | 建置正式版前端 |

## 部署到 Vercel

1. 在 Vercel 匯入這個 GitHub repo，**Root Directory 設成 `frontend`**，Framework 會自動偵測為 Create React App。
2. 在專案的 **Storage** 分頁建立兩個資源，Vercel 會自動加入對應的環境變數：
   - **Neon**（Postgres）→ `DATABASE_URL`
   - **Blob** → `BLOB_READ_WRITE_TOKEN`。建立時選擇 **Public** 存取，3D 畫廊需要直接讀取圖片。
3. 在 **Settings → Environment Variables** 加入第一個管理者帳號：
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`（請用夠長的密碼）

   資料庫裡還沒有任何管理者時，第一次呼叫 API 就會用這組帳密建立帳號。
4. 部署。資料表會在第一次呼叫 API 時自動建立。
5. （選擇性）匯入範例作品：把 Neon 的 `DATABASE_URL` 放進 `frontend/.env.local`，執行 `npm run db:seed`。

完整的環境變數說明見 [`frontend/.env.example`](frontend/.env.example)。

## API

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/artworks` | 已發佈的作品 |
| GET | `/api/artworks/:id` | 單一已發佈作品 |
| GET | `/api/exhibition` | 3D 畫廊用：已發佈作品與展位配置 |
| POST | `/api/auth/login`、`/api/auth/logout` | 登入、登出（HttpOnly cookie） |
| GET | `/api/auth/me` | 目前登入的管理者 |
| GET／POST | `/api/admin/artworks` | 所有作品（含草稿）／新增作品 |
| GET／PATCH／DELETE | `/api/admin/artworks/:id` | 讀取／修改／刪除作品（連同圖片檔） |
| PUT | `/api/admin/artworks/order` | 調整排序 |
| GET／PUT | `/api/admin/exhibition` | 讀取／儲存展位配置 |
| POST | `/api/admin/blob` | 核發 Vercel Blob 的瀏覽器直傳授權 |

管理 API 需要登入，而且所有修改請求都必須帶 `x-igallery: 1` 標頭（防 CSRF）。欄位長度等限制放在 `src/shared/artworkLimits.json`，前端表單和後端驗證共用同一份。
