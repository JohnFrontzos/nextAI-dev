import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestContext {
  projectRoot: string;
  cleanup: () => void;
}

/**
 * Creates a temporary test project directory
 */
export function createTestProject(): TestContext {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextai-test-'));

  return {
    projectRoot: tempDir,
    cleanup: () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Creates a feature fixture with specified artifacts
 */
export function createFeatureFixture(
  projectRoot: string,
  featureId: string,
  artifacts: Record<string, string>
): void {
  const featureDir = path.join(projectRoot, 'todo', featureId);

  for (const [artifactPath, content] of Object.entries(artifacts)) {
    const fullPath = path.join(featureDir, artifactPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}

/**
 * Creates a done feature fixture (for completed features)
 */
export function createDoneFeatureFixture(
  projectRoot: string,
  featureId: string,
  artifacts: Record<string, string>
): void {
  const featureDir = path.join(projectRoot, 'done', featureId);

  for (const [artifactPath, content] of Object.entries(artifacts)) {
    const fullPath = path.join(featureDir, artifactPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}

/**
 * Initializes a minimal .nextai structure for testing
 */
export function initNextAIStructure(projectRoot: string): void {
  const nextaiDir = path.join(projectRoot, '.nextai');
  const stateDir = path.join(nextaiDir, 'state');

  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'todo'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'done'), { recursive: true });

  // Create empty ledger
  fs.writeFileSync(
    path.join(stateDir, 'ledger.json'),
    JSON.stringify({ features: [] }, null, 2),
    'utf-8'
  );

  // Create empty history
  fs.writeFileSync(path.join(stateDir, 'history.log'), '', 'utf-8');

  // Create minimal config
  const config = {
    project: {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Project',
      repo_root: projectRoot
    },
    clients: {
      synced: [],
      default: 'claude'
    },
    preferences: {
      verbose: false
    }
  };
  fs.writeFileSync(
    path.join(nextaiDir, 'config.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );

  // Create minimal profile
  const profile = {
    project_id: '00000000-0000-0000-0000-000000000000',
    name: 'Test Project',
    repo_root: projectRoot,
    created_at: new Date().toISOString(),
    last_initialized_at: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(nextaiDir, 'profile.json'),
    JSON.stringify(profile, null, 2),
    'utf-8'
  );
}

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Runs the CLI with specified arguments
 */
export async function runCLI(
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<CLIResult> {
  const cwd = options?.cwd || process.cwd();
  const cliPath = path.resolve(__dirname, '../../dist/cli/index.js');
  const command = `node "${cliPath}" ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: { ...process.env, ...options?.env }
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || '',
      exitCode: execError.code || 1
    };
  }
}

/**
 * Reads a file from the test project
 */
export function readTestFile(projectRoot: string, relativePath: string): string {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Writes a file to the test project
 */
export function writeTestFile(projectRoot: string, relativePath: string, content: string): void {
  const fullPath = path.join(projectRoot, relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Checks if a file exists in the test project
 */
export function fileExists(projectRoot: string, relativePath: string): boolean {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.existsSync(fullPath);
}

/**
 * Reads and parses JSON from the test project
 */
export function readTestJson<T>(projectRoot: string, relativePath: string): T {
  const content = readTestFile(projectRoot, relativePath);
  return JSON.parse(content) as T;
}

/**
 * Writes JSON to the test project
 */
export function writeTestJson<T>(projectRoot: string, relativePath: string, data: T): void {
  writeTestFile(projectRoot, relativePath, JSON.stringify(data, null, 2));
}
