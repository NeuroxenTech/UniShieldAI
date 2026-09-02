import { test, expect } from "@playwright/test";
import { attachFullPage } from "./_helpers";

test.describe("SOC Command Center Dashboard", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page title is set", async ({ page }) => {
    await expect(page).toHaveTitle(/UniShield AI/i);
  });

  test("six stat cards render with live values", async ({ page }) => {
    const cards = [
      { label: "Total Users", value: "12,480" },
      { label: "Devices", value: "9,320" },
      { label: "Mailboxes", value: "15,240" },
      { label: "Browsers", value: "12,206" },
      { label: "Cloud Drives", value: "3,840" },
      { label: "Internet Assets", value: "518" },
    ];

    for (const c of cards) {
      await expect(
        page.getByText(c.label, { exact: true }).first()
      ).toBeVisible();
      await expect(page.getByText(c.value, { exact: true })).toBeVisible();
    }
  });

  test("coverage radar panel shows legend and control axes", async ({ page }) => {
    await expect(
      page.getByText("Coverage & Issues by Security Control", { exact: true })
    ).toBeVisible();
    for (const label of ["Uncovered", "Covered", "Issues"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const axis of [
      "Phishing Simulations",
      "Cloud Posture",
      "External Footprint",
      "Dark Web",
      "Cloud Data",
      "Email Protection",
      "Endpoint Security",
      "Secure Browsing",
    ]) {
      await expect(page.getByText(axis, { exact: true })).toBeVisible();
    }
  });

  test("issues by risk panel shows total, meters and customers", async ({ page }) => {
    await expect(page.getByText("Issues By Risk", { exact: true })).toBeVisible();
    await expect(page.getByText("1,240", { exact: true })).toBeVisible();
    for (const level of ["Critical", "High", "Medium", "Low"]) {
      await expect(page.getByText(level, { exact: true })).toBeVisible();
    }
    for (const customer of ["Acme Corp", "Globex", "Initech"]) {
      await expect(page.getByText(customer, { exact: true })).toBeVisible();
    }
  });

  test("insight cards are present", async ({ page }) => {
    await expect(
      page.getByText("New Report Ready", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Security Alert", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Setup Required", { exact: true })
    ).toBeVisible();
  });

  test("chat widget toggles open and shows messages", async ({ page }) => {
    await page.getByRole("button", { name: "Open chat" }).click();
    await expect(
      page.getByText("UniShield Assistant", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(/Acme currently has 42 open issues/)
    ).toBeVisible();
  });
});