/**
 * SignupApp.js - Encapsulates signup.html JavaScript logic
 * Manages multi-step signup flow with email, password, phone verification, and terms agreement
 */

class SignupApp {
	constructor() {
		// Navigation guard - detect page refresh
		if (sessionStorage.getItem("lr_nav") !== "signup") {
			location.replace("onboarding.html");
		}
		sessionStorage.removeItem("lr_nav");

		// State management
		this.cur = 1; // Current step (1-3)
		this.timerInt = null; // Timer interval ID
		this.verified = false; // Phone verification flag

		// Term content constants
		this.T1 = `<h4>제1조 (목적)</h4><p>이 약관은 LongRun(이하 "회사")이 제공하는 코치 대시보드 서비스의 이용조건, 회사와 이용자의 권리·의무를 규정합니다.</p><h4>제2조 (정의)</h4><p>① "서비스"란 선수 관리, 부상 예측, 훈련 계획 수립 등의 온라인 플랫폼을 의미합니다.<br>② "이용자"란 본 약관에 따라 서비스를 이용하는 코치 및 스태프를 말합니다.</p><h4>제3조 (서비스 제공)</h4><p>1. 선수 컨디션 모니터링 및 부상 위험도 분석<br>2. 훈련 계획 수립 및 관리<br>3. AI 기반 훈련 조언 및 부상 예방 추천<br>4. 선수별 데이터 관리 및 리포트</p>`;
		this.T2 = `<h4>1. 수집 항목</h4><p>필수: 이메일, 비밀번호, 전화번호, 이름<br>선택: 소속 팀, 직책, 프로필 사진</p><h4>2. 이용 목적</h4><p>회원 식별 및 본인 인증, 서비스 제공·운영, 서비스 개선, 고객 문의 대응</p><h4>3. 보유 기간</h4><p>회원 탈퇴 시까지. 관계 법령에 따라 계약 관련 기록 5년, 소비자 불만 기록 3년 보관.</p>`;
		this.T3 = `<h4>1. 제공받는 자</h4><p>소속 팀 관리자 및 의무 스태프, 클라우드 서비스 제공업체</p><h4>2. 제공 항목</h4><p>코치 이름, 소속 팀, 이메일, 선수 관리 데이터(선수 동의 하)</p><h4>3. 이용 목적</h4><p>팀 내 선수 관리 및 데이터 공유, 서비스 인프라 운영</p><h4>4. 보유 기간</h4><p>제공 목적 달성 시 또는 회원 탈퇴 시까지</p>`;
		this.T4 = `<h4>마케팅 정보 수신</h4><p>신기능 안내, 서비스 업데이트, 이벤트 알림을 이메일 또는 푸시 알림으로 수신합니다.</p><p>설정에서 언제든 수신 거부할 수 있으며, 미동의 시에도 서비스 이용에 제한은 없습니다.</p>`;
		this.T5 = `<h4>위치정보 이용</h4><p>훈련 장소 기반 날씨 정보 제공 및 훈련 환경 분석에 위치정보를 활용합니다.</p><p>수집 후 1년 또는 동의 철회 시 파기됩니다. 미동의 시 날씨 기반 추천 기능이 제한될 수 있습니다.</p>`;

		// Required and all checkbox IDs
		this.REQ = ["ck1", "ck2", "ck3"]; // Required checkboxes (T1, T2, T3)
		this.ALL = ["ck1", "ck2", "ck3", "ck4", "ck5"]; // All checkboxes including optional (T4, T5)

		// Initialize UI
		this.render();
	}

	/**
	 * Proceed to next step with validation
	 */
	nextStep() {
		if (this.cur === 1 && !this.s1Valid()) return;
		if (this.cur === 2 && !this.verified) return;
		if (this.cur === 3) {
			this.finish();
			return;
		}
		this.cur++;
		this.render();
	}

	/**
	 * Go back to previous step or navigate to login
	 */
	goBack() {
		if (this.cur > 1) {
			this.cur--;
			this.render();
		} else {
			sessionStorage.setItem("lr_nav", "login");
			location.href = "login.html";
		}
	}

	/**
	 * Render current step and update UI
	 */
	render() {
		// Hide all steps
		document
			.querySelectorAll(".step")
			.forEach((s) => s.classList.remove("active"));

		// Show current step
		const el = document.getElementById("step" + this.cur);
		if (el) el.classList.add("active");

		// Update progress bars
		for (let i = 1; i <= 3; i++) {
			const b = document.getElementById("pb" + i);
			b.className = "prog-bar";
			if (i < this.cur) b.classList.add("done");
			if (i === this.cur) b.classList.add("active");
		}

		// Update submit button text and styling
		const btn = document.getElementById("subBtn");
		btn.textContent = this.cur === 3 ? "가입 완료" : "다음";
		if (this.cur === 3) btn.classList.add("final");
		else btn.classList.remove("final");

		// Run validation for current step
		this.validate();
	}

