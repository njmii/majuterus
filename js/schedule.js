let weekStart = startOfWeekMonday(new Date());
let draggedCard = null;

function weekDates() {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/* ---------- Board rendering ---------- */

function renderBoard() {
  const dates = weekDates();
  const rangeStart = toISODate(dates[0]);
  const rangeEnd = toISODate(dates[6]);
  const jobs = listJobsInRange(rangeStart, rangeEnd);

  const jobsByDate = {};
  dates.forEach((d) => {
    jobsByDate[toISODate(d)] = [];
  });
  jobs.forEach((j) => {
    if (!jobsByDate[j.jobDate]) jobsByDate[j.jobDate] = [];
    jobsByDate[j.jobDate].push(j);
  });

  const today = toISODate(new Date());
  const weekTotal = jobs.reduce((sum, j) => sum + j.total, 0);

  document.getElementById("week-summary").textContent =
    `${formatDayLabel(dates[0])} – ${dates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · Week total: ${formatMoney(weekTotal)}`;

  const board = document.getElementById("board");
  board.innerHTML = dates
    .map((d) => {
      const dateKey = toISODate(d);
      const dayJobs = jobsByDate[dateKey] || [];
      const dayTotal = dayJobs.reduce((sum, j) => sum + j.total, 0);
      const isToday = dateKey === today;

      return `
        <div class="day-column" data-date="${dateKey}">
          <div class="day-header${isToday ? " is-today" : ""}">
            <div class="day-header-top">
              <p class="day-title">${formatDayLabel(d)}</p>
              <a class="day-view-link" href="day.html?date=${dateKey}">View day →</a>
            </div>
            <p class="day-meta">${dayJobs.length} job${dayJobs.length === 1 ? "" : "s"} · ${formatMoney(dayTotal)}</p>
            ${renderShareRow(dateKey, dayJobs)}
          </div>
          <div class="day-body" data-date="${dateKey}">
            ${dayJobs.map(renderJobCard).join("")}
          </div>
          <button class="add-job-btn" data-date="${dateKey}">+ Add job</button>
        </div>
      `;
    })
    .join("");

  setupDragAndDrop();

  board.querySelectorAll(".add-job-btn").forEach((btn) => {
    btn.addEventListener("click", () => openJobModal(btn.dataset.date, null, renderBoard));
  });

  board.querySelectorAll("[data-action='edit-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = getJob(btn.dataset.id);
      if (job) openJobModal(job.jobDate, job, renderBoard);
    });
  });

  board.querySelectorAll("[data-action='delete-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = getJob(btn.dataset.id);
      if (job) openDeleteJobConfirm(job, renderBoard);
    });
  });

  board.querySelectorAll("[data-action='share-day']").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => {
      shareDaySchedule(btn.dataset.date, btn.dataset.assignee);
    });
  });
}

function renderShareRow(dateKey, dayJobs) {
  const chips = ASSIGNEES.map((assignee) => {
    const count = dayJobs.filter(
      (j) => (j.assignedTo || "in_house") === assignee.id
    ).length;
    return `
      <button
        type="button"
        class="share-chip"
        data-action="share-day"
        data-date="${dateKey}"
        data-assignee="${assignee.id}"
        ${count === 0 ? "disabled" : ""}
        title="Share ${escapeHtml(assignee.label)}'s jobs for this day as a PDF"
      >${escapeHtml(assignee.label)} (${count})</button>
    `;
  }).join("");
  return `<div class="day-share-row"><span class="share-label">Share:</span>${chips}</div>`;
}

function renderJobCard(job) {
  const customer = job.customer;
  if (!customer) return "";
  const assignedTo = job.assignedTo || "in_house";
  return `
    <div class="job-card" draggable="true" data-job-id="${job.id}">
      <div class="job-card-top">
        <span class="job-drag-handle">&#10241;</span>
        <div class="job-card-body">
          <div class="job-card-header">
            <span class="job-card-time">${job.jobTime ? escapeHtml(job.jobTime) : "No time set"}</span>
            <span class="assignee-badge assignee-${assignedTo}">${escapeHtml(getAssigneeLabel(assignedTo))}</span>
          </div>
          <p class="job-card-name">${escapeHtml(customer.name)}</p>
          <p class="job-card-meta">${escapeHtml(customer.phone)}</p>
          <p class="job-card-meta">${escapeHtml(customer.address)}</p>
          ${job.description ? `<p class="job-card-desc">${escapeHtml(job.description)}</p>` : ""}
          <dl class="job-costs">
            <dt>Parts</dt><dd class="value">${formatMoney(job.partCost)}</dd>
            <dt>Labor</dt><dd class="value">${formatMoney(job.laborCost)}</dd>
            <dt>Subtotal</dt><dd class="value">${formatMoney(job.subtotal)}</dd>
            <dt class="total-label">Total</dt><dd class="value total-value">${formatMoney(job.total)}</dd>
          </dl>
          <div class="job-card-actions">
            <button type="button" class="job-card-edit" data-action="edit-job" data-id="${job.id}">Edit</button>
            <button type="button" class="job-card-delete" data-action="delete-job" data-id="${job.id}">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- Drag and drop (native HTML5 DnD) ---------- */

function setupDragAndDrop() {
  document.querySelectorAll(".job-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      draggedCard = card;
      setTimeout(() => card.classList.add("dragging"), 0);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document
        .querySelectorAll(".day-body.drag-over")
        .forEach((el) => el.classList.remove("drag-over"));
      draggedCard = null;
      persistAllColumns();
    });
  });

  document.querySelectorAll(".day-body").forEach((body) => {
    body.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!draggedCard) return;
      body.classList.add("drag-over");
      const afterElement = getDragAfterElement(body, e.clientY);
      if (afterElement == null) {
        body.appendChild(draggedCard);
      } else {
        body.insertBefore(draggedCard, afterElement);
      }
    });
    body.addEventListener("dragleave", (e) => {
      if (e.target === body) body.classList.remove("drag-over");
    });
    body.addEventListener("drop", (e) => {
      e.preventDefault();
      body.classList.remove("drag-over");
    });
  });
}

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll(".job-card:not(.dragging)")];
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function persistAllColumns() {
  document.querySelectorAll(".day-column").forEach((col) => {
    const date = col.dataset.date;
    const ids = [...col.querySelectorAll(".job-card")].map((c) => c.dataset.jobId);
    reorderColumn(date, ids);
  });
  renderBoard();
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  renderBoard();
  initJobModal();

  document.getElementById("prev-week-btn").addEventListener("click", () => {
    weekStart = addDays(weekStart, -7);
    renderBoard();
  });
  document.getElementById("this-week-btn").addEventListener("click", () => {
    weekStart = startOfWeekMonday(new Date());
    renderBoard();
  });
  document.getElementById("next-week-btn").addEventListener("click", () => {
    weekStart = addDays(weekStart, 7);
    renderBoard();
  });
});
