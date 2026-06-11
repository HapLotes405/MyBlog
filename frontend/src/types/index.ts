export interface User {
  id: string;
  username: string;
  email?: string;
  nickname: string;
  avatar: string;
  bio: string;
  role?: 'blogger' | 'user';
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  coverImage: string;
  tags: string[];
  author: User;
  createdAt: string;
  updatedAt: string;
  readingTime: number;
  likes: number;
  favorites: number;
  views: number;
}

export interface Comment {
  id: string;
  postId: string;
  author: User;
  content: string;
  createdAt: string;
  likes: number;
  replies: Comment[];
  parentId: string | null;
}

export interface TimelineItem {
  id: string;
  type: 'education' | 'work' | 'milestone';
  title: string;
  organization: string;
  description: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
}

export interface Interest {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface PersonalInfo {
  name: string;
  nickname: string;
  avatar: string;
  coverImage: string;
  title: string;
  bio: string;
  location: string;
  socialLinks: SocialLink[];
  skills: string[];
  timeline: TimelineItem[];
  interests: Interest[];
  photos: string[];
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginRequest {
  login: string;  // username or email
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
