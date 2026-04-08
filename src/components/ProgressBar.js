/**
 * ProgressBar Component
 * Manages progress bar rendering and state updates for multi-step forms
 */

class ProgressBar {
	/**
	 * Render HTML string for progress bars
	 * @param {number} count - Number of progress bars to render
	 * @returns {string} HTML string with progress bars
	 */
	static render(count) {
		if (!count || count < 1) {
			console.warn("ProgressBar.render: count must be at least 1");
			return "";
		}

		let html = '<div class="progress-wrap">\n';

		for (let i = 1; i <= count; i++) {
			const activeClass = i === 1 ? " active" : "";
			html += `  <div class="prog-bar${activeClass}" id="pb${i}"><div class="fill"></div></div>\n`;
		}

		html += "</div>";
		return html;
	}

	/**
	 * Inject progress bars into DOM element
	 * @param {string} containerId - ID of container element
	 * @param {number} count - Number of progress bars to render
	 * @returns {boolean} Success status
	 */
	static inject(containerId, count) {
		if (!containerId || typeof containerId !== "string") {
			console.error(
				"ProgressBar.inject: containerId must be a non-empty string",
			);
			return false;
		}

		const container = document.getElementById(containerId);
		if (!container) {
			console.error(
				`ProgressBar.inject: element with id "${containerId}" not found`,
			);
			return false;
		}

		const html = ProgressBar.render(count);
		if (!html) {
			return false;
		}

		container.innerHTML = html;
		return true;
	}

	/**
	 * Update progress bar states based on current step
	 * @param {number} current - Current step (1-indexed)
	 * @param {number} total - Total number of steps
	 * @returns {boolean} Success status
	 */
	static update(current, total) {
		if (!Number.isInteger(current) || !Number.isInteger(total)) {
			console.error("ProgressBar.update: current and total must be integers");
			return false;
		}

		if (current < 1 || total < 1) {
			console.error("ProgressBar.update: current and total must be at least 1");
			return false;
		}

		if (current > total) {
			console.warn(
				"ProgressBar.update: current step exceeds total steps, clamping to total",
			);
			current = total;
		}

		// Update all progress bars
		for (let i = 1; i <= total; i++) {
			const bar = document.getElementById(`pb${i}`);
			if (!bar) {
				console.warn(`ProgressBar.update: bar element pb${i} not found`);
				continue;
			}

			// Remove both active and done classes
			bar.classList.remove("active", "done");

			if (i < current) {
				// Past steps are marked as done
				bar.classList.add("done");
			} else if (i === current) {
				// Current step is marked as active
				bar.classList.add("active");
			}
			// Future steps have no class (default state)
		}

		return true;
	}
}

// Attach to window for global access
window.ProgressBar = ProgressBar;
