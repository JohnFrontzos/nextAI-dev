import { z } from 'zod';

export const SessionSchema = z.object({
  timestamp: z.string().datetime(),
  cli_version: z.string(),
});

export type Session = z.infer<typeof SessionSchema>;

export const createSession = (version: string): Session => ({
  timestamp: new Date().toISOString(),
  cli_version: version,
});
