export type SupportedClient = 'claude' | 'opencode' | 'codex';

export interface ClientInfo {
  id: SupportedClient;
  name: string;
  configDir: string;
  commandsDir: string;
  agentsDir: string | null;
  skillsDir: string | null;
}

export const SUPPORTED_CLIENTS: ClientInfo[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    configDir: '.claude',
    commandsDir: 'commands',
    agentsDir: 'agents/nextai',
    skillsDir: 'skills/nextai',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    configDir: '.opencode',
    commandsDir: 'command',
    agentsDir: 'agent',
    skillsDir: null, // OpenCode uses agents, not skills
  },
  // Phase 2: codex
];

export interface SyncOptions {
  force?: boolean;
}

export interface SyncResult {
  commandsWritten: string[];
  skillsSynced: string[];
  agentsSynced: string[];
  warnings: string[];
  skipped: string[];
}

// TODO: Future - Used for multi-developer routing based on tech stack.
// Implement detectLanguages() in scaffolding/project.ts during init.
export interface DetectedLanguage {
  name: string;
  detected_from: string[];
}

export class NextAIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: string,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'NextAIError';
  }
}

export const ERROR_CODES = {
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  CONFIG_INVALID: 'CONFIG_INVALID',
  LEDGER_CORRUPTED: 'LEDGER_CORRUPTED',
  AGENT_INVALID: 'AGENT_INVALID',
  FEATURE_NOT_FOUND: 'FEATURE_NOT_FOUND',
  CLIENT_NOT_SUPPORTED: 'CLIENT_NOT_SUPPORTED',
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  FILE_PERMISSION: 'FILE_PERMISSION',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;
