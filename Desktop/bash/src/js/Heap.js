export default class Heap {
	constructor(type = "max") {
		this._heap = [];
		this._trace = [];
		this._type = type; // 'max' or 'min'
	}

	/**
	 * Insert a value into the heap
	 * @param {number} value - The value to insert
	 * @returns {object} { success: boolean, trace: array }
	 */
	insert(value) {
		this._trace = [];

		const insertStep = {
			type: "insert",
			indices: [],
			heap: [...this._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: this._heap.length,
			message: `새 값 <strong>${value}</strong>이(가) 맨 뒤(${this._heap.length}번 자리)에 들어왔습니다`,
		};
		this._recordStep(insertStep);

		this._heap.push(value);
		this._siftUp(this._heap.length - 1);

		const doneStep = {
			type: "done",
			indices: [],
			heap: [...this._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: -1,
			message: "자기 자리를 찾았습니다! 삽입 완료",
		};
		this._recordStep(doneStep);

		return { success: true, trace: this._trace };
	}

	/**
	 * Extract root element from the heap
	 * @returns {object} { value: number | null, trace: array }
	 */
	extractRoot() {
		this._trace = [];

		if (this._heap.length === 0) {
			return { value: null, trace: this._trace };
		}

		const rootValue = this._heap[0];
		const extractStep = {
			type: "extract",
			indices: [0],
			heap: [...this._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: 0,
			message: `맨 위의 값 <strong>${rootValue}</strong>을(를) 꺼냅니다!`,
		};
		this._recordStep(extractStep);

		if (this._heap.length === 1) {
			this._heap.pop();
		} else {
			this._heap[0] = this._heap[this._heap.length - 1];
			this._heap.pop();
			this._siftDown(0);
		}

		const doneStep = {
			type: "done",
			indices: [],
			heap: [...this._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: -1,
			message: "꺼내기 완료! 힙이 다시 정리되었습니다",
		};
		this._recordStep(doneStep);

		return { value: rootValue, trace: this._trace };
	}

	/**
	 * Peek at root without removing
	 * @returns {object} { value: number | null }
	 */
	peek() {
		return { value: this._heap.length > 0 ? this._heap[0] : null };
	}

	/**
	 * Build heap from array using Floyd's algorithm
	 * @param {array} array - Array to build heap from
	 * @returns {object} { trace: array }
	 */
	buildHeap(array) {
		this._trace = [];
		this._heap = [...array];

		const startStep = {
			type: "compare",
			indices: [],
			heap: [...this._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: -1,
			message: `${array.length}개 숫자를 힙으로 만들기 시작!`,
		};
		this._recordStep(startStep);

		// Floyd's algorithm: start from last non-leaf node
		const lastNonLeaf = Math.floor(this._heap.length / 2) - 1;
		for (let i = lastNonLeaf; i >= 0; i--) {
			this._siftDown(i);
		}

		const doneStep = {
			type: "done",
			indices: [],
			heap: [...this._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: -1,
			message: "힙 완성! 맨 위에 가장 큰(또는 작은) 값이 있습니다",
		};
		this._recordStep(doneStep);

		return { trace: this._trace };
	}

	/**
	 * Perform heap sort on the heap
	 * @returns {object} { sorted: array, trace: array }
	 */
	heapSort() {
		this._trace = [];
		const sorted = [];
		const tempHeap = [...this._heap];
		const heapCopy = new Heap(this._type);
		heapCopy._heap = [...tempHeap];

		const startStep = {
			type: "compare",
			indices: [],
			heap: [...heapCopy._heap],
			comparing: [],
			swapping: [],
			sorted: [],
			active: -1,
			message: "정렬 시작! 맨 위를 반복해서 꺼내면 순서대로 정렬됩니다",
		};
		this._recordStep(startStep);

		while (heapCopy._heap.length > 0) {
			const root = heapCopy._heap[0];
			sorted.push(root);

			if (heapCopy._heap.length === 1) {
				heapCopy._heap.pop();
			} else {
				heapCopy._heap[0] = heapCopy._heap[heapCopy._heap.length - 1];
				heapCopy._heap.pop();
				heapCopy._siftDown(0);
			}

			const stepData = {
				type: "extract",
				indices: [0],
				heap: [...heapCopy._heap],
				comparing: [],
				swapping: [],
				sorted: [...sorted],
				active: -1,
				message: `<strong>${root}</strong>을(를) 꺼냈습니다 → 정렬 결과: [${[...sorted].join(', ')}]`,
			};
			this._recordStep(stepData);
		}

		const doneStep = {
			type: "done",
			indices: [],
			heap: [],
			comparing: [],
			swapping: [],
			sorted: [...sorted],
			active: -1,
			message: `정렬 완료! 결과: [${sorted.join(", ")}]`,
		};
		this._recordStep(doneStep);

		return { sorted, trace: this._trace };
	}

	/**
	 * Clear the heap and trace
	 */
	clear() {
		this._heap = [];
		this._trace = [];
	}

	/**
	 * Set heap type (min or max) and rebuild if not empty
	 * @param {string} type - 'min' or 'max'
	 */
	setType(type) {
		if (type !== "min" && type !== "max") {
			throw new Error('Type must be "min" or "max"');
		}
		this._type = type;

		// Rebuild heap if not empty
		if (this._heap.length > 0) {
			const array = [...this._heap];
			this._heap = [];
			this._trace = [];
			this.buildHeap(array);
		}
	}

	/**
	 * Get heap size
	 * @returns {number}
	 */
	size() {
		return this._heap.length;
	}

	/**
	 * Get heap height
	 * @returns {number}
	 */
	height() {
		if (this._heap.length === 0) return 0;
		return Math.floor(Math.log2(this._heap.length)) + 1;
	}

	/**
	 * Check if heap is empty
	 * @returns {boolean}
	 */
	isEmpty() {
		return this._heap.length === 0;
	}

	/**
	 * Get copy of heap array
	 * @returns {array}
	 */
	toArray() {
		return [...this._heap];
	}

	/**
	 * Get heap type
	 * @returns {string} 'min' or 'max'
	 */
	getType() {
		return this._type;
	}

	/**
	 * Sift up element at index
	 * @private
	 * @param {number} index
	 */
	_siftUp(index) {
		while (index > 0) {
			const parentIndex = this._parent(index);
			const shouldSwap = this._compare(
				this._heap[index],
				this._heap[parentIndex],
			);

			const compareStep = {
				type: "compare",
				indices: [parentIndex, index],
				heap: [...this._heap],
				comparing: [parentIndex, index],
				swapping: [],
				sorted: [],
				active: index,
				message: `부모 <strong>${this._heap[parentIndex]}</strong>와 자식 <strong>${this._heap[index]}</strong>을 비교합니다`,
			};
			this._recordStep(compareStep);

			if (!shouldSwap) break;

			this._swap(parentIndex, index);

			const swapStep = {
				type: "swap",
				indices: [parentIndex, index],
				heap: [...this._heap],
				comparing: [],
				swapping: [parentIndex, index],
				sorted: [],
				active: parentIndex,
				message: `자식이 더 ${this._type === "max" ? "크므로" : "작으므로"} 위로 올립니다! <strong>${this._heap[parentIndex]}</strong> ↔ <strong>${this._heap[index]}</strong>`,
			};
			this._recordStep(swapStep);

			index = parentIndex;
		}
	}

	/**
	 * Sift down element at index
	 * @private
	 * @param {number} index
	 */
	_siftDown(index) {
		while (true) {
			let targetIndex = index;
			const leftIndex = this._leftChild(index);
			const rightIndex = this._rightChild(index);

			if (leftIndex < this._heap.length) {
				const compareStep = {
					type: "compare",
					indices: [index, leftIndex],
					heap: [...this._heap],
					comparing: [index, leftIndex],
					swapping: [],
					sorted: [],
					active: index,
					message: `부모 <strong>${this._heap[index]}</strong>와 왼쪽 자식 <strong>${this._heap[leftIndex]}</strong>을 비교합니다`,
				};
				this._recordStep(compareStep);

				if (this._compare(this._heap[leftIndex], this._heap[targetIndex])) {
					targetIndex = leftIndex;
				}
			}

			if (rightIndex < this._heap.length) {
				const compareStep = {
					type: "compare",
					indices: [targetIndex, rightIndex],
					heap: [...this._heap],
					comparing: [targetIndex, rightIndex],
					swapping: [],
					sorted: [],
					active: index,
					message: `<strong>${this._heap[targetIndex]}</strong>와 오른쪽 자식 <strong>${this._heap[rightIndex]}</strong>을 비교합니다`,
				};
				this._recordStep(compareStep);

				if (this._compare(this._heap[rightIndex], this._heap[targetIndex])) {
					targetIndex = rightIndex;
				}
			}

			if (targetIndex === index) break;

			this._swap(index, targetIndex);

			const swapStep = {
				type: "swap",
				indices: [index, targetIndex],
				heap: [...this._heap],
				comparing: [],
				swapping: [index, targetIndex],
				sorted: [],
				active: targetIndex,
				message: `자식이 더 ${this._type === "max" ? "크므로" : "작으므로"} 자리를 바꿉니다! <strong>${this._heap[targetIndex]}</strong> ↔ <strong>${this._heap[index]}</strong>`,
			};
			this._recordStep(swapStep);

			index = targetIndex;
		}
	}

	/**
	 * Compare two values based on heap type
	 * @private
	 * @param {number} a
	 * @param {number} b
	 * @returns {boolean}
	 */
	_compare(a, b) {
		if (this._type === "max") {
			return a > b;
		} else {
			return a < b;
		}
	}

	/**
	 * Swap two elements in heap
	 * @private
	 * @param {number} i
	 * @param {number} j
	 */
	_swap(i, j) {
		const temp = this._heap[i];
		this._heap[i] = this._heap[j];
		this._heap[j] = temp;
	}

	/**
	 * Get parent index
	 * @private
	 * @param {number} i
	 * @returns {number}
	 */
	_parent(i) {
		return Math.floor((i - 1) / 2);
	}

	/**
	 * Get left child index
	 * @private
	 * @param {number} i
	 * @returns {number}
	 */
	_leftChild(i) {
		return 2 * i + 1;
	}

	/**
	 * Get right child index
	 * @private
	 * @param {number} i
	 * @returns {number}
	 */
	_rightChild(i) {
		return 2 * i + 2;
	}

	/**
	 * Record a trace step
	 * @private
	 * @param {object} step
	 */
	_recordStep(step) {
		this._trace.push({
			type: step.type,
			indices: step.indices || [],
			heap: step.heap || [...this._heap],
			comparing: step.comparing || [],
			swapping: step.swapping || [],
			sorted: step.sorted || [],
			active: step.active !== undefined ? step.active : -1,
			message: step.message || "",
		});
	}
}
