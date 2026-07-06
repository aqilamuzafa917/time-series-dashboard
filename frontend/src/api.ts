const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Perform a GET request to the FastAPI backend API.
 * Handles arrays by appending the query parameter multiple times (e.g. ?source_id=s1&source_id=s2)
 * as expected by FastAPI's Query(default=[]) parameter parser.
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | string[] | undefined>
): Promise<T> {
  // Ensure the path starts with a slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      
      if (Array.isArray(val)) {
        val.forEach((v) => {
          url.searchParams.append(key, v);
        });
      } else {
        url.searchParams.append(key, val);
      }
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorMsg = errBody.detail;
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${BASE_URL}${cleanPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        errorMsg = typeof errBody.detail === "string" ? errBody.detail : JSON.stringify(errBody.detail);
      }
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${BASE_URL}${cleanPath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        errorMsg = typeof errBody.detail === "string" ? errBody.detail : JSON.stringify(errBody.detail);
      }
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json() as Promise<T>;
}
