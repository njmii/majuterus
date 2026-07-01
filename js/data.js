/* Maju Terus Aircond Service — local data layer.
   Everything is stored in the browser's localStorage, so data is scoped to
   this device/browser only (no shared backend). */

const DB_KEYS = { CUSTOMERS: "mt_customers_v1", JOBS: "mt_jobs_v1" };

function loadCustomers() {
  return JSON.parse(localStorage.getItem(DB_KEYS.CUSTOMERS) || "[]");
}

function saveCustomers(list) {
  localStorage.setItem(DB_KEYS.CUSTOMERS, JSON.stringify(list));
}

function loadJobs() {
  return JSON.parse(localStorage.getItem(DB_KEYS.JOBS) || "[]");
}

function saveJobs(list) {
  localStorage.setItem(DB_KEYS.JOBS, JSON.stringify(list));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Assignees (in-house team vs. subcontractors) ---------- */

const ASSIGNEES = [
  { id: "in_house", label: "In House" },
  { id: "sub_marvel", label: "Sub Marvel" },
  { id: "sub_peter", label: "Sub Peter" },
];

function getAssigneeLabel(id) {
  const found = ASSIGNEES.find((a) => a.id === id);
  return found ? found.label : "In House";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Customers ---------- */

function listCustomers(search) {
  const all = loadCustomers().sort((a, b) => a.name.localeCompare(b.name));
  const q = (search || "").trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
  );
}

function getCustomer(id) {
  return loadCustomers().find((c) => c.id === id) || null;
}

function createCustomer({ name, phone, address }) {
  const customers = loadCustomers();
  const customer = {
    id: makeId(),
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    createdAt: new Date().toISOString(),
  };
  customers.push(customer);
  saveCustomers(customers);
  return customer;
}

function updateCustomerById(id, { name, phone, address }) {
  const customers = loadCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  customers[idx] = {
    ...customers[idx],
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
  };
  saveCustomers(customers);
  return customers[idx];
}

function deleteCustomerById(id) {
  saveCustomers(loadCustomers().filter((c) => c.id !== id));
}

function countJobsForCustomer(id) {
  return loadJobs().filter((j) => j.customerId === id).length;
}

/* ---------- Jobs ---------- */

function jobWithComputed(job) {
  const subtotal = (job.partCost || 0) + (job.laborCost || 0);
  const total = subtotal - (job.discount || 0);
  return { ...job, subtotal, total, customer: getCustomer(job.customerId) };
}

function listJobsInRange(start, end) {
  return loadJobs()
    .filter((j) => j.jobDate >= start && j.jobDate <= end)
    .sort((a, b) =>
      a.jobDate === b.jobDate
        ? a.position - b.position
        : a.jobDate.localeCompare(b.jobDate)
    )
    .map(jobWithComputed);
}

function getJob(id) {
  const job = loadJobs().find((j) => j.id === id);
  return job ? jobWithComputed(job) : null;
}

function nextPosition(jobDate) {
  const jobs = loadJobs().filter((j) => j.jobDate === jobDate);
  return jobs.length ? Math.max(...jobs.map((j) => j.position)) + 1 : 0;
}

function createJob(input) {
  const jobs = loadJobs();
  const job = {
    id: makeId(),
    customerId: input.customerId,
    jobDate: input.jobDate,
    jobTime: input.jobTime || null,
    position: nextPosition(input.jobDate),
    description: (input.description || "").trim(),
    partCost: Number(input.partCost) || 0,
    laborCost: Number(input.laborCost) || 0,
    discount: Number(input.discount) || 0,
    status: input.status || "scheduled",
    assignedTo: input.assignedTo || "in_house",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.push(job);
  saveJobs(jobs);
  return jobWithComputed(job);
}

function updateJobById(id, input) {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  const existing = jobs[idx];
  let position = existing.position;
  if (input.jobDate && input.jobDate !== existing.jobDate) {
    position = nextPosition(input.jobDate);
  }
  jobs[idx] = {
    ...existing,
    customerId: input.customerId ?? existing.customerId,
    jobDate: input.jobDate ?? existing.jobDate,
    jobTime: input.jobTime !== undefined ? input.jobTime : existing.jobTime,
    position,
    description:
      input.description !== undefined
        ? input.description.trim()
        : existing.description,
    partCost:
      input.partCost !== undefined ? Number(input.partCost) : existing.partCost,
    laborCost:
      input.laborCost !== undefined
        ? Number(input.laborCost)
        : existing.laborCost,
    discount:
      input.discount !== undefined ? Number(input.discount) : existing.discount,
    status: input.status ?? existing.status,
    assignedTo: input.assignedTo ?? existing.assignedTo ?? "in_house",
    updatedAt: new Date().toISOString(),
  };
  saveJobs(jobs);
  return jobWithComputed(jobs[idx]);
}

function deleteJobById(id) {
  saveJobs(loadJobs().filter((j) => j.id !== id));
}

/**
 * Reassigns date + sequential position for a full day column of job ids.
 * Used after a drag-and-drop move (same-day reorder, or moved to a
 * different day) so ordering always stays gap-free and consistent.
 */
function reorderColumn(jobDate, orderedIds) {
  const jobs = loadJobs();
  orderedIds.forEach((id, index) => {
    const job = jobs.find((j) => j.id === id);
    if (job) {
      job.jobDate = jobDate;
      job.position = index;
      job.updatedAt = new Date().toISOString();
    }
  });
  saveJobs(jobs);
}

/* ---------- Date helpers ---------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDate(a, b) {
  return toISODate(a) === toISODate(b);
}

function formatDayLabel(date) {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

function formatMoney(n) {
  return `RM ${Number(n || 0).toFixed(2)}`;
}

function formatFullDate(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ---------- Sharing (native share sheet, with clipboard fallback) ---------- */

function buildDaySchedulePlainText(dateKey, assigneeId) {
  const jobs = listJobsInRange(dateKey, dateKey).filter(
    (j) => (j.assignedTo || "in_house") === assigneeId
  );
  const dateObj = new Date(`${dateKey}T00:00:00`);
  const label = getAssigneeLabel(assigneeId);
  const lines = jobs.map((j, i) => {
    const time = j.jobTime ? `${j.jobTime} — ` : "";
    const desc = j.description ? ` (${j.description})` : "";
    return `${i + 1}. ${time}${j.customer.name} — ${j.customer.phone} — ${j.customer.address}${desc}`;
  });
  return {
    jobs,
    text: [
      `Schedule for ${formatFullDate(dateObj)} — ${label}`,
      "",
      lines.length ? lines.join("\n") : "No jobs scheduled.",
      "",
      `Total jobs: ${jobs.length}`,
    ].join("\n"),
  };
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function showToast(message) {
  let toast = document.getElementById("mt-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mt-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("visible"), 2500);
}

async function shareDaySchedule(dateKey, assigneeId) {
  const { jobs, text } = buildDaySchedulePlainText(dateKey, assigneeId);
  if (jobs.length === 0) return;
  const label = getAssigneeLabel(assigneeId);

  if (navigator.share) {
    try {
      await navigator.share({ title: `Schedule — ${label}`, text });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
      // fall through to clipboard fallback
    }
  }

  try {
    await copyTextToClipboard(text);
    showToast(`${label}'s schedule copied to clipboard.`);
  } catch {
    showToast("Could not share or copy the schedule.");
  }
}
