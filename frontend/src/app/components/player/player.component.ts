import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, skip } from 'rxjs';
import { Book } from '../../models/book.model';
import { SpeechService } from '../../services/speech.service';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen bg-slate-900 flex items-start justify-center overflow-hidden">
    <div class="w-full max-w-2xl h-full bg-slate-900 text-white flex flex-col shadow-2xl shadow-black/50">

      <!-- Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-900 shrink-0">
        <button
          class="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          (click)="onBack()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          New book
        </button>

        <div class="flex-1 text-center px-4">
          <h1 class="text-sm font-semibold text-white truncate max-w-xs mx-auto">{{ book.title }}</h1>
          <p class="text-xs text-slate-500 mt-0.5">{{ book.total_pages }} pages</p>
        </div>

        <div class="w-20"></div>
      </header>

      <!-- Page text -->
      <main class="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        <div class="max-w-2xl mx-auto px-6 py-10">
          <p class="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-6">
            Page {{ speech.pageIndex() + 1 }} of {{ book.total_pages }}
          </p>
          <div class="text-slate-300 text-lg leading-8 space-y-1">
            @for (chunk of pageChunks(); track $index) {
              <span
                class="transition-colors duration-150 rounded px-0.5"
                [class.bg-indigo-500]="chunk === speech.currentChunk() && speech.status() === 'playing'"
                [class.text-white]="chunk === speech.currentChunk() && speech.status() === 'playing'"
              >{{ chunk }}&nbsp;</span>
            }
          </div>
        </div>
      </main>

      <!-- Progress bar -->
      <div class="h-0.5 bg-slate-700">
        <div
          class="h-full bg-indigo-500 transition-all duration-500"
          [style.width.%]="speech.progress()"
        ></div>
      </div>

      <!-- Controls -->
      <footer class="bg-slate-800/80 backdrop-blur border-t border-slate-700/60 px-6 py-5">
        <!-- Main transport -->
        <div class="flex items-center justify-center gap-5 mb-5">
          <!-- Prev page -->
          <button
            class="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-30"
            [disabled]="speech.pageIndex() === 0"
            (click)="prevPage()"
            title="Previous page"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/>
            </svg>
          </button>

          <!-- Rewind 10s -->
          <button
            class="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            (click)="rewind()"
            title="Previous page"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          <!-- Play / Pause -->
          <button
            class="w-14 h-14 rounded-full flex items-center justify-center transition-all"
            [class]="speech.status() === 'playing' ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-500'"
            (click)="togglePlay()"
          >
            @if (speech.status() === 'playing') {
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            } @else {
              <svg class="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            }
          </button>

          <!-- Forward -->
          <button
            class="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            (click)="forward()"
            title="Next page"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>

          <!-- Next page -->
          <button
            class="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-30"
            [disabled]="speech.pageIndex() === book.total_pages - 1"
            (click)="nextPage()"
            title="Next page"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        <!-- Settings row -->
        <div class="flex items-center justify-between gap-4">
          <!-- Voice selector -->
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-slate-500 mb-1">Voice</label>
            <select
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              [(ngModel)]="selectedVoiceName"
              (ngModelChange)="onVoiceChange($event)"
            >
              <option value="">System default</option>
              @for (voice of voices(); track voice.name) {
                <option [value]="voice.name">{{ voice.name }}</option>
              }
            </select>
          </div>

          <!-- Speed selector -->
          <div class="w-32 shrink-0">
            <label class="block text-xs text-slate-500 mb-1">Speed</label>
            <select
              class="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              [(ngModel)]="selectedRate"
              (ngModelChange)="onRateChange($event)"
            >
              <option [value]="0.5">0.5×</option>
              <option [value]="0.75">0.75×</option>
              <option [value]="1">1×</option>
              <option [value]="1.25">1.25×</option>
              <option [value]="1.5">1.5×</option>
              <option [value]="2">2×</option>
            </select>
          </div>
        </div>
      </footer>

    </div>
    </div>
  `,
})
export class PlayerComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) book!: Book;
  @Input() initialPage = 0;
  @Output() back = new EventEmitter<void>();
  @Output() progressChanged = new EventEmitter<number>();

  readonly speech = inject(SpeechService);

  selectedVoiceName = '';
  selectedRate = 1;

  voices = signal<SpeechSynthesisVoice[]>([]);

  pageChunks = computed(() => {
    const page = this.book?.pages[this.speech.pageIndex()];
    if (!page) return [];
    return this.splitPageIntoChunks(page.text);
  });

  // Suppressed during ngOnChanges setup to avoid false progress writes
  private _initializing = false;

  constructor() {
    toObservable(this.speech.pageIndex).pipe(
      skip(1),
      distinctUntilChanged(),
      filter(() => !this._initializing),
      takeUntilDestroyed(),
    ).subscribe((idx) => this.progressChanged.emit(idx));
  }

  ngOnChanges(): void {
    if (this.book) {
      this._initializing = true;
      this.speech.loadBook(this.book.pages);
      if (this.initialPage > 0) {
        this.speech.goToPage(this.initialPage);
      }
      this.voices.set(this.speech.getVoices());
      // Allow microtask queue to flush before re-enabling progress tracking
      Promise.resolve().then(() => { this._initializing = false; });
    }
  }

  ngOnDestroy(): void {
    this.speech.stop();
  }

  togglePlay(): void {
    const s = this.speech.status();
    if (s === 'playing') {
      this.speech.pause();
    } else if (s === 'paused') {
      this.speech.resume();
    } else {
      this.speech.play();
    }
  }

  prevPage(): void {
    const idx = this.speech.pageIndex();
    if (idx > 0) this.speech.goToPage(idx - 1);
  }

  nextPage(): void {
    const idx = this.speech.pageIndex();
    if (idx < this.book.total_pages - 1) this.speech.goToPage(idx + 1);
  }

  rewind(): void {
    this.speech.goToPage(this.speech.pageIndex());
  }

  forward(): void {
    this.nextPage();
  }

  onVoiceChange(name: string): void {
    const voice = this.speech.getVoices().find((v) => v.name === name) ?? null;
    if (voice) {
      this.speech.setVoice(voice);
    }
    if (this.speech.status() === 'playing') {
      this.speech.play(this.speech.pageIndex());
    }
  }

  onRateChange(rate: number): void {
    this.speech.setRate(Number(rate));
    if (this.speech.status() === 'playing') {
      this.speech.play(this.speech.pageIndex());
    }
  }

  onBack(): void {
    this.speech.stop();
    this.back.emit();
  }

  private splitPageIntoChunks(text: string): string[] {
    const raw = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
    const result: string[] = [];
    const MAX = 180;
    for (const sentence of raw) {
      if (sentence.length <= MAX) {
        const t = sentence.trim();
        if (t) result.push(t);
      } else {
        const words = sentence.split(' ');
        let cur = '';
        for (const w of words) {
          if ((cur + ' ' + w).trim().length > MAX && cur) {
            result.push(cur.trim());
            cur = w;
          } else {
            cur = cur ? cur + ' ' + w : w;
          }
        }
        if (cur.trim()) result.push(cur.trim());
      }
    }
    return result;
  }
}
