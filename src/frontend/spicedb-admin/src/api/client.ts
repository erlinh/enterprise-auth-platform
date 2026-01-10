import axios from 'axios';
import type { Relationship, CheckResult } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Permission check
export async function checkPermission(
  resourceType: string,
  resourceId: string,
  permission: string,
  subjectType: string,
  subjectId: string
): Promise<CheckResult> {
  const { data } = await api.post('/check', {
    resourceType,
    resourceId,
    permission,
    subjectType,
    subjectId,
  });
  return data;
}

// Write relationship
export async function writeRelationship(
  resourceType: string,
  resourceId: string,
  relation: string,
  subjectType: string,
  subjectId: string
): Promise<{ token: string }> {
  const { data } = await api.post('/relationships', {
    resourceType,
    resourceId,
    relation,
    subjectType,
    subjectId,
  });
  return data;
}

// Delete relationship
export async function deleteRelationship(
  resourceType: string,
  resourceId: string,
  relation: string,
  subjectType: string,
  subjectId: string
): Promise<void> {
  await api.delete('/relationships', {
    data: {
      resourceType,
      resourceId,
      relation,
      subjectType,
      subjectId,
    },
  });
}

// Read relationships
export async function readRelationships(
  resourceType: string,
  resourceId?: string,
  relation?: string
): Promise<Relationship[]> {
  const params = new URLSearchParams({ resourceType });
  if (resourceId) params.append('resourceId', resourceId);
  if (relation) params.append('relation', relation);
  
  const { data } = await api.get(`/relationships?${params}`);
  return data.relationships || [];
}

// Lookup resources a subject has access to
export async function lookupResources(
  resourceType: string,
  permission: string,
  subjectType: string,
  subjectId: string
): Promise<string[]> {
  const { data } = await api.post('/lookup/resources', {
    resourceType,
    permission,
    subjectType,
    subjectId,
  });
  return data.resourceIds || [];
}

// Lookup subjects with access to a resource
export async function lookupSubjects(
  resourceType: string,
  resourceId: string,
  permission: string,
  subjectType: string
): Promise<string[]> {
  const { data } = await api.post('/lookup/subjects', {
    resourceType,
    resourceId,
    permission,
    subjectType,
  });
  return data.subjectIds || [];
}

// Get schema (we'll add this endpoint to AuthZ service)
export async function getSchema(): Promise<string> {
  try {
    const { data } = await api.get('/schema');
    return data.schema || '';
  } catch {
    return '';
  }
}
