#!/usr/bin/env node
/**
 * Portable PostgreSQL for local development.
 *
 * Downloads nothing and installs nothing system-wide: it drives the EnterpriseDB
 * binaries unpacked into .devdb/pgsql and keeps the cluster in .devdb/data.
 *
 *   node scripts/devdb.mjs init|start|stop|status|psql|reset
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pgRoot = join(root, ".devdb", "pgsql");
const dataDir = join(root, ".devdb", "data");
const logFile = join(root, ".devdb", "postgres.log");
const pwFile = join(root, ".devdb", ".initpw");

const PORT = process.env.DEVDB_PORT ?? "55432";
const USER = process.env.DEVDB_USER ?? "itam";
const PASSWORD = process.env.DEVDB_PASSWORD ?? "itam";
const DBNAME = process.env.DEVDB_NAME ?? "itam";

const bin = (name) => join(pgRoot, "bin", `${name}.exe`);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.error) throw res.error;
  return res.status ?? 1;
}

function capture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function requireBinaries() {
  if (!existsSync(bin("pg_ctl"))) {
    console.error(
      "PostgreSQL binaries not found under .devdb/pgsql.\n" +
        "Download the portable build and unzip it there:\n" +
        "  https://get.enterprisedb.com/postgresql/postgresql-17.6-1-windows-x64-binaries.zip",
    );
    process.exit(1);
  }
}

function isRunning() {
  const res = capture(bin("pg_ctl"), ["-D", dataDir, "status"]);
  return res.status === 0;
}

function init() {
  requireBinaries();
  if (existsSync(join(dataDir, "PG_VERSION"))) {
    console.log("Cluster already initialised at .devdb/data");
    return;
  }
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(pwFile, PASSWORD, "utf8");
  const code = run(bin("initdb"), [
    "-D", dataDir,
    "-U", USER,
    "--pwfile", pwFile,
    "-E", "UTF8",
    "--locale=C",
    "-A", "scram-sha-256",
  ]);
  rmSync(pwFile, { force: true });
  if (code !== 0) process.exit(code);
  console.log("Cluster initialised.");
}

function start() {
  requireBinaries();
  init();
  if (isRunning()) {
    console.log(`PostgreSQL already running on port ${PORT}.`);
  } else {
    // stdio must not be inherited: on Windows the postgres server keeps the
    // handles open after pg_ctl returns, which would hang the calling shell.
    const code = run(
      bin("pg_ctl"),
      [
        "-D", dataDir,
        "-l", logFile,
        "-o", `-p ${PORT} -c listen_addresses=127.0.0.1`,
        "-w",
        "start",
      ],
      { stdio: "ignore" },
    );
    if (code !== 0) {
      console.error(`Failed to start. See ${logFile}`);
      process.exit(code);
    }
  }
  ensureDatabase();
  console.log(`\nDATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DBNAME}?schema=public"`);
}

function ensureDatabase() {
  const env = { ...process.env, PGPASSWORD: PASSWORD };
  const exists = capture(
    bin("psql"),
    ["-h", "127.0.0.1", "-p", PORT, "-U", USER, "-d", "postgres", "-tAc",
     `SELECT 1 FROM pg_database WHERE datname='${DBNAME}'`],
    { env },
  );
  if (exists.stdout?.trim() !== "1") {
    run(bin("createdb"), ["-h", "127.0.0.1", "-p", PORT, "-U", USER, DBNAME], { env });
    console.log(`Database "${DBNAME}" created.`);
  }
}

function stop() {
  requireBinaries();
  if (!isRunning()) {
    console.log("PostgreSQL is not running.");
    return;
  }
  run(bin("pg_ctl"), ["-D", dataDir, "-m", "fast", "-w", "stop"]);
}

function status() {
  requireBinaries();
  console.log(isRunning() ? `running on port ${PORT}` : "stopped");
}

function psql() {
  requireBinaries();
  run(bin("psql"), ["-h", "127.0.0.1", "-p", PORT, "-U", USER, "-d", DBNAME], {
    env: { ...process.env, PGPASSWORD: PASSWORD },
  });
}

function reset() {
  if (isRunning()) stop();
  rmSync(dataDir, { recursive: true, force: true });
  console.log("Cluster removed. Run `npm run db:start` to recreate it.");
}

const commands = { init, start, stop, status, psql, reset };
const cmd = process.argv[2] ?? "start";
if (!commands[cmd]) {
  console.error(`Unknown command "${cmd}". Use: ${Object.keys(commands).join(" | ")}`);
  process.exit(1);
}
commands[cmd]();
