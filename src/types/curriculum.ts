export interface Lesson {
  id: string;
  title: string;
  summary: string;
  content: string; // markdown
  estimatedMinutes: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Track {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  modules: Module[];
}