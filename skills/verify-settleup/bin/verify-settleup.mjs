#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const evidenceRoot = path.join(repoRoot, ".scratch/verify-settleup");
const scratchRoot = "/tmp/settleup-verify";
const statePath = path.join(scratchRoot, "state.json");
const webUrl = "http://127.0.0.1:5173";
const apiUrl = "http://127.0.0.1:8787";

const command = process.argv[2];
const driveTarget = process.argv[3];

if (command === "launch") {
  await launch();
} else if (command === "doctor") {
  const report = await doctor();
  console.log(report);
} else if (command === "drive") {
  if (driveTarget !== "record-expense") {
    throw new Error("The bundled drive is record-expense. Follow the other feature files in Playwright.");
  }
  await driveRecordExpense();
} else if (command === "cleanup") {
  await cleanup();
} else {
  throw new Error("Usage: verify-settleup.mjs <launch|doctor|drive record-expense|cleanup>");
}

async function launch() {
  if (existsSync(statePath)) {
    const state = readState();
    if (processAlive(state.apiPid) || processAlive(state.webPid)) {
      throw new Error("A verification instance is already recorded. Run cleanup before launching another.");
    }
  }

  if (!(await portFree(8787)) || !(await portFree(5173))) {
    throw new Error("Port 8787 or 5173 is already in use. Refusing to drive a shared instance.");
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const scratchDir = path.join(scratchRoot, runId);
  mkdirSync(scratchDir, { recursive: true });
  const dbPath = path.join(scratchDir, "event.sqlite");
  const gitHead = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  execFileSync("npm", ["run", "build:contracts"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const api = spawnLogged("npm", ["run", "dev:api:watch"], path.join(scratchDir, "api.log"), {
    PORT: "8787",
    SETTLEUP_DB: dbPath,
  });
  const state = {
    runId,
    evidenceRoot,
    apiPid: api.pid,
    webPid: null,
    dbPath,
    scratchDir,
    gitHead,
  };
  writeState(state);

  try {
    await waitFor("API", async () => {
      const log = readFileSync(path.join(scratchDir, "api.log"), "utf8");
      if (!log.includes("SettleUp server listening on http://127.0.0.1:8787")) {
        return false;
      }
      const response = await fetch(`${apiUrl}/api/events/doctor-probe`);
      return response.status === 404;
    }, 90_000);

    const web = spawnLogged("npm", ["run", "dev:web:watch"], path.join(scratchDir, "web.log"), {});
    state.webPid = web.pid;
    writeState(state);

    await waitFor("web", async () => {
      const response = await fetch(`${webUrl}/`);
      if (!response.ok) {
        return false;
      }
      const body = await response.text();
      return body.includes("Everyone pays. Every cent lands.");
    }, 90_000);
  } catch (error) {
    await cleanup();
    throw error;
  }

  console.log(`SettleUp verification instance ready at ${webUrl}`);
  console.log(`git ${gitHead}`);
}

async function doctor() {
  const state = readState();
  const problems = [];
  if (!processAlive(state.apiPid)) {
    problems.push("API process group is not running.");
  }
  if (!processAlive(state.webPid)) {
    problems.push("Web process group is not running.");
  }

  const apiOwners = listenerPids(8787);
  const webOwners = listenerPids(5173);
  if (apiOwners.length === 0 || !apiOwners.some((pid) => inGroup(pid, state.apiPid))) {
    problems.push(`Port 8787 is not owned by the recorded API group ${state.apiPid}. Listeners: ${apiOwners.join(",") || "none"}.`);
  }
  if (webOwners.length === 0 || !webOwners.some((pid) => inGroup(pid, state.webPid))) {
    problems.push(`Port 5173 is not owned by the recorded web group ${state.webPid}. Listeners: ${webOwners.join(",") || "none"}.`);
  }

  try {
    const page = await fetch(`${webUrl}/`);
    const body = await page.text();
    if (!page.ok || !body.includes("Everyone pays. Every cent lands.")) {
      problems.push("Landing page is not serving the SettleUp heading.");
    }
  } catch (error) {
    problems.push(`Landing page request failed: ${error instanceof Error ? error.message : error}`);
  }

  try {
    const probe = await fetch(`${apiUrl}/api/events/doctor-probe`);
    if (probe.status !== 404) {
      problems.push(`API probe returned ${probe.status}, expected 404.`);
    }
  } catch (error) {
    problems.push(`API probe failed: ${error instanceof Error ? error.message : error}`);
  }

  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }

  return [
    "doctor ok",
    `web ${webUrl}`,
    `api ${apiUrl}`,
    `database ${state.dbPath}`,
    `git ${state.gitHead}`,
    `api-pid ${state.apiPid}`,
    `web-pid ${state.webPid}`,
  ].join("\n");
}

async function driveRecordExpense() {
  const report = await doctor();
  console.log(report);
  const state = readState();
  const root = state.evidenceRoot ?? evidenceRoot;
  mkdirSync(root, { recursive: true });
  const runDir = mkdtempSync(path.join(root, `${state.runId}-`));
  const evidenceDir = path.join(runDir, "record-expense");
  mkdirSync(evidenceDir);
  console.log(`evidence ${evidenceDir}`);
  prepareBrowserEnv();
  const require = createRequire(path.join(repoRoot, "apps/web/package.json"));
  const { chromium } = require("playwright");
  const { expect } = require("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    baseURL: webUrl,
    locale: "en-AU",
    viewport: { width: 1280, height: 800 },
  });

  try {
    await page.goto("/");
    await page.getByLabel("What are you splitting?").fill("Verify weekend");
    await page.getByLabel("Your name").fill("Mia");
    await page.getByLabel("Currency").selectOption("AUD");
    await page.getByRole("button", { name: "Create private event" }).click();
    await page.getByRole("heading", { level: 1, name: "Verify weekend" }).waitFor();

    await page.getByRole("link", { name: "People" }).click();
    await page.getByRole("link", { name: "Add person" }).click();
    await page.getByLabel("Name").fill("Noah");
    await page.getByRole("button", { name: "Add person" }).click();
    await page.getByText("Noah", { exact: true }).waitFor();

    await page.getByRole("link", { name: "Expenses" }).click();
    await page.getByRole("link", { name: "Add the first expense" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await page.getByLabel("What was it?").fill("Dinner");
    await page.getByLabel("Amount").fill("20.01");
    const expectedDisplay = [/^Mia\s*\$10\.01$/, /^Noah\s*\$10\.00$/];
    const previewRows = dialog.getByRole("region", { name: "Exact split preview" })
      .getByRole("listitem");
    await expect(previewRows).toHaveText(expectedDisplay);

    await page.screenshot({ path: path.join(evidenceDir, "preview.png"), fullPage: true });
    writeFileSync(
      path.join(evidenceDir, "preview.aria.txt"),
      redactToken(await page.locator("body").ariaSnapshot()),
    );

    await page.getByRole("button", { name: "Add expense" }).click();
    const activity = page.getByLabel("Recent activity");
    const disclosure = activity.getByText("See exact split", { exact: true });
    const savedRows = activity.locator("details").getByRole("listitem");
    await activity.getByText("Dinner", { exact: true }).waitFor();
    await disclosure.click();
    await expect(savedRows).toHaveText(expectedDisplay);
    await page.screenshot({ path: path.join(evidenceDir, "saved.png"), fullPage: true });
    writeFileSync(path.join(evidenceDir, "saved.aria.txt"), redactToken(await page.locator("body").ariaSnapshot()));

    const token = new URL(page.url()).pathname.split("/")[2];
    const readSnapshot = async () => {
      const response = await page.request.get(`/api/events/${token}`);
      if (!response.ok()) {
        throw new Error(`Snapshot read returned ${response.status()}.`);
      }
      const snapshot = await response.json();
      const names = new Map(snapshot.participants.map(({ id, name }) => [id, name]));
      expect(snapshot.expenses[0].shares.map(({ participantId, amountMinor }) =>
        [names.get(participantId), amountMinor],
      )).toEqual([["Mia", 1001], ["Noah", 1000]]);
      snapshot.event.token = "[redacted]";
      return snapshot;
    };
    const snapshot = await readSnapshot();
    writeFileSync(path.join(evidenceDir, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);

    await page.reload();
    await disclosure.click();
    await expect(savedRows).toHaveText(expectedDisplay);
    await page.getByRole("link", { name: "Edit Dinner" }).click();
    await expect(previewRows).toHaveText(expectedDisplay);
    await page.getByLabel("What was it?").fill("Dinner and dessert");
    await page.getByRole("button", { name: "Save changes" }).click();
    await activity.getByText("Dinner and dessert", { exact: true }).waitFor();
    await expect(savedRows).toHaveText(expectedDisplay);
    await readSnapshot();

    writeFileSync(
      path.join(evidenceDir, "run.txt"),
      [
        "feature record-expense",
        "entry Add the first expense",
        "title Verify weekend",
        "amount 20.01 AUD",
        "preview Mia $10.01, Noah $10.00",
        "stored shares Mia 1001, Noah 1000",
        "same split after reload and description edit",
        `git ${state.gitHead}`,
        "",
      ].join("\n"),
    );
  } finally {
    await browser.close();
  }
}

async function cleanup() {
  if (!existsSync(statePath)) {
    console.log("cleanup: no recorded instance");
    return;
  }
  const state = readState();
  for (const pid of [state.webPid, state.apiPid]) {
    signalGroup(pid, "SIGTERM");
  }
  await delay(1000);
  for (const pid of [state.webPid, state.apiPid]) {
    if (processAlive(pid)) {
      signalGroup(pid, "SIGKILL");
    }
  }
  rmSync(scratchRoot, { force: true, recursive: true });
  console.log("cleanup: instance removed");
  const root = state.evidenceRoot ?? evidenceRoot;
  if (existsSync(root)) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(`${state.runId}-`)) {
        console.log(`evidence kept at ${path.join(root, entry.name, "record-expense")}`);
      }
    }
  }
}

function spawnLogged(commandName, args, logPath, env) {
  const logFd = openSync(logPath, "a");
  const child = spawn(commandName, args, {
    cwd: repoRoot,
    detached: true,
    env: { ...process.env, ...env },
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  if (!child.pid) {
    throw new Error(`Failed to start ${commandName}.`);
  }
  return child;
}

function writeState(state) {
  mkdirSync(scratchRoot, { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function readState() {
  if (!existsSync(statePath)) {
    throw new Error("No verification instance is recorded. Run launch first.");
  }
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function processAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalGroup(pid, signal) {
  if (!pid) {
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // The process already exited.
    }
  }
}

function listenerPids(port) {
  try {
    const output = execFileSync("ss", ["-ltnp", `sport = :${port}`], { encoding: "utf8" });
    return [...output.matchAll(/pid=(\d+)/g)].map((match) => Number(match[1]));
  } catch {
    return [];
  }
}

function inGroup(pid, leader) {
  let current = pid;
  const seen = new Set();
  while (current && !seen.has(current)) {
    if (current === leader) {
      return true;
    }
    seen.add(current);
    try {
      const stat = readFileSync(`/proc/${current}/stat`, "utf8");
      const commandEnd = stat.lastIndexOf(")");
      const fields = stat.slice(commandEnd + 2).split(" ");
      current = Number(fields[1]);
    } catch {
      return false;
    }
  }
  return false;
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function waitFor(label, check, timeoutMs) {
  const started = Date.now();
  let last = "not ready";
  while (Date.now() - started < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
      last = "not ready";
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(`${label} was not ready: ${last}`);
}

function prepareBrowserEnv() {
  const scratchBrowsers = path.join(repoRoot, ".scratch/playwright");
  process.env.PLAYWRIGHT_BROWSERS_PATH = scratchBrowsers;
  const scratchHasChromium = existsSync(scratchBrowsers)
    && readdirSync(scratchBrowsers).some((name) => name.startsWith("chromium"));
  if (!scratchHasChromium) {
    throw new Error("Chromium is missing. Run mise run browsers:install, then drive again.");
  }
}

function redactToken(text) {
  return text.replace(/\/e\/[^/\s"]+/g, "/e/[redacted]");
}
