class TeamManager {
	constructor() {
		this.MAX_TEAMS = 4;
		this.newSport = null;
		this.newCode = null;

		// Team init logic
		this.initializeTeam();
	}

	initializeTeam() {
		const sport = sessionStorage.getItem("lr_team_sport") || "철인3종";
		const name = sessionStorage.getItem("lr_team_name") || sport + " 팀";
		let code = sessionStorage.getItem("lr_team_code");

		if (!code) {
			const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
			code = "";
			for (let i = 0; i < 6; i++)
				code += c[Math.floor(Math.random() * c.length)];
			sessionStorage.setItem("lr_team_code", code);
		}

		const chip = document.getElementById("initialTeamChip");
		if (chip) {
			chip.innerHTML = name + ' <span class="tc-sport">' + sport + "</span>";
			chip.dataset.code = code;
		}

		const headerCodeVal = document.getElementById("headerCodeVal");
		if (headerCodeVal) {
			headerCodeVal.textContent = code;
		}
	}

	copyHeaderCode() {
		const code = document.getElementById("headerCodeVal").textContent;
		if (!code || code === "——") return;

		navigator.clipboard.writeText(code).then(() => {
			const btn = document.getElementById("headerCodeBtn");
			btn.classList.add("copied");
			const orig = btn.querySelector(".tcode-val").textContent;
			btn.querySelector(".tcode-val").textContent = "복사됨!";
			setTimeout(() => {
				btn.classList.remove("copied");
				btn.querySelector(".tcode-val").textContent = orig;
			}, 1500);
		});
	}

	selectTeam(el) {
		document
			.querySelectorAll(".team-chip")
			.forEach((c) => c.classList.remove("active"));
		el.classList.add("active");
		const code = el.dataset.code || "——";
		document.getElementById("headerCodeVal").textContent = code;
	}

	openAddTeam() {
		const teamCount = document.querySelectorAll(".team-chip").length;
		if (teamCount >= this.MAX_TEAMS) {
			alert("팀은 최대 " + this.MAX_TEAMS + "개까지 추가할 수 있습니다.");
			return;
		}

		this.newSport = null;
		this.newCode = null;

		document.getElementById("addStep1").classList.add("active");
		document.getElementById("addStep2").classList.remove("active");
		document
			.querySelectorAll(".m-sport-item")
			.forEach((s) => s.classList.remove("selected"));
		document.getElementById("addNext1").disabled = true;
		document.getElementById("newTeamName").value = "";
		document.getElementById("newCodeDisplay").style.display = "none";
		document.getElementById("newCopyBtn").style.display = "none";
		document.getElementById("addDone").style.display = "none";
		document.getElementById("addTeamBg").classList.add("show");
	}

	closeAddTeam() {
		document.getElementById("addTeamBg").classList.remove("show");
	}

	pickSport(el, sport) {
		document
			.querySelectorAll(".m-sport-item")
			.forEach((s) => s.classList.remove("selected"));
		el.classList.add("selected");
		this.newSport = sport;
		document.getElementById("addNext1").disabled = false;
	}

	goAddStep() {
		document.getElementById("addStep1").classList.remove("active");
		document.getElementById("addStep2").classList.add("active");
	}

	generateTeamCode() {
		return window.generateCode();
	}

	onTeamNameInput() {
		const name = document.getElementById("newTeamName").value.trim();
		if (name.length >= 2) {
			if (!this.newCode) this.newCode = this.generateTeamCode();
			document.getElementById("newCodeVal").textContent = this.newCode;
			document.getElementById("newCodeDisplay").style.display = "block";
			document.getElementById("newCopyBtn").style.display = "flex";
			document.getElementById("addDone").style.display = "block";
		} else {
			document.getElementById("newCodeDisplay").style.display = "none";
			document.getElementById("newCopyBtn").style.display = "none";
			document.getElementById("addDone").style.display = "none";
		}
	}

	copyNewCode() {
		if (!this.newCode) return;

		navigator.clipboard.writeText(this.newCode).then(() => {
			const btn = document.getElementById("newCopyBtn");
			btn.classList.add("copied");
			btn.innerHTML =
				'<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 복사 완료';
			setTimeout(() => {
				btn.classList.remove("copied");
				btn.innerHTML =
					'<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> 코드 복사';
			}, 2000);
		});
	}

