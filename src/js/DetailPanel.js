/**
 * DetailPanel - Dashboard module for weekly/monthly/daily detail panel and calendar
 * Handles panel UI interactions, tab switching, and calendar rendering
 */
class DetailPanel {
	constructor() {
		this.currentStatus = "g";
		this.calYear = 2026;
		this.calMonth = 3;
		this.calSelected = null;
	}

	openWeekly(name, status, playerId) {
		this.currentStatus = status;
		this.currentPlayer = name;
		this.currentPlayerId = playerId;
		document.getElementById("weeklyName").textContent = name + " 선수";
		this.switchTab("weekly");

		const colors = { g: "var(--green)", y: "var(--yellow)", r: "var(--red)" };
		const cls = { g: "dp-v-green", y: "dp-v-yellow", r: "dp-v-red" };

		this._loadLiveData(name, playerId, status, colors, cls);

		document.getElementById("weeklyOverlay").classList.add("show");
		setTimeout(
			() => document.getElementById("weeklyPanel").classList.add("open"),
			10,
		);
		document.body.style.overflow = "hidden";
	}

	_placeholderView() {
		const ids = ["rRecoveryVal", "rSleepVal", "rStrainVal"];
		ids.forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.textContent = "—";
		});
		["rRecovery", "rSleep", "rStrain"].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.style.strokeDashoffset = String(id === "rRecovery" ? 364 : 251);
		});
	}

	async _loadLiveData(name, playerId, status, colors, cls) {
		try {
			let p = null;
			if (Array.isArray(window.__players)) {
				p = window.__players.find(
					(x) => (playerId && x.id === playerId) || x.name === name,
				);
			}
			if (!p) {
				const res = await fetch("/api/coach/players", { credentials: "include" });
				const players = await res.json();
				p = players.find(
					(x) => (playerId && x.id === playerId) || x.name === name,
				);
			}
			if (!p) { this._placeholderView(); return; }

			// 회복 점수 계산 (HRV + ACWR 기반)
			const hrvScore = p.hrv ? Math.min(100, Math.round(p.hrv * 1.5)) : 50;
			const acwrPenalty = p.acwr > 1.3 ? (p.acwr - 1.3) * 50 : 0;
			const recovery = Math.max(0, Math.min(100, hrvScore - Math.round(acwrPenalty)));
			const sleepPct = p.sleep ? Math.min(1, p.sleep / 9) : 0;
			const strainVal = p.acwr ? (p.acwr * 10).toFixed(1) : '0';
			const strainPct = p.acwr ? Math.min(1, p.acwr / 2) : 0;

			const rColor = recovery >= 70 ? 'var(--green)' : recovery >= 40 ? 'var(--yellow)' : 'var(--red)';
			const rCls = recovery >= 70 ? 'dp-v-green' : recovery >= 40 ? 'dp-v-yellow' : 'dp-v-red';

			const valEl = document.getElementById("rRecoveryVal");
			valEl.textContent = recovery;
			valEl.className = "dp-ring-val " + rCls;
			valEl.style.fontSize = "36px";

			const rings = [
				{ id: "rRecovery", circ: 364, pct: recovery / 100, color: rColor },
				{ id: "rSleep", circ: 251, pct: sleepPct, color: "var(--blue)" },
				{ id: "rStrain", circ: 251, pct: strainPct, color: "var(--yellow)" },
			];
			rings.forEach((r) => {
				const el = document.getElementById(r.id);
				el.style.stroke = r.color;
				el.style.strokeDashoffset = String(r.circ);
				setTimeout(() => { el.style.strokeDashoffset = String(r.circ - r.circ * r.pct); }, 100);
			});

			// 수면 링 값
			const sleepCenter = document.querySelector('#rSleep').closest('.dp-ring-wrap').querySelector('.dp-ring-val');
			if (sleepCenter) {
				sleepCenter.innerHTML = p.sleep != null
					? p.sleep.toFixed(1) + '<span style="font-size:11px">h</span>'
					: '—';
			}

			// 부하 링 값
			const strainCenter = document.querySelector('#rStrain').closest('.dp-ring-wrap').querySelector('.dp-ring-val');
			if (strainCenter) strainCenter.textContent = strainVal;

			// 주간 뷰 상세 리스트 업데이트
			const weekly = document.getElementById('viewWeekly');
			if (!weekly) return;
			const lists = weekly.querySelectorAll('.dp-list');

			// 심박·심혈관
			if (lists[0]) {
				const items = lists[0].querySelectorAll('li');
				if (items[0]) items[0].querySelector('.dp-list-val').innerHTML = (p.hr || '-') + '<span class="dp-list-unit">bpm</span>';
				if (items[1]) items[1].querySelector('.dp-list-val').innerHTML = (p.rhr || '-') + '<span class="dp-list-unit">bpm</span>';
				if (items[2]) items[2].querySelector('.dp-list-val').innerHTML = (p.walking_hr || '-') + '<span class="dp-list-unit">bpm</span>';
				if (items[3]) items[3].querySelector('.dp-list-val').innerHTML = (p.hrv ? Math.round(p.hrv) : '-') + '<span class="dp-list-unit">ms</span>';
				if (items[4]) items[4].querySelector('.dp-list-val').innerHTML = (p.spo2 || '-') + '<span class="dp-list-unit">%</span>';
			}

			// 활동
			if (lists[1]) {
				const items = lists[1].querySelectorAll('li');
				if (items[0]) items[0].querySelector('.dp-list-val').textContent = p.steps ? p.steps.toLocaleString() : '-';
				if (items[1]) items[1].querySelector('.dp-list-val').innerHTML = (p.distance_km || '-') + '<span class="dp-list-unit">km</span>';
				if (items[2]) items[2].querySelector('.dp-list-val').innerHTML = (p.active_cal ? Math.round(p.active_cal) : '-') + '<span class="dp-list-unit">kcal</span>';
				if (items[3]) items[3].querySelector('.dp-list-val').innerHTML = (p.basal_cal || '-') + '<span class="dp-list-unit">kcal</span>';
				if (items[4]) items[4].querySelector('.dp-list-val').innerHTML = (p.exercise_min || '-') + '<span class="dp-list-unit">분</span>';
				if (items[5]) items[5].querySelector('.dp-list-val').innerHTML = (p.stand_min || '-') + '<span class="dp-list-unit">분</span>';
				if (items[6]) items[6].querySelector('.dp-list-val').innerHTML = (p.flights || '-') + '<span class="dp-list-unit">층</span>';
			}

			// 수면
			if (lists[2]) {
				const items = lists[2].querySelectorAll('li');
				if (items[0]) {
					items[0].querySelector('.dp-list-val').innerHTML = p.sleep != null
						? p.sleep.toFixed(1) + '<span class="dp-list-unit">시간</span>'
						: '—';
				}
				if (items[1]) items[1].querySelector('.dp-list-val').textContent = '—';
			}

			// 환경·청각
			if (lists[3]) {
				const items = lists[3].querySelectorAll('li');
				if (items[0]) items[0].querySelector('.dp-list-val').innerHTML = (p.env_db || '-') + '<span class="dp-list-unit">dB</span>';
				if (items[1]) items[1].querySelector('.dp-list-val').innerHTML = (p.earphone_db || '-') + '<span class="dp-list-unit">dB</span>';
			}

			// AI 인사이트
			const aiP = weekly.querySelector('.ai-insight p');
			if (aiP) {
				const hrvStatus = p.hrv >= 50 ? '양호' : p.hrv >= 35 ? '보통' : '낮음';
				aiP.textContent = 'HRV ' + (p.hrv ? Math.round(p.hrv) : '-') + 'ms (' + hrvStatus + '). ' +
					'안정심박 ' + (p.rhr || '-') + 'bpm. ' +
					'ACWR ' + (p.acwr || '-') + '. ' +
					(p.acwr > 1.3 ? '훈련 부하 조절 권장.' : '현재 컨디션 유지 권장.');
			}
		} catch (e) {
			console.warn('Live data load failed:', e);
			this._placeholderView();
		}
	}

	closeWeekly() {
		document.getElementById("weeklyPanel").classList.remove("open");
		setTimeout(() => {
			document.getElementById("weeklyOverlay").classList.remove("show");
			document.body.style.overflow = "";
		}, 400);
	}

	switchTab(tab) {
		document.querySelectorAll(".dp-tab").forEach((t, i) => {
			t.classList.toggle(
				"active",
				(tab === "weekly" && i === 0) ||
					(tab === "monthly" && i === 1) ||
					(tab === "daily" && i === 2),
			);
		});
		document
			.getElementById("viewWeekly")
			.classList.toggle("active", tab === "weekly");
		document
			.getElementById("viewMonthly")
			.classList.toggle("active", tab === "monthly");
		document
			.getElementById("viewDaily")
			.classList.toggle("active", tab === "daily");
		const fmt = (d) => (d.getMonth() + 1) + "/" + d.getDate();
		if (tab === "weekly") {
			const today = new Date();
			const start = new Date(today);
			start.setDate(today.getDate() - 6);
			document.getElementById("dpDateRange").textContent =
				fmt(start) + " ~ " + fmt(today);
		} else if (tab === "monthly") {
			const today = new Date();
			const start = new Date(today);
			start.setDate(today.getDate() - 29);
			document.getElementById("dpDateRange").textContent =
				fmt(start) + " ~ " + fmt(today);
			["mRecovery", "mSleep", "mStrain"].forEach((id) => {
				const el = document.getElementById(id);
				if (el) el.style.strokeDashoffset = String(id === "mRecovery" ? 364 : 251);
			});
			["mRecoveryVal", "mSleepVal", "mStrainVal"].forEach((id) => {
				const el = document.getElementById(id);
				if (el) el.textContent = "—";
			});
		} else if (tab === "daily") {
			document.getElementById("dpDateRange").textContent = "일별 기록";
			this.renderCalendar();
		}
	}

	getDayData(_y, _m, _d) {
		// Real per-day data fetch requires a coach-side endpoint that does
		// not yet exist. Returning null keeps the calendar functional but
		// without mock values; the UI shows "데이터 없음".
		return null;
	}

	renderCalendar() {
		const grid = document.getElementById("calGrid");
		grid.innerHTML = "";
		const monthNames = [
			"1월",
			"2월",
			"3월",
			"4월",
			"5월",
			"6월",
			"7월",
			"8월",
			"9월",
			"10월",
			"11월",
			"12월",
		];
		document.getElementById("calTitle").textContent =
			this.calYear + "년 " + monthNames[this.calMonth];
		const dows = ["일", "월", "화", "수", "목", "금", "토"];
		dows.forEach((d) => {
			const el = document.createElement("div");
			el.className = "cal-dow";
			el.textContent = d;
			grid.appendChild(el);
		});
		const firstDay = new Date(this.calYear, this.calMonth, 1).getDay();
		const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
		const today = new Date();
		for (let i = 0; i < firstDay; i++) {
			const el = document.createElement("div");
			el.className = "cal-day empty";
			grid.appendChild(el);
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const el = document.createElement("div");
			el.className = "cal-day";
			el.textContent = d;
			const isToday =
				this.calYear === today.getFullYear() &&
				this.calMonth === today.getMonth() &&
				d === today.getDate();
			if (isToday) el.classList.add("today");
			if (
				this.calSelected &&
				this.calSelected.y === this.calYear &&
				this.calSelected.m === this.calMonth &&
				this.calSelected.d === d
			) {
				el.classList.add("selected");
			}
			const data = this.getDayData(this.calYear, this.calMonth, d);
			if (data) {
				const dot = document.createElement("span");
				dot.className = "cal-dot " + data.status;
				el.appendChild(dot);
			}
			el.onclick = () => this.selectDay(this.calYear, this.calMonth, d);
			grid.appendChild(el);
		}
	}

	calNav(dir) {
		this.calMonth += dir;
		if (this.calMonth > 11) {
			this.calMonth = 0;
			this.calYear++;
		}
		if (this.calMonth < 0) {
			this.calMonth = 11;
			this.calYear--;
		}
		this.renderCalendar();
	}

	selectDay(y, m, d) {
		this.calSelected = { y, m, d };
		this.renderCalendar();
		const data = this.getDayData(y, m, d);
		const noData = document.getElementById("dayNoData");
		const dayDataEl = document.getElementById("dayData");
		if (!data) {
			dayDataEl.style.display = "none";
			noData.style.display = "block";
			noData.textContent = "해당 날짜의 데이터가 없습니다.";
			return;
		}
		noData.style.display = "none";
		dayDataEl.style.display = "block";
		const dows = ["일", "월", "화", "수", "목", "금", "토"];
		const dateObj = new Date(y, m, d);
		document.getElementById("dayDataDate").textContent =
			m + 1 + "월 " + d + "일 (" + dows[dateObj.getDay()] + ")";
		document.getElementById("dayDataDot").style.background = data.statusColor;
		document.getElementById("dayDataStatus").textContent = data.statusLabel;
		const valColor = (status) =>
			status === "g"
				? "dp-v-green"
				: status === "y"
					? "dp-v-yellow"
					: "dp-v-red";
		const vc = valColor(data.status);
		document.getElementById("dd-hr").innerHTML =
			data.hr + '<span class="dp-list-unit">bpm</span>';
		document.getElementById("dd-rhr").innerHTML =
			data.rhr + '<span class="dp-list-unit">bpm</span>';
		document.getElementById("dd-rhr").className = "dp-list-val " + vc;
		document.getElementById("dd-hrv").innerHTML =
			data.hrv + '<span class="dp-list-unit">ms</span>';
		document.getElementById("dd-hrv").className = "dp-list-val " + vc;
		document.getElementById("dd-spo2").innerHTML =
			data.spo2 + '<span class="dp-list-unit">%</span>';
		document.getElementById("dd-spo2").className = "dp-list-val dp-v-green";
		document.getElementById("dd-steps").textContent = data.steps;
		document.getElementById("dd-cal").innerHTML =
			data.cal + '<span class="dp-list-unit">kcal</span>';
		document.getElementById("dd-cal").className = "dp-list-val dp-v-yellow";
		document.getElementById("dd-exercise").innerHTML =
			data.exercise + '<span class="dp-list-unit">분</span>';
		document.getElementById("dd-exercise").className = "dp-list-val dp-v-green";
		document.getElementById("dd-sleep").innerHTML =
			data.sleep + '<span class="dp-list-unit">시간</span>';
		document.getElementById("dd-sleep").className = "dp-list-val dp-v-blue";
		document.getElementById("dd-bed").textContent = data.bed;
		document.getElementById("dd-stress").innerHTML = data.stress;
		document.getElementById("dd-stress").className =
			"dp-list-val " +
			(data.stress > 50
				? "dp-v-red"
				: data.stress > 30
					? "dp-v-yellow"
					: "dp-v-green");
		document.getElementById("dd-acwr").innerHTML = data.acwr;
		document.getElementById("dd-acwr").className =
			"dp-list-val " +
			(parseFloat(data.acwr) > 1.3 ? "dp-v-red" : "dp-v-yellow");
		document.getElementById("dd-pain").innerHTML =
			data.pain + '<span class="dp-list-unit">/10</span>';
		document.getElementById("dd-pain").className =
			"dp-list-val " +
			(data.pain === 0
				? "dp-v-green"
				: data.pain <= 3
					? "dp-v-yellow"
					: "dp-v-red");
		document.getElementById("dd-noise").innerHTML =
			data.noise + '<span class="dp-list-unit">dB</span>';
		document.getElementById("dd-noise").className =
			"dp-list-val " + (data.noise < 50 ? "dp-v-green" : "dp-v-yellow");
		document.getElementById("dd-earphone").innerHTML =
			data.earphone + '<span class="dp-list-unit">dB</span>';
		document.getElementById("dd-earphone").className =
			"dp-list-val " + (data.earphone < 65 ? "dp-v-green" : "dp-v-yellow");
	}
}

// Global instantiation
window.detailPanel = new DetailPanel();

// Expose public methods on window for backward compatibility and inline event handlers
window.openWeekly = (name, status, playerId) =>
	window.detailPanel.openWeekly(name, status, playerId);
window.closeWeekly = () => window.detailPanel.closeWeekly();
window.switchTab = (tab) => window.detailPanel.switchTab(tab);
window.calNav = (dir) => window.detailPanel.calNav(dir);
window.selectDay = (y, m, d) => window.detailPanel.selectDay(y, m, d);
