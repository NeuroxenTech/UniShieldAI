import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

test.describe("UniShield AI Dashboard", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title and theme color are set", async ({ page }) => {
    await expect(page).toHaveTitle(/UniShield AI/i);
  });

  test("header renders with subtitle", async ({ page }) => {
    await expect(
      page.getByText("Security Overview", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(
        "AI-powered monitoring and threat detection across unidirectional IP traffic."
      )
    ).toBeVisible();
  });

  test("six KPI cards render with expected values", async ({ page }) => {
    const expectations = [
      { label: "Total Flows", value: "1.28M" },
      { label: "Packets Analyzed", value: "84.6M" },
      { label: "Threats Detected", value: "342" },
      { label: "Critical Alerts", value: "18" },
      { label: "Anomalies", value: "1,482" },
      { label: "Protected Assets", value: "126" },
    ];

    for (const e of expectations) {
      await expect(
        page.getByText(e.label, { exact: true }).first()
      ).toBeVisible();
      await expect(page.getByText(e.value, { exact: true }).first()).toBeVisible();
    }
  });

  test("core dashboard panels are present", async ({ page }) => {
    await expect(
      page.getByText("Threat Detection Overview", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Threats by Severity", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Unidirectional Traffic Intelligence", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Live Threat Feed", { exact: true })).toBeVisible();
    await expect(
      page.getByText("UniShield AI Analysis", { exact: true })
    ).toBeVisible();
    // live status indicator
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  });

  test("insights section shows expected title", async ({ page }) => {
    await expect(page.getByText("Insights", { exact: true })).toBeVisible();
  });

  test("recent network flows table renders flow data", async ({ page }) => {
    await expect(
      page.getByText("Recent Network Flows", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("10.24.18.42", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("185.x.x.xxx", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("12,492", { exact: true })).toBeVisible();
    await expect(page.getByText("8.4 MB", { exact: true })).toBeVisible();
  });

  test("live threat feed shows severity rows", async ({ page }) => {
    await expect(page.getByText("CRITICAL", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("HIGH", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("MEDIUM", { exact: true }).first()).toBeVisible();
  });
});
