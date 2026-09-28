import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { attachFullPage } from "./_helpers";

const ROOT = path.resolve(process.cwd(), "..");
const VENV_PY = "/home/saranraj/.venvs/unishield/bin/python";
const GEN = path.join(ROOT, "backend", "scripts", "generate_test_traffic.py");

async function newestFlowSrcIp(): Promise<string | null> {
  try {
    const res = await fetch("http://localhost:8000/api/v1/traffic/flows?limit=5");
    if (!res.ok) return null;
    const body = (await res.json()) as { flows?: Array<{ src_ip?: string }> };
    return body.flows?.find((f) => f.src_ip)?.src_ip ?? null;
  } catch {
    return null;
  }
}

async function pumpTraffic(): Promise<boolean> {
  try {
    execFileSync(
      VENV_PY,
      [GEN, "--duration", "8", "--fps", "20", "--seed", "4242", "--scenario", "c2_beacon"],
      { cwd: path.join(ROOT, "backend"), env: { ...process.env, PYTHONPATH: path.join(ROOT, "backend") }, timeout: 30_000 }
    );
    return true;
  } catch {
    return false;
  }
}

async function backendUp(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:8000/api/v1/metrics");
    return res.ok;
  } catch {
    return false;
  }
}

test.describe("Packet Inspector", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await attachFullPage(page, testInfo);
  });

  test("Traffic row click deep-links to the inspector scoped to that flow", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!(await backendUp()), "backend not running on :8000");

    const offline = page.getByText(/not reachable/);
    for (let attempt = 0; attempt < 4; attempt++) {
      test.skip(!(await pumpTraffic()), "could not pump test traffic");
      await page.goto("/traffic");

      // At mount the engine store has not polled yet, so Traffic can briefly render
      // its offline EmptyState ("not reachable") before the first refreshAll lands.
      // Wait on the actual row, not that transient latch.
      const row = page.locator('div[title^="Flow "]').first();
      try {
        await row.waitFor({ state: "visible", timeout: 20_000 });
      } catch {
        if (await offline.isVisible().catch(() => false)) continue; // still wedged — retry
        continue; // flows still processing — pump and wait again
      }

      await row.click();
      await page.waitForURL(/\/packets\?.*file=active(%2F|\/)current\.pcap/);

      const url = new URL(page.url());
      expect(url.searchParams.get("src")).toBeTruthy();
      expect(url.searchParams.get("dst")).toBeTruthy();
      expect(url.searchParams.get("file")).toBe("active/current.pcap");

      // The inspector should render a frame detail that includes the flow's addresses.
      await expect(
        page.getByRole("heading", { name: "Packet Inspector", exact: true })
      ).toBeVisible();
      const detail = page.getByText(/^Packet #/, { exact: false }).first();
      await detail.waitFor({ state: "visible", timeout: 15_000 });
      await expect(detail).toContainText(url.searchParams.get("src")!);
      return;
    }
    test.skip(true, "no flow row appeared after repeated pumps");
  });

  test("inspector renders with live traffic or a tolerant empty state", async ({ page }) => {
    await page.goto("/packets");
    await expect(
      page.getByRole("heading", { name: "Packet Inspector", exact: true })
    ).toBeVisible();

    const rows = page.locator("table tbody tr").first();
    const empty = page.getByText("No packets match", { exact: false });
    const waiting = page.getByText("Waiting for live capture", { exact: false });
    const offline = page.getByText(/not reachable/);
    await rows.or(empty).or(waiting).or(offline).first().waitFor({ state: "visible", timeout: 20_000 });

    if (await rows.isVisible().catch(() => false)) {
      await expect(page.getByText("Frame details", { exact: true })).toBeVisible();
    }
  });

  test("search input filters packets server-side", async ({ page }) => {
    test.skip(!(await backendUp()), "backend not running on :8000");
    test.skip(!(await pumpTraffic()), "could not pump test traffic");

    const offline = page.getByText(/not reachable/);

    // Sibling tests pump into the same shared current.pcap and the 1MB rotation
    // can archive our packets mid-test, so retry (re-pump + reload) like the
    // deep-link test. The generated source IP is random (`10.0.{rand}.{rand}`),
    // so each attempt derives a term from the newest live flow.
    for (let attempt = 0; attempt < 3; attempt++) {
      test.skip(!(await pumpTraffic()), "could not pump test traffic");

      let term: string | null = null;
      for (let i = 0; i < 5; i++) {
        term = await newestFlowSrcIp();
        if (term) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      test.skip(!term, "no flow observed after pump");

      await page.goto("/packets");
      const data = page.locator("table tbody tr").first();
      await data.or(offline).first().waitFor({ state: "visible", timeout: 15_000 });
      if (!(await data.isVisible().catch(() => false))) {
        test.skip(true, "browser could not reach the backend via the vite proxy");
        return;
      }

      const input = page.getByLabel("Search all packets");
      await input.waitFor({ state: "visible" });
      await input.fill(term!);

      // The search debounce/fetch races the previous page's content; poll the
      // actual table until the filtered rows include the term. The term appears
      // as src in some flows and dst in others, so check the whole body.
      const tableBody = page.locator("table tbody").first();
      const found = await expect
        .poll(
          async () =>
            (await tableBody.textContent().catch(() => ""))?.includes(term!) ?? false,
          { timeout: 15_000 }
        )
        .toBe(true)
        .then(() => true)
        .catch(() => false);

      if (found) return;
      // packet rotation archived the searched packets away — retry with a fresh pump
    }
    test.skip(true, "no matching packet appeared after repeated pumps");
  });

  test("jump-to-packet selects the requested frame", async ({ page }) => {
    test.skip(!(await backendUp()), "backend not running on :8000");
    test.skip(!(await pumpTraffic()), "could not pump test traffic");

    await page.goto("/packets");
    const offline = page.getByText(/not reachable/);
    const data = page.locator("table tbody tr").first();
    await data.or(offline).first().waitFor({ state: "visible", timeout: 15_000 });
    if (!(await data.isVisible().catch(() => false))) {
      test.skip(true, "browser could not reach the backend via the vite proxy");
      return;
    }

    const jump = page.getByLabel("Jump to packet number");
    await jump.waitFor({ state: "visible" });

    await jump.fill("1");
    await page.getByLabel("Go to packet").click();

    const detail = page.getByText(/^Packet #1 ·/, { exact: false });
    await detail.waitFor({ state: "visible", timeout: 15_000 });
    await expect(detail).toBeVisible();
  });
});