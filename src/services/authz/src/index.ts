import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { loadConfig } from './config.js';
import { SpiceDBClient } from './spicedb-client.js';
import { CacheService } from './cache.js';
import { createRoutes } from './routes.js';

async function main() {
  const config = loadConfig();

  const logger = pino({
    level: config.logging.level,
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });

  logger.info({ config: { ...config, spicedb: { ...config.spicedb, token: '***' } } }, 'Starting AuthZ service');

  // Initialize services
  const spicedb = new SpiceDBClient(config, logger);
  const cache = new CacheService(config, logger);

  // Create Express app
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    })
  );

  // CORS for local development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount routes
  app.use('/api/v1', createRoutes(spicedb, cache, logger));

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error: err }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'AuthZ service listening');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    await cache.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start AuthZ service:', err);
  process.exit(1);
});

