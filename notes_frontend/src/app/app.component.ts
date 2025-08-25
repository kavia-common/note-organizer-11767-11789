import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NoteEditorComponent } from './components/note-editor/note-editor.component';

@Component({
  selector: 'app-root',
  imports: [SidebarComponent, NoteEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {}
