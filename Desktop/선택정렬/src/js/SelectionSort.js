import { MESSAGES, STEP_TO_LINE } from "../utils/constants.js";

export class SelectionSort {
	constructor(arraySize = 10) {
		this.arraySize = arraySize;
		this.array = [];
		this.steps = [];
		this.currentStepIndex = -1;
		this.statistics = { comparisons: 0, swaps: 0 };
	}

	init() {
		this.array = this._generateRandomArray();
		this.steps = [];
		this.currentStepIndex = -1;
		this.statistics = { comparisons: 0, swaps: 0 };
		this.generateSteps();
	}

	_generateRandomArray() {
		const arr = [];
		for (let i = 0; i < this.arraySize; i++) {
			arr.push(Math.floor(Math.random() * 90) + 10); // 10~99
		}
		return arr;
	}

	generateSteps() {
		this.steps = [];
		const arr = [...this.array];
		const n = arr.length;
		let comparisons = 0;
		let swaps = 0;

		// Initial state
		this.steps.push({
			type: "initial",
			array: [...arr],
			indices: [],
			minIndex: -1,
			currentIndex: -1,
			sorted: [],
			message: "선택정렬을 시작합니다",
			analogyMessage: "📋 학생들의 점수를 오름차순으로 정렬해봅시다!",
			comparisons: 0,
			swaps: 0,
			pseudoLineNum: 0,
		});

		for (let i = 0; i < n - 1; i++) {
			// mark-start
			this.steps.push({
				type: "mark-start",
				array: [...arr],
				indices: [i],
				minIndex: i,
				currentIndex: i,
				sorted: Array.from({ length: i }, (_, k) => k),
				message: MESSAGES.technical["mark-start"](i),
				analogyMessage: MESSAGES.analogies["mark-start"](i),
				comparisons,
				swaps,
				pseudoLineNum: STEP_TO_LINE["mark-start"],
			});

			let minIdx = i;

			for (let j = i + 1; j < n; j++) {
				comparisons++;

				// compare
				this.steps.push({
					type: "compare",
					array: [...arr],
					indices: [j, minIdx],
					minIndex: minIdx,
					currentIndex: i,
					sorted: Array.from({ length: i }, (_, k) => k),
					message: MESSAGES.technical["compare"](
						j,
						minIdx,
						arr[j],
						arr[minIdx],
					),
					analogyMessage: MESSAGES.analogies["compare"](
						j,
						minIdx,
						arr[j],
						arr[minIdx],
					),
					comparisons,
					swaps,
					pseudoLineNum: STEP_TO_LINE["compare"],
				});

				if (arr[j] < arr[minIdx]) {
					minIdx = j;
					// found-min
					this.steps.push({
						type: "found-min",
						array: [...arr],
						indices: [j],
						minIndex: minIdx,
						currentIndex: i,
						sorted: Array.from({ length: i }, (_, k) => k),
						message: MESSAGES.technical["found-min"](j, arr[j]),
						analogyMessage: MESSAGES.analogies["found-min"](j, arr[j]),
						comparisons,
						swaps,
						pseudoLineNum: STEP_TO_LINE["found-min"],
					});
				}
			}

			if (minIdx !== i) {
				// swap
				swaps++;
				const valI = arr[i],
					valMin = arr[minIdx];
				[arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];

				this.steps.push({
					type: "swap",
					array: [...arr],
					indices: [i, minIdx],
					minIndex: minIdx,
					currentIndex: i,
					sorted: Array.from({ length: i }, (_, k) => k),
					message: MESSAGES.technical["swap"](i, minIdx, valI, valMin),
					analogyMessage: MESSAGES.analogies["swap"](i, minIdx, valI, valMin),
					comparisons,
					swaps,
					pseudoLineNum: STEP_TO_LINE["swap"],
				});
			}

			// mark-complete
			this.steps.push({
				type: "mark-complete",
				array: [...arr],
				indices: [],
				minIndex: -1,
				currentIndex: i,
				sorted: Array.from({ length: i + 1 }, (_, k) => k),
				message: MESSAGES.technical["mark-complete"](i),
				analogyMessage: MESSAGES.analogies["mark-complete"](i),
				comparisons,
				swaps,
				pseudoLineNum: STEP_TO_LINE["mark-complete"],
			});
		}

		// Final sorted state
		this.steps.push({
			type: "mark-complete",
			array: [...arr],
			indices: [],
			minIndex: -1,
			currentIndex: n - 1,
			sorted: Array.from({ length: n }, (_, k) => k),
			message: "정렬 완료! 모든 원소가 오름차순으로 정렬되었습니다",
			analogyMessage: "🎉 모든 학생이 점수 순으로 자리를 찾았습니다!",
			comparisons,
			swaps,
			pseudoLineNum: 7,
		});

		this.statistics = { comparisons, swaps };
	}

	getCurrentStep() {
		if (this.currentStepIndex < 0) return this.steps[0] || null;
		return this.steps[this.currentStepIndex] || null;
	}

	nextStep() {
		if (this.currentStepIndex < this.steps.length - 1) {
			this.currentStepIndex++;
			return true;
		}
		return false;
	}

	prevStep() {
		if (this.currentStepIndex > 0) {
			this.currentStepIndex--;
			return true;
		}
		return false;
	}

	reset() {
		this.currentStepIndex = -1;
	}

	isComplete() {
		return this.currentStepIndex >= this.steps.length - 1;
	}

	getProgress() {
		if (this.steps.length === 0) return 0;
		return Math.max(0, this.currentStepIndex) / (this.steps.length - 1);
	}

	setArraySize(size) {
		this.arraySize = size;
		this.init();
	}
}