	/**
	 * Validate current step form
	 */
	validate() {
		if (this.cur === 1) this.s1Check();
		if (this.cur === 2) this.s2Check();
		if (this.cur === 3) this.s3Check();
	}

	/**
	 * Validate email format
	 */
	valEmail() {
		const v = document.getElementById("email").value.trim();
		const h = document.getElementById("emailH");
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const el = document.getElementById("email");

		el.classList.remove("err", "ok");

		if (!v) {
			h.textContent = "";
			h.className = "hint";
		} else if (!re.test(v)) {
			el.classList.add("err");
			h.textContent = "올바른 이메일 형식이 아닙니다";
			h.className = "hint err";
		} else {
			el.classList.add("ok");
			h.textContent = "사용 가능한 이메일입니다";
			h.className = "hint ok";
		}

		this.s1Check();
	}

	/**
	 * Validate password strength
	 */
	valPw() {
		const v = document.getElementById("pw").value;
		const s = document.getElementById("strBar");
		const h = document.getElementById("pwH");

		s.className = "strength";

		if (!v) {
			h.textContent = "영문, 숫자, 특수문자를 포함해 8자 이상";
			h.className = "hint";
		} else if (v.length < 8) {
			s.classList.add("s1");
			h.textContent = "8자 이상 입력해주세요";
			h.className = "hint err";
		} else {
			const sc = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) =>
				r.test(v),
			).length;
			if (sc <= 1) {
				s.classList.add("s1");
				h.textContent = "영문, 숫자, 특수문자를 조합해주세요";
				h.className = "hint err";
			} else if (sc === 2) {
				s.classList.add("s2");
				h.textContent = "보통 강도";
				h.className = "hint";
			} else {
				s.classList.add("s3");
				h.textContent = "안전한 비밀번호입니다";
				h.className = "hint ok";
			}
		}

		this.valPwc();
		this.s1Check();
	}

	/**
	 * Validate password confirmation
	 */
	valPwc() {
		const pw = document.getElementById("pw").value;
		const c = document.getElementById("pwc");
		const h = document.getElementById("pwcH");

		c.classList.remove("err", "ok");

		if (!c.value) {
			h.textContent = "";
		} else if (c.value !== pw) {
			c.classList.add("err");
			h.textContent = "비밀번호가 일치하지 않습니다";
			h.className = "hint err";
		} else {
			c.classList.add("ok");
			h.textContent = "일치합니다";
			h.className = "hint ok";
		}

		this.s1Check();
	}

	/**
	 * Check if step 1 form is complete (disables submit button)
	 */
	s1Check() {
		const e = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
			document.getElementById("email").value.trim(),
		);
		const p = document.getElementById("pw").value;
		const c = document.getElementById("pwc").value;
		document.getElementById("subBtn").disabled = !(
			e &&
			p.length >= 8 &&
			p === c
		);
	}

	/**
	 * Validate step 1 (returns boolean for nextStep)
	 */
	s1Valid() {
		const e = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
			document.getElementById("email").value.trim(),
		);
		const p = document.getElementById("pw").value;
		return e && p.length >= 8 && p === document.getElementById("pwc").value;
	}

	/**
	 * Format phone number as user types
	 */
	fmtPhone(el) {
		let v = el.value.replace(/\D/g, "");
		if (v.length > 3 && v.length <= 7) {
			v = v.slice(0, 3) + "-" + v.slice(3);
		} else if (v.length > 7) {
			v = v.slice(0, 3) + "-" + v.slice(3, 7) + "-" + v.slice(7, 11);
		}
		el.value = v;
	}

	/**
	 * Validate phone number and enable send button
	 */
	valPhone() {
		document.getElementById("sendBtn").disabled =
			document.getElementById("phone").value.replace(/-/g, "").length < 10;
	}

	/**
	 * Send verification code and start 3-minute timer
	 */
	sendCode() {
		const btn = document.getElementById("sendBtn");
		btn.textContent = "전송됨";
		btn.classList.add("sent");
		btn.disabled = true;
		document.getElementById("codeArea").classList.add("show");

		clearInterval(this.timerInt);
		let sec = 180;
		const t = document.getElementById("timer");

		this.timerInt = setInterval(() => {
			sec--;
			t.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
			if (sec <= 0) {
				clearInterval(this.timerInt);
				t.textContent = "만료";
				btn.textContent = "재전송";
				btn.classList.remove("sent");
				btn.disabled = false;
			}
		}, 1000);

		// Reset button after 10 seconds (simulating code sent)
		setTimeout(() => {
			btn.textContent = "재전송";
			btn.classList.remove("sent");
			btn.disabled = false;
		}, 10000);
	}

	/**
	 * Check verification code and enable next step
	 */
	chkCode() {
		const v = document.getElementById("code").value;
		if (v.length === 6) {
			this.verified = true;
			document.getElementById("codeH").textContent = "인증 완료";
			document.getElementById("codeH").className = "hint ok";
			clearInterval(this.timerInt);
			document.getElementById("timer").textContent = "";
			this.s2Check();
		}
	}

	/**
	 * Check if step 2 form is complete (phone verified)
	 */
	s2Check() {
		document.getElementById("subBtn").disabled = !this.verified;
	}

	/**
	 * Toggle individual checkbox
	 */
	toggle(id) {
		document.getElementById(id).classList.toggle("on");
		this.syncAll();
		this.s3Check();
	}

	/**
	 * Toggle all checkboxes at once
	 */
	toggleAll() {
		const on = document.getElementById("ckAll").classList.contains("on");
		this.ALL.forEach((id) => {
			const e = document.getElementById(id);
			on ? e.classList.remove("on") : e.classList.add("on");
		});
		document.getElementById("ckAll").classList.toggle("on");
		this.s3Check();
	}

	/**
	 * Sync "select all" checkbox state with individual checkboxes
	 */
	syncAll() {
		const all = this.ALL.every((id) =>
			document.getElementById(id).classList.contains("on"),
		);
		document.getElementById("ckAll").classList.toggle("on", all);
	}

	/**
	 * Check if step 3 form is complete (required checkboxes checked)
	 */
	s3Check() {
		document.getElementById("subBtn").disabled = !this.REQ.every((id) =>
			document.getElementById(id).classList.contains("on"),
		);
	}

	/**
	 * Complete signup: POST /api/auth/signup to persist in backend DB,
	 * then mirror to localStorage for fallback UX (find-id, etc).
	 */
	async finish() {
		const email = document.getElementById("email").value.trim();
		const pw = document.getElementById("pw").value;
		const phone = document.getElementById("phone").value;
		const name = email.split("@")[0] || "user";

		try {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email, password: pw, name, phone }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				if (res.status !== 400 || !String(err.detail).includes("already")) {
					throw new Error(err.detail || res.statusText);
				}
			}
			sessionStorage.setItem("lr_user_email", email);

			// Coach 대시보드에서 가입했으므로 role=coach 로 즉시 승격
			try {
				await fetch("/api/user/me", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ role: "coach" }),
				});
			} catch (_) {}
		} catch (e) {
			alert(`가입 실패: ${e.message}`);
			return;
		}

		// Mirror to localStorage (fallback UX: find-id, etc.)
		const accounts = (
			typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
		)(localStorage.getItem("lr_accounts") || "[]");
		if (!accounts.find((a) => a.email === email)) {
			accounts.push({ email, password: pw, phone });
			localStorage.setItem("lr_accounts", JSON.stringify(accounts));
		}

		document
			.querySelectorAll(".step")
			.forEach((s) => s.classList.remove("active"));
		document.getElementById("done").classList.add("active");
		document.getElementById("btmCta").style.display = "none";
		document.querySelector(".progress-wrap").style.display = "none";
	}

	/**
	 * Open modal with title and content
	 */
	openModal(t, c) {
		document.getElementById("mTitle").textContent = t;
		document.getElementById("mBody").innerHTML = c;
		document.getElementById("modalBg").classList.add("show");
	}

	/**
	 * Close modal
	 */
	closeModal() {
		document.getElementById("modalBg").classList.remove("show");
	}
}

