import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { SpiceDBClient } from './spicedb-client.js';
import type { CacheService } from './cache.js';
import type { Logger } from 'pino';

// Request validation schemas
const checkPermissionSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  permission: z.string().min(1),
  subjectType: z.string().min(1),
  subjectId: z.string().min(1),
  subjectRelation: z.string().optional(),
});

const bulkCheckSchema = z.object({
  checks: z.array(checkPermissionSchema),
});

const writeRelationshipSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  relation: z.string().min(1),
  subjectType: z.string().min(1),
  subjectId: z.string().min(1),
  subjectRelation: z.string().optional(),
});

const deleteRelationshipSchema = writeRelationshipSchema;

const lookupResourcesSchema = z.object({
  resourceType: z.string().min(1),
  permission: z.string().min(1),
  subjectType: z.string().min(1),
  subjectId: z.string().min(1),
  subjectRelation: z.string().optional(),
});

const lookupSubjectsSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  permission: z.string().min(1),
  subjectType: z.string().min(1),
  subjectRelation: z.string().optional(),
});

export function createRoutes(
  spicedb: SpiceDBClient,
  cache: CacheService,
  logger: Logger
): Router {
  const router = Router();
  const log = logger.child({ component: 'routes' });

  // Health check
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Check single permission
  router.post('/check', async (req: Request, res: Response) => {
    try {
      const body = checkPermissionSchema.parse(req.body);

      // Check cache first
      const cached = await cache.getPermission(
        body.resourceType,
        body.resourceId,
        body.permission,
        body.subjectType,
        body.subjectId
      );

      if (cached !== null) {
        return res.json({ allowed: cached, cached: true });
      }

      const result = await spicedb.checkPermission(body);

      // Cache the result
      await cache.setPermission(
        body.resourceType,
        body.resourceId,
        body.permission,
        body.subjectType,
        body.subjectId,
        result.allowed
      );

      res.json({ allowed: result.allowed, cached: false, zedToken: result.checkedAt });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      log.error({ error: err }, 'Check permission error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Bulk check permissions
  router.post('/check/bulk', async (req: Request, res: Response) => {
    try {
      const body = bulkCheckSchema.parse(req.body);
      const result = await spicedb.bulkCheck(body);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      log.error({ error: err }, 'Bulk check error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Write relationship
  router.post('/relationships', async (req: Request, res: Response) => {
    try {
      const body = writeRelationshipSchema.parse(req.body);
      const zedToken = await spicedb.writeRelationship(body);

      // Invalidate cache for affected resource and subject
      await Promise.all([
        cache.invalidateResource(body.resourceType, body.resourceId),
        cache.invalidateSubject(body.subjectType, body.subjectId),
      ]);

      res.status(201).json({ success: true, zedToken });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      log.error({ error: err }, 'Write relationship error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete relationship
  router.delete('/relationships', async (req: Request, res: Response) => {
    try {
      const body = deleteRelationshipSchema.parse(req.body);
      const zedToken = await spicedb.deleteRelationship(body);

      // Invalidate cache
      await Promise.all([
        cache.invalidateResource(body.resourceType, body.resourceId),
        cache.invalidateSubject(body.subjectType, body.subjectId),
      ]);

      res.json({ success: true, zedToken });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      log.error({ error: err }, 'Delete relationship error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lookup resources a subject can access
  router.post('/lookup/resources', async (req: Request, res: Response) => {
    try {
      const body = lookupResourcesSchema.parse(req.body);
      const resources = await spicedb.lookupResources(body);
      res.json({ resources });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      log.error({ error: err }, 'Lookup resources error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Lookup subjects with access to a resource
  router.post('/lookup/subjects', async (req: Request, res: Response) => {
    try {
      const body = lookupSubjectsSchema.parse(req.body);
      const subjects = await spicedb.lookupSubjects(body);
      res.json({ subjects });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: err.errors });
      }
      log.error({ error: err }, 'Lookup subjects error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Read relationships with query params (must be before :resourceType route)
  router.get('/relationships', async (req: Request, res: Response) => {
    try {
      const { resourceType, resourceId, relation } = req.query;

      if (!resourceType) {
        return res.status(400).json({ error: 'resourceType is required' });
      }

      const relationships = await spicedb.readRelationships(
        resourceType as string,
        resourceId as string | undefined,
        relation as string | undefined
      );

      res.json({ relationships });
    } catch (err) {
      log.error({ error: err }, 'Read relationships error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Read relationships with path param (legacy support)
  router.get('/relationships/:resourceType', async (req: Request, res: Response) => {
    try {
      const { resourceType } = req.params;
      const { resourceId, relation } = req.query;

      const relationships = await spicedb.readRelationships(
        resourceType,
        resourceId as string | undefined,
        relation as string | undefined
      );

      res.json({ relationships });
    } catch (err) {
      log.error({ error: err }, 'Read relationships error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get schema (for admin UI)
  router.get('/schema', async (_req: Request, res: Response) => {
    try {
      // Read schema from file
      const fs = await import('fs/promises');
      const path = await import('path');
      const schemaPath = path.join(process.cwd(), '..', '..', '..', 'schemas', 'spicedb', 'schema.zed');
      
      try {
        const schema = await fs.readFile(schemaPath, 'utf-8');
        res.json({ schema });
      } catch {
        // Fallback: try another path
        const altPath = path.join(process.cwd(), 'schemas', 'spicedb', 'schema.zed');
        try {
          const schema = await fs.readFile(altPath, 'utf-8');
          res.json({ schema });
        } catch {
          res.json({ schema: '', error: 'Schema file not found' });
        }
      }
    } catch (err) {
      log.error({ error: err }, 'Get schema error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

