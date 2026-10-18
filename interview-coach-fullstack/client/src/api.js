export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      signal: AbortSignal.timeout(75000),
    });
  } catch (error) {
    throw new Error(
      error.name === "TimeoutError" || error.name === "AbortError"
        ? "The request timed out. Please retry."
        : "Cannot connect to Interview Coach. Keep the project terminal open and restart the app if it stopped.",
    );
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}). Check the project terminal.`,
    );
  }
  if (!response.ok)
    throw new Error(data.message || "Request failed. Please retry.");
  return data;
}
export const startInterview = (context) =>
  api("/interviews", { method: "POST", body: JSON.stringify(context) });
export const sendAnswer = (id, body) =>
  api(`/interviews/${id}/answers`, {
    method: "POST",
    body: JSON.stringify(body),
  });
export const syncInterview = (id) => api(`/interviews/${id}`);
export const deleteInterview = (id) =>
  api(`/interviews/${id}`, { method: "DELETE" });

export function uploadResume(file) {
  const body = new FormData();
  body.append("resume", file);
  return api("/resumes/extract", { method: "POST", body });
}
