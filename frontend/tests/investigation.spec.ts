import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

test.describe("Threat Investigation Flow", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/investigation/THR-2026-001842");
  });

  test("renders investigation workspace with threat id and severity", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Threat Investigation", exact: true })
    ).toBeVisible();
    await expect(page.getByText("THR-2026-001842", { exact: true })).toBeVisible();
    await expect(page.getByText("CRITICAL", { exact: true })).toBeVisible();
  });

  test("shows the three-column structure", async ({ page }) => {
    await expect(page.getByText("Threat Details", { exact: true })).toBeVisible();
    await expect(page.getByText("Traffic Timeline", { exact: true })).toBeVisible();
    await expect(page.getByText("UniShield AI Analysis", { exact: true })).toBeVisible();
  });

  test("threat details contain C2 beaconing metadata", async ({ page }) => {
    await expect(page.getByText("C2 Beaconing", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("10.24.18.42", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("185.x.x.xxx", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("HTTPS", { exact: true }).first()).toBeVisible();
  });

  test("AI analysis panel shows confidence, risk, explanation and actions", async ({ page }) => {
    await expect(page.getByText("Confidence", { exact: true })).toBeVisible();
    await expect(page.getByText("97.4%", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Explanation", { exact: true })).toBeVisible();
    await expect(page.getByText("Recommended Actions", { exact: true })).toBeVisible();
  });
});
