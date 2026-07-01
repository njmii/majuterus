let weekStart = startOfWeekMonday(new Date());
let editingJobId = null;
let modalDate = null;
let selectedCustomer = null;
let newCustomerMode = false;
let deletingJobId = null;
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
            <p class="day-title">${formatDayLabel(d)}</p>
            <p class="day-meta">${dayJobs.length} job${dayJobs.length === 1 ? "" : "s"} · ${formatMoney(dayTotal)}</p>
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
    btn.addEventListener("click", () => openJobModal(btn.dataset.date, null));
  });

  board.querySelectorAll("[data-action='edit-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = getJob(btn.dataset.id);
      if (job) openJobModal(job.jobDate, job);
    });
  });

  board.querySelectorAll("[data-action='delete-job']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = getJob(btn.dataset.id);
      if (job) openDeleteConfirm(job);
    });
  });
}

function renderJobCard(job) {
  const customer = job.customer;
  if (!customer) return "";
  return `
    <div class="job-card" draggable="true" data-job-id="${job.id}">
      <div class="job-card-top">
        <span class="job-drag-handle">&#10241;</span>
        <div>
          <p class="job-card-name">${escapeHtml(customer.name)}</p>
          <p class="job-card-meta">${escapeHtml(customer.phone)}</p>
          <p class="job-card-meta">${escapeHtml(customer.address)}</p>
          ${job.jobTime ? `<p class="job-card-time">${escapeHtml(job.jobTime)}</p>` : ""}
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

/* ---------- Job modal ---------- */

function openJobModal(date, job) {
  editingJobId = job ? job.id : null;
  modalDate = date;
  selectedCustomer = job ? job.customer : null;
  newCustomerMode = false;

  document.getElementById("job-modal-title").textContent = job
    ? "Edit job"
    : "Add job to schedule";
  document.getElementById("job-date").value = job ? job.jobDate : date;
  document.getElementById("job-time").value = job && job.jobTime ? job.jobTime : "";
  document.getElementById("job-description").value = job ? job.description : "";
  document.getElementById("job-part-cost").value = job ? job.partCost : 0;
  document.getElementById("job-labor-cost").value = job ? job.laborCost : 0;
  document.getElementById("job-discount").value = job ? job.discount : 0;
  document.getElementById("job-status").value = job ? job.status : "scheduled";
  document.getElementById("job-status-field").hidden = !job;
  document.getElementById("job-error").hidden = true;

  renderCustomerPicker();
  updateJobTotals();
  document.getElementById("job-modal-backdrop").hidden = false;
}

function closeJobModal() {
  document.getElementById("job-modal-backdrop").hidden = true;
  editingJobId = null;
  modalDate = null;
  selectedCustomer = null;
  newCustomerMode = false;
}

function updateJobTotals() {
  const part = Number(document.getElementById("job-part-cost").value) || 0;
  const labor = Number(document.getElementById("job-labor-cost").value) || 0;
  const discount = Number(document.getElementById("job-discount").value) || 0;
  const subtotal = part + labor;
  const total = subtotal - discount;
  document.getElementById("job-subtotal").textContent = formatMoney(subtotal);
  document.getElementById("job-total").textContent = formatMoney(total);
}

function renderCustomerPicker(query) {
  const el = document.getElementById("customer-picker");

  if (selectedCustomer && !newCustomerMode) {
    el.innerHTML = `
      <div class="customer-chip">
        <div>
          <p class="customer-chip-name">${escapeHtml(selectedCustomer.name)}</p>
          <p class="customer-chip-meta">${escapeHtml(selectedCustomer.phone)} · ${escapeHtml(selectedCustomer.address)}</p>
        </div>
        <button type="button" class="link-btn" id="change-customer-btn">Change</button>
      </div>
    `;
    document
      .getElementById("change-customer-btn")
      .addEventListener("click", () => {
        selectedCustomer = null;
        renderCustomerPicker();
      });
    return;
  }

  if (newCustomerMode) {
    el.innerHTML = `
      <div class="new-customer-box">
        <input class="input" id="new-customer-name" placeholder="Customer name" required />
        <input class="input" id="new-customer-phone" placeholder="Telephone number" required />
        <textarea class="input textarea" id="new-customer-address" placeholder="Address" required></textarea>
        <button type="button" class="link-btn" id="use-existing-btn" style="align-self: flex-start;">
          Choose existing customer instead
        </button>
      </div>
    `;
    document.getElementById("use-existing-btn").addEventListener("click", () => {
      newCustomerMode = false;
      renderCustomerPicker();
    });
    return;
  }

  const matches = query && query.trim() ? listCustomers(query).slice(0, 6) : [];

  el.innerHTML = `
    <div class="customer-search-wrap">
      <input class="input" id="customer-query" placeholder="Search by name or phone..." value="${escapeHtml(query || "")}" />
      ${
        matches.length
          ? `<ul class="customer-matches">${matches
              .map(
                (c) => `
              <li><button type="button" data-id="${c.id}">
                <strong>${escapeHtml(c.name)}</strong> ${escapeHtml(c.phone)}
              </button></li>`
              )
              .join("")}</ul>`
          : ""
      }
      <button type="button" class="link-btn" id="new-customer-btn" style="margin-top: 0.35rem;">
        + New customer
      </button>
    </div>
  `;

  const queryInput = document.getElementById("customer-query");
  queryInput.addEventListener("input", () => renderCustomerPicker(queryInput.value));
  queryInput.focus();
  queryInput.setSelectionRange(queryInput.value.length, queryInput.value.length);

  el.querySelectorAll(".customer-matches button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedCustomer = getCustomer(btn.dataset.id);
      renderCustomerPicker();
    });
  });

  document.getElementById("new-customer-btn").addEventListener("click", () => {
    newCustomerMode = true;
    renderCustomerPicker();
  });
}

function showJobError(message) {
  const el = document.getElementById("job-error");
  el.textContent = message;
  el.hidden = false;
}

function handleJobSubmit(event) {
  event.preventDefault();

  const part = Number(document.getElementById("job-part-cost").value);
  const labor = Number(document.getElementById("job-labor-cost").value);
  const discount = Number(document.getElementById("job-discount").value);

  if (
    !Number.isFinite(part) ||
    !Number.isFinite(labor) ||
    !Number.isFinite(discount) ||
    part < 0 ||
    labor < 0 ||
    discount < 0
  ) {
    showJobError("Part cost, labor cost, and discount must be non-negative numbers.");
    return;
  }

  let customerId = selectedCustomer ? selectedCustomer.id : null;

  if (newCustomerMode) {
    const name = document.getElementById("new-customer-name").value;
    const phone = document.getElementById("new-customer-phone").value;
    const address = document.getElementById("new-customer-address").value;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showJobError("New customer needs a name, phone number, and address.");
      return;
    }
    const customer = createCustomer({ name, phone, address });
    customerId = customer.id;
  }

  if (!customerId) {
    showJobError("Please choose or add a customer.");
    return;
  }

  const payload = {
    customerId,
    jobDate: document.getElementById("job-date").value,
    jobTime: document.getElementById("job-time").value || null,
    description: document.getElementById("job-description").value,
    partCost: part,
    laborCost: labor,
    discount,
    status: document.getElementById("job-status").value,
  };

  if (editingJobId) {
    updateJobById(editingJobId, payload);
  } else {
    createJob(payload);
  }

  closeJobModal();
  renderBoard();
}

/* ---------- Delete confirm ---------- */

function openDeleteConfirm(job) {
  deletingJobId = job.id;
  document.getElementById("confirm-message").textContent =
    `Remove ${job.customer.name}'s job from the schedule.`;
  document.getElementById("confirm-modal-backdrop").hidden = false;
}

function closeDeleteConfirm() {
  document.getElementById("confirm-modal-backdrop").hidden = true;
  deletingJobId = null;
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  renderBoard();

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

  document.getElementById("job-form").addEventListener("submit", handleJobSubmit);
  document.getElementById("job-cancel-btn").addEventListener("click", closeJobModal);
  document
    .getElementById("job-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "job-modal-backdrop") closeJobModal();
    });

  ["job-part-cost", "job-labor-cost", "job-discount"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateJobTotals);
  });

  document
    .getElementById("confirm-cancel-btn")
    .addEventListener("click", closeDeleteConfirm);
  document.getElementById("confirm-delete-btn").addEventListener("click", () => {
    if (!deletingJobId) return;
    deleteJobById(deletingJobId);
    closeDeleteConfirm();
    renderBoard();
  });
  document
    .getElementById("confirm-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "confirm-modal-backdrop") closeDeleteConfirm();
    });
});
