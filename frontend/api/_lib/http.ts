import type {ZodType} from "zod";

const FIELD_NAMES: Record<string, string> = {
  title: "標題", author: "作者", character: "角色", description: "描述", story: "作品故事",
  hotspots: "細節熱點", imageUrl: "圖片", previewUrl: "預覽圖", username: "帳號", password: "密碼",
  displayName: "顯示名稱", bio: "自我介紹", aiUsage: "AI 使用標註", next: "新密碼", reason: "退回原因",
};

// Parses and validates a JSON body; returns {data} or {error} with a readable message.
export const parse = async <T>(request: Request, schema: ZodType<T>): Promise<{data: T; error?: undefined} | {data?: undefined; error: string}> => {
  // a cross-site form can only send form or text bodies, never application/json
  if (!request.headers.get("content-type")?.includes("application/json")) return {error: "請求內容必須是 JSON"};
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return {error: "請求內容不是有效的 JSON"};
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const field = FIELD_NAMES[String(issue.path[0])];
      return field ? `${field}：${issue.message}` : issue.message;
    });
    return {error: [...new Set(messages)].join("；")};
  }
  return {data: result.data};
};
