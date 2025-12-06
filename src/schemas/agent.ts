import { z } from 'zod';

export const AgentRoleSchema = z.enum([
  'orchestrator',
  'product_research',
  'tech_spec',
  'developer',
  'reviewer',
  'documentation',
  'investigator',
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentManifestFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  role: AgentRoleSchema,
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  tools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export type AgentManifestFrontmatter = z.infer<typeof AgentManifestFrontmatterSchema>;

export const AgentManifestSchema = AgentManifestFrontmatterSchema.extend({
  prompt: z.string(), // The markdown body (system prompt)
});

export type AgentManifest = z.infer<typeof AgentManifestSchema>;
