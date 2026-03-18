import { ANIMATION } from "../utils/constants.js";
import { AnimationManager } from "./AnimationManager.js";
import { CodePanel } from "./CodePanel.js";
import { SelectionSort } from "./SelectionSort.js";
import { Visualizer } from "./Visualizer.js";

class App {
	constructor() {
		this.sorter = new SelectionSort(20);
		this.visualizer = new Visualizer("sort-canvas");
		this.animator = new AnimationManager();
		this.codePanel = new CodePanel("pseudocode");

		this._bindEvents();
		this._init();
	}

	_init() {
		this.sorter.init();
		this.visualizer.resize();
		this._renderCurrentStep();

		// Start pulse on play button (removed once user interacts)
		const playBtn = document.getElementById("btn-play");
		if (playBtn) playBtn.classList.add("pulse-guide");
	}

	_bindEvents() {
		// Play/Pause button
		const btnPlay = document.getElementById("btn-play");
		if (btnPlay) {
			btnPlay.addEventListener("click", () => {
				btnPlay.classList.remove("pulse-guide");
				const playing = this.animator.toggle(() => this._advanceStep());
				this._updatePlayButton(playing);
			});
		}

		// First step
		const btnFirst = document.getElementById("btn-first");
		if (btnFirst) {
			btnFirst.addEventListener("click", () => {
				this.animator.pause();
				this._updatePlayButton(false);
				// Jump to first step
				while (this.sorter.prevStep()) {}
				this._renderCurrentStep();
			});
		}

		// Previous step
		const btnPrev = document.getElementById("btn-prev");
		if (btnPrev) {
			btnPrev.addEventListener("click", () => {
				this.animator.pause();
				this._updatePlayButton(false);
				if (this.sorter.prevStep()) {
					this._renderCurrentStep();
				}
			});
		}

		// Next step
		const btnNext = document.getElementById("btn-next");
		if (btnNext) {
			btnNext.addEventListener("click", () => {
				this.animator.pause();
				this._updatePlayButton(false);
				if (this.sorter.nextStep()) {
					this._renderCurrentStep();
				}
			});
		}

		// Last step
		const btnLast = document.getElementById("btn-last");
		if (btnLast) {
			btnLast.addEventListener("click", () => {
				this.animator.pause();
				this._updatePlayButton(false);
				// Jump to last step
				while (this.sorter.nextStep()) {}
				this._renderCurrentStep();
			});
		}

		// New array
		const btnNew = document.getElementById("btn-new");
		if (btnNew) {
			btnNew.addEventListener("click", () => {
				this.animator.stop();
				this._updatePlayButton(false);
				this.sorter.init();
				this._renderCurrentStep();
			});
		}

		// Speed slider
		const speedSlider = document.getElementById("speed-slider");
		if (speedSlider) {
			speedSlider.addEventListener("input", (e) => {
				this.animator.setSpeed(parseInt(e.target.value));
				this._updateSpeedLabel(parseInt(e.target.value));
			});
		}

		// Array size buttons (10 / 20 / 50)
		document.querySelectorAll(".btn-size").forEach((btn) => {
			btn.addEventListener("click", () => {
				const size = parseInt(btn.dataset.size);
				this.animator.stop();
				this._updatePlayButton(false);

				// Update active state
				document
					.querySelectorAll(".btn-size")
					.forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");

				this.sorter.setArraySize(size);
				this.visualizer.resize();
				this._renderCurrentStep();
			});
		});

		// Window resize
		window.addEventListener("resize", () => {
			this.visualizer.resize();
			this._renderCurrentStep();
		});

		// Mobile accordion toggle
		const mobileToggle = document.getElementById("mobile-code-toggle");
		const mobilePanel = document.getElementById("mobile-code-panel");
		if (mobileToggle && mobilePanel) {
			mobileToggle.addEventListener("click", () => {
				const expanded = mobileToggle.getAttribute("aria-expanded") === "true";
				mobileToggle.setAttribute("aria-expanded", String(!expanded));
				if (expanded) {
					mobilePanel.setAttribute("hidden", "");
				} else {
					mobilePanel.removeAttribute("hidden");
				}
			});
		}

		// Keyboard shortcuts
		document.addEventListener("keydown", (e) => {
			// Ignore when focused on slider or input
			if (e.target.tagName === "INPUT") return;
			switch (e.key) {
				case " ":
					e.preventDefault();
					document.getElementById("btn-play")?.click();
					break;
				case "ArrowRight":
					e.preventDefault();
					document.getElementById("btn-next")?.click();
					break;
				case "ArrowLeft":
					e.preventDefault();
					document.getElementById("btn-prev")?.click();
					break;
				case "n":
				case "N":
					document.getElementById("btn-new")?.click();
					break;
				case "Home":
					e.preventDefault();
					document.getElementById("btn-first")?.click();
					break;
				case "End":
					e.preventDefault();
					document.getElementById("btn-last")?.click();
					break;
			}
		});
	}

