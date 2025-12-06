import { z } from 'zod';

export const ProfileSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string(),
  repo_root: z.string(),
  // TODO: Future - Populate during init by scanning package manifests.
  // Will enable multi-developer routing. Currently unused.
  languages: z.array(
    z.object({
      name: z.string(),
      detected_from: z.array(z.string()),
    })
  ).optional(),
  created_at: z.string().datetime(),
  last_initialized_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const createProfile = (
  projectId: string,
  name: string,
  repoRoot: string,
  languages?: { name: string; detected_from: string[] }[]
): Profile => {
  const now = new Date().toISOString();
  return {
    project_id: projectId,
    name,
    repo_root: repoRoot,
    languages,
    created_at: now,
    last_initialized_at: now,
  };
};
