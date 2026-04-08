/**
 * HeaderBar Component
 * Renders a back-button header bar for signup.html and team-setup.html
 */

class HeaderBar {
	/**
	 * Render header bar HTML string
	 * @param {string} title - Header title text (e.g., "회원가입", "팀 설정")
	 * @param {string} onBackFn - onclick handler string (e.g., "goBack()")
	 * @returns {string} HTML string
	 */
	static render(title, onBackFn) {
		// Sanitize inputs to prevent XSS
		const sanitizedTitle = String(title || "")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		const sanitizedFn = String(onBackFn || "goBack()");

		return `<div class="header">
  <button class="back-btn" onclick="${sanitizedFn}">
    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  </button>
  <span class="header-title">${sanitizedTitle}</span>
</div>`;
	}

	/**
	 * Inject header bar into DOM element
	 * @param {string} containerId - Target element ID
	 * @param {string} title - Header title text
	 * @param {string} onBackFn - onclick handler string
	 */
	static inject(containerId, title, onBackFn) {
		const container = document.getElementById(containerId);

		if (!container) {
			console.error(`[HeaderBar] Container with id "${containerId}" not found`);
			return;
		}

		container.innerHTML = HeaderBar.render(title, onBackFn);
	}
}

// Attach to window for global access
window.HeaderBar = HeaderBar;
