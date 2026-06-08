import { Component, inject, signal } from '@angular/core';
import { Book } from './models/book.model';
import { LibraryService, SavedBook } from './services/library.service';
import { LibraryComponent } from './components/library/library.component';
import { UploadComponent } from './components/upload/upload.component';
import { PlayerComponent } from './components/player/player.component';

type View = 'library' | 'upload' | 'player';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LibraryComponent, UploadComponent, PlayerComponent],
  template: `
    @switch (view()) {
      @case ('library') {
        <app-library
          (add)="view.set('upload')"
          (open)="openBook($event)"
        />
      }
      @case ('upload') {
        <app-upload
          (bookReady)="onBookReady($event)"
          (back)="view.set('library')"
        />
      }
      @case ('player') {
        <app-player
          [book]="activeBook()!.book"
          [initialPage]="activeBook()!.lastPageIndex"
          (back)="view.set('library')"
          (progressChanged)="onProgressChanged($event)"
        />
      }
    }
  `,
})
export class App {
  view = signal<View>('library');
  activeBook = signal<SavedBook | null>(null);

  private library = inject(LibraryService);

  async onBookReady(book: Book): Promise<void> {
    const id = await this.library.save(book);
    const saved = this.library.books().find((b) => b.id === id)!;
    this.activeBook.set(saved);
    this.view.set('player');
  }

  openBook(saved: SavedBook): void {
    this.activeBook.set(saved);
    this.view.set('player');
  }

  async onProgressChanged(pageIndex: number): Promise<void> {
    const saved = this.activeBook();
    if (!saved) return;
    // Guard: don't overwrite real progress with a spurious 0 during init
    if (pageIndex === 0 && saved.lastPageIndex > 0) return;
    await this.library.updateProgress(saved.id, pageIndex);
    // Keep the in-memory activeBook in sync so the badge updates immediately
    this.activeBook.set({ ...saved, lastPageIndex: pageIndex });
  }
}
