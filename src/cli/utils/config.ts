import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ConfigSchema,
  ProfileSchema,
  LedgerSchema,
  defaultConfig,
  createProfile,
  emptyLedger,
  createSession,
  type Config,
  type Profile,
  type Ledger,
  type Session,
} from '../../schemas/index.js';
import { NextAIError, ERROR_CODES } from '../../types/index.js';

const NEXTAI_DIR = '.nextai';
const NEXTAI_CONTENT_DIR = 'nextai';
const CONFIG_FILE = 'config.json';
const PROFILE_FILE = 'profile.json';
const LEDGER_FILE = 'state/ledger.json';
const HISTORY_FILE = 'state/history.log';
const SESSION_FILE = 'state/session.json';

/**
 * Find the project root by looking for .nextai directory
 * Traverses up from startDir to filesystem root
 */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let currentDir = resolve(startDir);

  // Traverse up until we hit the filesystem root (when dirname returns the same path)
  while (true) {
    if (existsSync(join(currentDir, NEXTAI_DIR))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);

    // Reached filesystem root (dirname of root returns root itself)
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

/**
 * Get the .nextai directory path (hidden, system config)
 */
export function getNextAIDir(projectRoot: string): string {
  return join(projectRoot, NEXTAI_DIR);
}

/**
 * Get the nextai/ content directory path (visible, user-facing)
 * This is separate from .nextai/ which holds system config
 */
export function getNextAIContentDir(projectRoot: string): string {
  return join(projectRoot, NEXTAI_CONTENT_DIR);
}

/**
 * Ensure a directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write JSON to a file with pretty formatting
 */
export function writeJson<T>(filePath: string, data: T): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Read and parse JSON from a file
 */
export function readJson<T>(filePath: string): T {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

// Config operations
export function getConfigPath(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), CONFIG_FILE);
}

export function loadConfig(projectRoot: string): Config {
  const configPath = getConfigPath(projectRoot);
  if (!existsSync(configPath)) {
    throw new NextAIError(
      ERROR_CODES.NOT_INITIALIZED,
      'Project not initialized',
      `No ${CONFIG_FILE} found at ${configPath}`,
      ['Run `nextai init` to initialize this project']
    );
  }
  const raw = readJson<unknown>(configPath);
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new NextAIError(
      ERROR_CODES.CONFIG_INVALID,
      'Invalid config file',
      result.error.message
    );
  }
  return result.data;
}

export function saveConfig(projectRoot: string, config: Config): void {
  writeJson(getConfigPath(projectRoot), config);
}

export function initConfig(projectRoot: string, projectName: string): Config {
  const projectId = uuidv4();
  const config = defaultConfig(projectId, projectName, projectRoot);
  saveConfig(projectRoot, config);
  return config;
}

// Profile operations
export function getProfilePath(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), PROFILE_FILE);
}

export function loadProfile(projectRoot: string): Profile {
  const profilePath = getProfilePath(projectRoot);
  if (!existsSync(profilePath)) {
    throw new NextAIError(
      ERROR_CODES.NOT_INITIALIZED,
      'Profile not found',
      `No ${PROFILE_FILE} found at ${profilePath}`
    );
  }
  const raw = readJson<unknown>(profilePath);
  const result = ProfileSchema.safeParse(raw);
  if (!result.success) {
    throw new NextAIError(
      ERROR_CODES.CONFIG_INVALID,
      'Invalid profile file',
      result.error.message
    );
  }
  return result.data;
}

export function saveProfile(projectRoot: string, profile: Profile): void {
  writeJson(getProfilePath(projectRoot), profile);
}

export function initProfile(
  projectRoot: string,
  projectId: string,
  projectName: string
): Profile {
  const profile = createProfile(projectId, projectName, projectRoot);
  saveProfile(projectRoot, profile);
  return profile;
}

// Ledger operations
export function getLedgerPath(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), LEDGER_FILE);
}

export function loadLedger(projectRoot: string): Ledger {
  const ledgerPath = getLedgerPath(projectRoot);
  if (!existsSync(ledgerPath)) {
    return emptyLedger();
  }
  try {
    const raw = readJson<unknown>(ledgerPath);
    const result = LedgerSchema.safeParse(raw);
    if (!result.success) {
      throw new NextAIError(
        ERROR_CODES.LEDGER_CORRUPTED,
        'Ledger file is corrupted',
        result.error.message,
        ['Run `nextai repair` to fix the ledger']
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof NextAIError) throw error;
    throw new NextAIError(
      ERROR_CODES.LEDGER_CORRUPTED,
      'Failed to read ledger file',
      String(error),
      ['Run `nextai repair` to fix the ledger']
    );
  }
}

export function saveLedger(projectRoot: string, ledger: Ledger): void {
  writeJson(getLedgerPath(projectRoot), ledger);
}

export function initLedger(projectRoot: string): Ledger {
  const ledger = emptyLedger();
  saveLedger(projectRoot, ledger);
  return ledger;
}

// History operations
export function getHistoryPath(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), HISTORY_FILE);
}

export function appendHistory(projectRoot: string, event: object): void {
  const historyPath = getHistoryPath(projectRoot);
  ensureDir(dirname(historyPath));
  const entry = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  appendFileSync(historyPath, entry, 'utf-8');
}

// Session operations
export function getSessionPath(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), SESSION_FILE);
}

export function updateSession(projectRoot: string, version: string): Session {
  const session = createSession(version);
  writeJson(getSessionPath(projectRoot), session);
  return session;
}

// Metrics operations
export function getMetricsDir(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), 'metrics');
}

export function getMetricsFeaturesDir(projectRoot: string): string {
  return join(getMetricsDir(projectRoot), 'features');
}

export function getFeatureMetricsPath(projectRoot: string, featureId: string): string {
  return join(getMetricsFeaturesDir(projectRoot), `${featureId}.json`);
}

export function getAggregatedMetricsPath(projectRoot: string): string {
  return join(getMetricsDir(projectRoot), 'aggregated.json');
}

export function getMetricsIndexPath(projectRoot: string): string {
  return join(getMetricsDir(projectRoot), 'index.json');
}

// Package version helper (injected at build time via tsup define)
export function getPackageVersion(): string {
  return process.env.PACKAGE_VERSION || '0.0.0';
}
