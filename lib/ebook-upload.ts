/**
 * The upload handshake between the browser and the server.
 *
 * A book file cannot be posted to a Server Action: Next.js caps a Server Action
 * body at 1 MB and the hosting platform caps any serverless request at ~4.5 MB,
 * while an eBook may be up to 200 MB. So the browser uploads the bytes straight
 * to Supabase Storage using a short-lived signed ticket, and the server only
 * ever handles a path.
 *
 * Nothing in this file is secret: the ticket is created on the server, bound to
 * one exact path, and the server re-checks the stored object before it is linked
 * to a book.
 */
import type { EbookKind } from "@/lib/ebooks";

export type StorageBucket = "book-covers" | "book-files";

/** A signed permission to write one object at one path. */
export type UploadTicket = {
  bucket: StorageBucket;
  path: string;
  token: string;
};

export type FileFacts = { name: string; size: number };

export type PrepareEbookInput = {
  title: string;
  description: string;
  authorName: string;
  categoryId: string;
  price: string;
  currency: string;
  intent: "submit" | "draft";
  cover: FileFacts;
  ebook: FileFacts;
};

export type PrepareEbookResult =
  | {
      ok: true;
      bookId: string;
      cover: UploadTicket;
      ebook: UploadTicket & { kind: EbookKind; extension: string };
    }
  | { ok: false; message: string };

export type FinalizeEbookInput = {
  bookId: string;
  coverPath: string;
  ebookPath: string;
  ebookName: string;
  intent: "submit" | "draft";
};

export type FinalizeEbookResult =
  | { ok: true; message: string; redirectTo: string }
  | { ok: false; message: string };

export type PrepareReplacementInput = {
  bookId: string;
  file: FileFacts;
};

export type PrepareReplacementResult =
  | {
      ok: true;
      ticket: UploadTicket;
      kind: EbookKind;
      extension: string;
    }
  | { ok: false; message: string };

export type FinalizeReplacementInput = {
  bookId: string;
  path: string;
  fileName: string;
};

export type FinalizeReplacementResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type PrepareCoverInput = { bookId: string; cover: FileFacts };

export type PrepareCoverResult =
  | { ok: true; ticket: UploadTicket }
  | { ok: false; message: string };

export type FinalizeCoverInput = { bookId: string; path: string };

export type FinalizeCoverResult =
  | { ok: true; message: string }
  | { ok: false; message: string };