	_advanceStep() {
		const hasMore = this.sorter.nextStep();
		this._renderCurrentStep();
		if (!hasMore) {
			this._updatePlayButton(false);
		}
		return hasMore;
	}

	_renderCurrentStep() {
		const step = this.sorter.getCurrentStep();
		if (!step) return;

		// Render visualization canvas
		this.visualizer.render(step);

		// Update code panel
		this.codePanel.update(step);

		const comparisons = step.comparisons || 0;
		const swaps = step.swaps || 0;
		const current = Math.max(0, this.sorter.currentStepIndex + 1);
		const total = this.sorter.steps.length;

		// Update description panel
		const technicalEl = document.getElementById("technical-msg");
		if (technicalEl) {
			technicalEl.textContent = step.message || "";
			technicalEl.classList.remove("animate-fade-in");
			// Trigger reflow for animation restart
			void technicalEl.offsetWidth;
			technicalEl.classList.add("animate-fade-in");
		}

		const analogyEl = document.getElementById("analogy-msg");
		if (analogyEl) analogyEl.textContent = step.analogyMessage || "";

		// Update step badge
		const stepBadge = document.getElementById("step-badge");
		if (stepBadge) stepBadge.textContent = `Step ${current} / ${total}`;

		// Update stat values in description panel
		const compareVal = document.getElementById("stat-compare-val");
		if (compareVal) {
			compareVal.textContent = comparisons;
			compareVal.classList.remove("animate-pop");
			void compareVal.offsetWidth;
			compareVal.classList.add("animate-pop");
		}

		const swapVal = document.getElementById("stat-swap-val");
		if (swapVal) {
			swapVal.textContent = swaps;
			swapVal.classList.remove("animate-pop");
			void swapVal.offsetWidth;
			swapVal.classList.add("animate-pop");
		}

		// Update header stats
		const headerComp = document.getElementById("stat-comparisons");
		if (headerComp) {
			const strong = headerComp.querySelector("strong");
			if (strong) strong.textContent = comparisons;
		}

		const headerSwap = document.getElementById("stat-swaps");
		if (headerSwap) {
			const strong = headerSwap.querySelector("strong");
			if (strong) strong.textContent = swaps;
		}

		const headerStep = document.getElementById("stat-step");
		if (headerStep) {
			const strong = headerStep.querySelector("strong");
			if (strong) strong.textContent = `${current}/${total}`;
		}

		// Update progress bar
		const progress = this.sorter.getProgress();
		const fillEl = document.getElementById("progress-fill");
		if (fillEl) fillEl.style.width = `${progress * 100}%`;

		const labelEl = document.getElementById("progress-label");
		if (labelEl) labelEl.textContent = `${Math.round(progress * 100)}%`;
	}

	_updatePlayButton(playing) {
		const btn = document.getElementById("btn-play");
		if (!btn) return;
		btn.textContent = playing ? "⏸" : "▶";
		btn.setAttribute("aria-label", playing ? "일시정지" : "재생");
		btn.title = playing ? "일시정지" : "재생";
	}

	_updateSpeedLabel(value) {
		// Map slider 0-5 to speed labels
		const labels = ["0.5x", "0.75x", "1.0x", "1.5x", "2.0x", "3.0x"];
		const el = document.getElementById("speed-value");
		if (el) el.textContent = labels[value] || "1.0x";
	}
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	new App();
});