	async addTeamDone() {
		const name = document.getElementById("newTeamName").value.trim();
		if (!name || !this.newCode || !this.newSport) {
			alert("팀 이름·종목·코드를 모두 입력해주세요.");
			return;
		}

		// 1. 백엔드에 실제 팀 생성 (POST /api/teams)
		try {
			const res = await fetch("/api/teams", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ name, code: this.newCode }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				alert(`팀 생성 실패: ${err.detail || res.statusText}`);
				return;
			}
			// 종목도 함께 PATCH
			await fetch("/api/user/me", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ sport: this.newSport, role: "coach" }),
			});
		} catch (e) {
			alert(`팀 생성 실패: ${e.message}`);
			return;
		}

		// 2. UI 에 칩 추가
		const selector = document.getElementById("teamSelector");
		const addBtn = selector.querySelector(".btn-add-team");
		const chip = document.createElement("button");

		chip.className = "team-chip";
		chip.dataset.code = this.newCode;
		chip.onclick = (e) => this.selectTeam(e.currentTarget);
		chip.innerHTML =
			name + ' <span class="tc-sport">' + this.newSport + "</span>";

		selector.insertBefore(chip, addBtn);
		this.selectTeam(chip);

		if (selector.querySelectorAll(".team-chip").length >= this.MAX_TEAMS) {
			addBtn.style.display = "none";
		}

		this.newCode = null;
		this.closeAddTeam();

		// 3. 선수 리스트 재로드 (409 → 200 전환)
		if (typeof window.loadAllPlayers === "function") {
			window.loadAllPlayers();
		}
	}

	openDeleteTeam() {
		const chips = document.querySelectorAll(".team-chip");
		if (chips.length <= 1) {
			alert("팀이 1개만 남아있어 삭제할 수 없습니다.");
			return;
		}

		const activeChip = document.querySelector(".team-chip.active");
		if (!activeChip) return;

		document.getElementById("delCodeInput").value = "";
		document.getElementById("delCodeHint").textContent = "";
		document.getElementById("delConfirmBtn").disabled = true;
		document.getElementById("delConfirmOverlay").classList.add("show");
	}

	closeDeleteTeam() {
		document.getElementById("delConfirmOverlay").classList.remove("show");
	}

	checkDelCode(el) {
		el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
		const activeChip = document.querySelector(".team-chip.active");
		const teamCode = activeChip ? activeChip.dataset.code : "";
		const hint = document.getElementById("delCodeHint");
		const btn = document.getElementById("delConfirmBtn");

		if (el.value.length === 6) {
			if (el.value === teamCode) {
				hint.textContent = "코드가 일치합니다";
				hint.className = "confirm-hint";
				hint.style.color = "var(--green)";
				btn.disabled = false;
			} else {
				hint.textContent = "팀 코드가 일치하지 않습니다";
				hint.className = "confirm-hint err";
				btn.disabled = true;
			}
		} else {
			hint.textContent = "";
			hint.className = "confirm-hint";
			btn.disabled = true;
		}
	}

	executeDeleteTeam() {
		const activeChip = document.querySelector(".team-chip.active");
		if (!activeChip) return;

		activeChip.remove();
		const remaining = document.querySelectorAll(".team-chip");

		if (remaining.length > 0) {
			this.selectTeam(remaining[0]);
		} else {
			document.getElementById("headerCodeVal").textContent = "——";
		}

		if (remaining.length < this.MAX_TEAMS) {
			const addBtn = document.querySelector(".btn-add-team");
			if (addBtn) addBtn.style.display = "";
		}

		this.closeDeleteTeam();
		window.closeSettings();
	}
}

// Instantiate and expose globally
window.teamManager = new TeamManager();

