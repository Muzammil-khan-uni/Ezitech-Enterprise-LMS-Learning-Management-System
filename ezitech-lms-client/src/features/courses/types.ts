export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonType = 'video' | 'pdf' | 'assignment' | 'download' | 'scorm';

export interface Category {
  _id: string;
  name: string;
  slug: string;
}

export interface Course {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  category: Category | string;
  tags: string[];
  prerequisites: string[];
  instructor: string;
  level: CourseLevel;
  status: CourseStatus;
  thumbnailUrl?: string;
  contentVersion: number;
  createdAt: string;
  price: number;
  language: string;
}

export interface Section {
  _id: string;
  course: string;
  title: string;
  order: number;
}

export interface Lesson {
  _id: string;
  course: string;
  section: string;
  title: string;
  order: number;
  lessonType: LessonType;
  isPreview: boolean;
  locked?: boolean;
  [key: string]: unknown;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}
