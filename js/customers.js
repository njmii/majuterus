let editingCustomerId = null;
let deletingCustomerId = null;

function renderCustomers() {
  const search = document.getElementById("search-input").value;
  const customers = listCustomers(search);
  const tbody = document.getElementById("customers-tbody");
  const emptyState = document.getElementById("empty-state");

  if (customers.length === 0) {
    tbody.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  tbody.innerHTML = customers
    .map(
      (c) => `
    <tr>
      <td class="cell-strong">${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td class="cell-wrap">${escapeHtml(c.address)}</td>
      <td class="text-right">
        <button class="link-btn" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="link-btn link-danger" data-action="delete" data-id="${c.id}">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");
}

function openCustomerModal(customer) {
  editingCustomerId = customer ? customer.id : null;
  document.getElementById("customer-modal-title").textContent = customer
    ? "Edit customer"
    : "Add customer";
  document.getElementById("customer-name").value = customer ? customer.name : "";
  document.getElementById("customer-phone").value = customer ? customer.phone : "";
  document.getElementById("customer-address").value = customer
    ? customer.address
    : "";
  document.getElementById("customer-error").hidden = true;
  document.getElementById("customer-modal-backdrop").hidden = false;
}

function closeCustomerModal() {
  document.getElementById("customer-modal-backdrop").hidden = true;
  editingCustomerId = null;
}

function showCustomerError(message) {
  const el = document.getElementById("customer-error");
  el.textContent = message;
  el.hidden = false;
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("customer-name").value;
  const phone = document.getElementById("customer-phone").value;
  const address = document.getElementById("customer-address").value;

  if (!name.trim() || !phone.trim() || !address.trim()) {
    showCustomerError("Name, phone, and address are required.");
    return;
  }

  if (editingCustomerId) {
    updateCustomerById(editingCustomerId, { name, phone, address });
  } else {
    createCustomer({ name, phone, address });
  }
  closeCustomerModal();
  renderCustomers();
}

function openDeleteConfirm(customer) {
  deletingCustomerId = customer.id;
  const jobCount = countJobsForCustomer(customer.id);
  const message = document.getElementById("confirm-message");
  const deleteBtn = document.getElementById("confirm-delete-btn");

  if (jobCount > 0) {
    message.textContent = `Cannot delete: this customer has ${jobCount} job(s) on the schedule. Remove those jobs first.`;
    deleteBtn.hidden = true;
  } else {
    message.textContent = `This will permanently remove ${customer.name} from your customer list.`;
    deleteBtn.hidden = false;
  }
  document.getElementById("confirm-modal-backdrop").hidden = false;
}

function closeDeleteConfirm() {
  document.getElementById("confirm-modal-backdrop").hidden = true;
  deletingCustomerId = null;
}

document.addEventListener("DOMContentLoaded", () => {
  renderCustomers();

  document.getElementById("search-input").addEventListener("input", renderCustomers);
  document
    .getElementById("add-customer-btn")
    .addEventListener("click", () => openCustomerModal(null));
  document
    .getElementById("customer-form")
    .addEventListener("submit", handleCustomerSubmit);
  document
    .getElementById("customer-cancel-btn")
    .addEventListener("click", closeCustomerModal);
  document
    .getElementById("customer-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "customer-modal-backdrop") closeCustomerModal();
    });

  document.getElementById("customers-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const customer = getCustomer(btn.dataset.id);
    if (!customer) return;
    if (btn.dataset.action === "edit") openCustomerModal(customer);
    if (btn.dataset.action === "delete") openDeleteConfirm(customer);
  });

  document
    .getElementById("confirm-cancel-btn")
    .addEventListener("click", closeDeleteConfirm);
  document.getElementById("confirm-delete-btn").addEventListener("click", () => {
    if (!deletingCustomerId) return;
    deleteCustomerById(deletingCustomerId);
    closeDeleteConfirm();
    renderCustomers();
  });
  document
    .getElementById("confirm-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "confirm-modal-backdrop") closeDeleteConfirm();
    });
});
