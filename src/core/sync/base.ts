import type { SyncResult, SyncOptions, SupportedClient } from '../../types/index.js';

export interface ClientConfig {
  name: SupportedClient;
  displayName: string;
  configDir: string;
  commandsDir: string;
  agentsDir: string | null;
  skillsDir: string | null;
  commandFilePattern: string;
}

export interface SyncContext {
  projectRoot: string;
  options: SyncOptions;
  skipped: string[];
}

export abstract class ClientConfigurator {
  abstract config: ClientConfig;

  /**
   * Project root directory for resolving paths
   */
  protected projectRoot?: string;

  /**
   * Generate slash command files for this client
   */
  abstract generateCommands(ctx: SyncContext): Promise<string[]>;

  /**
   * Sync agents to client's expected location
   */
  abstract syncAgents(ctx: SyncContext): Promise<string[]>;

  /**
   * Copy/transform skills to client's expected location
   */
  abstract syncSkills(ctx: SyncContext): Promise<string[]>;

  /**
   * Full sync: commands + agents + skills
   */
  async sync(projectRoot: string, options: SyncOptions = {}): Promise<SyncResult> {
    // Set projectRoot for access in instance methods
    this.projectRoot = projectRoot;

    const ctx: SyncContext = {
      projectRoot,
      options,
      skipped: [],
    };

    const result: SyncResult = {
      commandsWritten: [],
      skillsSynced: [],
      agentsSynced: [],
      warnings: [],
      skipped: [],
    };

    result.commandsWritten = await this.generateCommands(ctx);
    result.agentsSynced = await this.syncAgents(ctx);
    result.skillsSynced = await this.syncSkills(ctx);
    result.skipped = ctx.skipped;

    return result;
  }

  /**
   * Check if client config dir exists
   */
  abstract isConfigDirPresent(projectRoot: string): boolean;
}
