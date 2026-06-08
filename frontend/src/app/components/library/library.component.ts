import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LibraryService, SavedBook } from '../../services/library.service';

// Deterministic accent color per book title
const ACCENT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
];

function accentColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col">

      <!-- Header -->
      <header class="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h1 class="text-lg font-bold text-white">My Audiobooks</h1>
          </div>

          <button
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            (click)="add.emit()"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Book
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 max-w-5xl mx-auto w-full px-6 py-8">

        @if (library.books().length === 0) {
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center py-32 text-center">
            <div class="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
              <svg class="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p class="text-white text-lg font-medium mb-2">No audiobooks yet</p>
            <p class="text-slate-500 text-sm mb-6">Upload a PDF to get started</p>
            <button
              class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              (click)="add.emit()"
            >Upload your first PDF</button>
          </div>
        } @else {
          <!-- Book grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            @for (item of library.books(); track item.id) {
              <div
                class="group relative flex flex-col bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] hover:shadow-xl transition-all duration-200"
                (click)="open.emit(item)"
              >
                <!-- Cover -->
                <div
                  class="h-28 flex items-end justify-between p-3"
                  [style.background]="gradient(item.title)"
                >
                  <svg class="w-6 h-6 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/>
                  </svg>
                  @if (item.lastPageIndex > 0) {
                    <span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-white text-xs font-medium">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Resume
                    </span>
                  }
                </div>

                <!-- Info -->
                <div class="p-3 flex-1">
                  <h3 class="text-white text-xs font-semibold leading-tight line-clamp-2">{{ item.title }}</h3>
                  <p class="text-slate-400 text-xs mt-1.5">{{ item.totalPages }} pages</p>
                  <p class="text-slate-600 text-xs mt-0.5">{{ formatDate(item.savedAt) }}</p>
                </div>

                <!-- Delete -->
                <button
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
                  title="Delete"
                  (click)="onDelete($event, item.id)"
                >
                  <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

              </div>
            }
          </div>
        }

      </main>
    </div>
  `,
})
export class LibraryComponent {
  @Output() add = new EventEmitter<void>();
  @Output() open = new EventEmitter<SavedBook>();

  readonly library = inject(LibraryService);

  gradient(title: string): string {
    const c = accentColor(title);
    return `linear-gradient(135deg, ${c}cc, ${c}66)`;
  }

  formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async onDelete(e: MouseEvent, id: string): Promise<void> {
    e.stopPropagation();
    await this.library.remove(id);
  }
}
