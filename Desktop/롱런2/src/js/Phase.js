"use strict";

/* ─── BUILD TIMELINE DOT ──────────────────────────────────── */
function buildDot(s) {
	var col = document.createElement("div");
	col.className = "timeline-dot-col";

	var dot = document.createElement("div");
	dot.className = "timeline-dot timeline-dot--" + s;
	col.appendChild(dot);
	return col;
}

/* ─── BUILD PHASE BLOCK ───────────────────────────────────── */
function buildPhase(phase) {
	var s = document.createElement("section");
	s.className = "phase-block phase-block--" + phase.theme;
	s.id = "phase-" + phase.phaseId;

	var inner = document.createElement("div");
	inner.className = "phase-block-inner";

	/* Phase header */
	var header = document.createElement("div");
	header.className = "phase-header fade-up";

	var numEl = document.createElement("div");
	numEl.className = "phase-num phase-num--" + phase.phaseNum;
	numEl.textContent = "P" + phase.phaseNum;
	header.appendChild(numEl);

	var meta = document.createElement("div");
	meta.className = "phase-meta";

	var tagRow = document.createElement("div");
	tagRow.className = "phase-tag-row";

	var monthTag = document.createElement("span");
	monthTag.className = "phase-month-tag phase-month-tag--" + phase.phaseNum;
	monthTag.textContent = phase.month;
	tagRow.appendChild(monthTag);

	/* Progress line */
	var total = phase.milestones.length;
	var done = phase.milestones.filter(function (m) {
		return m.status === "completed";
	}).length;
	var pct = total > 0 ? Math.round((done / total) * 100) : 0;

	meta.appendChild(tagRow);

	var titleEl = document.createElement("h2");
	titleEl.className = "phase-title-h2";
	titleEl.textContent = phase.title;
	meta.appendChild(titleEl);
	header.appendChild(meta);
	inner.appendChild(header);

	/* Axis */
	var axis = document.createElement("div");
	axis.className = "timeline-axis";

	var axisLine = document.createElement("div");
	axisLine.className = "timeline-axis-line";
	axis.appendChild(axisLine);

	/* Cards */
	phase.milestones.forEach(function (m, idx) {
		var s2 = resolveStatus(m);
		var row = document.createElement("div");
		row.className = "timeline-row";

		var isLeft = idx % 2 === 0;

		/* Left card col */
		var leftCol = document.createElement("div");
		leftCol.className = "timeline-card-col--left";

		/* Center dot col */
		var dotCol = buildDot(s2);

		/* Right card col */
		var rightCol = document.createElement("div");
		rightCol.className = "timeline-card-col--right";

		var card = buildCard(m, isLeft ? "left" : "right");

		if (isLeft) {
			leftCol.appendChild(card);
		} else {
			rightCol.appendChild(card);
		}

		row.appendChild(leftCol);
		row.appendChild(dotCol);
		row.appendChild(rightCol);
		axis.appendChild(row);
	});

	inner.appendChild(axis);
	s.appendChild(inner);
	return s;
}
