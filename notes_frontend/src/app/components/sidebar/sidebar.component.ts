import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteService } from '../../services/note.service';
import { Note, NoteTag } from '../../models/note.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly tags: (NoteTag | 'all')[] = ['all', 'work', 'personal', 'idea', 'todo', 'other'];

  // Initialize with defaults; sync after DI is ready
  search = signal<string>('');
  tag = signal<(NoteTag | 'all')>('all');
  favOnly = signal<boolean>(false);

  selectedId = computed(() => this.noteService.selectedNoteId());
  notes = computed<Note[]>(() => this.noteService.filteredNotes());

  constructor(private noteService: NoteService) {
    // Initialize signals from service once constructed
    this.search.set(this.noteService.searchQuery());
    this.tag.set(this.noteService.tagFilter());
    this.favOnly.set(this.noteService.showFavoritesOnly());

    // Sync local inputs when service state changes externally
    effect(() => {
      this.search.set(this.noteService.searchQuery());
      this.tag.set(this.noteService.tagFilter());
      this.favOnly.set(this.noteService.showFavoritesOnly());
    });
  }

  // PUBLIC_INTERFACE
  /** Create a new note and select it. */
  createNote() {
    this.noteService.createNote({ title: 'New note', content: '' });
  }

  // PUBLIC_INTERFACE
  /** Select a note for viewing/editing. */
  selectNote(id: string) {
    this.noteService.selectNote(id);
  }

  // PUBLIC_INTERFACE
  /** Delete a note by id. */
  deleteNote(id: string, event?: unknown) {
    const e = event as { stopPropagation?: () => void } | undefined;
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    this.noteService.deleteNote(id);
  }

  // PUBLIC_INTERFACE
  /** Toggle favorite filter */
  toggleFavOnly() {
    this.noteService.toggleFavoritesOnly();
  }

  // PUBLIC_INTERFACE
  /** Apply search text */
  onSearchChange(value: string) {
    this.noteService.setSearchQuery(value || '');
  }

  // PUBLIC_INTERFACE
  /** Apply tag filter */
  onTagChange(value: string) {
    const t = (value as NoteTag) || 'all';
    this.noteService.setTagFilter(t);
  }

  // PUBLIC_INTERFACE
  /** Toggle favorite state of a specific note */
  toggleFavorite(id: string, event?: unknown) {
    const e = event as { stopPropagation?: () => void } | undefined;
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    this.noteService.toggleFavorite(id);
  }

  trackById(_: number, n: Note) {
    return n.id;
  }
}
