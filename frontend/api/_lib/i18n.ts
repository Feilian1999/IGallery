import type {Context} from "hono";
import type {ContentfulStatusCode} from "hono/utils/http-status";
import {z} from "zod";
import * as shared from "../../src/shared/languages.json";

// Server-side translations. The app sends `x-lang`; otherwise Accept-Language decides.
// The language list is shared with the app (src/shared/languages.json).

export type Language = "zh-TW" | "en" | "ja";
export const LANGUAGES = shared.languages.map((entry) => entry.id as Language);
export const DEFAULT_LANGUAGE = shared.source as Language;

type Entry = Record<Language, string>;

// Message id -> text per language. `{name}` placeholders are filled from params.
const messages = {
  // --- general -------------------------------------------------------------------
  "server.error": {
    "zh-TW": "伺服器發生錯誤",
    "en": "Something went wrong on the server.",
    "ja": "サーバーでエラーが発生しました。",
  },
  "api.notFound": {
    "zh-TW": "找不到這個 API",
    "en": "This API endpoint doesn't exist.",
    "ja": "この API は見つかりません。",
  },
  "request.notJson": {
    "zh-TW": "請求內容必須是 JSON",
    "en": "The request body must be JSON.",
    "ja": "リクエストの本文は JSON である必要があります。",
  },
  "request.invalidJson": {
    "zh-TW": "請求內容不是有效的 JSON",
    "en": "The request body isn't valid JSON.",
    "ja": "リクエストの本文が有効な JSON ではありません。",
  },

  // --- auth ----------------------------------------------------------------------
  "auth.missingHeader": {
    "zh-TW": "缺少必要的請求標頭",
    "en": "A required request header is missing.",
    "ja": "必要なリクエストヘッダーがありません。",
  },
  "auth.signInFirst": {
    "zh-TW": "請先登入",
    "en": "Please sign in first.",
    "ja": "先にログインしてください。",
  },
  "auth.notSignedIn": {
    "zh-TW": "尚未登入",
    "en": "You're not signed in.",
    "ja": "ログインしていません。",
  },
  "auth.membersOnly": {
    "zh-TW": "訪客無法使用這個功能，請先註冊成為會員",
    "en": "Guests can't use this feature. Please sign up as a member first.",
    "ja": "ゲストはこの機能を利用できません。先に会員登録をしてください。",
  },
  "auth.artistsOnly": {
    "zh-TW": "只有藝術家可以發布作品，請先申請成為藝術家",
    "en": "Only artists can publish artworks. Please apply to become an artist first.",
    "ja": "作品を公開できるのはアーティストのみです。先にアーティスト申請をしてください。",
  },
  "auth.adminsOnly": {
    "zh-TW": "只有管理者可以使用這個功能",
    "en": "Only administrators can use this feature.",
    "ja": "この機能は管理者のみ利用できます。",
  },
  "auth.guestName": {
    "zh-TW": "訪客 {id}",
    "en": "Guest {id}",
    "ja": "ゲスト {id}",
  },
  "auth.usernameTaken": {
    "zh-TW": "這個帳號已經有人使用",
    "en": "This username is already taken.",
    "ja": "このユーザー名はすでに使われています。",
  },
  "auth.wrongCredentials": {
    "zh-TW": "帳號或密碼錯誤",
    "en": "Incorrect username or password.",
    "ja": "ユーザー名またはパスワードが正しくありません。",
  },
  "auth.alreadyMember": {
    "zh-TW": "已經是會員了",
    "en": "You're already a member.",
    "ja": "すでに会員です。",
  },
  "auth.wrongCurrentPassword": {
    "zh-TW": "目前的密碼不正確",
    "en": "Your current password is incorrect.",
    "ja": "現在のパスワードが正しくありません。",
  },

  // --- uploads -------------------------------------------------------------------
  "upload.blobNotConfigured": {
    "zh-TW": "尚未設定 Vercel Blob",
    "en": "Vercel Blob isn't configured.",
    "ja": "Vercel Blob が設定されていません。",
  },
  "upload.artistsOnly": {
    "zh-TW": "只有藝術家可以上傳作品，請先申請成為藝術家",
    "en": "Only artists can upload artworks. Please apply to become an artist first.",
    "ja": "作品をアップロードできるのはアーティストのみです。先にアーティスト申請をしてください。",
  },
  "upload.useBlob": {
    "zh-TW": "正式環境請使用 Vercel Blob 上傳",
    "en": "Please upload through Vercel Blob in production.",
    "ja": "本番環境では Vercel Blob でアップロードしてください。",
  },
  "upload.tooLarge": {
    "zh-TW": "檔案超過 {mb} MB",
    "en": "The file is larger than {mb} MB.",
    "ja": "ファイルが {mb} MB を超えています。",
  },
  "upload.unsupportedType": {
    "zh-TW": "只接受 JPEG、PNG、WebP 圖片",
    "en": "Only JPEG, PNG and WebP images are accepted.",
    "ja": "JPEG、PNG、WebP 形式の画像のみ受け付けています。",
  },
  "file.notFound": {
    "zh-TW": "找不到檔案",
    "en": "File not found.",
    "ja": "ファイルが見つかりません。",
  },

  // --- artworks ------------------------------------------------------------------
  "artwork.notFound": {
    "zh-TW": "找不到這件作品",
    "en": "Artwork not found.",
    "ja": "この作品は見つかりません。",
  },
  "artwork.aiUsageMissing": {
    "zh-TW": "這件作品還沒標註是否使用 AI",
    "en": "This artwork hasn't been labeled for AI use yet.",
    "ja": "この作品はまだ AI 使用の有無が設定されていません。",
  },
  "artwork.submitNeedsAiUsage": {
    "zh-TW": "送出前請先標註這件作品是否使用 AI",
    "en": "Please indicate whether this artwork uses AI before submitting it.",
    "ja": "提出する前に、この作品で AI を使用したかどうかを設定してください。",
  },
  "artwork.submitNeedsTitle": {
    "zh-TW": "送出前請先填寫標題",
    "en": "Please add a title before submitting.",
    "ja": "提出する前にタイトルを入力してください。",
  },
  "artwork.alreadySubmitted": {
    "zh-TW": "這件作品已經送出了",
    "en": "This artwork has already been submitted.",
    "ja": "この作品はすでに提出されています。",
  },
  "artwork.isDraft": {
    "zh-TW": "這件作品目前是草稿",
    "en": "This artwork is currently a draft.",
    "ja": "この作品は現在下書きです。",
  },
  "artwork.cannotLikeOwn": {
    "zh-TW": "不能對自己的作品按喜歡",
    "en": "You can't like your own artwork.",
    "ja": "自分の作品に「いいね」することはできません。",
  },
  "exhibition.publishedOnly": {
    "zh-TW": "只能展出已公開的作品",
    "en": "Only published artworks can be exhibited.",
    "ja": "展示できるのは公開済みの作品のみです。",
  },

  // --- users & applications ------------------------------------------------------
  "user.notFound": {
    "zh-TW": "找不到這個使用者",
    "en": "User not found.",
    "ja": "このユーザーは見つかりません。",
  },
  "user.profileNotFound": {
    "zh-TW": "找不到這位使用者",
    "en": "User not found.",
    "ja": "このユーザーは見つかりません。",
  },
  "user.likesPrivate": {
    "zh-TW": "這位使用者沒有公開收藏",
    "en": "This user's favorites aren't public.",
    "ja": "このユーザーのお気に入りは公開されていません。",
  },
  "user.cannotChangeOwnRole": {
    "zh-TW": "不能變更自己的角色",
    "en": "You can't change your own role.",
    "ja": "自分のロールは変更できません。",
  },
  "user.cannotDeleteSelf": {
    "zh-TW": "不能刪除自己的帳號",
    "en": "You can't delete your own account.",
    "ja": "自分のアカウントは削除できません。",
  },
  "application.notFound": {
    "zh-TW": "找不到這份申請，或已經處理過了",
    "en": "This application doesn't exist or has already been handled.",
    "ja": "この申請は見つからないか、すでに処理済みです。",
  },
  "application.alreadyArtist": {
    "zh-TW": "你已經可以發布作品了",
    "en": "You can already publish artworks.",
    "ja": "すでに作品を公開できます。",
  },
  "application.pending": {
    "zh-TW": "你的申請還在審核中",
    "en": "Your application is still under review.",
    "ja": "申請はまだ審査中です。",
  },

  // --- validation: custom messages used in schemas.ts ----------------------------
  // (no trailing punctuation: these are joined into a list like zod's own messages)
  "validation.foreignImageUrl": {
    "zh-TW": "圖片網址不屬於本站的儲存空間",
    "en": "The image URL isn't from this site's storage",
    "ja": "画像の URL が本サイトのストレージのものではありません",
  },
  "validation.username": {
    "zh-TW": "帳號只能用 3–24 個英文小寫、數字、底線或連字號",
    "en": "Usernames must be 3–24 lowercase letters, numbers, underscores or hyphens",
    "ja": "ユーザー名は半角英小文字・数字・アンダースコア・ハイフンの 3～24 文字で入力してください",
  },
  "validation.passwordTooShort": {
    "zh-TW": "密碼至少要 8 個字元",
    "en": "Passwords must be at least 8 characters",
    "ja": "パスワードは 8 文字以上で入力してください",
  },
  "validation.planTitleRequired": {
    "zh-TW": "請填寫方案名稱",
    "en": "Please enter a plan name",
    "ja": "プラン名を入力してください",
  },
  "validation.displayNameRequired": {
    "zh-TW": "請填寫顯示名稱",
    "en": "Please enter a display name",
    "ja": "表示名を入力してください",
  },
  "validation.aiUsageRequired": {
    "zh-TW": "請標註這件作品是否使用 AI",
    "en": "Please indicate whether this artwork uses AI",
    "ja": "この作品で AI を使用したかどうかを設定してください",
  },
  "validation.reasonRequired": {
    "zh-TW": "請填寫退回原因",
    "en": "Please enter a reason for sending it back",
    "ja": "差し戻しの理由を入力してください",
  },
  "validation.unknownSlot": {
    "zh-TW": "未知的展位",
    "en": "Unknown exhibition slot",
    "ja": "不明な展示枠です",
  },
  "validation.applicationMessageRequired": {
    "zh-TW": "請介紹一下自己和你的創作",
    "en": "Please tell us about yourself and your work",
    "ja": "ご自身と作品について紹介してください",
  },

  // --- validation: field names and list formatting (http.ts) ---------------------
  "validation.fieldMessage": {"zh-TW": "{field}：{message}", "en": "{field}: {message}", "ja": "{field}：{message}"},
  "validation.separator": {"zh-TW": "；", "en": "; ", "ja": "。"},
  "field.title": {"zh-TW": "標題", "en": "Title", "ja": "タイトル"},
  "field.author": {"zh-TW": "作者", "en": "Author", "ja": "作者"},
  "field.character": {"zh-TW": "角色", "en": "Character", "ja": "キャラクター"},
  "field.description": {"zh-TW": "描述", "en": "Description", "ja": "説明"},
  "field.story": {"zh-TW": "作品故事", "en": "Story", "ja": "作品のストーリー"},
  "field.hotspots": {"zh-TW": "細節熱點", "en": "Detail hotspots", "ja": "詳細ホットスポット"},
  "field.imageUrl": {"zh-TW": "圖片", "en": "Image", "ja": "画像"},
  "field.previewUrl": {"zh-TW": "預覽圖", "en": "Preview image", "ja": "プレビュー画像"},
  "field.username": {"zh-TW": "帳號", "en": "Username", "ja": "ユーザー名"},
  "field.password": {"zh-TW": "密碼", "en": "Password", "ja": "パスワード"},
  "field.displayName": {"zh-TW": "顯示名稱", "en": "Display name", "ja": "表示名"},
  "field.bio": {"zh-TW": "自我介紹", "en": "Bio", "ja": "自己紹介"},
  "field.commission": {"zh-TW": "約稿設定", "en": "Commission settings", "ja": "依頼受付の設定"},
  "field.likesPublic": {"zh-TW": "收藏公開設定", "en": "Favorites visibility", "ja": "お気に入りの公開設定"},
  "field.aiUsage": {"zh-TW": "AI 使用標註", "en": "AI usage label", "ja": "AI 使用の表示"},
  "field.next": {"zh-TW": "新密碼", "en": "New password", "ja": "新しいパスワード"},
  "field.reason": {"zh-TW": "退回原因", "en": "Reason", "ja": "差し戻しの理由"},
} satisfies Record<string, Entry>;

