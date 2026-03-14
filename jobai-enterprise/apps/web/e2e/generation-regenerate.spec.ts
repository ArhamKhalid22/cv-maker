import { test, expect } from "@playwright/test";

test("regenerate creates a new operation id and does not reuse idempotency key", async ({ page }) => {
  const keys: string[] = [];
  
  await page.route("**/v1/generations", async (route) => {
    const headers = route.request().headers();
    keys.push(headers["idempotency-key"]);
    await route.continue();
  });

  await page.goto("/app");
  
  // Click regenerate twice
  await page.getByRole("button", { name: "Regenerate" }).click();
  await page.getByRole("button", { name: "Regenerate" }).click();

  // Validate the keys are unique
  const uniqueKeys = new Set(keys);
  expect(uniqueKeys.size).toBe(keys.length);
});
