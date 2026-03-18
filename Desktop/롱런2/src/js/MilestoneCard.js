"use strict";

/* ─── BUILD MILESTONE CARD ────────────────────────────────── */
function buildCard(m, side) {
	var s = resolveStatus(m);
	var article = document.createElement("article");
	article.className = "milestone-card milestone-card--" + s;

	/* icon wrap */
	var top = document.createElement("div");
	top.className = "card-top";

	var iconWrap = document.createElement("div");
	iconWrap.className = "card-icon-wrap card-icon-wrap--" + s;
	iconWrap.textContent = m.icon;

	top.appendChild(iconWrap);
	article.appendChild(top);

	/* id + date */
	var meta = document.createElement("div");
	meta.className = "card-id-date";
	var idText = document.createTextNode(m.id);
	var sep = document.createElement("span");
	sep.className = "card-id-date-sep";
	sep.textContent = "/";
	var dateText = document.createTextNode(m.displayDate);
	meta.appendChild(idText);
	meta.appendChild(sep);
	meta.appendChild(dateText);
	article.appendChild(meta);

	/* title */
	var titleEl = document.createElement("h3");
	titleEl.className = "card-title";
	titleEl.textContent = m.title;
	article.appendChild(titleEl);

	/* desc */
	var descEl = document.createElement("p");
	descEl.className = "card-desc";
	descEl.textContent = m.desc;
	article.appendChild(descEl);

	return article;
}
