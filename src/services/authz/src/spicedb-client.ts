import { v1 } from '@authzed/authzed-node';
import type { Config } from './config.js';
import type { Logger } from 'pino';

export interface CheckPermissionRequest {
  resourceType: string;
  resourceId: string;
  permission: string;
  subjectType: string;
  subjectId: string;
  subjectRelation?: string;
}

export interface CheckPermissionResult {
  allowed: boolean;
  checkedAt?: string;
}

export interface WriteRelationshipRequest {
  resourceType: string;
  resourceId: string;
  relation: string;
  subjectType: string;
  subjectId: string;
  subjectRelation?: string;
}

export interface DeleteRelationshipRequest {
  resourceType: string;
  resourceId: string;
  relation: string;
  subjectType: string;
  subjectId: string;
  subjectRelation?: string;
}

export interface LookupResourcesRequest {
  resourceType: string;
  permission: string;
  subjectType: string;
  subjectId: string;
  subjectRelation?: string;
}

export interface LookupSubjectsRequest {
  resourceType: string;
  resourceId: string;
  permission: string;
  subjectType: string;
  subjectRelation?: string;
}

export interface BulkCheckRequest {
  checks: CheckPermissionRequest[];
}

export interface BulkCheckResult {
  results: Array<{
    request: CheckPermissionRequest;
    allowed: boolean;
  }>;
  checkedAt?: string;
}

export class SpiceDBClient {
  private client: v1.ZedPromiseClientInterface;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.logger = logger.child({ component: 'spicedb-client' });

    // Create client with appropriate security level
    const security = config.spicedb.insecure
      ? v1.ClientSecurity.INSECURE_LOCALHOST_ALLOWED
      : v1.ClientSecurity.SECURE;

    // Create client with token in metadata
    this.client = v1.NewClient(
      config.spicedb.token,
      config.spicedb.endpoint,
      security
    ).promises;

