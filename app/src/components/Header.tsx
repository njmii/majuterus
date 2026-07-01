import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-brand-navy text-brand-cream sticky top-0 z-40 shadow-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white overflow-hidden shrink-0">
            <Image
              src="/logo.jpg"
              alt="Maju Terus Aircond Service logo"
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
              priority
            />
          </span>
          <span className="leading-tight">
            <span className="block font-bold tracking-wide text-sm sm:text-base">
              MAJU TERUS
            </span>
            <span className="block text-[10px] sm:text-xs uppercase tracking-widest text-brand-blue">
              Aircond Service
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/schedule"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-navy-light transition-colors"
          >
            Schedule
          </Link>
          <Link
            href="/customers"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-navy-light transition-colors"
          >
            Customers
          </Link>
        </nav>
      </div>
    </header>
  );
}
