"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Job } from "@/lib/types";

export default function JobCard({
  job,
  onEdit,
  onDelete,
  dragOverlay = false,
}: {
  job: Job;
  onEdit?: () => void;
  onDelete?: () => void;
  dragOverlay?: boolean;
}) {
  const sortable = useSortable({ id: job.id, disabled: dragOverlay });
  const style = dragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      };

  return (
    <div
      ref={dragOverlay ? undefined : sortable.setNodeRef}
      style={style}
      className={`rounded-lg border border-brand-cream-dark bg-white p-3 shadow-sm ${
        !dragOverlay && sortable.isDragging ? "opacity-40" : ""
      } ${dragOverlay ? "shadow-xl rotate-1" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span
          {...(dragOverlay ? {} : sortable.attributes)}
          {...(dragOverlay ? {} : sortable.listeners)}
          className="mt-0.5 cursor-grab select-none text-brand-navy-light active:cursor-grabbing"
          aria-label="Drag to reschedule"
        >
          ⠿
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brand-navy">
            {job.customer.name}
          </p>
          <p className="truncate text-xs text-brand-navy-light">
            {job.customer.phone}
          </p>
          <p className="truncate text-xs text-brand-navy-light">
            {job.customer.address}
          </p>
          {job.jobTime && (
            <p className="mt-1 text-xs font-medium text-brand-blue-dark">
              {job.jobTime}
            </p>
          )}
          {job.description && (
            <p className="mt-1 truncate text-xs italic text-brand-navy-light">
              {job.description}
            </p>
          )}
          <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-brand-navy-light">
            <dt>Parts</dt>
            <dd className="text-right">RM {job.partCost.toFixed(2)}</dd>
            <dt>Labor</dt>
            <dd className="text-right">RM {job.laborCost.toFixed(2)}</dd>
            <dt>Subtotal</dt>
            <dd className="text-right">RM {job.subtotal.toFixed(2)}</dd>
            <dt className="font-semibold text-brand-navy">Total</dt>
            <dd className="text-right font-semibold text-brand-navy">
              RM {job.total.toFixed(2)}
            </dd>
          </dl>
        </div>
      </div>
      {!dragOverlay && (
        <div className="mt-2 flex justify-end gap-3 text-xs">
          <button onClick={onEdit} className="text-brand-blue-dark hover:underline">
            Edit
          </button>
          <button onClick={onDelete} className="text-red-600 hover:underline">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
