let pendingImportPayload = null;

function renderSummary() {
  const customers = loadCustomers();
  const jobs = loadJobs();
  document.getElementById("export-summary").textContent =
    `${customers.length} customer${customers.length === 1 ? "" : "s"} · ${jobs.length} job${jobs.length === 1 ? "" : "s"} on this device`;
}

function handleExportClick() {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const stamp = toISODate(new Date());
  downloadBlob(blob, `majuterus-backup-${stamp}.json`);
  showToast("Backup downloaded.");
}

function handleFileChange(event) {
  document.getElementById("import-error").hidden = true;
  document.getElementById("import-btn").disabled = !event.target.files[0];
}

async function handleImportClick() {
  const fileInput = document.getElementById("import-file-input");
  const file = fileInput.files[0];
  if (!file) return;

  const errorEl = document.getElementById("import-error");
  errorEl.hidden = true;

  try {
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload.customers) || !Array.isArray(payload.jobs)) {
      throw new Error("This file doesn't look like a Maju Terus backup.");
    }

    pendingImportPayload = payload;
    document.getElementById("import-confirm-message").textContent =
      `This device currently has ${loadCustomers().length} customer(s) and ${loadJobs().length} job(s). ` +
      `Importing will replace them with ${payload.customers.length} customer(s) and ${payload.jobs.length} job(s) from the backup file.`;
    document.getElementById("import-confirm-backdrop").hidden = false;
  } catch (err) {
    errorEl.textContent = err.message || "Could not read that file.";
    errorEl.hidden = false;
  }
}

function closeImportConfirm() {
  document.getElementById("import-confirm-backdrop").hidden = true;
  pendingImportPayload = null;
}

document.addEventListener("DOMContentLoaded", () => {
  renderSummary();

  document.getElementById("export-btn").addEventListener("click", handleExportClick);
  document
    .getElementById("import-file-input")
    .addEventListener("change", handleFileChange);
  document.getElementById("import-btn").addEventListener("click", handleImportClick);

  document
    .getElementById("import-confirm-cancel-btn")
    .addEventListener("click", closeImportConfirm);
  document.getElementById("import-confirm-proceed-btn").addEventListener("click", () => {
    if (!pendingImportPayload) return;
    importAllData(pendingImportPayload);
    closeImportConfirm();
    renderSummary();
    document.getElementById("import-file-input").value = "";
    document.getElementById("import-btn").disabled = true;
    showToast("Backup imported.");
  });
  document
    .getElementById("import-confirm-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "import-confirm-backdrop") closeImportConfirm();
    });
});
