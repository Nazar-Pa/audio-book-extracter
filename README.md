# AudioBook Generator

A full-stack web application that converts English PDF books into audiobooks using the browser's built-in Text-to-Speech engine. Upload a PDF, and the app extracts the text, stores the book locally in your browser, and reads it aloud — no cloud TTS service, no audio files, no ongoing cost.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Browser Compatibility](#browser-compatibility)

---

## Features

### Library
- **Persistent book library** — every book you upload is saved to IndexedDB and survives browser restarts. No account or cloud storage required.
- **Book cards** — each saved book displays as a card with a deterministic accent colour derived from the title, the page count, and the date it was saved.
- **Resume badge** — cards where you have previously started listening show a "Resume" pill so you can immediately see which books are in progress.
- **Delete** — hover a card to reveal a trash-icon button that permanently removes the book from your library.

### Upload
- **Drag-and-drop or file picker** — drop a PDF anywhere on the upload zone, or click to browse.
- **English-only gate** — the backend samples the first five pages and runs language detection. Non-English PDFs are rejected with a clear error message before any data is stored.
- **File validation** — only `.pdf` files are accepted; files larger than 50 MB are rejected.
- **Title inference** — the book title is taken from the PDF filename (underscores and dashes replaced with spaces). If the filename is uninformative the first line of page one is used instead.

### Player
- **Page-by-page reading** — the book is read one page at a time. The current page's text is shown in a large, comfortable reading area.
- **Sentence highlighting** — the exact sentence currently being spoken is highlighted in indigo so you can follow along visually.
- **Playback controls**
  - Play / Pause
  - Restart current page (rewind to beginning of the page without losing your place in the book)
  - Previous page / Next page (skips to the adjacent page; if audio is playing it restarts from that page)
- **Speed control** — choose from six playback speeds: 0.5×, 0.75×, 1×, 1.25×, 1.5×, and 2×. Changing speed while playing restarts the current page at the new rate immediately.
- **Voice selection** — a dropdown lists every English-language voice installed on the device. Changing the voice while playing restarts the current page with the new voice immediately.
- **Progress bar** — a thin bar at the bottom of the player shows overall reading progress through the whole book (not just the current page).
- **Resume from last position** — when you return to a book from the library, the player opens on the exact page you last reached. The book's progress is updated in IndexedDB every time the page changes, including automatic advances when speech reaches the end of a page.
- **Viewport-locked layout** — the player is always fully visible. The text area scrolls independently inside the screen; the header and playback controls never scroll off-screen regardless of how long the current page is.
- **Custom scrollbar** — the text area uses a slim, styled scrollbar that matches the dark theme.
- **Centred, readable column** — the player is capped at a comfortable reading width (`max-w-2xl`) and centred on the screen.

---

## Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| **Angular** | 21 | Application framework — standalone components, signals-based reactivity |
| **Tailwind CSS** | 3 | Utility-first styling |
| **TypeScript** | 5 | Type-safe application code |
| **Web Speech API** | Browser built-in | Text-to-speech synthesis — no external TTS service |
| **IndexedDB** (`idb`) | 8 | Persistent client-side storage for the book library and reading progress |
| **RxJS** | (bundled with Angular) | `toObservable` + `takeUntilDestroyed` for reactive progress tracking |

#### Key Angular patterns used
- **Standalone components** — every component declares its own imports; there is no `NgModule`.
- **Signals** — `signal()`, `computed()`, and `effect()` replace `BehaviorSubject` / `async` pipe for all reactive state (playback status, current page, current sentence, library contents).
- **`inject()`** — dependency injection is done with the `inject()` function rather than constructor parameters.
- **New control flow** — templates use `@if`, `@for`, `@switch` / `@case` (Angular 17+ block syntax) instead of `*ngIf` / `*ngFor`.
- **`toObservable` + `takeUntilDestroyed`** — the player converts the `pageIndex` signal to an RxJS observable to apply `skip(1)` and `distinctUntilChanged` filtering for accurate progress-change detection without spurious writes during initialisation.

### Backend

| Technology | Version | Role |
|---|---|---|
| **Python** | 3.9+ | Runtime |
| **FastAPI** | 0.115 | REST API framework with automatic OpenAPI docs |
| **Uvicorn** | 0.30 | ASGI server |
| **pdfplumber** | 0.11 | PDF text extraction |
| **langdetect** | 1.0.9 | Language identification |
| **pydantic** | (bundled with FastAPI) | Request / response validation and serialisation |
| **python-multipart** | 0.0.12 | Multipart form-data parsing for file uploads |

---

## Architecture Overview

```
Browser
│
├─ LibraryComponent      — home screen, book card grid
├─ UploadComponent       — drag-and-drop PDF upload form
└─ PlayerComponent       — reading view with playback controls
        │
        ├─ PdfApiService    — HTTP POST to backend, returns structured book data
        ├─ SpeechService    — wraps window.speechSynthesis, manages chunk queue
        └─ LibraryService   — IndexedDB CRUD via idb (save / load / update / delete)

FastAPI Backend (localhost:8000)
│
└─ POST /api/extract
        ├─ Validates file type and size
        ├─ Extracts text with pdfplumber (page by page)
        ├─ Cleans whitespace and non-ASCII garbage
        ├─ Detects language with langdetect
        └─ Returns { title, language, total_pages, pages[] }
```

