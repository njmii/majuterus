"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { addDays, addWeeks, format, isToday, startOfWeek, subWeeks } from "date-fns";
import DayColumn from "@/components/DayColumn";
import JobCard from "@/components/JobCard";
import JobModal from "@/components/JobModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Customer, Job } from "@/lib/types";

type JobsByDate = Record<string, Job[]>;

function weekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [jobsByDate, setJobsByDate] = useState<JobsByDate>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ date: string; job: Job | null } | null>(
    null
  );
  const [deleting, setDeleting] = useState<Job | null>(null);

  const dragSnapshotRef = useRef<JobsByDate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const dates = weekDates(weekStart);
  const rangeStart = format(dates[0], "yyyy-MM-dd");
  const rangeEnd = format(dates[6], "yyyy-MM-dd");

  async function loadJobs() {
    setLoading(true);
    const res = await fetch(`/api/jobs?start=${rangeStart}&end=${rangeEnd}`);
    const data = await res.json();
    const jobs: Job[] = data.jobs;
    const grouped: JobsByDate = {};
    for (const d of dates) {
      grouped[format(d, "yyyy-MM-dd")] = [];
    }
    for (const job of jobs) {
      if (!grouped[job.jobDate]) grouped[job.jobDate] = [];
      grouped[job.jobDate].push(job);
    }
    setJobsByDate(grouped);
    setLoading(false);
  }

  async function loadCustomers() {
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data.customers);
  }

  useEffect(() => {
    (async () => {
      await loadJobs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    (async () => {
      await loadCustomers();
    })();
  }, []);

  function findContainerOfJob(jobId: number): string | undefined {
    return Object.keys(jobsByDate).find((date) =>
      jobsByDate[date].some((j) => j.id === jobId)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    dragSnapshotRef.current = jobsByDate;
    setActiveId(Number(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = Number(active.id);
    const overId = over.id;

    const activeContainer = findContainerOfJob(activeId);
    const overContainer =
      typeof overId === "string" && overId in jobsByDate
        ? overId
        : findContainerOfJob(Number(overId));

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setJobsByDate((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((j) => j.id === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((j) => j.id === Number(overId));
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;
      const movedJob = { ...activeItems[activeIndex], jobDate: overContainer };

      return {
        ...prev,
        [activeContainer]: activeItems.filter((j) => j.id !== activeId),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          movedJob,
          ...overItems.slice(newIndex),
        ],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = Number(active.id);
    const overId = over.id;
    const container = findContainerOfJob(activeId);
    if (!container) return;

    setJobsByDate((prev) => {
      const items = prev[container];
      const activeIndex = items.findIndex((j) => j.id === activeId);
      if (activeIndex === -1) return prev;

      const overIsContainer = typeof overId === "string" && overId in prev;
      const overIndex = overIsContainer
        ? items.length - 1
        : items.findIndex((j) => j.id === Number(overId));

      const reordered =
        overIndex >= 0 && overIndex !== activeIndex
          ? arrayMove(items, activeIndex, overIndex)
          : items;

      const next = { ...prev, [container]: reordered };

      const before = dragSnapshotRef.current ?? prev;
      const changedDates = Object.keys(next).filter(
        (date) =>
          (next[date] ?? []).map((j) => j.id).join(",") !==
          (before[date] ?? []).map((j) => j.id).join(",")
      );
      if (changedDates.length) {
        persistColumns(changedDates, next);
      }
      dragSnapshotRef.current = null;

      return next;
    });
  }

  function handleDragCancel() {
    if (dragSnapshotRef.current) {
      setJobsByDate(dragSnapshotRef.current);
    }
    dragSnapshotRef.current = null;
    setActiveId(null);
  }

  async function persistColumns(dates: string[], state: JobsByDate) {
    const columns = dates.map((date) => ({
      date,
      orderedIds: (state[date] ?? []).map((j) => j.id),
    }));
    await fetch("/api/jobs/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columns }),
    });
  }

  async function handleDeleteJob() {
    if (!deleting) return;
    await fetch(`/api/jobs/${deleting.id}`, { method: "DELETE" });
    setDeleting(null);
    loadJobs();
  }

  const activeJob = activeId
    ? Object.values(jobsByDate)
        .flat()
        .find((j) => j.id === activeId) ?? null
    : null;

  const weekTotal = Object.values(jobsByDate)
    .flat()
    .reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Schedule</h1>
          <p className="text-sm text-brand-navy-light">
            Drag a job card to move it to another day, or reorder within a day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => subWeeks(d, 1))}
            className="rounded-md border border-brand-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-cream"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="rounded-md border border-brand-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-cream"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart((d) => addWeeks(d, 1))}
            className="rounded-md border border-brand-cream-dark bg-white px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-cream"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="mt-2 text-sm font-medium text-brand-navy-light">
        {format(dates[0], "d MMM")} – {format(dates[6], "d MMM yyyy")} · Week total: RM{" "}
        {weekTotal.toFixed(2)}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-brand-navy-light">Loading schedule...</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
            {dates.map((d) => {
              const dateKey = format(d, "yyyy-MM-dd");
              return (
                <DayColumn
                  key={dateKey}
                  date={dateKey}
                  label={`${format(d, "EEE")} ${format(d, "d MMM")}`}
                  isToday={isToday(d)}
                  jobs={jobsByDate[dateKey] ?? []}
                  onAddJob={() => setModal({ date: dateKey, job: null })}
                  onEditJob={(job) => setModal({ date: dateKey, job })}
                  onDeleteJob={(job) => setDeleting(job)}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeJob ? <JobCard job={activeJob} dragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {modal && (
        <JobModal
          date={modal.date}
          job={modal.job}
          customers={customers}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadJobs();
            loadCustomers();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete job?"
          message={`Remove ${deleting.customer.name}'s job from the schedule.`}
          onConfirm={handleDeleteJob}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
