import Image from "next/image";
import Link from "next/link";
import { listCustomers } from "@/lib/customers";
import { listJobsInRange } from "@/lib/jobs";

// Stats depend on live database state, so this page must render per request
// rather than being frozen into a static build-time snapshot.
export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekIso() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7; // Monday-start week
  now.setDate(now.getDate() - diff);
  return now.toISOString().slice(0, 10);
}

function endOfWeekIso() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7;
  now.setDate(now.getDate() - diff + 6);
  return now.toISOString().slice(0, 10);
}

export default async function Home() {
  const customers = listCustomers();
  const weekJobs = listJobsInRange(startOfWeekIso(), endOfWeekIso());
  const today = todayIso();
  const todaysJobs = weekJobs.filter((j) => j.jobDate === today);
  const weekTotal = weekJobs.reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
      <section className="flex flex-col items-center text-center gap-5">
        <span className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-white shadow-lg overflow-hidden flex items-center justify-center">
          <Image
            src="/logo.jpg"
            alt="Maju Terus Aircond Service logo"
            width={144}
            height={144}
            className="h-full w-full object-cover"
            priority
          />
        </span>
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-brand-navy">
            Maju Terus Aircond Service
          </h1>
          <p className="mt-2 text-sm sm:text-base text-brand-navy-light">
            Customer and job scheduling for the team.
          </p>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Customers" value={customers.length} />
        <StatCard label="Jobs today" value={todaysJobs.length} />
        <StatCard
          label="This week's total"
          value={`RM ${weekTotal.toFixed(2)}`}
        />
      </section>

      <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <NavCard
          href="/schedule"
          title="Schedule"
          description="View the weekly job board, add jobs, and drag-and-drop to rearrange timing."
        />
        <NavCard
          href="/customers"
          title="Customers"
          description="Add and update customer name, phone number, and address."
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-brand-cream-dark bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-brand-navy-light">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-brand-navy">{value}</p>
    </div>
  );
}

function NavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-brand-navy text-brand-cream p-6 shadow-md hover:bg-brand-navy-light transition-colors flex flex-col gap-2"
    >
      <span className="text-lg font-bold text-brand-blue">{title}</span>
      <span className="text-sm text-brand-cream/90">{description}</span>
    </Link>
  );
}
