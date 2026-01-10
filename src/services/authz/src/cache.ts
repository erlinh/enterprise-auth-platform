import Redis from 'ioredis';
import type { Config } from './config.js';
import type { Logger } from 'pino';

export class CacheService {
  private redis: Redis | null = null;
  private logger: Logger;
  private ttl: number;
  private enabled: boolean;

  constructor(config: Config, logger: Logger) {
    this.logger = logger.child({ component: 'cache' });
    this.ttl = config.redis.cacheTtlSeconds;
    this.enabled = config.redis.enabled;

    if (!this.enabled) {
      this.logger.info('Redis caching disabled');
      return;
    }

    try {
      this.redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('connect', () => {
        this.logger.info('Redis connected');
      });

      this.redis.on('error', (err) => {
        this.logger.warn({ error: err.message }, 'Redis error - caching disabled');
      });
    } catch (err) {
      this.logger.warn('Redis unavailable - caching disabled');
    }
  }

  private generateKey(prefix: string, params: Record<string, string>): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    return `authz:${prefix}:${sortedParams}`;
  }

  async getPermission(
    resourceType: string,
    resourceId: string,
    permission: string,
    subjectType: string,
    subjectId: string
  ): Promise<boolean | null> {
    if (!this.enabled || !this.redis) return null;

    const key = this.generateKey('perm', {
      rt: resourceType,
      ri: resourceId,
      p: permission,
      st: subjectType,
      si: subjectId,
    });

    try {
      const cached = await this.redis.get(key);
      if (cached !== null) {
        this.logger.debug({ key }, 'Cache hit');
        return cached === '1';
      }
    } catch (err) {
      this.logger.debug({ error: err }, 'Cache read error');
    }

    return null;
  }

  async setPermission(
    resourceType: string,
    resourceId: string,
    permission: string,
    subjectType: string,
    subjectId: string,
    allowed: boolean
  ): Promise<void> {
    if (!this.enabled || !this.redis) return;

    const key = this.generateKey('perm', {
      rt: resourceType,
      ri: resourceId,
      p: permission,
      st: subjectType,
      si: subjectId,
    });

    try {
      await this.redis.setex(key, this.ttl, allowed ? '1' : '0');
      this.logger.debug({ key, ttl: this.ttl }, 'Cache set');
    } catch (err) {
      this.logger.debug({ error: err }, 'Cache write error');
    }
  }

  async invalidateResource(resourceType: string, resourceId: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    const pattern = `authz:perm:*rt:${resourceType}:ri:${resourceId}*`;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug({ pattern, count: keys.length }, 'Cache invalidated');
      }
    } catch (err) {
      this.logger.debug({ error: err }, 'Cache invalidation error');
    }
  }

  async invalidateSubject(subjectType: string, subjectId: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    const pattern = `authz:perm:*st:${subjectType}:si:${subjectId}*`;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug({ pattern, count: keys.length }, 'Cache invalidated');
      }
    } catch (err) {
      this.logger.debug({ error: err }, 'Cache invalidation error');
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

