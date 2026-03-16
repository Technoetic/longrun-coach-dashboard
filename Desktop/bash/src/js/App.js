import Heap from "./Heap.js";
import Visualizer from "./Visualizer.js";
import TutorialManager from "./TutorialManager.js";
import Scenario from "./Scenario.js";
import { SAMPLE_DATA } from "../utils/constants.js";

class App {
	constructor() {
		// DOM references
		this._valueInput = document.getElementById("value-input");
		this._btnInsert = document.getElementById("btn-insert");
		this._btnExtract = document.getElementById("btn-extract");
		this._btnPeek = document.getElementById("btn-peek");
		this._btnBuild = document.getElementById("btn-build");
		this._btnSort = document.getElementById("btn-sort");
		this._btnSample = document.getElementById("btn-sample");
		this._btnClear = document.getElementById("btn-clear");
		this._heapTypeCheckbox = document.getElementById("heap-type");
		this._speedSlider = document.getElementById("speed-slider");
		this._btnTutorial = document.getElementById("btn-tutorial");
		this._modalClose = document.getElementById("modal-close");
		this._welcomeModal = document.getElementById("welcome-modal");
		this._toast = document.getElementById("toast");

		// Playback buttons
		this._btnSkipBack = document.getElementById("btn-skip-back");
		this._btnStepBack = document.getElementById("btn-step-back");
		this._btnPlayPause = document.getElementById("btn-play-pause");
		this._btnStepForward = document.getElementById("btn-step-forward");
		this._btnSkipForward = document.getElementById("btn-skip-forward");
		this._stepCounter = document.getElementById("step-counter");

		// Info displays
		this._heapSizeDisplay = document.getElementById("heap-size");
		this._heapHeightDisplay = document.getElementById("heap-height");
		this._heapTypeDisplay = document.getElementById("heap-type-display");

		// Canvas and array container
		const canvas = document.getElementById("tree-canvas");
		const arrayContainer = document.getElementById("array-view");
		const explanationPanel = document.getElementById("explanation-panel");

		// Scenario
		this._scenarioSelect = document.getElementById("scenario-select");
		this._scenario = new Scenario();

		// Create instances
		this._heap = new Heap("max");
		this._visualizer = new Visualizer(canvas, arrayContainer, this._scenario);
		this._tutorial = new TutorialManager(explanationPanel);
		this._isAnimating = false;

		this._init();
	}

