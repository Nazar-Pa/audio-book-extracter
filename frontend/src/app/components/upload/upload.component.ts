import {
  Component,
  EventEmitter,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../../models/book.model';
import { PdfApiService } from '../../services/pdf-api.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <!-- Back to library -->
      <button
        class="absolute top-5 left-5 flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        (click)="back.emit()"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Library
      </button>

      <div class="w-full max-w-xl">

        <!-- Logo + heading -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
            <svg class="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">AudioBook Generator</h1>
          <p class="text-slate-400">Upload an English PDF to start listening</p>
        </div>

        <!-- Drop zone -->
        <div
          class="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
          [class]="dropZoneClass()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input
            #fileInput
            type="file"
            accept=".pdf,application/pdf"
            class="hidden"
            (change)="onFileSelected($event)"
          />

          <div class="py-14 px-8 text-center">
            @if (!selectedFile()) {
              <svg class="w-12 h-12 mx-auto mb-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-white font-medium mb-1">Drop your PDF here</p>
              <p class="text-slate-400 text-sm">or click to browse &nbsp;·&nbsp; English PDFs only</p>
            } @else {
              <svg class="w-10 h-10 mx-auto mb-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-white font-semibold truncate max-w-xs mx-auto">{{ selectedFile()!.name }}</p>
              <p class="text-slate-400 text-sm mt-1">{{ formatSize(selectedFile()!.size) }}</p>
              <button
                class="mt-3 text-xs text-slate-500 hover:text-red-400 transition-colors"
                (click)="clearFile($event)"
              >Remove</button>
            }
          </div>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ error() }}</span>
          </div>
        }

        <!-- Submit -->
        <button
          class="mt-6 w-full py-4 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2"
          [class]="submitClass()"
          [disabled]="!selectedFile() || isLoading()"
          (click)="upload()"
        >
          @if (isLoading()) {
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Extracting text…
          } @else {
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Generate Audiobook
          }
        </button>

      </div>
    </div>
  `,
})
export class UploadComponent {
  @Output() bookReady = new EventEmitter<Book>();
  @Output() back = new EventEmitter<void>();

  private api = inject(PdfApiService);

  selectedFile = signal<File | null>(null);
  isLoading = signal(false);
  isDragging = signal(false);
  error = signal('');

  dropZoneClass() {
    if (this.isDragging()) return 'border-indigo-400 bg-indigo-500/10';
    if (this.selectedFile()) return 'border-indigo-500/50 bg-indigo-500/5';
    return 'border-slate-600 bg-slate-800/40 hover:border-slate-500';
  }

  submitClass() {
    if (!this.selectedFile() || this.isLoading()) {
      return 'bg-slate-700 text-slate-500 cursor-not-allowed';
    }
    return 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  clearFile(e: MouseEvent): void {
    e.stopPropagation();
    this.selectedFile.set(null);
    this.error.set('');
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setFile(file: File): void {
    this.error.set('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.error.set('Only PDF files are supported.');
      return;
    }
    this.selectedFile.set(file);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set('');

    this.api.extract(file).subscribe({
      next: (book) => {
        this.isLoading.set(false);
        this.bookReady.emit(book);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
