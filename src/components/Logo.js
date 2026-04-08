/**
 * LongRun Coach Logo Component
 * Renders the logo HTML into DOM containers
 */
class Logo {
	/**
	 * Returns the logo HTML string
	 * @returns {string} The logo HTML markup
	 */
	static render() {
		return `<div class="logo">
  <div class="logo-mark">
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="var(--green)" stroke-width="2.5" opacity="0.3"/>
      <path d="M16 6 C20 10, 24 14, 16 26 C8 14, 12 10, 16 6Z" fill="var(--green)"/>
    </svg>
  </div>
  <div class="logo-type">LongRun <span>coach</span></div>
</div>`;
	}

	/**
	 * Injects the logo into a DOM element by ID
	 * @param {string} containerId - The ID of the container element
	 * @returns {boolean} True if injection succeeded, false otherwise
	 */
	static inject(containerId) {
		// Edge case: empty or null containerId
		if (!containerId || typeof containerId !== "string") {
			console.warn("Logo.inject: containerId must be a non-empty string");
			return false;
		}

		// Edge case: container element not found
		const container = document.getElementById(containerId);
		if (!container) {
			console.warn(
				'Logo.inject: element with id "' + containerId + '" not found',
			);
			return false;
		}

		// Edge case: container is null or not a valid DOM node
		if (!container.nodeType) {
			console.warn("Logo.inject: container is not a valid DOM element");
			return false;
		}

		try {
			container.innerHTML = Logo.render();
			return true;
		} catch (error) {
			console.error("Logo.inject: failed to inject logo into container", error);
			return false;
		}
	}
}

// Attach to window for global access
window.Logo = Logo;
