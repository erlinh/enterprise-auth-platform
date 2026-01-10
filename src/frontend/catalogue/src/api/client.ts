import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/catalogue',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token will be set by the auth hook
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

export interface Application {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  launchUrl: string;
  category: string;
  status: string;
  isFeatured: boolean;
  isBeta: boolean;
  accessLevel: {
    canLaunch: boolean;
    canAdmin: boolean;
    permissionSummary: string;
  };
}

export interface ApplicationListResponse {
  applications: Application[];
  totalCount: number;
  categoryCounts: Record<string, number>;
}

export interface UserFavorites {
  userId: string;
  applicationIds: string[];
  updatedAt: string;
}

export const catalogueApi = {
  getApplications: async (category?: string): Promise<ApplicationListResponse> => {
    const params = category ? { category } : {};
    const response = await apiClient.get<ApplicationListResponse>('/applications', { params });
    return response.data;
  },

  getApplication: async (id: string): Promise<Application> => {
    const response = await apiClient.get<Application>(`/applications/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/applications/categories');
    return response.data;
  },

  getFavorites: async (): Promise<UserFavorites> => {
    const response = await apiClient.get<UserFavorites>('/favorites');
    return response.data;
  },

  setFavorites: async (applicationIds: string[]): Promise<void> => {
    await apiClient.put('/favorites', { applicationIds });
  },

  addFavorite: async (applicationId: string): Promise<void> => {
    await apiClient.post(`/favorites/${applicationId}`);
  },

  removeFavorite: async (applicationId: string): Promise<void> => {
    await apiClient.delete(`/favorites/${applicationId}`);
  },
};

export default apiClient;