export type MessageKey = keyof typeof messages;
export type Params = Record<string, string | number>;

export const isMessageKey = (value: string): value is MessageKey => Object.hasOwn(messages, value);

const isLanguage = (value: string): value is Language => (LANGUAGES as readonly string[]).includes(value);

// Maps a language tag ("ja-JP", "zh-Hant", "en-US") to a supported language.
const match = (tag: string): Language | null => {
  const lower = tag.trim().toLowerCase();
  const found = shared.languages.find((entry) => lower.startsWith(entry.prefix));
  return found ? found.id as Language : null;
};

// x-lang if supported, else the best Accept-Language match. A browser asking only
// for other languages gets English, like the app; a request naming no language
// at all gets Traditional Chinese.
export const languageOf = (headers: Headers): Language => {
  const explicit = headers.get("x-lang")?.trim();
  if (explicit && isLanguage(explicit)) return explicit;
  const accepted = headers.get("accept-language") || "";
  const ranked = accepted.split(",")
      .map((part) => {
        const [tag, ...rest] = part.split(";");
        const q = rest.map((p) => p.trim()).find((p) => p.startsWith("q="));
        return {tag, q: q ? Number(q.slice(2)) || 0 : 1};
      })
      .filter((entry) => entry.q > 0)
      .sort((a, b) => b.q - a.q);
  for (const {tag} of ranked) {
    const language = match(tag);
    if (language) return language;
  }
  return accepted.trim() && accepted.trim() !== "*/*" ? shared.unmatched as Language : DEFAULT_LANGUAGE;
};

export const language = (c: Context): Language => languageOf(c.req.raw.headers);

// Looks up a message in a given language and fills in {params}.
export const translate = (lang: Language, key: MessageKey, params?: Params): string => {
  const text: string = messages[key][lang];
  return params ? text.replace(/\{(\w+)\}/g, (whole, name) => name in params ? String(params[name]) : whole) : text;
};

// A message in the request's language.
export const t = (c: Context, key: MessageKey, params?: Params) => translate(language(c), key, params);

// Responds with `{error}` in the request's language.
export const fail = (c: Context, status: ContentfulStatusCode, key: MessageKey, params?: Params) =>
  c.json({error: t(c, key, params)}, status);

// zod's built-in messages for each language, passed per parse (see http.ts)
const zodErrorMaps: Record<Language, z.core.$ZodErrorMap> = {
  "zh-TW": z.locales.zhTW().localeError,
  "en": z.locales.en().localeError,
  "ja": z.locales.ja().localeError,
};

export const zodErrorMap = (lang: Language) => zodErrorMaps[lang];
