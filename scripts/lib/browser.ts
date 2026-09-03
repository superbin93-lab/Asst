/**
 * Minimal headless-browser driver over the DevTools protocol.
 *
 * Shared by the screenshot and workflow-verification scripts so neither needs a
 * browser-automation dependency, and so nothing dev-only has to exist in the app.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { PrismaClient } from "../../src/generated/prisma/client";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

export type Send = (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

export type Browser = {
  send: Send;
  /** Evaluates an expression in the page and returns its JSON value. */
  evaluate: <T>(expression: string) => Promise<T>;
  goto: (url: string, settleMs?: number) => Promise<void>;
  /** Replaces the session cookie so the next navigation is a different user. */
  signInAs: (email: string) => Promise<void>;
  setCookie: (name: string, value: string) => Promise<void>;
  close: () => Promise<void>;
};

async function openSocket(wsUrl: string) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map<number, (v: Record<string, unknown>) => void>();
  let nextId = 1;

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("DevTools socket failed")), { once: true });
  });

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data)) as { id?: number; result?: Record<string, unknown> };
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result ?? {});
      pending.delete(msg.id);
    }
  });

  const send: Send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  return { send, close: () => socket.close() };
}

/** Helpers injected into the page; React ignores a bare `.value` assignment. */
export const PAGE_HELPERS = `
window.__set = (selector, value) => {
  const el = document.querySelector(selector);
  if (!el) throw new Error("missing field: " + selector);
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
};
window.__click = (text, scope) => {
  // An open dialog wins, then the main content area - never the sidebar, whose
  // nav links share wording with page actions ("Cấp phát", "Bảo trì", ...).
  const root = scope
    ? document.querySelector(scope)
    : document.querySelector("[role=dialog]") ?? document.querySelector("main") ?? document;
  if (!root) throw new Error("missing scope: " + scope);
  const controls = [...root.querySelectorAll("button, a")].filter((b) => !b.disabled);
  const el = controls.find((b) => b.textContent.trim() === text)
    ?? controls.find((b) => b.textContent.trim().includes(text));
  if (!el) throw new Error("missing control: " + text + " :: " + controls.map((b) => b.textContent.trim()).filter(Boolean).join(" | "));
  el.click();
  return true;
};
window.__text = () => document.body.innerText;
true;
`;

export async function launchBrowser(options: {
  db: PrismaClient;
  base: string;
  port?: number;
  width?: number;
  /** Tag written to Session.userAgent so the caller can clean up afterwards. */
  sessionTag: string;
}): Promise<Browser> {
  const { db, base, sessionTag } = options;
  const port = options.port ?? 9333;
  const width = options.width ?? 1440;

  const binary = BROWSERS.find((p) => existsSync(p));
  if (!binary) throw new Error("No Chrome or Edge binary found for headless rendering.");

  const profile = mkdtempSync(join(tmpdir(), "itam-cdp-"));
  const proc: ChildProcess = spawn(
    binary,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--hide-scrollbars",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${width},1200`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let attempt = 0; attempt < 40 && !target; attempt++) {
    await delay(250);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      target = ((await res.json()) as { type: string; webSocketDebuggerUrl: string }[]).find(
        (t) => t.type === "page",
      );
    } catch {
      // browser still starting
    }
  }
  if (!target) {
    proc.kill();
    throw new Error("Headless browser did not expose a page target.");
  }

  const { send, close: closeSocket } = await openSocket(target.webSocketDebuggerUrl);
  await send("Page.enable");
  await send("Network.enable");
  await send("Runtime.enable");

  const host = new URL(base).hostname;

  const setCookie: Browser["setCookie"] = async (name, value) => {
    await send("Network.setCookie", { name, value, domain: host, path: "/" });
  };

  const evaluate: Browser["evaluate"] = async <T,>(expression: string) => {
    const res = (await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })) as { result?: { value?: T }; exceptionDetails?: { text: string; exception?: { description?: string } } };
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    }
    return res.result?.value as T;
  };

  const goto: Browser["goto"] = async (url, settleMs = 2500) => {
    await send("Page.navigate", { url });
    await delay(settleMs);
    await evaluate(PAGE_HELPERS);
  };

  const signInAs: Browser["signInAs"] = async (email) => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const token = randomBytes(32).toString("base64url");
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 3_600_000),
        userAgent: sessionTag,
      },
    });
    await send("Network.clearBrowserCookies");
    await setCookie("itam_session", token);
    await setCookie("itam_locale", "vi");
  };

  return {
    send,
    evaluate,
    goto,
    signInAs,
    setCookie,
    close: async () => {
      closeSocket();
      proc.kill();
      await delay(300);
      rmSync(profile, { recursive: true, force: true });
      await db.session.deleteMany({ where: { userAgent: sessionTag } });
    },
  };
}
