function statCard(label, value) {
  return `
    <div class="stat-card">
      <p class="stat-label">${escapeHtml(label)}</p>
      <p class="stat-value">${escapeHtml(String(value))}</p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const customers = listCustomers();
  const today = toISODate(new Date());
  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = addDays(weekStart, 6);
  const weekJobs = listJobsInRange(toISODate(weekStart), toISODate(weekEnd));
  const todaysJobs = weekJobs.filter((j) => j.jobDate === today);
  const weekTotal = weekJobs.reduce((sum, j) => sum + j.total, 0);

  document.getElementById("stats-grid").innerHTML = [
    statCard("Customers", customers.length),
    statCard("Jobs today", todaysJobs.length),
    statCard("This week's total", formatMoney(weekTotal)),
  ].join("");
});
