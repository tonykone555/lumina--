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
