/**
 * Process Supervisor & Watchdog
 * Keeps services running continuously and checks their health every second (1000ms).
 * Automatically restarts any service if it crashes or exits unexpectedly.
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ANSI Colors for clean log prefixes
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Configured services to keep alive
const SERVICES_CONFIG = [
  {
    name: 'admin-web',
    command: 'pnpm',
    args: ['--filter', 'admin-web', 'dev'],
    color: COLORS.cyan,
  },
  {
    name: 'customer-mobile',
    command: 'pnpm',
    args: ['--filter', 'customer-mobile', 'start', '--', '--offline'],
    color: COLORS.green,
    env: {
      EXPO_OFFLINE: '1',
    },
  },
];

// Active service state tracker
const activeServices = new Map();
let isShuttingDown = false;

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function log(prefix, color, message) {
  const time = `${COLORS.gray}[${timestamp()}]${COLORS.reset}`;
  console.log(`${time} ${color}[${prefix}]${COLORS.reset} ${message}`);
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Process might already be dead
  }
}

function startService(config) {
  if (isShuttingDown) return;

  const state = activeServices.get(config.name) || {
    config,
    process: null,
    pid: null,
    restarts: 0,
    lastStarted: 0,
    running: false,
  };

  state.lastStarted = Date.now();
  state.running = true;

  log(config.name, config.color, `${COLORS.bold}Starting service...${COLORS.reset} (${config.command} ${config.args.join(' ')})`);

  const child = spawn(config.command, config.args, {
    cwd: rootDir,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1', ...(config.env || {}) },
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  state.process = child;
  state.pid = child.pid;
  activeServices.set(config.name, state);

  // Pipe stdout with service prefix
  child.stdout?.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim().length > 0) {
        log(config.name, config.color, line);
      }
    }
  });

  // Pipe stderr with service prefix
  child.stderr?.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim().length > 0) {
        log(config.name, COLORS.red, line);
      }
    }
  });

  child.on('error', (err) => {
    log(config.name, COLORS.red, `Spawn error: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    state.running = false;
    state.process = null;
    state.pid = null;

    if (!isShuttingDown) {
      state.restarts += 1;
      log(
        config.name,
        COLORS.yellow,
        `⚠️ Service stopped/crashed (code: ${code}, signal: ${signal}). Total restarts: ${state.restarts}. Watchdog will revive it immediately.`
      );
    }
  });
}

// Watchdog checker running every second (1000ms)
function startWatchdog() {
  console.log(`${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}  Tractor Repair App - 1-Second Process Watchdog   ${COLORS.reset}`);
  console.log(`${COLORS.dim}  Monitoring: ${SERVICES_CONFIG.map((s) => s.name).join(', ')}${COLORS.reset}`);
  console.log(`${COLORS.dim}  Check interval: Every 1 second (1000ms)${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}\n`);

  // Initial startup of all services
  for (const config of SERVICES_CONFIG) {
    startService(config);
  }

  // Check every second
  setInterval(() => {
    if (isShuttingDown) return;

    for (const config of SERVICES_CONFIG) {
      const state = activeServices.get(config.name);
      if (!state || !state.running || !state.process) {
        log(config.name, COLORS.red, `Watchdog tick: Service is down! Restarting now...`);
        startService(config);
      }
    }
  }, 1000);
}

// Graceful shutdown handling
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${COLORS.yellow}Shutting down watchdog and stopping all child processes...${COLORS.reset}`);

  for (const [name, state] of activeServices.entries()) {
    if (state.pid) {
      log(name, COLORS.gray, `Killing process tree (PID: ${state.pid})...`);
      killProcessTree(state.pid);
    }
  }

  console.log(`${COLORS.green}All processes stopped cleanly. Goodbye!${COLORS.reset}`);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run supervisor
startWatchdog();
