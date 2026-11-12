import type {ZodType} from "zod";
import {isMessageKey, languageOf, translate, zodErrorMap, type MessageKey} from "./i18n";

// a field with a `field.<name>` message has that name put in front of its validation message
const fieldKey = (field: string): MessageKey | null => {
  const key = `field.${field}`;
  return isMessageKey(key) ? key : null;
};

// Parses and validates a JSON body; returns {data} or {error} with a readable message
// in the request's language.
export const parse = async <T>(request: Request, schema: ZodType<T>): Promise<{data: T; error?: undefined} | {data?: undefined; error: string}> => {
  const lang = languageOf(request.headers);
  // a cross-site form can only send form or text bodies, never application/json
  if (!request.headers.get("content-type")?.includes("application/json")) return {error: translate(lang, "request.notJson")};
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return {error: translate(lang, "request.invalidJson")};
  }
  const result = schema.safeParse(body, {error: zodErrorMap(lang)});
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      // custom messages in schemas.ts are message keys; zod's own are already localized
      const message = isMessageKey(issue.message) ? translate(lang, issue.message) : issue.message;
      const field = fieldKey(String(issue.path[0]));
      return field ? translate(lang, "validation.fieldMessage", {field: translate(lang, field), message}) : message;
    });
    return {error: [...new Set(messages)].join(translate(lang, "validation.separator"))};
  }
  return {data: result.data};
};
