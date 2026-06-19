// ===== Shared Types (aligned with frontend `types/index.ts`) =====

export interface User {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  bio: string;
  role: 'blogger' | 'user';
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
  parentId: string | null;
  replies: Comment[];
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
  email: string;
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
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ===== Database row types (snake_case, matching PostgreSQL columns) =====

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar: string;
  bio: string;
  role: 'blogger' | 'user';
  created_at: string | Date; // pg returns TIMESTAMPTZ as Date
}

export interface BlogRow {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  cover_image: string;
  tags: string[];        // JSONB → pg auto-parses to array
  author_id: number;
  reading_time: number;
  likes_count: number;
  favorites_count: number;
  views: number;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CommentRow {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  parent_id: number | null;
  likes_count: number;
  created_at: string | Date;
}

export interface PersonalInfoRow {
  id: number;
  name: string;
  nickname: string;
  avatar: string;
  cover_image: string;
  title: string;
  bio: string;
  location: string;
  email: string;
  social_links: SocialLink[];  // JSONB → auto-parsed
  skills: string[];             // JSONB → auto-parsed
  timeline: TimelineItem[];     // JSONB → auto-parsed
  interests: Interest[];        // JSONB → auto-parsed
  photos: string[];             // JSONB → auto-parsed
}

export interface FileRow {
  id: number;
  uuid_filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  post_id: number | null;
  uploaded_by: number;
  download_count: number;
  created_at: string | Date;
}
