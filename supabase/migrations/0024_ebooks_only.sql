-- 0024 eBooks only
--
-- The platform sells digital eBooks. Print is not offered, so no new paperback
-- or hardcover format may be created, and a digital file always carries the
-- format it belongs to.
--
-- Nothing is deleted. The `book_format` enum keeps its historical values so old
-- rows and order snapshots still resolve, and the new constraint is NOT VALID:
-- it binds every future insert without rewriting or rejecting existing data.
-- (Verified before applying: book_formats currently holds 0 paperback and 0
-- hardcover rows.)

-- 1. A digital file must declare a format. `book_files_digital_kind` already
--    requires it for kinds ebook/pdf/interior; without a default every upload
--    from the author dashboard failed the check. eBooks only, so the default is
--    the ebook format.
alter table public.book_files
  alter column format set default 'ebook';

update public.book_files
   set format = 'ebook'
 where format is null
   and kind in ('ebook', 'pdf');

-- 2. Only the ebook format may be offered from now on.
alter table public.book_formats
  drop constraint if exists book_formats_ebook_only;

alter table public.book_formats
  add constraint book_formats_ebook_only check (format = 'ebook') not valid;

-- 3. Existing print formats, if any ever existed, are withdrawn from sale rather
--    than deleted, so past orders keep their references.
update public.book_formats
   set is_available = false
 where format <> 'ebook'
   and is_available;

comment on constraint book_formats_ebook_only on public.book_formats is
  'INKFREEDOMPUBLISHING sells eBooks only. Print formats are historical values in the enum, never offered for sale.';
