// My Documents page data types

// Document kind types
export type DocKind = "pdf" | "csv" | "ppt" | "doc";
export type SimpleKind = "pdf" | "csv" | "ppt" | "doc";

// Document item structure
export interface DocItem {
  id: string;
  name: string;
  kind: DocKind;
  createdAt: Date;
  url: string;
}

// Uploaded file structure
export interface UploadedFile {
  name: string;
  url: string;
  kind: SimpleKind;
}

// Document section structure
export interface DocSection {
  title: string;
  items: DocItem[];
}

