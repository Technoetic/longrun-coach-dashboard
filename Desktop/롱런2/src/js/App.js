"use strict";

/* ─── SCROLL PROGRESS BAR ─────────────────────────────────── */
function initScrollBar() {
	var bar = document.getElementById("scroll-progress-bar");
	if (!bar) return;
	window.addEventListener(
		"scroll",
		function () {
			var total =
				document.documentElement.scrollHeight -
				document.documentElement.clientHeight;
			bar.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + "%";
		},
		{ passive: true },
	);
}

/* ─── INTERSECTION OBSERVER ───────────────────────────────── */
function initScrollAnimations() {
	var els = document.querySelectorAll(".milestone-card, .fade-up");

	if (!window.IntersectionObserver) {
		els.forEach(function (el) {
			el.classList.add("is-visible");
		});
		return;
	}

	var observer = new IntersectionObserver(
		function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
	);

	els.forEach(function (el) {
		observer.observe(el);
	});
}

/* ─── NAV PILL CLICK + SCROLL TRACKING ───────────────────── */
function initNavPills() {
	var pills = document.querySelectorAll(".nav-pill[data-target]");
	var isClicking = false;

	/* Click → smooth scroll */
	pills.forEach(function (pill) {
		pill.style.cursor = "pointer";
		pill.addEventListener("click", function (e) {
			e.preventDefault();
			isClicking = true;
			var target = document.getElementById(pill.getAttribute("data-target"));
			if (target) target.scrollIntoView({ behavior: "smooth" });
			pills.forEach(function (p) { p.classList.remove("nav-pill--active"); });
			pill.classList.add("nav-pill--active");
			setTimeout(function () { isClicking = false; }, 800);
		});
	});

	/* Scroll → auto-activate matching pill */
	if (!window.IntersectionObserver) return;
	var sections = [];
	pills.forEach(function (pill) {
		var el = document.getElementById(pill.getAttribute("data-target"));
		if (el) sections.push({ el: el, pill: pill });
	});

	var phaseObserver = new IntersectionObserver(
		function (entries) {
			if (isClicking) return;
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					pills.forEach(function (p) { p.classList.remove("nav-pill--active"); });
					for (var i = 0; i < sections.length; i++) {
						if (sections[i].el === entry.target) {
							sections[i].pill.classList.add("nav-pill--active");
							break;
						}
					}
				}
			});
		},
		{ threshold: 0.3 }
	);

	sections.forEach(function (s) { phaseObserver.observe(s.el); });
}

/* ─── BOOT ────────────────────────────────────────────────── */
function boot() {
	var timelineContainer = document.getElementById("timeline-container");
	/* Collect all milestones */
	var allMilestones = [];
	ROADMAP.phases.forEach(function (p) {
		p.milestones.forEach(function (m) {
			allMilestones.push(m);
		});
	});

	/* Update hero stats */
	updateHeroStats(allMilestones);

	/* Render timeline phases */
	if (timelineContainer) {
		ROADMAP.phases.forEach(function (phase) {
			timelineContainer.appendChild(buildPhase(phase));
		});
	}

	/* Init interactions */
	initScrollAnimations();
	initScrollBar();
	initNavPills();

	console.log(
		"LongRun 초기화 완료 — phases: 3, milestones: " + allMilestones.length,
	);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", boot);
} else {
	boot();
}
