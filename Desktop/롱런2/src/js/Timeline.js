"use strict";

/* ─── HERO STATS ──────────────────────────────────────────── */
function updateHeroStats(allMilestones) {
	var done = allMilestones.filter(function (m) {
		return resolveStatus(m) === "done";
	}).length;
	var prog = allMilestones.filter(function (m) {
		return resolveStatus(m) === "prog";
	}).length;
	var total = allMilestones.length;
	var doneEl = document.getElementById("hero-stat-done");
	var progEl = document.getElementById("hero-stat-prog");
	var totalEl = document.getElementById("hero-stat-total");
	if (doneEl) doneEl.textContent = done;
	if (progEl) progEl.textContent = prog;
	if (totalEl) totalEl.textContent = total;
}
