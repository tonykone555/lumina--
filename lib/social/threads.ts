const THREADS_API_BASE = "https://graph.threads.net/v1.0";

type ThreadsApiErrorDetails = {
  status: number;
  message: string;
  code?: string | number;
  errorSubcode?: string | number;
  type?: string;
};

export class ThreadsApiError extends Error {
  readonly status: number;
  readonly metaMessage: string;
  readonly code?: string | number;
  readonly errorSubcode?: string | number;
  readonly apiType?: string;

  constructor(details: ThreadsApiErrorDetails) {
    super(`THREADS_API_${details.status}:${details.message}`);
    this.name = "ThreadsApiError";
    this.status = details.status;
    this.metaMessage = details.message;
    this.code = details.code;
    this.errorSubcode = details.errorSubcode;
    this.apiType = details.type;
  }
}

function redactThreadsSecrets(value: string) {
  let safe = value
    .replace(/(access[_-]?token\s*[=:]\s*)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/(bearer\s+)[a-z0-9._~-]+/gi, "$1[REDACTED]");
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (accessToken) safe = safe.split(accessToken).join("[REDACTED]");
  return safe.slice(0, 500);
}

function scalar(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function parseThreadsApiError(status: number, data: any): ThreadsApiErrorDetails {
  const nested = data?.error && typeof data.error === "object" ? data.error : null;
  const first = Array.isArray(data?.errors) && data.errors[0] && typeof data.errors[0] === "object"
    ? data.errors[0]
    : null;
  const source = nested || first || data || {};
  const rawMessage = [
    source?.message,
    source?.error_user_msg,
    source?.error_message,
    data?.message,
    data?.error_description,
    typeof data?.error === "string" ? data.error : undefined,
  ].find((value) => typeof value === "string" && value.trim());

  return {
    status,
    message: redactThreadsSecrets(
      typeof rawMessage === "string" && rawMessage.trim()
        ? rawMessage.trim()
        : `Meta Threads API request failed (${status})`
    ),
    code: scalar(source?.code ?? data?.code),
    errorSubcode: scalar(source?.error_subcode ?? data?.error_subcode),
    type: typeof (source?.type ?? data?.type) === "string"
      ? redactThreadsSecrets(String(source?.type ?? data?.type))
      : undefined,
  };
}

export function publicThreadsApiError(error: unknown) {
  if (!(error instanceof ThreadsApiError)) return null;
  return {
    message: error.metaMessage,
    status: error.status,
    code: error.code,
    error_subcode: error.errorSubcode,
    type: error.apiType,
  };
}

function token() {
  const value = process.env.THREADS_ACCESS_TOKEN;
  if (!value) throw new Error("THREADS_ACCESS_TOKEN_NOT_CONFIGURED");
  return value;
}

async function threadsRequest(path: string, init: RequestInit = {}) {
  const url = new URL(path, THREADS_API_BASE + "/");
  const accessToken = token();

  if ((init.method || "GET").toUpperCase() === "GET") {
    url.searchParams.set("access_token", accessToken);
  }

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    const details = parseThreadsApiError(res.status, data);
    console.error("Meta Threads API request failed", {
      path: url.pathname,
      status: details.status,
      message: details.message,
      code: details.code,
      error_subcode: details.errorSubcode,
      type: details.type,
    });
    throw new ThreadsApiError(details);
  }
  return data;
}

function form(params: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    body.set(key, String(value));
  }
  body.set("access_token", token());
  return body;
}

async function publishContainer(creationId: string) {
  return threadsRequest("me/threads_publish", {
    method: "POST",
    body: form({ creation_id: creationId }),
  });
}

export async function getThreadsProfile() {
  return threadsRequest(
    "me?fields=id,username,name,threads_profile_picture_url,threads_biography"
  );
}

export async function listRecentThreads(limit = 10) {
  const safeLimit = Math.max(1, Math.min(25, limit));
  return threadsRequest(
    `me/threads?fields=id,text,timestamp,permalink,media_type,media_url,shortcode,username&limit=${safeLimit}`
  );
}

export async function publishTextThread(text: string, replyToId?: string) {
  const created = await threadsRequest("me/threads", {
    method: "POST",
    body: form({
      media_type: "TEXT",
      text,
      reply_to_id: replyToId,
    }),
  });
  const creationId = created?.id;
  if (!creationId) throw new Error("THREADS_CREATE_NO_CONTAINER_ID");
  const published = await publishContainer(creationId);
  return { created, published };
}

export async function publishImageThread(input: {
  text?: string;
  imageUrl: string;
  replyToId?: string;
}) {
  const created = await threadsRequest("me/threads", {
    method: "POST",
    body: form({
      media_type: "IMAGE",
      image_url: input.imageUrl,
      text: input.text || "",
      reply_to_id: input.replyToId,
    }),
  });
  const creationId = created?.id;
  if (!creationId) throw new Error("THREADS_CREATE_NO_CONTAINER_ID");
  const published = await publishContainer(creationId);
  return { created, published };
}

export async function listThreadReplies(threadId: string, limit = 25) {
  const safeLimit = Math.max(1, Math.min(50, limit));
  return threadsRequest(
    `${encodeURIComponent(threadId)}/replies?fields=id,text,username,timestamp,permalink,media_type,media_url&limit=${safeLimit}`
  );
}

export async function hideThreadReply(replyId: string, hide = true) {
  return threadsRequest(`${encodeURIComponent(replyId)}/manage_reply`, {
    method: "POST",
    body: form({ hide }),
  });
}


const THREAD_FIELDS =
  "id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,thumbnail_url,is_quote_post,has_replies,alt_text,link_attachment_url,topic_tag,is_verified,profile_picture_url";

async function waitForContainer(containerId: string, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await threadsRequest(
      `${encodeURIComponent(containerId)}?fields=id,status,error_message`
    );
    if (status?.status === "FINISHED" || status?.status === "PUBLISHED") return status;
    if (status?.status === "ERROR" || status?.status === "EXPIRED") {
      throw new Error(
        `THREADS_CONTAINER_${status.status}:${status?.error_message || "Container processing failed"}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("THREADS_CONTAINER_TIMEOUT");
}

export async function publishVideoThread(input: {
  videoUrl: string;
  text?: string;
  altText?: string;
  replyToId?: string;
}) {
  const created = await threadsRequest("me/threads", {
    method: "POST",
    body: form({
      media_type: "VIDEO",
      video_url: input.videoUrl,
      text: input.text || "",
      alt_text: input.altText || "",
      reply_to_id: input.replyToId,
    }),
  });
  const creationId = created?.id;
  if (!creationId) throw new Error("THREADS_CREATE_NO_CONTAINER_ID");
  const status = await waitForContainer(creationId);
  const published = await publishContainer(creationId);
  return { created, status, published };
}

export async function searchPublicThreads(input: {
  query: string;
  searchType?: "TOP" | "RECENT";
  limit?: number;
}) {
  const q = input.query.trim();
  if (!q) throw new Error("THREADS_SEARCH_QUERY_REQUIRED");
  const safeLimit = Math.max(1, Math.min(50, input.limit || 25));
  const params = new URLSearchParams({
    q,
    search_type: input.searchType || "TOP",
    fields: THREAD_FIELDS,
    limit: String(safeLimit),
  });
  return threadsRequest(`keyword_search?${params.toString()}`);
}

export async function listThreadMentions(limit = 25) {
  const safeLimit = Math.max(1, Math.min(50, limit));
  const params = new URLSearchParams({
    fields: THREAD_FIELDS,
    limit: String(safeLimit),
  });
  return threadsRequest(`me/mentions?${params.toString()}`);
}
