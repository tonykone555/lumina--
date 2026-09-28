type JevQuestion = Record<string, unknown>;

type JevRequest = {
  state: string | Record<string, unknown>;
  questions: Record<string, JevQuestion>;
  model?: string;
};

const TYPESAFE_API = "https://api.typesafe.ai";

export function jevConfigured() {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

async function jevFetch(path: string, init?: RequestInit) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error("TYPESAFE_API_KEY_MISSING");
  const response = await fetch(`${TYPESAFE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`TYPESAFE_${response.status}:${detail.slice(0, 300)}`);
  }
  return response.json();
}

export async function getJevModels() {
  return jevFetch("/v1/models", { method: "GET" });
}

export async function askJev(input: JevRequest) {
  return jevFetch("/v1/systemone", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
