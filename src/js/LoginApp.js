/**
 * LoginApp
 * Encapsulates login page JavaScript logic
 */
class LoginApp {
	constructor() {
		// Nav guard: check if user should be on this page
		if (sessionStorage.getItem("lr_nav") !== "login") {
			location.replace("onboarding.html");
		}
		sessionStorage.removeItem("lr_nav");

		// Cache DOM elements
		this.loginEmail = document.getElementById("loginEmail");
		this.loginPw = document.getElementById("loginPw");
		this.loginBtn = document.getElementById("loginBtn");
		this.loginHint = document.getElementById("loginHint");
		this.rememberChk = document.getElementById("rememberChk");
		this.findOverlay = document.getElementById("findOverlay");
		this.findTabs = document.querySelectorAll(".find-tab");
		this.findId = document.getElementById("findId");
		this.findPw = document.getElementById("findPw");
		this.findPhone = document.getElementById("findPhone");
		this.findEmail = document.getElementById("findEmail");
		this.findIdResult = document.getElementById("findIdResult");
		this.findPwResult = document.getElementById("findPwResult");

		// Email validation regex
		this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	}

	/**
	 * Validates email and password, enables/disables login button
	 */
	checkLogin() {
		const email = this.loginEmail.value.trim();
		const pw = this.loginPw.value;

		// Enable login button only if email is valid and password has at least 1 char
		const isValid = this.emailRegex.test(email) && pw.length >= 1;
		this.loginBtn.disabled = !isValid;

		// Clear error messages and styles
		this.loginHint.textContent = "";
		this.loginEmail.classList.remove("err");
		this.loginPw.classList.remove("err");
	}

	/**
	 * Performs login: checks credentials against localStorage
	 */
	doLogin() {
		const email = this.loginEmail.value.trim();
		const pw = this.loginPw.value;
		const saved = (
			typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
		)(localStorage.getItem("lr_accounts") || "[]");
		const account = saved.find((a) => a.email === email && a.password === pw);

		if (account) {
			// Login successful: store team info in sessionStorage
			if (account.teamSport)
				sessionStorage.setItem("lr_team_sport", account.teamSport);
			if (account.teamName)
				sessionStorage.setItem("lr_team_name", account.teamName);
			if (account.teamCode)
				sessionStorage.setItem("lr_team_code", account.teamCode);

			sessionStorage.setItem("lr_nav", "dashboard");
			location.href = "dashboard.html";
		} else if (saved.length === 0) {
			// No accounts exist: redirect to team setup
			sessionStorage.setItem("lr_nav", "team-setup");
			location.href = "team-setup.html";
		} else {
			// Invalid credentials
			this.loginHint.textContent = "계정정보가 없거나 일치하지 않습니다";
			this.loginHint.className = "hint err";
			this.loginEmail.classList.add("err");
			this.loginPw.classList.add("err");
		}
	}

	/**
	 * Navigates to signup page
	 */
	goSignup() {
		sessionStorage.setItem("lr_nav", "signup");
		location.href = "signup.html";
	}

	/**
	 * Toggles the "remember me" checkbox styling
	 */
	toggleRemember() {
		this.rememberChk.classList.toggle("on");
	}

	/**
	 * Opens the find ID/PW overlay
	 */
	openFind() {
		this.findOverlay.classList.add("show");
	}

	/**
	 * Closes the find ID/PW overlay
	 */
	closeFind() {
		this.findOverlay.classList.remove("show");
	}

	/**
	 * Switches between find ID and find PW tabs
	 * @param {string} type - 'id' or 'pw'
	 */
	switchFind(type) {
		this.findTabs.forEach((t, i) => {
			t.classList.toggle(
				"active",
				(type === "id" && i === 0) || (type === "pw" && i === 1),
			);
		});
		this.findId.classList.toggle("active", type === "id");
		this.findPw.classList.toggle("active", type === "pw");
	}

	/**
	 * Formats phone number input with hyphens (010-1234-5678 format)
	 * @param {HTMLElement} el - The input element
	 */
	fmtFindPhone(el) {
		let v = el.value.replace(/\D/g, "");
		if (v.length > 3 && v.length <= 7) {
			v = v.slice(0, 3) + "-" + v.slice(3);
		} else if (v.length > 7) {
			v = v.slice(0, 3) + "-" + v.slice(3, 7) + "-" + v.slice(7, 11);
		}
		el.value = v;
	}

	/**
	 * Finds account by phone number and displays masked email
	 */
	doFindId() {
		const phone = this.findPhone.value.replace(/-/g, "");

		if (phone.length < 10) {
			this.findIdResult.textContent = "올바른 전화번호를 입력해주세요";
			this.findIdResult.className = "find-result err";
			return;
		}

		const saved = (
			typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
		)(localStorage.getItem("lr_accounts") || "[]");
		const found = saved.find(
			(a) => a.phone && a.phone.replace(/-/g, "") === phone,
		);

		if (found) {
			const masked = found.email.replace(/(.{2})(.*)(@.*)/, "$1****$3");
			this.findIdResult.textContent = "가입된 이메일: " + masked;
			this.findIdResult.className = "find-result ok";
		} else {
			this.findIdResult.textContent = "해당 전화번호로 가입된 계정이 없습니다";
			this.findIdResult.className = "find-result err";
		}
	}

	/**
	 * Finds account by email and displays success message
	 */
	doFindPw() {
		const email = this.findEmail.value.trim();

		if (!this.emailRegex.test(email)) {
			this.findPwResult.textContent = "올바른 이메일을 입력해주세요";
			this.findPwResult.className = "find-result err";
			return;
		}

		const saved = (
			typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
		)(localStorage.getItem("lr_accounts") || "[]");
		const found = saved.find((a) => a.email === email);

		if (found) {
			this.findPwResult.textContent = "비밀번호 재설정 링크가 발송되었습니다";
			this.findPwResult.className = "find-result ok";
		} else {
			this.findPwResult.textContent = "해당 이메일로 가입된 계정이 없습니다";
			this.findPwResult.className = "find-result err";
		}
	}
}

// Instantiate and expose globally for HTML onclick handlers
window.loginApp = new LoginApp();

// Expose methods to window for inline HTML event handlers
window.checkLogin = () => window.loginApp.checkLogin();
window.doLogin = () => window.loginApp.doLogin();
window.goSignup = () => window.loginApp.goSignup();
window.toggleRemember = () => window.loginApp.toggleRemember();
window.openFind = () => window.loginApp.openFind();
window.closeFind = () => window.loginApp.closeFind();
window.switchFind = (type) => window.loginApp.switchFind(type);
window.fmtFindPhone = (el) => window.loginApp.fmtFindPhone(el);
window.doFindId = () => window.loginApp.doFindId();
window.doFindPw = () => window.loginApp.doFindPw();
