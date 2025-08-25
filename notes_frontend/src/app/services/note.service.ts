import { Injectable, signal, computed } from '@angular/core';
import { Note, NoteTag } from '../models/note.model';

/**
 * Service responsible for managing notes in localStorage with reactive signals.
 * Includes CRUD operations, search, filtering, and selection handling.
 */
@Injectable({ providedIn: 'root' })
export class NoteService {
  private static STORAGE_KEY = 'notes_app_storage_v1';
  private static PREFERENCES_KEY = 'notes_app_prefs_v1';

  // Signals for reactive data
  private notesSignal = signal<Note[]>([]);
  private searchQuerySignal = signal<string>('');
  private tagFilterSignal = signal<NoteTag | 'all'>('all');
  private selectedNoteIdSignal = signal<string | null>(null);
  private showFavoritesOnlySignal = signal<boolean>(false);

  // Derived/computed lists
  readonly notes = computed(() => this.notesSignal());
  readonly selectedNoteId = computed(() => this.selectedNoteIdSignal());
  readonly searchQuery = computed(() => this.searchQuerySignal());
  readonly tagFilter = computed(() => this.tagFilterSignal());
  readonly showFavoritesOnly = computed(() => this.showFavoritesOnlySignal());

  readonly filteredNotes = computed(() => {
    const q = this.searchQuerySignal().trim().toLowerCase();
    const tag = this.tagFilterSignal();
    const favOnly = this.showFavoritesOnlySignal();
    return this.notesSignal()
      .filter((n) => (tag === 'all' ? true : n.tags.includes(tag)))
      .filter((n) => (favOnly ? !!n.favorite : true))
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  constructor() {
    this.loadFromStorage();
  }

  // PUBLIC_INTERFACE
  /**
   * Create a new note with default content and add it to the top of the list.
   * @param partial Optional fields to initialize the note.
   * @returns The created Note.
   */
  createNote(partial?: Partial<Note>): Note {
    const now = new Date().toISOString();
    const globalCrypto = (globalThis as any)?.crypto as { randomUUID?: () => string } | undefined;
    const id =
      globalCrypto && typeof globalCrypto.randomUUID === 'function'
        ? globalCrypto.randomUUID!()
        : `note_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const newNote: Note = {
      id,
      title: partial?.title?.trim() || 'Untitled note',
      content: partial?.content || '',
      createdAt: now,
      updatedAt: now,
      tags: partial?.tags?.length ? partial.tags : ['other'],
      favorite: partial?.favorite ?? false,
    };
    this.notesSignal.update((prev) => [newNote, ...prev]);
    this.persist();
    this.selectNote(newNote.id);
    return newNote;
  }

  // PUBLIC_INTERFACE
  /**
   * Update an existing note by id.
   * @param id Note id
   * @param updates Partial note fields to update
   */
  updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) {
    this.notesSignal.update((list) =>
      list.map((n) =>
        n.id === id
          ? { ...n, ...updates, updatedAt: new Date().toISOString() }
          : n
      )
    );
    this.persist();
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a note by id. If the deleted note is selected, clear selection or select next available.
   * @param id Note id to delete
   */
  deleteNote(id: string) {
    const wasSelected = this.selectedNoteIdSignal() === id;
    this.notesSignal.update((list) => list.filter((n) => n.id !== id));
    this.persist();
    if (wasSelected) {
      const first = this.notesSignal()[0];
      this.selectedNoteIdSignal.set(first ? first.id : null);
      this.persistPrefs();
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Toggle favorite state for a note.
   * @param id Note id
   */
  toggleFavorite(id: string) {
    const note = this.notesSignal().find((n) => n.id === id);
    if (!note) return;
    this.updateNote(id, { favorite: !note.favorite });
  }

  // PUBLIC_INTERFACE
  /**
   * Select a note by id for detail view/edit.
   * @param id Note id
   */
  selectNote(id: string | null) {
    this.selectedNoteIdSignal.set(id);
    this.persistPrefs();
  }

  // PUBLIC_INTERFACE
  /**
   * Get currently selected note.
   * @returns Note or null
   */
  getSelectedNote(): Note | null {
    const id = this.selectedNoteIdSignal();
    return id ? this.notesSignal().find((n) => n.id === id) ?? null : null;
  }

  // PUBLIC_INTERFACE
  /**
   * Set the search query used to filter notes.
   * @param q Search string
   */
  setSearchQuery(q: string) {
    this.searchQuerySignal.set(q);
    this.persistPrefs();
  }

  // PUBLIC_INTERFACE
  /**
   * Set the tag filter.
   * @param tag Tag name or 'all'
   */
  setTagFilter(tag: NoteTag | 'all') {
    this.tagFilterSignal.set(tag);
    this.persistPrefs();
  }

  // PUBLIC_INTERFACE
  /**
   * Toggle the "favorites only" filter.
   */
  toggleFavoritesOnly() {
    this.showFavoritesOnlySignal.set(!this.showFavoritesOnlySignal());
    this.persistPrefs();
  }

  private loadFromStorage() {
    try {
      const ls = (typeof globalThis !== 'undefined' && (globalThis as any).localStorage)
        ? ((globalThis as any).localStorage as { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void })
        : null;
      const raw = ls ? ls.getItem(NoteService.STORAGE_KEY) : null;
      const prefsRaw = ls ? ls.getItem(NoteService.PREFERENCES_KEY) : null;
      const notes: Note[] = raw ? JSON.parse(raw) : [];

      // If no notes, seed with a welcome note
      if (notes.length === 0) {
        const first = this.createNote({
          title: 'Welcome to Notes',
          content:
            'Start typing your thoughts here. Use the sidebar to search, filter by tags, and manage your notes.',
          tags: ['personal'],
          favorite: true,
        });
        this.selectNote(first.id);
      } else {
        this.notesSignal.set(notes);
      }

      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw);
        if (prefs.selectedNoteId) this.selectedNoteIdSignal.set(prefs.selectedNoteId);
        if (prefs.searchQuery !== undefined) this.searchQuerySignal.set(prefs.searchQuery);
        if (prefs.tagFilter !== undefined) this.tagFilterSignal.set(prefs.tagFilter);
        if (prefs.showFavoritesOnly !== undefined)
          this.showFavoritesOnlySignal.set(prefs.showFavoritesOnly);
      } else {
        // Ensure a selected note exists
        const first = this.notesSignal()[0];
        this.selectedNoteIdSignal.set(first ? first.id : null);
      }
    } catch {
      // reset in case of parse errors
      this.notesSignal.set([]);
      this.selectedNoteIdSignal.set(null);
      this.searchQuerySignal.set('');
      this.tagFilterSignal.set('all');
      this.showFavoritesOnlySignal.set(false);
    }
    this.persist(); // keep storage in sync
    this.persistPrefs();
  }

  private persist() {
    const ls = (typeof globalThis !== 'undefined' && (globalThis as any).localStorage)
      ? ((globalThis as any).localStorage as { setItem: (k: string, v: string) => void })
      : null;
    if (!ls) return;
    ls.setItem(NoteService.STORAGE_KEY, JSON.stringify(this.notesSignal()));
  }

  private persistPrefs() {
    const prefs = {
      selectedNoteId: this.selectedNoteIdSignal(),
      searchQuery: this.searchQuerySignal(),
      tagFilter: this.tagFilterSignal(),
      showFavoritesOnly: this.showFavoritesOnlySignal(),
    };
    const ls = (typeof globalThis !== 'undefined' && (globalThis as any).localStorage)
      ? ((globalThis as any).localStorage as { setItem: (k: string, v: string) => void })
      : null;
    if (!ls) return;
    ls.setItem(NoteService.PREFERENCES_KEY, JSON.stringify(prefs));
  }
}
