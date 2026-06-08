import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Book } from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class PdfApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/extract';

  extract(file: File): Observable<Book> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Book>(this.apiUrl, form).pipe(
      catchError((err: HttpErrorResponse) => {
        const msg =
          err.error?.detail ??
          (err.status === 0
            ? 'Cannot reach the server. Make sure the backend is running.'
            : `Server error ${err.status}`);
        return throwError(() => new Error(msg));
      })
    );
  }
}
