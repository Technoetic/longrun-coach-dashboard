"use strict";

/* ─── BUILD DASHBOARD ─────────────────────────────────────── */
function buildDashboard(allMilestones) {
	var total = allMilestones.length;
	var done = allMilestones.filter(function (m) {
		return resolveStatus(m) === "done";
	}).length;
	var prog = allMilestones.filter(function (m) {
		return resolveStatus(m) === "prog";
	}).length;
	var pend = allMilestones.filter(function (m) {
		return resolveStatus(m) === "pend";
	}).length;
	var del = allMilestones.filter(function (m) {
		return resolveStatus(m) === "del";
	}).length;
	var pct = total > 0 ? Math.round((done / total) * 100) : 0;

	var section = document.createElement("section");
	section.className = "dashboard-section";
	section.id = "dashboard";

	var inner = document.createElement("div");
	inner.className = "dashboard-inner";

	/* Top */
	var top = document.createElement("div");
	top.className = "dashboard-top fade-up";

	var left = document.createElement("div");
	var label = document.createElement("div");
	label.className = "dashboard-label";
	label.textContent = "Overall Progress";
	var title = document.createElement("h2");
	title.className = "dashboard-title";
	title.textContent = "전체 진행률";
	left.appendChild(label);
	left.appendChild(title);

	var right = document.createElement("div");
	var pctEl = document.createElement("div");
	pctEl.className = "dashboard-overall-pct";
	pctEl.id = "overall-pct-display";
	pctEl.textContent = "0%";
	var pctLbl = document.createElement("div");
	pctLbl.className = "dashboard-pct-label";
	pctLbl.textContent = done + "/" + total + " 마일스톤 완료";
	right.appendChild(pctEl);
	right.appendChild(pctLbl);

	top.appendChild(left);
	top.appendChild(right);
	inner.appendChild(top);

	/* Overall bar */
	var barWrap = document.createElement("div");
	barWrap.className = "overall-progress-wrap fade-up";
	var barFill = document.createElement("div");
	barFill.className = "overall-progress-fill";
	barFill.id = "overall-bar-fill";
	barWrap.appendChild(barFill);
	inner.appendChild(barWrap);

	/* Stats grid */
	var statsGrid = document.createElement("div");
	statsGrid.className = "stats-grid fade-up";

	var statsData = [
		{
			num: done,
			cls: "done",
			label: "완료",
			barPct: total > 0 ? (done / total) * 100 : 0,
		},
		{
			num: prog,
			cls: "prog",
			label: "진행중",
			barPct: total > 0 ? (prog / total) * 100 : 0,
		},
		{
			num: pend,
			cls: "pend",
			label: "예정",
			barPct: total > 0 ? (pend / total) * 100 : 0,
		},
		{
			num: del,
			cls: "del",
			label: "지연",
			barPct: total > 0 ? (del / total) * 100 : 0,
		},
	];

	statsData.forEach(function (sd) {
		var card = document.createElement("div");
		card.className = "stat-card fade-up";

		var num = document.createElement("div");
		num.className = "stat-num stat-num--" + sd.cls;
		num.textContent = sd.num;

		var desc = document.createElement("div");
		desc.className = "stat-desc";
		desc.textContent = sd.label;

		var miniWrap = document.createElement("div");
		miniWrap.className = "stat-bar-mini";
		var miniFill = document.createElement("div");
		miniFill.className = "stat-bar-mini-fill stat-bar-mini-fill--" + sd.cls;
		miniFill.style.width = "0%";
		miniFill.dataset.target = sd.barPct.toFixed(1);
		miniWrap.appendChild(miniFill);

		card.appendChild(num);
		card.appendChild(desc);
		card.appendChild(miniWrap);
		statsGrid.appendChild(card);
	});
	inner.appendChild(statsGrid);

	/* Phase breakdown */
	var breakdown = document.createElement("div");
	breakdown.className = "phase-breakdown";

	ROADMAP.phases.forEach(function (phase) {
		var t = phase.milestones.length;
		var d = phase.milestones.filter(function (m) {
			return m.status === "completed";
		}).length;
		var p = t > 0 ? Math.round((d / t) * 100) : 0;

		var card = document.createElement("div");
		card.className = "phase-breakdown-card fade-up";

		var tag = document.createElement("span");
		tag.className =
			"breakdown-phase-tag breakdown-phase-tag--" + phase.phaseNum;
		tag.textContent = phase.month + " · Phase " + phase.phaseNum;

		var bdTitle = document.createElement("div");
		bdTitle.className = "breakdown-title";
		bdTitle.textContent = phase.title;

		var bdTrack = document.createElement("div");
		bdTrack.className = "breakdown-track";
		var bdFill = document.createElement("div");
		bdFill.className = "breakdown-fill breakdown-fill--" + phase.phaseNum;
		bdFill.style.width = p + "%";
		bdTrack.appendChild(bdFill);

		var bdBottom = document.createElement("div");
		var bdPct = document.createElement("span");
		bdPct.className = "breakdown-pct";
		bdPct.textContent = p + "%";
		var bdCount = document.createElement("span");
		bdCount.className = "breakdown-count";
		bdCount.textContent = d + "/" + t;
		bdBottom.appendChild(bdPct);
		bdBottom.appendChild(bdCount);

		card.appendChild(tag);
		card.appendChild(bdTitle);
		card.appendChild(bdTrack);
		card.appendChild(bdBottom);
		breakdown.appendChild(card);
	});
	inner.appendChild(breakdown);
	section.appendChild(inner);

	/* Animate bars after render */
	setTimeout(function () {
		document.getElementById("overall-bar-fill").style.width = pct + "%";
		document.getElementById("overall-pct-display").textContent = pct + "%";
		document.querySelectorAll(".stat-bar-mini-fill").forEach(function (el) {
			el.style.width = el.dataset.target + "%";
		});
	}, 400);

	return section;
}