The backend is only involved once per book — at upload time. Everything after that (playback, library, progress) happens entirely in the browser with no server dependency.

---

## Project Structure

```
audio-book-generator/
│
├── backend/
│   ├── main.py                  # FastAPI app — single file
│   └── requirements.txt
│
└── frontend/
    ├── tailwind.config.js
    ├── src/
    │   ├── styles.css            # Tailwind directives + custom scrollbar
    │   ├── index.html
    │   └── app/
    │       ├── app.ts            # Root component — view router (library/upload/player)
    │       ├── app.config.ts     # provideHttpClient()
    │       ├── models/
    │       │   └── book.model.ts         # Book, Page interfaces
    │       ├── services/
    │       │   ├── pdf-api.service.ts    # HTTP extraction call
    │       │   ├── speech.service.ts     # Web Speech API wrapper
    │       │   └── library.service.ts    # IndexedDB via idb
    │       └── components/
    │           ├── library/
    │           │   └── library.component.ts   # Book card grid
    │           ├── upload/
    │           │   └── upload.component.ts    # Drag-and-drop upload
    │           └── player/
    │               └── player.component.ts    # Audio player UI
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.9+
- A modern browser (Chrome, Edge, or Safari recommended — see [Browser Compatibility](#browser-compatibility))

### 1 — Install and start the backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs (Swagger UI) are at `http://localhost:8000/docs`.

### 2 — Install and start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:4200`.

> Both processes must be running at the same time. The frontend talks to the backend only during the upload step.

---

## How It Works

### PDF extraction (backend)

1. The user selects or drops a PDF in the browser.
2. The frontend posts the file as `multipart/form-data` to `POST /api/extract`.
3. **pdfplumber** opens the PDF from memory (no disk writes) and extracts raw text from each page.
4. Each page's text is cleaned — consecutive whitespace is collapsed and non-printable characters are stripped.
5. Pages that yield no text after cleaning (e.g. image-only pages) are skipped silently.
6. The first 3 000 characters of the first five pages are sampled and passed to **langdetect**. If the detected language is not `en`, a 422 error is returned and the upload is rejected.
7. The book title is inferred from the filename. Underscores and dashes are replaced with spaces. If the filename is not useful, the first line of the first page is used instead.
8. The response is a JSON object containing the title, language code, total readable page count, and an array of `{ number, text }` objects for each page.

### Text-to-speech (browser)

The `SpeechService` wraps the browser's `window.speechSynthesis` API:

1. **Chunking** — each page's text is split into utterances at sentence boundaries (`.`, `!`, `?`). Sentences longer than 180 characters are further split at word boundaries. This keeps every utterance short enough to avoid the ~15-second Chrome synthesis pause bug that affects long single utterances.
2. **Chained queue** — utterances are not queued all at once. Instead, each utterance's `onend` callback immediately calls `speakNext()` to dispatch the next chunk. This avoids Chrome's limit on queued utterances.
3. **Auto page advance** — when all chunks for a page are exhausted, `speakNext()` automatically increments the page index and begins reading the next page.
4. **Error resilience** — the `onerror` handler ignores the `interrupted` error code (which fires on intentional `cancel()` calls) and skips forward for any other error.
5. **Voice filtering** — only voices whose `lang` starts with `en` are offered in the UI.
6. **Reactive state** — `status`, `pageIndex`, `currentChunk`, and `progress` are Angular signals, so the UI updates instantly with zero manual change detection.

### Library persistence (browser)

The `LibraryService` uses **IndexedDB** via the `idb` wrapper library:

- Books are stored in an object store keyed by a `timestamp-random` ID.
- The full `Book` object (all page text) is stored alongside metadata (title, page count, save date, last page index).
- A `books` signal is kept in sync with the database after every write. Components that inject `LibraryService` react to changes automatically.
- Reading progress (`lastPageIndex`) is updated every time the player's page index changes — both from manual navigation and from the speech engine's automatic page advance.
- An initialisation guard prevents a spurious write of `pageIndex = 0` from overwriting real progress when the player opens a book mid-way through.

---

## API Reference

### `POST /api/extract`

Upload a PDF and receive structured text.

**Request**

| Field | Type | Description |
|---|---|---|
| `file` | `multipart/form-data` | The PDF file to process |

**Response `200 OK`**

```json
{
  "title": "My Book",
  "language": "en",
  "total_pages": 312,
  "pages": [
    { "number": 1, "text": "Chapter 1 ..." },
    { "number": 2, "text": "..." }
  ]
}
```

> Note: `total_pages` reflects the number of pages that contained extractable text, which may be less than the physical page count of the PDF if some pages are image-only.

**Error responses**

| Status | Condition |
|---|---|
| `400` | File is not a PDF, or exceeds 50 MB |
| `422` | PDF contains no readable text, or detected language is not English |

### `GET /health`

Returns `{ "status": "ok" }`. Useful for checking that the backend is running.

---

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| Web Speech API | ✅ Full support | ✅ Full support | ⚠️ Limited voices | ✅ macOS/iOS voices |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Custom scrollbar styling | ✅ | ✅ | ✅ (thin) | ✅ |

**Chrome and Edge** offer the widest range of voices and the most reliable speech synthesis behaviour. Firefox supports the API but typically only exposes a small number of system voices. Safari works well on macOS and iOS using the platform's native voices.

The application does not support scanned / image-only PDFs since there is no OCR layer. PDFs must contain selectable text.
