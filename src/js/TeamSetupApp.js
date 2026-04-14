class TeamSetupApp {
	constructor() {
		// 새로고침 감지 → 온보딩으로
		if (sessionStorage.getItem("lr_nav") !== "team-setup") {
			location.replace("onboarding.html");
		}
		sessionStorage.removeItem("lr_nav");

		// State initialization
		this.cur = 1;
		this.selectedSport = null;
		this.teamOption = null;
		this.generatedCode = null;

		// Bind methods to window for HTML onclick handlers
		window.nextStep = () => this.nextStep();
		window.goBack = () => this.goBack();
		window.selectSport = (el, sport) => this.selectSport(el, sport);
		window.selectOption = (type) => this.selectOption(type);
		window.checkTeamName = () => this.checkTeamName();
		window.copyCode = () => this.copyCode();
		window.checkJoinCode = (el) => this.checkJoinCode(el);
	}

	async nextStep() {
		if (this.cur === 1 && !this.selectedSport) return;
		if (this.cur === 2) {
			const tName =
				document.getElementById("teamName").value.trim() ||
				this.selectedSport + " 팀";
			const tCode = this.generatedCode || "";
			sessionStorage.setItem("lr_team_sport", this.selectedSport);
			sessionStorage.setItem("lr_team_name", tName);
			sessionStorage.setItem("lr_team_code", tCode);
			const accounts = (
				typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
			)(localStorage.getItem("lr_accounts") || "[]");
			if (accounts.length > 0) {
				const last = accounts[accounts.length - 1];
				last.teamSport = this.selectedSport;
				last.teamName = tName;
				last.teamCode = tCode;
				localStorage.setItem("lr_accounts", JSON.stringify(accounts));
			}

			// 백엔드 teams 테이블에 실제 팀 레코드 생성 + 코치 승격
			try {
				const r = await fetch("/api/teams", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ name: tName, code: tCode }),
				});
				if (!r.ok) {
					const err = await r.json().catch(() => ({}));
					alert(`팀 생성 실패: ${err.detail || r.statusText}`);
					return;
				}
				await fetch("/api/user/me", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						sport: this.selectedSport,
						onboarding_done: true,
					}),
				});
			} catch (e) {
				alert(`팀 생성 실패: ${e.message}`);
				return;
			}

			sessionStorage.setItem("lr_nav", "dashboard");
			window.location.href = "dashboard.html";
			return;
		}
		this.cur++;
		this.render();
	}

	goBack() {
		if (this.cur > 1) {
			this.cur--;
			this.render();
		} else {
			history.back();
		}
	}

	render() {
		document
			.querySelectorAll(".step")
			.forEach((s) => s.classList.remove("active"));
		document.getElementById("step" + this.cur).classList.add("active");
		document.getElementById("pb1").className =
			this.cur >= 1 ? "prog-bar active" : "prog-bar";
		document.getElementById("pb2").className =
			this.cur >= 2 ? "prog-bar active" : "prog-bar";
		if (this.cur > 1) document.getElementById("pb1").classList.add("done");
		const btn = document.getElementById("subBtn");
		btn.textContent = this.cur === 2 ? "완료" : "다음";
		if (this.cur === 2) btn.classList.add("green");
		else btn.classList.remove("green");
		btn.disabled = true;
		if (this.cur === 1 && this.selectedSport) btn.disabled = false;
	}

	selectSport(el, sport) {
		document
			.querySelectorAll(".sport-card")
			.forEach((c) => c.classList.remove("selected"));
		el.classList.add("selected");
		this.selectedSport = sport;
		document.getElementById("subBtn").disabled = false;
	}

	selectOption(type) {
		this.teamOption = type;
		document
			.querySelectorAll(".team-option")
			.forEach((o) => o.classList.remove("selected"));
		event.currentTarget.classList.add("selected");
		document.getElementById("createSection").classList.remove("show");
		document.getElementById("joinSection").classList.remove("show");
		if (type === "create") {
			document.getElementById("createSection").classList.add("show");
			this.checkTeamName();
		} else {
			document.getElementById("joinSection").classList.add("show");
			this.checkJoinCode(document.getElementById("joinCode"));
		}
	}

	generateCode() {
		return window.generateCode();
	}

	checkTeamName() {
		const name = document.getElementById("teamName").value.trim();
		const codeEl = document.getElementById("codeValue");
		const btn = document.getElementById("subBtn");
		if (name.length >= 2) {
			if (!this.generatedCode) this.generatedCode = this.generateCode();
			codeEl.textContent = this.generatedCode;
			btn.disabled = false;
		} else {
			codeEl.textContent = "—";
			btn.disabled = true;
		}
	}

	copyCode() {
		if (!this.generatedCode) return;
		navigator.clipboard.writeText(this.generatedCode).then(() => {
			const btn = document.getElementById("copyBtn");
			btn.classList.add("copied");
			btn.innerHTML = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 복사 완료`;
			setTimeout(() => {
				btn.classList.remove("copied");
				btn.innerHTML = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> 코드 복사`;
			}, 2000);
		});
	}

	checkJoinCode(el) {
		el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
		const hint = document.getElementById("joinHint");
		const btn = document.getElementById("subBtn");
		if (el.value.length === 6) {
			hint.textContent = "팀을 찾았습니다: " + this.selectedSport + " 팀";
			hint.className = "join-hint ok";
			btn.disabled = false;
		} else if (el.value.length > 0) {
			hint.textContent = "6자리 코드를 입력해주세요";
			hint.className = "join-hint";
			btn.disabled = true;
		} else {
			hint.textContent = "코치 또는 팀 관리자에게 받은 6자리 코드를 입력하세요";
			hint.className = "join-hint";
			btn.disabled = true;
		}
	}
}

// Instantiate and expose globally
window.teamSetupApp = new TeamSetupApp();
