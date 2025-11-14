export const API_BASE_URL = process.env.API_BASE_URL ?? "http://10.0.2.2:3000";
// For Android emulator use 10.0.2.2 -> maps to host localhost
// On physical device set this to your machine IP or your deployed server URL.

export async function generateFromGroq(message: string) {
  const url = `${API_BASE_URL}/api/groq`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server error ${res.status}: ${text}`);
  }
  return res.json(); // { content, raw }
}
