export interface Relationship {
  resource: string;
  relation: string;
  subject: string;
}

export interface CheckResult {
  allowed: boolean;
  cached: boolean;
  zedToken?: string;
}

export interface SchemaDefinition {
  name: string;
  type: 'definition';
  relations: string[];
  permissions: string[];
}

export interface User {
  id: string;
  displayName?: string;
  email?: string;
  organizations: string[];
  roles: string[];
}

export interface Organization {
  id: string;
  name: string;
  members: { userId: string; role: string }[];
}

export interface ResourceType {
  name: string;
  description: string;
  relations: { name: string; allowedTypes: string[] }[];
  permissions: { name: string; expression: string }[];
}
