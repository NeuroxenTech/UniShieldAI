import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

const routes = [
  { label: "Dashboard", path: "/", marker: "Total Users" },
  { label: "Threat Detection", path: "/detection", heading: "Threat Detection" },
  { label: "Traffic Analysis", path: "/traffic", heading: "Traffic Analysis" },
  { label: "Alerts", path: "/alerts", heading: "Security Alerts" },
  { label: "Network Flows", path: "/network", heading: "Network Flows" },
  { label: "AI Intelligence", path: "/ai", heading: "AI Security Intelligence" },
  { label: "Reports", path: "/reports", heading: "Security Reports" },
  { label: "Settings", path: "/settings", heading: "Settings" },
];

test.describe("Sidebar Navigation", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });
  test("all eight nav destinations render their page content", async ({ page }) => {
    for (const r of routes) {
      await page.goto(r.path);
      if (r.heading) {
        await expect(
          page.getByRole("heading", { name: r.heading, exact: true })
        ).toBeVisible();
      } else {
        await expect(
          page.getByText(r.marker, { exact: true }).first()
        ).toBeVisible();
      }
    }
  });

  test("sidebar exposes tooltip labels for each item", async ({ page }) => {
    await page.goto("/");
    for (const r of routes) {
      const tip = page.getByRole("tooltip", { name: r.label, exact: true });
      await expect(tip).toBeAttached();
    }
  });
});