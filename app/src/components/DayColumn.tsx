"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import JobCard from "./JobCard";
import type { Job } from "@/lib/types";

export default function DayColumn({
  date,
  label,
  isToday,
  jobs,
  onAddJob,
  onEditJob,
  onDeleteJob,
}: {
  date: string;
  label: string;
  isToday: boolean;
  jobs: Job[];
  onAddJob: () => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (job: Job) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayTotal = jobs.reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-xl border border-brand-cream-dark bg-brand-cream/60">
      <div
        className={`rounded-t-xl px-3 py-2 ${
          isToday ? "bg-brand-blue text-brand-navy" : "bg-brand-navy text-brand-cream"
        }`}
      >
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[11px] opacity-80">
          {jobs.length} job{jobs.length === 1 ? "" : "s"} · RM {dayTotal.toFixed(2)}
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? "bg-brand-blue/20" : ""
        }`}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={() => onEditJob(job)}
              onDelete={() => onDeleteJob(job)}
            />
          ))}
        </SortableContext>
      </div>
      <button
        onClick={onAddJob}
        className="m-2 mt-0 rounded-md border border-dashed border-brand-navy-light/40 py-1.5 text-xs font-medium text-brand-navy-light hover:bg-white"
      >
        + Add job
      </button>
    </div>
  );
}
