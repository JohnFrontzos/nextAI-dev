import { z } from 'zod';

export const ConfigSchema = z.object({
  project: z.object({
    id: z.string().uuid(),
    name: z.string(),
    repo_root: z.string(),
    // TODO: Future - Populate during init by scanning package manifests (package.json,
    // requirements.txt, Cargo.toml, go.mod, etc.). Will enable multi-developer routing
    // based on tech stack (e.g., Python-specialist vs TypeScript-specialist).
    // Currently, tech detection happens via /nextai-analyze → docs/nextai/architecture.md
    languages: z.array(
      z.object({
        name: z.string(),
        detected_from: z.array(z.string()),
      })
    ).optional(),
  }),
  clients: z.object({
    synced: z.array(z.enum(['claude', 'opencode', 'codex'])),
    default: z.enum(['claude', 'opencode', 'codex']),
  }),
  preferences: z.object({
    verbose: z.boolean().default(false),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const defaultConfig = (projectId: string, name: string, repoRoot: string): Config => ({
  project: {
    id: projectId,
    name,
    repo_root: repoRoot,
  },
  clients: {
    synced: [],
    default: 'claude',
  },
  preferences: {
    verbose: false,
  },
});
