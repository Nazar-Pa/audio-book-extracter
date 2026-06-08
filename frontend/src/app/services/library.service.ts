import { Injectable, signal } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { Book } from '../models/book.model';

export interface SavedBook {
  id: string;
  title: string;
  totalPages: number;
  savedAt: number;
  lastPageIndex: number;
  book: Book;
}

const DB_NAME = 'audiobook-library';
const DB_VERSION = 1;
const STORE = 'books';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private dbp: Promise<IDBPDatabase>;

  readonly books = signal<SavedBook[]>([]);

  constructor() {
    this.dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      },
    });
    this.reload();
  }

  async save(book: Book): Promise<string> {
    const db = await this.dbp;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: SavedBook = {
      id,
      title: book.title,
      totalPages: book.total_pages,
      savedAt: Date.now(),
      lastPageIndex: 0,
      book,
    };
    await db.put(STORE, entry);
    await this.reload();
    return id;
  }

  async updateProgress(id: string, pageIndex: number): Promise<void> {
    const db = await this.dbp;
    const entry: SavedBook | undefined = await db.get(STORE, id);
    if (!entry) return;
    entry.lastPageIndex = pageIndex;
    await db.put(STORE, entry);
    await this.reload();
  }

  async remove(id: string): Promise<void> {
    const db = await this.dbp;
    await db.delete(STORE, id);
    await this.reload();
  }

  private async reload(): Promise<void> {
    const db = await this.dbp;
    const all: SavedBook[] = await db.getAll(STORE);
    all.sort((a, b) => b.savedAt - a.savedAt);
    this.books.set(all);
  }
}