    this.logger.info({ endpoint: config.spicedb.endpoint }, 'SpiceDB client initialized');
  }

  async checkPermission(req: CheckPermissionRequest): Promise<CheckPermissionResult> {
    this.logger.debug({ request: req }, 'Checking permission');

    try {
      const response = await this.client.checkPermission(
        v1.CheckPermissionRequest.create({
          resource: v1.ObjectReference.create({
            objectType: req.resourceType,
            objectId: req.resourceId,
          }),
          permission: req.permission,
          subject: v1.SubjectReference.create({
            object: v1.ObjectReference.create({
              objectType: req.subjectType,
              objectId: req.subjectId,
            }),
            optionalRelation: req.subjectRelation,
          }),
          consistency: v1.Consistency.create({
            requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true },
          }),
        })
      );

      const allowed =
        response.permissionship ===
        v1.CheckPermissionResponse_Permissionship.HAS_PERMISSION;

      this.logger.debug({ request: req, allowed }, 'Permission check result');

      return {
        allowed,
        checkedAt: response.checkedAt?.token,
      };
    } catch (error) {
      this.logger.error({ error, request: req }, 'Permission check failed');
      return { allowed: false };
    }
  }

  async bulkCheck(req: BulkCheckRequest): Promise<BulkCheckResult> {
    this.logger.debug({ count: req.checks.length }, 'Bulk checking permissions');

    const results = await Promise.all(
      req.checks.map(async (check) => {
        const result = await this.checkPermission(check);
        return {
          request: check,
          allowed: result.allowed,
        };
      })
    );

    return {
      results,
    };
  }

  async writeRelationship(req: WriteRelationshipRequest): Promise<string> {
    this.logger.debug({ request: req }, 'Writing relationship');

    try {
      const response = await this.client.writeRelationships(
        v1.WriteRelationshipsRequest.create({
          updates: [
            v1.RelationshipUpdate.create({
              operation: v1.RelationshipUpdate_Operation.TOUCH,
              relationship: v1.Relationship.create({
                resource: v1.ObjectReference.create({
                  objectType: req.resourceType,
                  objectId: req.resourceId,
                }),
                relation: req.relation,
                subject: v1.SubjectReference.create({
                  object: v1.ObjectReference.create({
                    objectType: req.subjectType,
                    objectId: req.subjectId,
                  }),
                  optionalRelation: req.subjectRelation,
                }),
              }),
            }),
          ],
        })
      );

      this.logger.info({ request: req }, 'Relationship written');
      return response.writtenAt?.token ?? '';
    } catch (error) {
      this.logger.error({ error, request: req }, 'Write relationship failed');
      throw error;
    }
  }

  async deleteRelationship(req: DeleteRelationshipRequest): Promise<string> {
    this.logger.debug({ request: req }, 'Deleting relationship');

    try {
      const response = await this.client.writeRelationships(
        v1.WriteRelationshipsRequest.create({
          updates: [
            v1.RelationshipUpdate.create({
              operation: v1.RelationshipUpdate_Operation.DELETE,
              relationship: v1.Relationship.create({
                resource: v1.ObjectReference.create({
                  objectType: req.resourceType,
                  objectId: req.resourceId,
                }),
                relation: req.relation,
                subject: v1.SubjectReference.create({
                  object: v1.ObjectReference.create({
                    objectType: req.subjectType,
                    objectId: req.subjectId,
                  }),
                  optionalRelation: req.subjectRelation,
                }),
              }),
            }),
          ],
        })
      );

      this.logger.info({ request: req }, 'Relationship deleted');
      return response.writtenAt?.token ?? '';
    } catch (error) {
      this.logger.error({ error, request: req }, 'Delete relationship failed');
      throw error;
    }
  }

  async lookupResources(req: LookupResourcesRequest): Promise<string[]> {
    this.logger.debug({ request: req }, 'Looking up resources');

    try {
      const resources: string[] = [];
      const responses = await this.client.lookupResources(
        v1.LookupResourcesRequest.create({
          resourceObjectType: req.resourceType,
          permission: req.permission,
          subject: v1.SubjectReference.create({
            object: v1.ObjectReference.create({
              objectType: req.subjectType,
              objectId: req.subjectId,
            }),
            optionalRelation: req.subjectRelation,
          }),
          consistency: v1.Consistency.create({
            requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true },
          }),
        })
      );

      // Handle as array of responses
      for (const response of responses) {
        if (response.resourceObjectId) {
          resources.push(response.resourceObjectId);
        }
      }

      this.logger.debug({ request: req, count: resources.length }, 'Resources found');
      return resources;
    } catch (error) {
      this.logger.error({ error, request: req }, 'Lookup resources failed');
      return [];
    }
  }

  async lookupSubjects(req: LookupSubjectsRequest): Promise<string[]> {
    this.logger.debug({ request: req }, 'Looking up subjects');

    try {
      const subjects: string[] = [];
      const responses = await this.client.lookupSubjects(
        v1.LookupSubjectsRequest.create({
          resource: v1.ObjectReference.create({
            objectType: req.resourceType,
            objectId: req.resourceId,
          }),
          permission: req.permission,
          subjectObjectType: req.subjectType,
          optionalSubjectRelation: req.subjectRelation,
          consistency: v1.Consistency.create({
            requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true },
          }),
        })
      );

      for (const response of responses) {
        if (response.subject?.subjectObjectId) {
          subjects.push(response.subject.subjectObjectId);
        }
      }

      this.logger.debug({ request: req, count: subjects.length }, 'Subjects found');
      return subjects;
    } catch (error) {
      this.logger.error({ error, request: req }, 'Lookup subjects failed');
      return [];
    }
  }

  async readRelationships(
    resourceType: string,
    resourceId?: string,
    relation?: string
  ): Promise<Array<{ resource: string; relation: string; subject: string }>> {
    this.logger.debug({ resourceType, resourceId, relation }, 'Reading relationships');

    try {
      const relationships: Array<{ resource: string; relation: string; subject: string }> = [];
      
      const filter = v1.RelationshipFilter.create({
        resourceType,
        optionalResourceId: resourceId,
        optionalRelation: relation,
      });

      const responses = await this.client.readRelationships(
        v1.ReadRelationshipsRequest.create({
          relationshipFilter: filter,
          consistency: v1.Consistency.create({
            requirement: { oneofKind: 'fullyConsistent', fullyConsistent: true },
          }),
        })
      );

      for (const response of responses) {
        if (response.relationship) {
          const rel = response.relationship;
          relationships.push({
            resource: `${rel.resource?.objectType}:${rel.resource?.objectId}`,
            relation: rel.relation,
            subject: `${rel.subject?.object?.objectType}:${rel.subject?.object?.objectId}${
              rel.subject?.optionalRelation ? `#${rel.subject.optionalRelation}` : ''
            }`,
          });
        }
      }

      return relationships;
    } catch (error) {
      this.logger.error({ error }, 'Read relationships failed');
      return [];
    }
  }
}
