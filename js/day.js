let currentDate = getInitialDate();

function getInitialDate() {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return new Date(`${dateParam}T00:00:00`);
  }
  return new Date();
}

function renderDayView() {
  const dateKey = toISODate(currentDate);
  const jobs = listJobsInRange(dateKey, dateKey);
  const dayTotal = jobs.reduce((sum, j) => sum + j.total, 0);

  history.replaceState(null, "", `day.html?date=${dateKey}`);

  document.getElementById("day-summary").textContent =
    `${formatFullDate(currentDate)} · ${jobs.length} job${jobs.length === 1 ? "" : "s"} total · ${formatMoney(dayTotal)}`;

  const grid = document.getElementById("day-view-grid");
  grid.innerHTML = ASSIGNEES.map((assignee) => {
    const assigneeJobs = jobs.filter(
      (j) => (j.assignedTo || "in_house") === assignee.id
    );
    const assigneeTotal = assigneeJobs.reduce((sum, j) => sum + j.total, 0);

    return `
      <section class="day-panel">
        <div class="day-panel-header">
          <div>
            <h2 class="day-panel-title">${escapeHtml(assignee.label)}</h2>
            <p class="day-panel-meta">${assigneeJobs.length} job${assigneeJobs.length === 1 ? "" : "s"} · ${formatMoney(assigneeTotal)}</p>
          </div>
          <div class="day-panel-actions">
            <button
              type="button"
              class="btn btn-secondary"
              data-action="share-day"
              data-assignee="${assignee.id}"
              ${assigneeJobs.length === 0 ? "disabled" : ""}
            >Share PDF</button>
            <button type="button" class="btn btn-primary" data-action="add-job" data-assignee="${assignee.id}">
              + Add job
            </button>
          </div>
        </div>
        <div class="day-panel-body">
          ${
            assigneeJobs.length
              ? assigneeJobs.map(renderBigJobCard).join("")
              : `<p class="empty-state">No jobs assigned.</p>`
          }
        </div>
      </section>
    `;
  }).join("");

  grid.querySelectorAll("[data-action='add-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      openJobModal(dateKey, null, renderDayView);
      document.getElementById("job-assigned-to").value = btn.dataset.assignee;
    });
  });

  grid.querySelectorAll("[data-action='edit-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = getJob(btn.dataset.id);
      if (job) openJobModal(job.jobDate, job, renderDayView);
    });
  });

  grid.querySelectorAll("[data-action='delete-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = getJob(btn.dataset.id);
      if (job) openDeleteJobConfirm(job, renderDayView);
    });
  });

  grid.querySelectorAll("[data-action='share-day']").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => {
      shareDaySchedule(dateKey, btn.dataset.assignee);
    });
  });
}

function renderBigJobCard(job) {
  const customer = job.customer;
  if (!customer) return "";
  const assignedTo = job.assignedTo || "in_house";
  return `
    <div class="big-job-card">
      <div class="big-job-card-header">
        <span class="big-job-time">${job.jobTime ? escapeHtml(job.jobTime) : "No time set"}</span>
        <span class="assignee-badge assignee-${assignedTo}">${escapeHtml(getAssigneeLabel(assignedTo))}</span>
      </div>
      <p class="big-job-name">${escapeHtml(customer.name)}</p>
      <p class="big-job-meta">${escapeHtml(customer.phone)}</p>
      <p class="big-job-meta">${escapeHtml(customer.address)}</p>
      ${job.description ? `<p class="big-job-desc">${escapeHtml(job.description)}</p>` : ""}
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
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderDayView();
  initJobModal();

  document.getElementById("prev-day-btn").addEventListener("click", () => {
    currentDate = addDays(currentDate, -1);
    renderDayView();
  });
  document.getElementById("today-btn").addEventListener("click", () => {
    currentDate = new Date();
    renderDayView();
  });
  document.getElementById("next-day-btn").addEventListener("click", () => {
    currentDate = addDays(currentDate, 1);
    renderDayView();
  });
});
