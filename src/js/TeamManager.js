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

	addTeamDone() {
		const name = document.getElementById("newTeamName").value.trim();
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

// ===== 전문준 실데이터 카드를 맨 위에 삽입 =====
async function loadTopPlayer() {
	const list = document.querySelector('.player-list');
	if (!list) return;

	try {
		const res = await fetch('https://ravishing-grace-production.up.railway.app/api/coach/players');
		const players = await res.json();
		if (!Array.isArray(players)) return;

		const p = players.find(x => x.name === '전문준');
		if (!p) return;

		const hrvText = p.hrv ? Math.round(p.hrv) : '-';
		const hrvClass = p.hrv ? (p.hrv >= 50 ? 'val-up' : p.hrv >= 35 ? 'val-normal' : 'val-down') : 'val-normal';
		const acwrClass = p.acwr >= 1.5 ? 'val-down' : p.acwr >= 1.3 ? 'val-warn' : 'val-normal';

		const card = '<div class="player-card" onclick="openWeekly(\'전문준\',\'' + p.status + '\')">' +
			'<div class="player-photo">' +
			'<img src="https://api.dicebear.com/9.x/initials/svg?seed=JM&backgroundColor=1a1a1a&textColor=00F19F" alt="전문준">' +
			'<span class="signal ' + p.status + '"></span></div>' +
			'<div class="player-main"><div class="player-top">' +
			'<span class="player-name">전문준</span>' +
			'<span class="player-num">#1</span></div>' +
			'<div class="player-stats">' +
			'<div class="ps-item"><div class="ps-val ' + hrvClass + '">' + hrvText + '</div><div class="ps-label">HRV</div></div>' +
			'<div class="ps-item"><div class="ps-val val-normal">' + (p.rhr ? Math.round(p.rhr) : '-') + '</div><div class="ps-label">RHR</div></div>' +
			'<div class="ps-item"><div class="ps-val val-normal">' + (p.sleep ? p.sleep.toFixed(1) + 'h' : '-') + '</div><div class="ps-label">수면</div></div>' +
			'<div class="ps-item"><div class="ps-val val-normal">' + (p.stress !== null ? p.stress : '-') + '</div><div class="ps-label">스트레스</div></div>' +
			'<div class="ps-item"><div class="ps-val ' + acwrClass + '">' + (p.acwr ? p.acwr.toFixed(2) : '-') + '</div><div class="ps-label">ACWR</div></div>' +
			'<div class="ps-item"><div class="ps-val ' + (p.pain > 2 ? 'val-down' : 'val-up') + '">' + (p.pain || 0) + '</div><div class="ps-label">통증</div></div>' +
			'</div></div>' +
			'<div class="player-arrow"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg></div></div>';

		list.insertAdjacentHTML('afterbegin', card);
	} catch (e) {
		console.warn('Top player load failed:', e);
	}
}

setTimeout(loadTopPlayer, 1000);
