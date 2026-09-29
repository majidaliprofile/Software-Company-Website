import { test, expect } from "@playwright/test";
test("landing page identifies the product", async ({page})=>{await page.goto("/");await expect(page.getByText("AS Code Assess").first()).toBeVisible();await expect(page.getByText("Secure online assessments")).toBeVisible();});