// Instantiate and expose on window for HTML onclick handlers
window.signupApp = new SignupApp();

// Expose methods globally for HTML onclick handlers
window.nextStep = () => {
	window.signupApp.nextStep();
};
window.goBack = () => {
	window.signupApp.goBack();
};
window.valEmail = () => {
	window.signupApp.valEmail();
};
window.valPw = () => {
	window.signupApp.valPw();
};
window.valPwc = () => {
	window.signupApp.valPwc();
};
window.fmtPhone = (el) => {
	window.signupApp.fmtPhone(el);
};
window.valPhone = () => {
	window.signupApp.valPhone();
};
window.sendCode = () => {
	window.signupApp.sendCode();
};
window.chkCode = () => {
	window.signupApp.chkCode();
};
window.toggle = (id) => {
	window.signupApp.toggle(id);
};
window.toggleAll = () => {
	window.signupApp.toggleAll();
};
window.openModal = (t, c) => {
	window.signupApp.openModal(t, c);
};
window.closeModal = () => {
	window.signupApp.closeModal();
};

// Expose term constants globally for HTML onclick references
window.T1 = window.signupApp.T1;
window.T2 = window.signupApp.T2;
window.T3 = window.signupApp.T3;
window.T4 = window.signupApp.T4;
window.T5 = window.signupApp.T5;
