import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-editorial flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow text-gold-deep">404</p>
      <h1 className="mt-4 font-display text-4xl leading-tight text-navy sm:text-5xl">
        This page isn’t on the shelf
      </h1>
      <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-charcoal-soft">
        The page you were looking for may have moved, or the link may have been
        mistyped. The catalogue is the best place to start again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/books"
          className="bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
        >
          Discover books
        </Link>
        <Link
          href="/"
          className="border border-navy/20 px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
        >
          Back home
        </Link>
      </div>
    </section>
  );
}
