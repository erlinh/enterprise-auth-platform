import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/authz/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let getTokenFn: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

apiClient.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    const token = await getTokenFn();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface Relationship {
  resource: string;
  relation: string;
  subject: string;
}

export interface CheckPermissionRequest {
  resourceType: string;
  resourceId: string;
  permission: string;
  subjectType: string;
  subjectId: string;
}

export interface CheckPermissionResult {
  allowed: boolean;
  cached?: boolean;
  zedToken?: string;
}

export interface WriteRelationshipRequest {
  resourceType: string;
  resourceId: string;
  relation: string;
  subjectType: string;
  subjectId: string;
}

export const authzApi = {
  checkPermission: async (request: CheckPermissionRequest): Promise<CheckPermissionResult> => {
    const response = await apiClient.post<CheckPermissionResult>('/check', request);
    return response.data;
  },

  writeRelationship: async (request: WriteRelationshipRequest): Promise<void> => {
    await apiClient.post('/relationships', request);
  },

  deleteRelationship: async (request: WriteRelationshipRequest): Promise<void> => {
    await apiClient.delete('/relationships', { data: request });
  },

  lookupResources: async (
    resourceType: string,
    permission: string,
    subjectType: string,
    subjectId: string
  ): Promise<string[]> => {
    const response = await apiClient.post<{ resources: string[] }>('/lookup/resources', {
      resourceType,
      permission,
      subjectType,
      subjectId,
    });
    return response.data.resources;
  },

  lookupSubjects: async (
    resourceType: string,
    resourceId: string,
    permission: string,
    subjectType: string
  ): Promise<string[]> => {
    const response = await apiClient.post<{ subjects: string[] }>('/lookup/subjects', {
      resourceType,
      resourceId,
      permission,
      subjectType,
    });
    return response.data.subjects;
  },

  readRelationships: async (
    resourceType: string,
    resourceId?: string,
    relation?: string
  ): Promise<Relationship[]> => {
    const params = new URLSearchParams();
    if (resourceId) params.set('resourceId', resourceId);
    if (relation) params.set('relation', relation);

    const response = await apiClient.get<{ relationships: Relationship[] }>(
      `/relationships/${resourceType}?${params.toString()}`
    );
    return response.data.relationships;
  },
};

export default apiClient;

