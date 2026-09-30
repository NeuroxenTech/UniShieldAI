import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

const routes = [
  { label: "SOC Overview", path: "/", heading: "Security Overview" },
  { label: "Alerts", path: "/alerts", heading: "Security Alerts" },
  { label: "Live Traffic", path: "/traffic", heading: "Live Traffic Flows" },
  { label: "Packet Inspector", path: "/packets", heading: "Packet Inspector" },
  { label: "Detection Engine", path: "/engine", heading: "Detection Engine" },
];

test.describe("Sidebar Navigation", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test("all five nav destinations render their page headings", async ({ page }) => {
    for (const r of routes) {
      await page.goto(r.path);
      await expect(
        page.getByRole("heading", { name: r.heading, exact: true })
      ).toBeVisible();
    }
  });

  test("sidebar exposes tooltip labels for each nav item", async ({ page }) => {
    await page.goto("/");
    for (const r of routes) {
      const tip = page.getByRole("tooltip", { name: r.label, exact: true });
      await expect(tip).toBeAttached();
    }
  });
});