/**
 * Safely parses AI-generated JSON which might be wrapped in markdown code blocks.
 */
export function safelyParseJSON<T>(raw: string): T | null {
  if (!raw) return null;
  try {
    // Remove markdown code fences if present
    const cleaned = raw.replace(/^```json\n?|\n?```$/gi, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}
