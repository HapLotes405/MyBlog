import {
  ApiResponse,
  PaginatedResponse,
  BlogPost,
  Comment,
  PersonalInfo,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  GameScore,
  LeaderboardEntry,
  UploadedFile,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ===== Token Management =====
const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// ===== HTTP Request Helper =====
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===== Auth API =====
export const authApi = {
  login: (login: string, password: string): Promise<ApiResponse<AuthResponse>> =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),

  register: (username: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  me: (): Promise<ApiResponse<{ user: AuthResponse['user'] }>> =>
    request<{ user: AuthResponse['user'] }>('/auth/me', {
      headers: authHeaders(),
    }),

  changePassword: (currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ===== Blog API =====
export const blogApi = {
  list: (page = 1, tag?: string, pageSize = 10): Promise<ApiResponse<BlogPost[]>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (tag) params.set('tag', tag);
    return request<BlogPost[]>(`/posts?${params.toString()}`);
  },

  getBySlug: (slug: string, count = true): Promise<ApiResponse<BlogPost>> =>
    request<BlogPost>(`/posts/${slug}${count ? '' : '?count=false'}`),

  create: (data: Partial<BlogPost>): Promise<ApiResponse<BlogPost>> =>
    request<BlogPost>('/posts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<BlogPost>): Promise<ApiResponse<BlogPost>> =>
    request<BlogPost>(`/posts/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<ApiResponse<null>> =>
    request<null>(`/posts/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  tags: (): Promise<ApiResponse<string[]>> =>
    request<string[]>('/posts/tags'),
};

// ===== Comment API =====
export const commentApi = {
  list: (postIdOrSlug: string): Promise<ApiResponse<Comment[]>> =>
    request<Comment[]>(`/posts/${postIdOrSlug}/comments`),

  create: (postIdOrSlug: string, content: string, parentId?: string): Promise<ApiResponse<Comment>> =>
    request<Comment>(`/posts/${postIdOrSlug}/comments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content, parentId }),
    }),

  delete: (commentId: string): Promise<ApiResponse<null>> =>
    request<null>(`/comments/${commentId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
};

// ===== Interaction API =====
export const interactionApi = {
  like: (postIdOrSlug: string): Promise<ApiResponse<{ liked: boolean }>> =>
    request<{ liked: boolean }>(`/posts/${postIdOrSlug}/like`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  unlike: (postIdOrSlug: string): Promise<ApiResponse<{ liked: boolean }>> =>
    request<{ liked: boolean }>(`/posts/${postIdOrSlug}/like`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  favorite: (postIdOrSlug: string): Promise<ApiResponse<{ favorited: boolean }>> =>
    request<{ favorited: boolean }>(`/posts/${postIdOrSlug}/favorite`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  unfavorite: (postIdOrSlug: string): Promise<ApiResponse<{ favorited: boolean }>> =>
    request<{ favorited: boolean }>(`/posts/${postIdOrSlug}/favorite`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  myFavorites: (): Promise<ApiResponse<BlogPost[]>> =>
    request<BlogPost[]>('/user/favorites', {
      headers: authHeaders(),
    }),

  myLikes: (): Promise<ApiResponse<BlogPost[]>> =>
    request<BlogPost[]>('/user/likes', {
      headers: authHeaders(),
    }),
};

// ===== User Profile API =====
export const userApi = {
  getProfile: (): Promise<ApiResponse<AuthResponse['user']>> =>
    request<AuthResponse['user']>('/user/profile', {
      headers: authHeaders(),
    }),

  updateProfile: (data: { nickname?: string; avatar?: string }): Promise<ApiResponse<AuthResponse['user']>> =>
    request<AuthResponse['user']>('/user/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),
};

// ===== Profile API =====
export const profileApi = {
  get: (): Promise<ApiResponse<PersonalInfo>> =>
    request<PersonalInfo>('/profile'),

  update: (data: Partial<PersonalInfo>): Promise<ApiResponse<PersonalInfo>> =>
    request<PersonalInfo>('/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),
};

// ===== Game API =====
export const gameApi = {
  /** Submit or update a score (auth required). Returns the saved score with isNewBest flag. */
  submitScore: (level: number, timeMs: number): Promise<ApiResponse<GameScore>> =>
    request<GameScore>('/game-scores', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ level, timeMs }),
    }),

  /** Get leaderboard for a specific level (public). */
  getLeaderboard: (level: number, limit = 20): Promise<ApiResponse<LeaderboardEntry[]>> =>
    request<LeaderboardEntry[]>(`/game-scores?level=${level}&limit=${limit}`),
};

// ===== Upload API =====
export const uploadApi = {
  uploadImage: async (file: File): Promise<ApiResponse<{ url: string; filename: string; size: number; type: 'image' | 'video' }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE}/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  },

  downloadImage: async (imageUrl: string): Promise<ApiResponse<{ url: string; filename: string; size: number; type: 'image' }>> => {
    const url = `${API_BASE}/upload/download-url`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ url: imageUrl }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Download failed');
    }
    return data;
  },
};

// ===== Files API =====
export const filesApi = {
  /** Upload any file (image, video, document) — unified upload endpoint */
  upload: async (file: File): Promise<ApiResponse<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    type: 'image' | 'video' | 'document';
    fileId?: string;
  }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE}/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  },

  /** List uploaded files (paginated, optional post filter) */
  list: (page = 1, postId?: string, pageSize = 20): Promise<PaginatedResponse<UploadedFile>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (postId) params.set('postId', postId);
    return request<UploadedFile[]>(`/files?${params.toString()}`) as Promise<PaginatedResponse<UploadedFile>>;
  },

  /** Delete a file (blogger only) */
  delete: (fileId: string): Promise<ApiResponse<null>> =>
    request<null>(`/files/${fileId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
};

// ===== AI API =====
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  model?: string;
}

export const aiApi = {
  chat: async (messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<ApiResponse<AIChatResponse>> => {
    const url = `${API_BASE}/ai/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        messages,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'AI request failed');
    }
    return data;
  },
};
