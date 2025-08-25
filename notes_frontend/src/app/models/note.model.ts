export type NoteTag = 'work' | 'personal' | 'idea' | 'todo' | 'other';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  tags: NoteTag[];
  favorite?: boolean;
}
