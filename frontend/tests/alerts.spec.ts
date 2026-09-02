import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

test.describe("Security Alerts Page", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/alerts");
  });

  test("renders page header and search input", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Security Alerts", exact: true })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Search alerts")
    ).toBeVisible();
  });

  test("shows status filter tabs", async ({ page }) => {
    for (const s of ["New", "Investigating", "Resolved", "Ignored"]) {
      await expect(page.getByRole("button", { name: s, exact: true })).toBeVisible();
    }
  });

  test("displays alert rows with threat names and severities", async ({ page }) => {
    await expect(page.getByText("C2 Beaconing", { exact: true })).toBeVisible();
    await expect(page.getByText("Port Scan Anomaly", { exact: true })).toBeVisible();
    await expect(page.getByText("critical", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("high", { exact: true }).first()).toBeVisible();
  });

  test("filtering changes the alert list", async ({ page }) => {
    await page.getByText("Ignored", { exact: true }).click();
    // only ignored alerts remain (Traffic Burst)
    await expect(page.getByText("Traffic Burst", { exact: true })).toBeVisible();
    await expect(page.getByText("C2 Beaconing", { exact: true })).toBeHidden();
  });
});
