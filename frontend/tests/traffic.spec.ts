import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

test.describe("Traffic Analysis Page", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/traffic");
  });

  test("renders page and KPI cards", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Traffic Analysis", exact: true })
    ).toBeVisible();
    for (const label of [
      "Traffic Volume",
      "Packets/sec",
      "Bytes/sec",
      "Unique Sources",
      "Unique Destinations",
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("shows chart panels and top talkers", async ({ page }) => {
    await expect(page.getByText("Protocol Distribution", { exact: true })).toBeVisible();
    await expect(page.getByText("Top Talkers", { exact: true })).toBeVisible();
    await expect(page.getByText("Inbound vs Outbound", { exact: true })).toBeVisible();
    await expect(page.getByText("10.24.18.42", { exact: true }).first()).toBeVisible();
  });

  test("shows protocol legend values", async ({ page }) => {
    await expect(page.getByText("TCP", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("UDP", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("HTTPS", { exact: true }).first()).toBeVisible();
  });
});
