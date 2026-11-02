# IGallery

把 Instagram 創作者的作品集中展示的線上畫廊，包含一座可以走進去逛的 3D 展廳。

| 資料夾 | 內容 | 技術 |
|---|---|---|
| [`frontend/`](frontend) | 網站與 3D 畫廊 | React 19、Three.js（React Three Fiber）、MUI |
| [`backend/`](backend) | Instagram 授權與作品資料 API | ASP.NET Core 7、Entity Framework、SQL Server |

## 前端

```bash
cd frontend
npm install
npm start          # http://localhost:3000/IGallery
npm run optimize:artworks   # 新增 public/artworks 的圖片後，產生預覽小圖
```

3D 畫廊在 `http://localhost:3000/IGallery#gallery`。功能清單與完成狀態見 [`frontend/TODO.md`](frontend/TODO.md)。

## 後端

```bash
cd backend/WebApplication1
dotnet run
```

密碼與金鑰不放在 `appsettings.json`，請用環境變數或 [user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) 提供：

| 設定 | 環境變數 |
|---|---|
| Azure 資料庫連線字串 | `ConnectionStrings__AzureConnectionString` |
| 本機資料庫連線字串 | `ConnectionStrings__LocalConnectionString` |
| Instagram App Secret | `Instagram__ClientSecret` |
| 測試用 access token | `Token__access_token` |

本機開發可以這樣設定（只存在你的電腦上）：

```bash
cd backend/WebApplication1
dotnet user-secrets init
dotnet user-secrets set "Instagram:ClientSecret" "<你的 App Secret>"
dotnet user-secrets set "ConnectionStrings:AzureConnectionString" "<連線字串>"
```

部署到 Azure App Service 時，在「設定 → 應用程式設定」加入上面的環境變數。
