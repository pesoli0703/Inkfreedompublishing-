import { describe, expect, it } from "vitest";
import {
  COVER_MAX_BYTES,
  EBOOK_MAX_BYTES,
  describeEbookFile,
  ebookKindLabel,
  priceCurrencyOptions,
} from "@/lib/ebooks";

describe("describeEbookFile", () => {
  it("recognises a PDF by extension", () => {
    expect(describeEbookFile({ name: "novel.pdf", type: "application/pdf" })).toEqual({
      kind: "pdf",
      extension: "pdf",
      label: "PDF",
    });
  });

  it("recognises an EPUB even when the browser sends no MIME type", () => {
    expect(describeEbookFile({ name: "novel.EPUB", type: "" })).toEqual({
      kind: "ebook",
      extension: "epub",
      label: "EPUB",
    });
  });

  it("refuses anything that is not a PDF or an EPUB", () => {
    expect(describeEbookFile({ name: "novel.docx", type: "application/msword" })).toBeNull();
    expect(describeEbookFile({ name: "cover.jpg", type: "image/jpeg" })).toBeNull();
    expect(describeEbookFile({ name: "no-extension", type: "text/plain" })).toBeNull();
  });

  it("falls back to the MIME type only when the name carries no extension", () => {
    expect(describeEbookFile({ name: "download", type: "application/epub+zip" })?.kind).toBe(
      "ebook",
    );
    expect(describeEbookFile({ name: "download", type: "application/pdf" })?.kind).toBe("pdf");
  });

  it("does not accept a file that merely claims to be a PDF in its name alone", () => {
    expect(describeEbookFile({ name: "novel.pdf.exe" })).toBeNull();
  });
});

describe("ebookKindLabel", () => {
  it("names the two editions the platform sells", () => {
    expect(ebookKindLabel("pdf")).toBe("PDF");
    expect(ebookKindLabel("ebook")).toBe("EPUB");
  });
});

describe("priceCurrencyOptions", () => {
  it("always offers the NGN base price", () => {
    const options = priceCurrencyOptions([]);
    expect(options).toHaveLength(1);
    expect(options[0].code).toBe("NGN");
  });

  it("only offers a currency the platform holds a rate for", () => {
    const options = priceCurrencyOptions([{ quote_currency: "usd" }]);
    expect(options.map((option) => option.code)).toEqual(["NGN", "USD"]);
  });
});

describe("upload limits", () => {
  it("matches the database check on book_files.size_bytes", () => {
    expect(EBOOK_MAX_BYTES).toBe(209_715_200);
  });

  it("keeps the cover limit well under the size of a book", () => {
    expect(COVER_MAX_BYTES).toBeLessThan(EBOOK_MAX_BYTES);
  });
});