// Expose methods on window for HTML event handlers
window.selectTeam = (el) => window.teamManager.selectTeam(el);
window.copyHeaderCode = () => window.teamManager.copyHeaderCode();
window.openAddTeam = () => window.teamManager.openAddTeam();
window.closeAddTeam = () => window.teamManager.closeAddTeam();
window.pickSport = (el, sport) => window.teamManager.pickSport(el, sport);
window.goAddStep = (n) => window.teamManager.goAddStep(n);
window.onTeamNameInput = () => window.teamManager.onTeamNameInput();
window.copyNewCode = () => window.teamManager.copyNewCode();
window.addTeamDone = () => window.teamManager.addTeamDone();
window.openDeleteTeam = () => window.teamManager.openDeleteTeam();
window.closeDeleteTeam = () => window.teamManager.closeDeleteTeam();
window.checkDelCode = (el) => window.teamManager.checkDelCode(el);
window.executeDeleteTeam = () => window.teamManager.executeDeleteTeam();

// ===== 선수 리스트: /api/coach/players 전체 로드 + summary 집계 =====
function _buildPlayerCard(p, idx) {
	const name = p.name || "?";
	// 한글 이름은 첫 글자만, 그 외는 앞 2글자로 이니셜 생성 (dicebear initials 호환)
	const isHangul = /[\u3131-\u318e\uac00-\ud7a3]/.test(name);
	const seed = isHangul ? name.charAt(0) : name.slice(0, 2);
	const colorByStatus = { g: "00F19F", y: "FFD60A", r: "FF3B30" };
	const photoColor = colorByStatus[p.status] || "7BDBFF";
	const hrvText = p.hrv != null ? Math.round(p.hrv) : "-";
	const hrvClass = p.hrv == null
		? "val-normal"
		: p.hrv >= 50 ? "val-up" : p.hrv >= 35 ? "val-normal" : "val-down";
	const rhrText = p.rhr != null ? Math.round(p.rhr) : "-";
	const sleepText = p.sleep != null ? p.sleep.toFixed(1) + "h" : "-";
	const stressText = p.stress != null ? p.stress : "-";
	const acwrText = p.acwr != null ? p.acwr.toFixed(2) : "-";
	const acwrClass = p.acwr == null
		? "val-normal"
		: p.acwr >= 1.5 ? "val-down" : p.acwr >= 1.3 ? "val-normal" : "val-normal";
	const painVal = p.pain || 0;
	const painClass = painVal > 2 ? "val-down" : "val-up";
	const nameSafe = (p.name || "").replace(/'/g, "\\'");
	let syncText = "미동기화";
	if (p.watch_at) {
		const diffMin = Math.floor((Date.now() - new Date(p.watch_at).getTime()) / 60000);
		if (diffMin < 1) syncText = "방금 전";
		else if (diffMin < 60) syncText = diffMin + "분 전";
		else if (diffMin < 1440) syncText = Math.floor(diffMin / 60) + "시간 전";
		else syncText = Math.floor(diffMin / 1440) + "일 전";
	}
	return (
		'<div class="player-card" onclick="openWeekly(\'' + nameSafe + "','" + p.status + "'," + p.id + ')">' +
		'<div class="player-photo">' +
		'<img src="https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(seed) +
		"&backgroundColor=1a1a1a&textColor=" + photoColor + '" alt="' + nameSafe + '">' +
		'<span class="signal ' + p.status + '"></span></div>' +
		'<div class="player-main"><div class="player-top">' +
		'<span class="player-name">' + (p.name || "") + "</span>" +
		'<span class="player-num" title="마지막 동기화: ' + syncText + '">#' + (idx + 1) + ' · ' + syncText + "</span></div>" +
		'<div class="player-stats">' +
		'<div class="ps-item"><div class="ps-val ' + hrvClass + '">' + hrvText + '</div><div class="ps-label">HRV</div></div>' +
		'<div class="ps-item"><div class="ps-val val-normal">' + rhrText + '</div><div class="ps-label">RHR</div></div>' +
		'<div class="ps-item"><div class="ps-val val-normal">' + sleepText + '</div><div class="ps-label">수면</div></div>' +
		'<div class="ps-item"><div class="ps-val val-normal">' + stressText + '</div><div class="ps-label">스트레스</div></div>' +
		'<div class="ps-item"><div class="ps-val ' + acwrClass + '">' + acwrText + '</div><div class="ps-label">ACWR</div></div>' +
		'<div class="ps-item"><div class="ps-val ' + painClass + '">' + painVal + '</div><div class="ps-label">통증</div></div>' +
		"</div></div>" +
		'<div class="player-arrow"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg></div></div>'
	);
}

async function loadAllPlayers() {
	const list = document.getElementById("playerList");
	if (!list) return;
	try {
		const res = await fetch("/api/coach/players", { credentials: "include" });
		if (res.status === 409) {
			list.innerHTML =
				'<div class="player-empty">먼저 팀을 만들어주세요.</div>';
			_setSummary(0, 0, 0, 0);
			return;
		}
		if (res.status === 403) {
			// Athlete fallback: load own bio-data and render as a 1-player list.
			// Coach endpoint refused because this user is role=athlete.
			try {
				const bioRes = await fetch("/api/bio-data", { credentials: "include" });
				if (!bioRes.ok) throw new Error("bio-data " + bioRes.status);
				const bio = await bioRes.json();
				const latest = bio.latest || {};
				const myName = sessionStorage.getItem("lr_user_name") || "나";
				const player = {
					id: 0,
					name: myName,
					hr: latest.heart_rate,
					rhr: latest.resting_heart_rate,
					walking_hr: latest.walking_heart_rate,
					hrv: latest.hrv,
					spo2: latest.blood_oxygen,
					hr_max: latest.heart_rate_max,
					hr_avg: latest.heart_rate_avg,
					hr_samples_count: latest.heart_rate_samples_count,
					steps: latest.steps,
					distance_km: latest.distance_km,
					active_cal: latest.active_calories,
					basal_cal: latest.basal_calories,
					exercise_min: latest.exercise_minutes,
					stand_min: latest.stand_minutes,
					flights: latest.flights_climbed,
					sleep: latest.sleep_hours,
					env_db: latest.env_audio_db,
					earphone_db: latest.headphone_audio_db,
					watch_at: latest.created_at,
					status: "g",
				};
				window.__players = [player];
				list.innerHTML = _buildPlayerCard(player, 0);
				_setSummary(1, 0, 0, 0);
				return;
			} catch (e) {
				list.innerHTML = '<div class="player-empty">데이터를 불러올 수 없습니다.</div>';
				_setSummary(0, 0, 0, 0);
				return;
			}
		}
		if (res.status === 401) {
			location.href = "login.html";
			return;
		}
		if (!res.ok) throw new Error("HTTP " + res.status);
		const players = await res.json();
		if (!Array.isArray(players) || players.length === 0) {
			list.innerHTML =
				'<div class="player-empty">아직 팀에 가입한 선수가 없습니다.<br>선수에게 팀 코드를 공유해주세요.</div>';
			_setSummary(0, 0, 0, 0);
			return;
		}
		window.__players = players;
		list.innerHTML = players.map((p, i) => _buildPlayerCard(p, i)).join("");
		const counts = { g: 0, y: 0, r: 0, d: 0 };
		for (const p of players) {
			const s = p.status || "d";
			counts[s] = (counts[s] || 0) + 1;
		}
		_setSummary(counts.g, counts.y, counts.r, counts.d);
	} catch (e) {
		console.warn("loadAllPlayers failed:", e);
		list.innerHTML = '<div class="player-empty">선수 데이터를 불러오지 못했습니다.</div>';
	}
}

function _setSummary(g, y, r, d) {
	const set = (id, v) => {
		const el = document.getElementById(id);
		if (el) el.textContent = v + "명";
	};
	set("sumG", g);
	set("sumY", y);
	set("sumR", r);
	set("sumD", d);
}

setTimeout(loadAllPlayers, 300);
window.loadAllPlayers = loadAllPlayers;

// 30초 주기 자동 새로고침 — 포커스가 페이지에 있을 때만
let _pollTimer = null;
function _startPolling() {
	if (_pollTimer) return;
	_pollTimer = setInterval(() => {
		if (!document.hidden) loadAllPlayers();
	}, 30000);
}
function _stopPolling() {
	if (_pollTimer) {
		clearInterval(_pollTimer);
		_pollTimer = null;
	}
}
document.addEventListener("visibilitychange", () => {
	if (document.hidden) _stopPolling();
	else {
		loadAllPlayers();
		_startPolling();
	}
});
_startPolling();
