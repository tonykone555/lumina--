const THREADS_API_BASE = "https://graph.threads.net/v1.0";

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
    throw new Error(
      `THREADS_API_${res.status}:${data?.error?.message || raw || "Unknown error"}`
    );
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
