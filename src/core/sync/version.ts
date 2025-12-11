import { existsSync } from 'fs';
import { getSessionPath, readJson, getPackageVersion } from '../../cli/utils/config.js';
import type { Session } from '../../schemas/session.js';

export interface VersionComparison {
  stored: string;
  current: string;
  needsUpdate: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
}

/**
 * Compare two semver version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = v2.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < 3; i++) {
    const n1 = parts1[i] || 0;
    const n2 = parts2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

/**
 * Get version comparison between package and session
 * Returns null if session.json doesn't exist (first-time sync)
 */
export function getVersionComparison(projectRoot: string): VersionComparison | null {
  const sessionPath = getSessionPath(projectRoot);
  if (!existsSync(sessionPath)) {
    return null; // First-time sync
  }

  try {
    const session = readJson<Session>(sessionPath);
    const stored = session.cli_version;
    const current = getPackageVersion();

    const comparison = compareVersions(current, stored);

    return {
      stored,
      current,
      needsUpdate: comparison !== 0,
      isUpgrade: comparison > 0,
      isDowngrade: comparison < 0,
    };
  } catch (error) {
    // If session file is corrupted, treat as first-time
    return null;
  }
}
