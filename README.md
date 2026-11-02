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
- 登入／工作室：http://localhost:3000/#login（本機預設管理者 `admin`／`igallery-dev`）

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

## 帳號與權限

| 角色 | 可以做什麼 |
|---|---|
| 訪客 | 從登入頁一鍵進入，有自己的 dashboard 與 profile，只能瀏覽；可以隨時升級成會員（同一個帳號） |
| 會員 | 註冊帳號＋密碼；上傳作品（必須標註是否使用 AI）、編輯、送出審核、對別人的作品按喜歡 |
| 管理者 | 會員的所有功能，加上審核、所有作品排序、展場配置、使用者管理（改角色、重設密碼、刪除） |

第一個管理者由 `ADMIN_USERNAME`／`ADMIN_PASSWORD` 建立，之後可以在「使用者」頁把會員設為管理者。會員忘記密碼時由管理者重設。

作品狀態：草稿 → 送審（審核中）→ 管理者核准（已公開）或退回（附原因，修改後可再送審）。只有已公開的作品會出現在首頁、排行與畫廊。

## API

| 方法 | 路徑 | 權限 | 說明 |
|---|---|---|---|
| GET | `/api/artworks`、`/api/artworks/:id` | 公開 | 已公開的作品（含上傳者、AI 標註、喜歡數） |
| POST／DELETE | `/api/artworks/:id/like` | 會員 | 喜歡／取消喜歡（不能對自己的作品） |
| GET | `/api/artists/ranking` | 公開 | 依作品收到的喜歡數排名 |
| GET | `/api/exhibition` | 公開 | 3D 畫廊用：已公開作品與展位配置 |
| POST | `/api/auth/register`、`login`、`guest`、`logout` | 公開 | 註冊、登入、訪客進入、登出（HttpOnly cookie） |
| GET | `/api/auth/me` | 登入 | 目前的使用者 |
| POST | `/api/auth/upgrade` | 訪客 | 升級成會員 |
| PUT | `/api/auth/password` | 會員 | 變更密碼 |
| PATCH | `/api/me/profile` | 登入 | 顯示名稱、自我介紹 |
| GET | `/api/me/dashboard` | 登入 | 自己的作品統計 |
| GET | `/api/me/notifications`、`/api/me/notifications/unread` | 登入 | 通知列表／未讀數（前端每分鐘輪詢） |
| POST | `/api/me/notifications/read` | 登入 | 標為已讀（帶 `ids` 只標指定的，不帶就全部） |
| GET／POST | `/api/me/artworks` | 會員 | 自己的作品／新增作品 |
| GET／PATCH／DELETE | `/api/me/artworks/:id` | 擁有者或管理者 | 讀取／修改／刪除 |
| POST | `/api/me/artworks/:id/submit`、`withdraw` | 擁有者 | 送審／撤回（管理者送出即公開） |
| POST | `/api/uploads/blob`、`/api/uploads/local` | 會員 | 圖片上傳授權（正式環境）／本機上傳 |
| GET／PATCH／DELETE | `/api/admin/artworks[/:id]` | 管理者 | 所有作品 |
| POST | `/api/admin/artworks/:id/approve`、`reject` | 管理者 | 核准／退回 |
| PUT | `/api/admin/artworks/order` | 管理者 | 排序 |
| GET／PUT | `/api/admin/exhibition` | 管理者 | 展位配置 |
| GET／PATCH／DELETE | `/api/admin/users[/:id]`、POST `/:id/password` | 管理者 | 使用者管理 |

所有修改請求都必須是 JSON 並帶 `x-igallery: 1` 標頭（防 CSRF）。資料庫結構變更寫在 `api/_lib/db.ts` 的 `MIGRATIONS`，部署後第一次呼叫 API 時自動套用。欄位長度等限制放在 `src/shared/artworkLimits.json`，前端表單和後端驗證共用同一份。
