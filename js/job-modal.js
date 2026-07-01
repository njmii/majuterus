/* Shared "add/edit job" modal and delete-confirm dialog. Used by both the
   weekly schedule board and the single-day view, so the (previously buggy)
   customer-picker logic only has to be fixed in one place. */

let jobModalEditingId = null;
let jobModalSelectedCustomer = null;
let jobModalNewCustomerMode = false;
let jobModalOnSaved = null;

let deletingJobId = null;
let deletingJobOnDeleted = null;

function openJobModal(date, job, onSaved) {
  jobModalEditingId = job ? job.id : null;
  jobModalSelectedCustomer = job ? job.customer : null;
  jobModalNewCustomerMode = false;
  jobModalOnSaved = onSaved || null;

  document.getElementById("job-modal-title").textContent = job
    ? "Edit job"
    : "Add job to schedule";
  document.getElementById("job-date").value = job ? job.jobDate : date;
  document.getElementById("job-time").value = job && job.jobTime ? job.jobTime : "";
  document.getElementById("job-description").value = job ? job.description : "";
  populateAssigneeSelect();
  document.getElementById("job-assigned-to").value = job
    ? job.assignedTo || "in_house"
    : "in_house";
  document.getElementById("job-part-cost").value = job && job.partCost ? job.partCost : "";
  document.getElementById("job-labor-cost").value = job && job.laborCost ? job.laborCost : "";
  document.getElementById("job-discount").value = job && job.discount ? job.discount : "";
  document.getElementById("job-status").value = job ? job.status : "scheduled";
  document.getElementById("job-status-field").hidden = !job;
  document.getElementById("job-error").hidden = true;

  renderCustomerPicker();
  updateJobTotals();
  document.getElementById("job-modal-backdrop").hidden = false;
}

function populateAssigneeSelect() {
  const select = document.getElementById("job-assigned-to");
  select.innerHTML = ASSIGNEES.map(
    (a) => `<option value="${a.id}">${escapeHtml(a.label)}</option>`
  ).join("");
}

function closeJobModal() {
  document.getElementById("job-modal-backdrop").hidden = true;
  jobModalEditingId = null;
  jobModalSelectedCustomer = null;
  jobModalNewCustomerMode = false;
  jobModalOnSaved = null;
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

function renderCustomerPicker() {
  const el = document.getElementById("customer-picker");

  if (jobModalSelectedCustomer && !jobModalNewCustomerMode) {
    el.innerHTML = `
      <div class="customer-chip">
        <div>
          <p class="customer-chip-name">${escapeHtml(jobModalSelectedCustomer.name)}</p>
          <p class="customer-chip-meta">${escapeHtml(jobModalSelectedCustomer.phone)} · ${escapeHtml(jobModalSelectedCustomer.address)}</p>
        </div>
        <button type="button" class="link-btn" id="change-customer-btn">Change</button>
      </div>
    `;
    document
      .getElementById("change-customer-btn")
      .addEventListener("click", () => {
        jobModalSelectedCustomer = null;
        renderCustomerPicker();
      });
    return;
  }

  if (jobModalNewCustomerMode) {
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
      jobModalNewCustomerMode = false;
      renderCustomerPicker();
    });
    document.getElementById("new-customer-name").focus();
    return;
  }

  // Search mode: build the input once and never replace it while the user is
  // typing — earlier this rebuilt the whole box (and refocused it) on every
  // keystroke, which visibly stalled typing on many browsers/devices.
  el.innerHTML = `
    <div class="customer-search-wrap">
      <div class="customer-search-row">
        <input class="input" id="customer-query" placeholder="Search by name or phone..." autocomplete="off" />
        <button type="button" class="link-btn new-customer-btn" id="new-customer-btn">+ New customer</button>
      </div>
      <ul class="customer-matches" id="customer-matches-list" hidden></ul>
    </div>
  `;

  const queryInput = document.getElementById("customer-query");
  queryInput.addEventListener("input", () => updateCustomerMatches(queryInput.value));
  queryInput.focus();

  document.getElementById("new-customer-btn").addEventListener("click", () => {
    jobModalNewCustomerMode = true;
    renderCustomerPicker();
  });
}

function updateCustomerMatches(query) {
  const list = document.getElementById("customer-matches-list");
  if (!list) return;

  const q = (query || "").trim();
  const matches = q ? listCustomers(q).slice(0, 6) : [];

  if (matches.length === 0) {
    list.hidden = true;
    list.innerHTML = "";
    return;
  }

  list.hidden = false;
  list.innerHTML = matches
    .map(
      (c) => `
        <li><button type="button" data-id="${c.id}">
          <strong>${escapeHtml(c.name)}</strong> ${escapeHtml(c.phone)}
        </button></li>`
    )
    .join("");

  list.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      jobModalSelectedCustomer = getCustomer(btn.dataset.id);
      renderCustomerPicker();
    });
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

  let customerId = jobModalSelectedCustomer ? jobModalSelectedCustomer.id : null;

  if (jobModalNewCustomerMode) {
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
    assignedTo: document.getElementById("job-assigned-to").value,
  };

  if (jobModalEditingId) {
    updateJobById(jobModalEditingId, payload);
  } else {
    createJob(payload);
  }

  const onSaved = jobModalOnSaved;
  closeJobModal();
  if (onSaved) onSaved();
}

/* ---------- Delete confirm ---------- */

function openDeleteJobConfirm(job, onDeleted) {
  deletingJobId = job.id;
  deletingJobOnDeleted = onDeleted || null;
  document.getElementById("confirm-message").textContent =
    `Remove ${job.customer.name}'s job from the schedule.`;
  document.getElementById("confirm-modal-backdrop").hidden = false;
}

function closeDeleteJobConfirm() {
  document.getElementById("confirm-modal-backdrop").hidden = true;
  deletingJobId = null;
  deletingJobOnDeleted = null;
}

/* ---------- Shared init (call once per page) ---------- */

function initJobModal() {
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
    .addEventListener("click", closeDeleteJobConfirm);
  document.getElementById("confirm-delete-btn").addEventListener("click", () => {
    if (!deletingJobId) return;
    deleteJobById(deletingJobId);
    const onDeleted = deletingJobOnDeleted;
    closeDeleteJobConfirm();
    if (onDeleted) onDeleted();
  });
  document
    .getElementById("confirm-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "confirm-modal-backdrop") closeDeleteJobConfirm();
    });
}
