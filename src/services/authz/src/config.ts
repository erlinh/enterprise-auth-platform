import { z } from 'zod';

// Helper to parse string booleans correctly (handles "true"/"false" strings)
const parseBoolean = (val: string | undefined, defaultValue: boolean): boolean => {
  if (val === undefined || val === '') return defaultValue;
  return val.toLowerCase() === 'true';
};

const configSchema = z.object({
  port: z.coerce.number().default(3010),
  spicedb: z.object({
    endpoint: z.string().default('localhost:50051'),
    token: z.string().default('mysecret'),
    insecure: z.boolean().default(true),
  }),
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
    cacheTtlSeconds: z.coerce.number().default(60),
    enabled: z.boolean().default(false), // Disabled for demo
  }),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  }),
});

// Export the parseBoolean helper for use in loadConfig
export { parseBoolean };

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    port: process.env.PORT,
    spicedb: {
      endpoint: process.env.SPICEDB_ENDPOINT,
      token: process.env.SPICEDB_TOKEN,
      insecure: parseBoolean(process.env.SPICEDB_INSECURE, true),
    },
    redis: {
      url: process.env.REDIS_URL,
      cacheTtlSeconds: process.env.REDIS_CACHE_TTL,
      enabled: parseBoolean(process.env.REDIS_ENABLED, false), // Default to disabled for demo
    },
    logging: {
      level: process.env.LOG_LEVEL,
    },
  });
}

