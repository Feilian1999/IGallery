// Small fetch wrapper for the admin API: JSON in and out, session cookie, and
// the header the server requires on every change (CSRF protection).
export const CSRF_HEADERS = {"x-igallery": "1"};

/** An API error carrying the server's message and HTTP status. */
export class ApiError extends Error {
  /**
   * @param {string} message message to show the user
   * @param {number} status HTTP status code
   */
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const api = async (path, {method = "GET", body} = {}) => {
  const headers = method === "GET" ? {} : {...CSRF_HEADERS};
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || `請求失敗（${response.status}）`, response.status);
  return data;
};
