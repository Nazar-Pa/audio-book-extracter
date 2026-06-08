import { Injectable, signal, computed } from '@angular/core';
import { Page } from '../models/book.model';

export type SpeechStatus = 'idle' | 'playing' | 'paused';

// Max chars per utterance — keeps each chunk well under the ~15 s Chrome limit
const MAX_CHUNK = 180;

@Injectable({ providedIn: 'root' })
export class SpeechService {
  private synth = window.speechSynthesis;
  private pages: Page[] = [];
  private chunks: string[] = [];
  private chunkIdx = 0;
  private _rate = 1;
  private _voice: SpeechSynthesisVoice | null = null;
  private _voices: SpeechSynthesisVoice[] = [];

  readonly status = signal<SpeechStatus>('idle');
  readonly pageIndex = signal(0);
  readonly currentChunk = signal('');

  readonly progress = computed(() =>
    this.pages.length > 0
      ? ((this.pageIndex() + 1) / this.pages.length) * 100
      : 0
  );

  constructor() {
    // Voices load asynchronously in some browsers
    this.synth.onvoiceschanged = () => {
      this._voices = this.synth.getVoices().filter((v) => v.lang.startsWith('en'));
    };
    this._voices = this.synth.getVoices().filter((v) => v.lang.startsWith('en'));
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this._voices;
  }

  loadBook(pages: Page[]): void {
    this.synth.cancel();
    this.pages = pages;
    this.status.set('idle');
    this.pageIndex.set(0);
    this.currentChunk.set('');
  }

  play(fromPage?: number): void {
    this.synth.cancel();
    if (fromPage !== undefined) {
      this.pageIndex.set(fromPage);
    }
    this.buildChunks(this.pageIndex());
    this.chunkIdx = 0;
    this.status.set('playing');
    this.speakNext();
  }

  pause(): void {
    this.synth.pause();
    this.status.set('paused');
  }

  resume(): void {
    this.synth.resume();
    this.status.set('playing');
  }

  stop(): void {
    this.synth.cancel();
    this.status.set('idle');
    this.currentChunk.set('');
  }

  goToPage(idx: number): void {
    const wasPlaying = this.status() === 'playing';
    this.synth.cancel();
    this.pageIndex.set(idx);
    this.buildChunks(idx);
    this.chunkIdx = 0;
    this.currentChunk.set('');
    if (wasPlaying) {
      this.status.set('playing');
      this.speakNext();
    } else {
      this.status.set('idle');
    }
  }

  setRate(rate: number): void {
    this._rate = rate;
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this._voice = voice;
  }

  private buildChunks(pageIdx: number): void {
    const text = this.pages[pageIdx]?.text ?? '';
    this.chunks = this.splitText(text);
  }

  private splitText(text: string): string[] {
    // Split on sentence boundaries first
    const raw = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
    const result: string[] = [];
    for (const sentence of raw) {
      if (sentence.length <= MAX_CHUNK) {
        const trimmed = sentence.trim();
        if (trimmed) result.push(trimmed);
      } else {
        // Break long sentences at word boundaries
        const words = sentence.split(' ');
        let current = '';
        for (const word of words) {
          if ((current + ' ' + word).trim().length > MAX_CHUNK && current) {
            result.push(current.trim());
            current = word;
          } else {
            current = current ? current + ' ' + word : word;
          }
        }
        if (current.trim()) result.push(current.trim());
      }
    }
    return result;
  }

  private speakNext(): void {
    if (this.status() !== 'playing') return;

    if (this.chunkIdx >= this.chunks.length) {
      // Move to next page
      const next = this.pageIndex() + 1;
      if (next < this.pages.length) {
        this.pageIndex.set(next);
        this.buildChunks(next);
        this.chunkIdx = 0;
        this.speakNext();
      } else {
        this.status.set('idle');
        this.currentChunk.set('');
      }
      return;
    }

    const chunk = this.chunks[this.chunkIdx];
    this.currentChunk.set(chunk);

    const utt = new SpeechSynthesisUtterance(chunk);
    utt.rate = this._rate;
    if (this._voice) utt.voice = this._voice;

    utt.onend = () => {
      if (this.status() === 'playing') {
        this.chunkIdx++;
        this.speakNext();
      }
    };

    utt.onerror = (e) => {
      // 'interrupted' fires when we cancel intentionally — ignore it
      if (e.error !== 'interrupted' && this.status() === 'playing') {
        this.chunkIdx++;
        this.speakNext();
      }
    };

    this.synth.speak(utt);
  }
}