	_init() {
		// Bind event listeners
		this._btnInsert.addEventListener("click", () => this.handleInsert());
		this._btnExtract.addEventListener("click", () => this.handleExtract());
		this._btnPeek.addEventListener("click", () => this.handlePeek());
		this._btnBuild.addEventListener("click", () => this.handleBuild());
		this._btnSort.addEventListener("click", () => this.handleSort());
		this._btnSample.addEventListener("click", () => this.handleSample());
		this._btnClear.addEventListener("click", () => this.handleClear());
		this._heapTypeCheckbox.addEventListener("change", () =>
			this.handleTypeToggle(),
		);
		this._speedSlider.addEventListener("input", (e) =>
			this.handleSpeedChange(e.target.value),
		);
		this._btnTutorial.addEventListener("click", () => this.handleTutorial());
		this._modalClose.addEventListener("click", () => this.closeModal());
		this._scenarioSelect.addEventListener("change", (e) =>
			this.handleScenarioChange(e.target.value),
		);

		// Playback controls
		this._btnSkipBack.addEventListener("click", () =>
			this._visualizer.skipToStart(),
		);
		this._btnStepBack.addEventListener("click", () =>
			this._visualizer.stepBack(),
		);
		this._btnPlayPause.addEventListener("click", () => this.handlePlayPause());
		this._btnStepForward.addEventListener("click", () =>
			this._visualizer.stepForward(),
		);
		this._btnSkipForward.addEventListener("click", () =>
			this._visualizer.skipToEnd(),
		);

		// Enter key on input
		this._valueInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") this.handleInsert();
		});

		// Visualizer callbacks
		this._visualizer.onStepChange((current, total) => {
			this._stepCounter.textContent = `Step ${current + 1}/${total}`;
		});
		this._visualizer.onAnimationEnd(() => {
			this._isAnimating = false;
			this._setButtonsEnabled(true);
			this._btnPlayPause.textContent = "⏸";
		});

		// Check if first visit (show modal)
		// Modal is visible by default, hidden on close

		// Apply initial scenario
		this._applyScenario();

		// Initial render
		this._updateInfo();
		this._visualizer.render(this._heap.toArray());
	}

	handleInsert() {
		const sc = this._scenario.config;
		const value = parseInt(this._valueInput.value, 10);
		if (Number.isNaN(value) || value < sc.minVal || value > sc.maxVal) {
			this._showToast(`${sc.minVal}~${sc.maxVal} 사이의 값을 입력하세요`);
			return;
		}
		if (this._heap.size() >= 15) {
			this._showToast("최대 15개까지 넣을 수 있습니다");
			return;
		}
		const name = this._scenario.getNameForValue(value);
		const result = this._heap.insert(value);
		this._valueInput.value = "";
		this._updateInfo();
		this._playTrace(result.trace);
		this._showToast(
			sc.names ? `${name}(${sc.valueLabel} ${value}) 접수!` : `${value} 삽입!`,
		);
	}

	handleExtract() {
		const sc = this._scenario.config;
		if (this._heap.isEmpty()) {
			this._showToast(sc.emptyMsg);
			return;
		}
		const rootVal = this._heap.peek().value;
		const name = this._scenario.getNameForValue(rootVal);
		const result = this._heap.extractRoot();
		this._updateInfo();
		this._playTrace(result.trace);
		this._showToast(
			sc.names
				? `${name}(${sc.valueLabel} ${rootVal}) 처리!`
				: `${rootVal} 꺼냈습니다!`,
		);
	}

	handlePeek() {
		const sc = this._scenario.config;
		const result = this._heap.peek();
		if (result.value === null) {
			this._showToast(sc.emptyMsg);
			return;
		}
		const name = this._scenario.getNameForValue(result.value);
		this._visualizer.render(this._heap.toArray(), { active: 0 });
		this._showToast(
			sc.names
				? `다음: ${name}(${sc.valueLabel} ${result.value})`
				: `루트 값: ${result.value}`,
		);
		this._tutorial.showMessage(
			sc.names
				? `다음 순서: <strong>${name}</strong> (${sc.valueLabel} ${result.value})`
				: `루트(${this._heap.getType() === "max" ? "최대" : "최소"}값): <strong>${result.value}</strong>`,
		);
	}

	handleBuild() {
		const sc = this._scenario.config;
		const count = 5 + Math.floor(Math.random() * 6);
		const range = sc.maxVal - sc.minVal + 1;
		const values = [];
		while (values.length < count) {
			const n = sc.minVal + Math.floor(Math.random() * range);
			if (!values.includes(n)) values.push(n);
		}
		this._scenario.clearNames();
		this._heap.clear();
		// Pre-assign names
		for (const v of values) this._scenario.getNameForValue(v);
		const result = this._heap.buildHeap(values);
		this._updateInfo();
		this._playTrace(result.trace);
		this._showToast(sc.buildMsg(count));
	}

	handleSort() {
		const sc = this._scenario.config;
		if (this._heap.isEmpty()) {
			this._showToast(sc.emptyMsg);
			return;
		}
		const result = this._heap.heapSort();
		this._updateInfo();
		this._playTrace(result.trace);
		this._showToast("정렬 완료!");
	}

	handleSample() {
		const sc = this._scenario.config;
		this._scenario.clearNames();
		this._heap.clear();
		let data;
		if (this._scenario.id === "hospital") {
			data = [8, 3, 6, 2, 7, 5, 1, 4, 9, 10];
		} else if (this._scenario.id === "taxi") {
			data = [3, 12, 7, 1, 15, 5, 9, 2, 8, 4];
		} else {
			data = [...SAMPLE_DATA];
		}
		for (const v of data) this._scenario.getNameForValue(v);
		const result = this._heap.buildHeap(data);
		this._updateInfo();
		this._playTrace(result.trace);
		this._showToast(`${sc.sampleLabel}을(를) 넣었습니다!`);
	}

	handleClear() {
		this._scenario.clearNames();
		this._heap.clear();
		this._visualizer.render([], {});
		this._updateInfo();
		this._stepCounter.textContent = "Step 0/0";
		this._tutorial.clearMessage();
		this._showToast("초기화 완료");
	}

	handleTypeToggle() {
		const type = this._heapTypeCheckbox.checked ? "max" : "min";
		this._heap.setType(type);
		this._heapTypeDisplay.textContent =
			type === "max" ? "Max Heap" : "Min Heap";
		this._updateInfo();
		this._visualizer.render(this._heap.toArray());
		this._showToast(`${type === "max" ? "Max" : "Min"} Heap으로 전환`);
	}

	handleScenarioChange(scenarioId) {
		this._scenario.set(scenarioId);
		this._applyScenario();
		this.handleClear();
	}

	_applyScenario() {
		const sc = this._scenario.config;
		this._valueInput.placeholder = sc.placeholder;
		this._valueInput.min = sc.minVal;
		this._valueInput.max = sc.maxVal;
		this._btnInsert.textContent = sc.insertLabel;
		this._btnExtract.textContent = sc.extractLabel;
		this._btnPeek.textContent = sc.peekLabel;
		this._btnBuild.textContent = sc.buildLabel;
		this._btnSort.textContent = sc.sortLabel;
		this._btnSample.textContent = sc.sampleLabel;
		// Auto-set heap type for scenario
		const type = sc.heapType;
		this._heapTypeCheckbox.checked = type === "max";
		this._heap.setType(type);
		this._heapTypeDisplay.textContent =
			type === "max" ? "Max Heap" : "Min Heap";
	}

	handleSpeedChange(value) {
		this._visualizer.setSpeed(parseInt(value, 10));
	}

	handlePlayPause() {
		if (this._visualizer.isPlaying()) {
			this._visualizer.pause();
			this._btnPlayPause.textContent = "▶";
		} else {
			this._visualizer.resume();
			this._btnPlayPause.textContent = "⏸";
		}
	}

	handleTutorial() {
		if (this._tutorial.isActive()) {
			this._tutorial.exit();
		} else {
			this._tutorial.start();
		}
	}

	closeModal() {
		this._welcomeModal.classList.add("hidden");
	}

	_playTrace(trace) {
		if (!trace || trace.length === 0) {
			this._visualizer.render(this._heap.toArray());
			return;
		}
		this._isAnimating = true;
		this._setButtonsEnabled(false);
		this._btnPlayPause.textContent = "⏸";

		// Show messages in explanation panel during animation
		this._visualizer.onStepChange((current, total) => {
			this._stepCounter.textContent = `Step ${current + 1}/${total}`;
			if (trace[current]?.message) {
				this._tutorial.showMessage(trace[current].message);
			}
		});

		this._visualizer.playTrace(trace);
	}

	_updateInfo() {
		this._heapSizeDisplay.textContent = this._heap.size();
		this._heapHeightDisplay.textContent = this._heap.height();
	}

	_setButtonsEnabled(enabled) {
		const buttons = [
			this._btnInsert,
			this._btnExtract,
			this._btnPeek,
			this._btnBuild,
			this._btnSort,
			this._btnSample,
			this._btnClear,
		];
		buttons.forEach((btn) => {
			btn.disabled = !enabled;
		});
	}

	_showToast(message) {
		this._toast.textContent = message;
		this._toast.classList.add("show");
		setTimeout(() => this._toast.classList.remove("show"), 2000);
	}
}

// Auto-start
document.addEventListener("DOMContentLoaded", () => {
	new App();
});
