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

			// Samsung Health mirror table 렌더링.
			// 기존 링·차트·섹션 리스트는 HTML 에서 제거됨.
			const setCell = (id, val) => {
				const el = document.getElementById(id);
				if (el) el.textContent = val != null && val !== '' ? val : '—';
			};

			// 에너지 점수 (Option G 공식 — 서버 composite_score 와 방향성 일치)
			const energy = p.composite_score != null ? p.composite_score
				: (p.hrv != null && p.sleep != null
					? Math.round(
						(Math.pow(Math.min(p.sleep, 8), 1.3) * 14 * 0.30 +
						Math.min(100, Math.max(10, (p.hrv - 3) / 12 * 90 + 10)) * 0.25 +
						Math.min(100, Math.max(0, (p.steps || 0) / 100 + 20)) * 0.15 +
						Math.min(100, Math.max(0, (p.spo2 - 87) * 12)) * 0.10)
						/ (0.30 + 0.25 + 0.15 + 0.10),
					  )
					: null);
			setCell('sm-energy', energy);

			setCell('sm-steps', p.steps != null ? p.steps.toLocaleString() : null);
			// 활동 시간: Health Connect 의 ExerciseSessionRecord 는 명시적 세션만
			// 기록하므로 Samsung Health 의 자동 감지 활동량(87분 등) 과 달라 null.
			// Fallback: 걸음/100 으로 추정 (경험적: 1000보 ≈ 10분).
			const exerciseMin = p.exercise_min != null
				? p.exercise_min
				: (p.steps != null ? Math.round(p.steps / 100) : null);
			setCell('sm-exercise', exerciseMin != null ? exerciseMin + '분' : null);
			// 활동 칼로리: Health Connect 에 없으면 걸음 기반 추정 (1보 ≈ 0.04 kcal)
			const activeCal = p.active_cal != null
				? Math.round(p.active_cal)
				: (p.steps != null ? Math.round(p.steps * 0.04) : null);
			setCell('sm-cal', activeCal != null ? activeCal + ' kcal' : null);

			// 수면 점수 (서버 공식과 동일): sleep^1.3 * 14, 8h+ = 100
			let sleepScore = null;
			if (p.sleep != null) {
				sleepScore = p.sleep >= 8 ? 100 : Math.max(0, Math.min(100, Math.round(Math.pow(p.sleep, 1.3) * 14)));
			}
			setCell('sm-sleep-score', sleepScore);
			setCell('sm-sleep', p.sleep != null ? p.sleep.toFixed(1) + '시간' : null);
			setCell('sm-bed', null); // 취침/기상 시각은 DB 스키마 추가 후 (별도 phase)

			setCell('sm-hr', p.hr != null ? p.hr + ' bpm' : null);
			// 심박 범위: hr_avg 가 있으면 그 근처 ±편차 추정, 또는 현재/안정 조합
			let hrRange = null;
			if (p.hr_max != null && p.rhr != null) hrRange = `${Math.round(p.rhr)} - ${Math.round(p.hr_max)} bpm`;
			else if (p.hr_max != null && p.hr_avg != null) hrRange = `${Math.round(p.hr_avg)} (최대 ${Math.round(p.hr_max)}) bpm`;
			setCell('sm-hr-range', hrRange);

			setCell('sm-rhr', p.rhr != null ? p.rhr + ' bpm' : null);
			setCell('sm-hrv', p.hrv != null ? Math.round(p.hrv) + ' ms' : null);

			// 스트레스 라벨: pseudo-HRV 기반. Samsung 은 "편안함/보통/높음".
			let stressLabel = null;
			if (p.hrv != null) {
				stressLabel = p.hrv >= 12 ? '편안함' : p.hrv >= 8 ? '보통' : '높음';
			}
			setCell('sm-stress', stressLabel);
			setCell('sm-spo2', p.spo2 != null ? p.spo2 + '%' : null);

			// 기존 블록(AI 인사이트, 주간 HR 차트 등) 은 HTML 에서 제거됨 — 아래 기존 코드는
			// 방어적으로 건드리지만 DOM 이 없으면 조용히 건너뜀.
			if (false) {  // legacy — HTML 제거됨, 아래 로직은 미사용
				const weekly = document.getElementById('viewWeekly');
				const lists = weekly && weekly.querySelectorAll('.dp-list');
				const items = lists && lists[2] ? lists[2].querySelectorAll('li') : [];
				void items;
				if (items[1]) {
					let sleepScore = null;
					if (p.sleep != null) {
						if (p.sleep >= 8) sleepScore = 100;
						else sleepScore = Math.max(0, Math.min(100, Math.round(Math.pow(p.sleep, 1.3) * 14)));
					}
					items[1].querySelector('.dp-list-val').textContent = sleepScore != null ? sleepScore : '—';
				}
				if (items[2]) items[2].querySelector('.dp-list-val').textContent = '—';
			}


			// AI 인사이트 — HTML 에서 제거됨, 방어적으로 존재 여부만 확인
			const weekly2 = document.getElementById('viewWeekly');
			const aiP = weekly2 ? weekly2.querySelector('.ai-insight p') : null;
			if (aiP) {
				const parts = [];
				if (p.hrv != null) {
					// pseudo-HRV 임계값 (정수 bpm 기반, 실제 RMSSD 의 1/3~1/5)
					const hrvStatus = p.hrv >= 12 ? '양호' : p.hrv >= 8 ? '보통' : '낮음';
					parts.push('HRV* ' + Math.round(p.hrv) + 'ms(' + hrvStatus + ')');
				}
				if (p.rhr != null) parts.push('안정심박 ' + Math.round(p.rhr) + 'bpm');
				if (p.hr != null) parts.push('심박 ' + Math.round(p.hr) + 'bpm');
				if (p.spo2 != null) parts.push('SpO2 ' + Math.round(p.spo2) + '%');
				if (p.sleep != null) parts.push('수면 ' + p.sleep.toFixed(1) + 'h');
				if (p.steps != null) parts.push('걸음 ' + p.steps.toLocaleString());
				if (p.acwr != null) parts.push('ACWR ' + p.acwr.toFixed(2));

				let advice;
				if (p.acwr != null && p.acwr > 1.5) {
					advice = '급성 부하 증가. 훈련량 감소 권장.';
				} else if (p.acwr != null && p.acwr > 1.3) {
					advice = '훈련 부하 조절 권장.';
				} else if (p.hrv != null && p.hrv < 8) {
					advice = '회복 부족. 휴식 권장.';
				} else if (p.sleep != null && p.sleep < 6) {
					advice = '수면 부족. 취침 시간 확보 권장.';
				} else if (parts.length === 0) {
					aiP.textContent =
						'아직 충분한 데이터가 수집되지 않았습니다. 워치를 착용하고 잠시 기다려주세요.';
					return;
				} else {
					advice = '현재 컨디션 유지 권장.';
				}
				aiP.textContent = parts.join(' · ') + '. ' + advice;
			}

			// Phase 5: 7-day daily HR trend
			this._loadWeeklyHrChart();
		} catch (e) {
			console.warn('Live data load failed:', e);
			this._placeholderView();
		}
	}

	/**
	 * Phase 5: fetch /api/bio-daily (7 days) and render a bar+line chart in
	 * the weekly view. Bars = resting_heart_rate, overlay line = heart_rate_max.
	 */
	async _loadWeeklyHrChart() {
		const mount = document.getElementById('dp-weekly-hr-chart');
		if (!mount) return;
		let data = null;
		try {
			const res = await fetch('/api/bio-daily?days=7', { credentials: 'include' });
			if (!res.ok) { mount.innerHTML = ''; return; }
			const json = await res.json();
			data = json.days || [];
		} catch (_) {
			mount.innerHTML = '';
			return;
		}
		// Filter days that have at least resting_heart_rate so we can plot.
		const usable = data.filter((d) => d.resting_heart_rate != null);
		if (usable.length < 1) {
			mount.innerHTML = '';
			return;
		}
		const w = 280;
		const h = 80;
		const padL = 22, padR = 6, padT = 8, padB = 18;
		const plotW = w - padL - padR;
		const plotH = h - padT - padB;

		// Y-axis range: min rhr → max hr_max, padded.
		let lo = Infinity, hi = -Infinity;
		for (const d of usable) {
			if (d.resting_heart_rate != null) lo = Math.min(lo, d.resting_heart_rate);
			if (d.heart_rate_max != null) hi = Math.max(hi, d.heart_rate_max);
			if (d.resting_heart_rate != null) hi = Math.max(hi, d.resting_heart_rate);
		}
		if (!isFinite(lo)) lo = 50;
		if (!isFinite(hi)) hi = 150;
		if (hi - lo < 20) hi = lo + 20;
		const range = hi - lo;

		const n = usable.length;
		const slotW = plotW / n;
		const barW = Math.min(18, slotW * 0.55);

		const bars = [];
		const linePts = [];
		const labels = [];
		usable.forEach((d, i) => {
			const cx = padL + slotW * i + slotW / 2;
			const rhr = d.resting_heart_rate;
			const maxHr = d.heart_rate_max;
			// Bar: from baseline (lo) to rhr
			if (rhr != null) {
				const y = padT + plotH * (1 - (rhr - lo) / range);
				const barH = padT + plotH - y;
				bars.push(
					`<rect x="${cx - barW / 2}" y="${y}" width="${barW}" height="${barH}" fill="var(--green,#00f19f)" opacity="0.75" rx="2"/>`,
				);
			}
			// Line point at max HR
			if (maxHr != null) {
				const y = padT + plotH * (1 - (maxHr - lo) / range);
				linePts.push(`${cx.toFixed(1)},${y.toFixed(1)}`);
			}
			// X label: date MM/DD
			const md = (d.date || '').slice(5); // "04-15"
			labels.push(
				`<text x="${cx}" y="${h - 4}" text-anchor="middle" font-size="9" fill="var(--text-tertiary,#888)">${md}</text>`,
			);
		});
		const line = linePts.length >= 2
			? `<polyline fill="none" stroke="var(--yellow,#ffd60a)" stroke-width="1.4" points="${linePts.join(' ')}"/>`
			: '';
		const dots = linePts
			.map((pt) => {
				const [x, y] = pt.split(',');
				return `<circle cx="${x}" cy="${y}" r="2" fill="var(--yellow,#ffd60a)"/>`;
			})
			.join('');

		// Y-axis reference labels (lo, hi)
		const yAxis =
			`<text x="${padL - 4}" y="${padT + 4}" text-anchor="end" font-size="9" fill="var(--text-tertiary,#888)">${Math.round(hi)}</text>` +
			`<text x="${padL - 4}" y="${padT + plotH}" text-anchor="end" font-size="9" fill="var(--text-tertiary,#888)">${Math.round(lo)}</text>`;

		mount.innerHTML =
			`<div class="dp-weekly-chart-title">최근 ${n}일 HR 트렌드 (막대=안정심박, 선=최대심박)</div>` +
			`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
			yAxis + bars.join('') + line + dots + labels.join('') +
			`</svg>`;
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
	}

	/**
	 * Render a minimalist SVG polyline sparkline for an HR sample array.
	 * Phase 3-C — R21 cat=0x03 downsampled stream (max 120 points).
	 */
	_sparkline(samples) {
		const w = 220;
		const h = 32;
		const pad = 2;
		const n = samples.length;
		if (n < 2) return "";
		const lo = Math.min(...samples);
		const hi = Math.max(...samples);
		const range = Math.max(1, hi - lo);
		const xStep = (w - pad * 2) / (n - 1);
		const pts = samples
			.map((v, i) => {
				const x = pad + i * xStep;
				const y = pad + (h - pad * 2) * (1 - (v - lo) / range);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(" ");
		return (
			`<svg class="dp-hr-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
			`<polyline fill="none" stroke="var(--green, #00f19f)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>` +
			`</svg>`
		);
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
