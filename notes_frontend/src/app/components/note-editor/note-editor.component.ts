import { CommonModule } from '@angular/common';
import { Component, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../services/note.service';
import { Note, NoteTag } from '../../models/note.model';

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
})
export class NoteEditorComponent {
  note = signal<Note | null>(null);
  allTags: NoteTag[] = ['work', 'personal', 'idea', 'todo', 'other'];
  isEmpty = computed(() => this.note() == null);

  constructor(private noteService: NoteService) {
    effect(() => {
      this.note.set(this.noteService.getSelectedNote());
    });
  }

  // PUBLIC_INTERFACE
  /** Update note title live */
  onTitleChange(value: string) {
    const current = this.note();
    if (!current) return;
    this.noteService.updateNote(current.id, { title: value });
    this.note.set({ ...current, title: value });
  }

  // PUBLIC_INTERFACE
  /** Update note content live */
  onContentChange(value: string) {
    const current = this.note();
    if (!current) return;
    this.noteService.updateNote(current.id, { content: value });
    this.note.set({ ...current, content: value });
  }

  // PUBLIC_INTERFACE
  /** Toggle a tag on/off for the note */
  toggleTag(tag: NoteTag) {
    const current = this.note();
    if (!current) return;
    const has = current.tags.includes(tag);
    const tags = has ? current.tags.filter((t) => t !== tag) : [...current.tags, tag];
    this.noteService.updateNote(current.id, { tags });
    this.note.set({ ...current, tags });
  }

  // PUBLIC_INTERFACE
  /** Toggle favorite state of current note */
  toggleFavorite() {
    const current = this.note();
    if (!current) return;
    this.noteService.toggleFavorite(current.id);
    this.note.set({ ...current, favorite: !current.favorite });
  }

  // PUBLIC_INTERFACE
  /** Delete current note */
  deleteCurrent() {
    const current = this.note();
    if (!current) return;
    this.noteService.deleteNote(current.id);
    this.note.set(this.noteService.getSelectedNote());
  }

  isTagActive(tag: NoteTag): boolean {
    const current = this.note();
    return !!current?.tags.includes(tag);
  }
}
