export interface Page {
  number: number;
  text: string;
}

export interface Book {
  title: string;
  language: string;
  total_pages: number;
  pages: Page[];
}
