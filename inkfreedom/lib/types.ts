export type BookStatus = "draft" | "pending" | "published" | "rejected";
export type Role = "reader" | "author" | "admin";

export type Book = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  category: string;
  language: string;
  price_kobo: number;
  cover_path: string | null;
  ebook_path: string | null;
  ebook_format: "pdf" | "epub";
  ebook_size_bytes: number | null;
  pages: number | null;
  isbn: string | null;
  status: BookStatus;
  review_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Author = {
  id: string;
  profile_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  status: string;
  created_at: string;
};

export type BookWithAuthor = Book & {
  author: Pick<Author, "id" | "slug" | "name" | "tagline"> | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
  created_at: string;
};
