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

			// 회복 점수 계산 (pseudo-HRV + ACWR 기반)
			// pseudo-HRV 는 정수 bpm 기반 역산이라 실제 RMSSD 의 1/3~1/5 수준.
			// 일반 범위: 5~20ms. 20ms 이상이면 100점 처리.
			const hrvScore = p.hrv ? Math.min(100, Math.round(p.hrv * 5)) : 50;
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
				if (items[0]) {
					// 심박수: 현재값 + (오늘 max / avg / samples) 작은 서브텍스트 + sparkline
					let hrHtml = (p.hr || '-') + '<span class="dp-list-unit">bpm</span>';
					if (p.hr_max != null || p.hr_avg != null) {
						const maxTxt = p.hr_max != null ? Math.round(p.hr_max) : '-';
						const avgTxt = p.hr_avg != null ? Math.round(p.hr_avg) : '-';
						const n = p.hr_samples_count || 0;
						hrHtml += `<div class="dp-list-sub">오늘 최대 ${maxTxt} / 평균 ${avgTxt} bpm (${n}샘플)</div>`;
					}
					// Parse hr_samples_json (from coach endpoint) or array (from bio-data)
					let samples = null;
					if (Array.isArray(p.hr_samples)) samples = p.hr_samples;
					else if (typeof p.hr_samples_json === 'string' && p.hr_samples_json.length > 0) {
						try { samples = JSON.parse(p.hr_samples_json); } catch (_) { samples = null; }
					}
					if (Array.isArray(samples) && samples.length >= 3) {
						hrHtml += this._sparkline(samples);
					}
					items[0].querySelector('.dp-list-val').innerHTML = hrHtml;
				}
				if (items[1]) items[1].querySelector('.dp-list-val').innerHTML = (p.rhr || '-') + '<span class="dp-list-unit">bpm</span>';
				if (items[2]) items[2].querySelector('.dp-list-val').innerHTML = (p.hrv ? Math.round(p.hrv) : '-') + '<span class="dp-list-unit">ms*</span>';
				if (items[3]) items[3].querySelector('.dp-list-val').innerHTML = (p.spo2 || '-') + '<span class="dp-list-unit">%</span>';
			}

			// 활동
			if (lists[1]) {
				const items = lists[1].querySelectorAll('li');
				if (items[0]) items[0].querySelector('.dp-list-val').textContent = p.steps ? p.steps.toLocaleString() : '-';
				if (items[1]) items[1].querySelector('.dp-list-val').innerHTML = (p.distance_km || '-') + '<span class="dp-list-unit">km</span>';
				if (items[2]) items[2].querySelector('.dp-list-val').innerHTML = (p.active_cal ? Math.round(p.active_cal) : '-') + '<span class="dp-list-unit">kcal</span>';
				if (items[3]) items[3].querySelector('.dp-list-val').innerHTML = (p.basal_cal || '-') + '<span class="dp-list-unit">kcal</span>';
				if (items[4]) items[4].querySelector('.dp-list-val').innerHTML = (p.exercise_min || '-') + '<span class="dp-list-unit">분</span>';
				if (items[5]) items[5].querySelector('.dp-list-val').innerHTML = (p.flights || '-') + '<span class="dp-list-unit">층</span>';
			}

			// 수면
			if (lists[2]) {
				const items = lists[2].querySelectorAll('li');
				if (items[0]) {
					items[0].querySelector('.dp-list-val').innerHTML = p.sleep != null
						? p.sleep.toFixed(1) + '<span class="dp-list-unit">시간</span>'
						: '—';
				}
				// 수면 점수 (Samsung Health 방향성 매칭): 서버 공식과 동일하게
				// sleep^1.3 * 14. 4.3h → 약 58, 6h → 80, 8h+ → 100
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


			// AI 인사이트 — 데이터 일부만 있을 때도 의미 있게
			const aiP = weekly.querySelector('.ai-insight p');
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
