import { COLORS, SIZES, ANIMATION } from "../utils/constants.js";

export default class Visualizer {
	constructor(treeCanvas, arrayContainer, scenario) {
		this._canvas = treeCanvas;
		this._ctx = treeCanvas.getContext("2d");
		this._arrayContainer = arrayContainer;
		this._scenario = scenario;

		this._trace = [];
		this._currentStep = -1;

		this._isPlaying = false;
		this._speed = 5;
		this._animationTimer = null;

		this._onStepChange = null;
		this._onAnimationEnd = null;

		this._resizeCanvas();
		window.addEventListener("resize", () => this._resizeCanvas());
	}

	// Public: Render both tree and array
	render(heapArray, highlights = {}) {
		this.renderTree(heapArray, highlights);
		this.renderArray(heapArray, highlights);
	}

	// Public: Render tree visualization
	renderTree(heapArray, highlights) {
		const width = this._canvas.width;
		const height = this._canvas.height;

		// Clear canvas
		this._ctx.fillStyle = COLORS.BACKGROUND;
		this._ctx.fillRect(0, 0, width, height);

		if (heapArray.length === 0) {
			return;
		}

		const positions = this._calculateNodePositions(heapArray.length);

		// Draw edges first (so they appear behind nodes)
		for (let i = 0; i < heapArray.length; i++) {
			const leftChildIdx = 2 * i + 1;
			const rightChildIdx = 2 * i + 2;

			if (leftChildIdx < heapArray.length) {
				const parentPos = positions[i];
				const childPos = positions[leftChildIdx];
				this._drawEdge(parentPos.x, parentPos.y, childPos.x, childPos.y);
			}

			if (rightChildIdx < heapArray.length) {
				const parentPos = positions[i];
				const childPos = positions[rightChildIdx];
				this._drawEdge(parentPos.x, parentPos.y, childPos.x, childPos.y);
			}
		}

		// Draw nodes
		for (let i = 0; i < heapArray.length; i++) {
			const pos = positions[i];
			let color = COLORS.NODE_DEFAULT;

			// Determine node color based on highlights
			if (highlights.active === i) {
				color = COLORS.NODE_ACTIVE;
			} else if (highlights.swapping?.includes(i)) {
				color = COLORS.NODE_SWAPPING;
			} else if (highlights.comparing?.includes(i)) {
				color = COLORS.NODE_COMPARING;
			} else if (highlights.sorted?.includes(i)) {
				color = COLORS.NODE_SORTED;
			}

			this._drawNode(pos.x, pos.y, heapArray[i], color);
			this._drawIndex(pos.x, pos.y, i);
		}
	}

	// Public: Render array visualization
	renderArray(heapArray, highlights) {
		this._arrayContainer.innerHTML = "";

		const sc = this._scenario ? this._scenario.config : null;

		if (heapArray.length === 0) {
			const empty = document.createElement("div");
			empty.className = "array-empty";
			empty.textContent = sc ? sc.emptyArrayMsg : "데이터가 없습니다";
			this._arrayContainer.appendChild(empty);
			return;
		}

		// Array label
		const label = document.createElement("div");
		label.className = "array-label";
		label.textContent = sc ? sc.arrayTitle : "배열 저장 순서";
		this._arrayContainer.appendChild(label);

		const cellRow = document.createElement("div");
		cellRow.className = "array-row";

		for (let i = 0; i < heapArray.length; i++) {
			const cell = document.createElement("div");
			cell.className = "array-cell";

			const valueDiv = document.createElement("div");
			valueDiv.className = "array-value";
			valueDiv.textContent = heapArray[i];

			// Determine cell color based on highlights
			if (highlights.active === i) {
				valueDiv.style.borderColor = COLORS.NODE_ACTIVE;
				valueDiv.style.backgroundColor = `${COLORS.NODE_ACTIVE}20`;
			} else if (highlights.swapping?.includes(i)) {
				valueDiv.style.borderColor = COLORS.NODE_SWAPPING;
				valueDiv.style.backgroundColor = `${COLORS.NODE_SWAPPING}20`;
			} else if (highlights.comparing?.includes(i)) {
				valueDiv.style.borderColor = COLORS.NODE_COMPARING;
				valueDiv.style.backgroundColor = `${COLORS.NODE_COMPARING}20`;
			} else if (highlights.sorted?.includes(i)) {
				valueDiv.style.borderColor = COLORS.NODE_SORTED;
				valueDiv.style.backgroundColor = `${COLORS.NODE_SORTED}20`;
			}

			// Name label for scenario mode
			if (sc && sc.names) {
				const name = this._scenario.getNameForValue(heapArray[i]);
				if (name) {
					const nameDiv = document.createElement("div");
					nameDiv.className = "array-name";
					nameDiv.textContent = name;
					cell.appendChild(nameDiv);
				}
			}

			cell.appendChild(valueDiv);

			const indexDiv = document.createElement("div");
			indexDiv.className = "array-index";
			indexDiv.textContent = sc
				? sc.indexLabel(i)
				: i === 0
					? "루트"
					: `${i}번`;

			cell.appendChild(indexDiv);
			cellRow.appendChild(cell);
		}

		this._arrayContainer.appendChild(cellRow);
	}

	// Public: Start playing trace
	playTrace(trace) {
		this._trace = trace;
		this._currentStep = -1;
		this._isPlaying = true;
		this._playNext();
	}

	// Public: Pause playback
	pause() {
		this._isPlaying = false;
		if (this._animationTimer !== null) {
			cancelAnimationFrame(this._animationTimer);
			this._animationTimer = null;
		}
	}

	// Public: Resume playback
	resume() {
		if (this._trace.length === 0) {
			return;
		}
		this._isPlaying = true;
		this._playNext();
	}

	// Public: Step forward one step
	stepForward() {
		if (this._currentStep < this._trace.length - 1) {
			this._currentStep++;
			this._animateStep(this._trace[this._currentStep]);
			if (this._onStepChange) {
				this._onStepChange(this._currentStep, this._trace.length);
			}
		}
	}

	// Public: Step back one step
	stepBack() {
		if (this._currentStep > 0) {
			this._currentStep--;
			this._animateStep(this._trace[this._currentStep]);
			if (this._onStepChange) {
				this._onStepChange(this._currentStep, this._trace.length);
			}
		}
	}

	// Public: Jump to last step
	skipToEnd() {
		if (this._trace.length > 0) {
			this._currentStep = this._trace.length - 1;
			this._animateStep(this._trace[this._currentStep]);
			if (this._onStepChange) {
				this._onStepChange(this._currentStep, this._trace.length);
			}
			this._isPlaying = false;
			if (this._animationTimer !== null) {
				cancelAnimationFrame(this._animationTimer);
				this._animationTimer = null;
			}
		}
	}

	// Public: Jump to first step
	skipToStart() {
		this._currentStep = -1;
		this._isPlaying = false;
		if (this._animationTimer !== null) {
			cancelAnimationFrame(this._animationTimer);
			this._animationTimer = null;
		}
		if (this._onStepChange) {
			this._onStepChange(this._currentStep, this._trace.length);
		}
		// Render initial empty or default state
		if (this._trace.length > 0) {
			this.render([]);
		}
	}

	// Public: Set playback speed (1-10)
	setSpeed(speed) {
		this._speed = Math.max(1, Math.min(10, speed));
	}

	// Public: Check if playing
	isPlaying() {
		return this._isPlaying;
	}

	// Public: Register step change callback
	onStepChange(callback) {
		this._onStepChange = callback;
	}

	// Public: Register animation end callback
	onAnimationEnd(callback) {
		this._onAnimationEnd = callback;
	}

	// Private: Calculate node positions using BFS layout
	_calculateNodePositions(size) {
		const positions = [];
		const dpr = window.devicePixelRatio || 1;
		const width = this._canvas.width / dpr;
		const height = this._canvas.height / dpr;
		const hasNames = this._scenario && this._scenario.config.names;
		const nodeR = hasNames ? SIZES.NODE_RADIUS + 10 : SIZES.NODE_RADIUS;

		const totalLevels = Math.floor(Math.log2(size)) + 1;
		const padding = nodeR + 15;
		const availH = height - padding * 2;
		const levelHeight = totalLevels > 1 ? availH / (totalLevels - 1) : 0;
		const startY = padding;

		for (let i = 0; i < size; i++) {
			const level = Math.floor(Math.log2(i + 1));
			const posInLevel = i - (2 ** level - 1);
			const totalInLevel = 2 ** level;

			const margin = nodeR + 5;
			const usableW = width - margin * 2;
			const x = margin + (posInLevel + 0.5) * (usableW / totalInLevel);
			const y = startY + level * levelHeight;

			positions.push({ x, y });
		}

		return positions;
	}

	// Private: Draw a single node
	_drawNode(x, y, value, color = COLORS.NODE_DEFAULT) {
		const radius = SIZES.NODE_RADIUS;
		const label = this._scenario ? this._scenario.getNodeLabel(value) : null;
		const hasName = label && label.bottom;
		const drawRadius = hasName ? radius + 10 : radius;

		// Draw shadow/glow for highlighted nodes
		if (color !== COLORS.NODE_DEFAULT) {
			this._ctx.fillStyle = `${color}40`;
			this._ctx.beginPath();
			this._ctx.arc(x, y, drawRadius + 4, 0, Math.PI * 2);
			this._ctx.fill();
		}

		// Draw main circle
		this._ctx.fillStyle = color;
		this._ctx.beginPath();
		this._ctx.arc(x, y, drawRadius, 0, Math.PI * 2);
		this._ctx.fill();

		// Draw border
		this._ctx.strokeStyle = COLORS.EDGE;
		this._ctx.lineWidth = 2;
		this._ctx.stroke();

		if (hasName) {
			// Scenario mode: show value big + name below
			this._ctx.fillStyle = "white";
			this._ctx.font = `bold ${SIZES.NODE_FONT_SIZE + 2}px system-ui`;
			this._ctx.textAlign = "center";
			this._ctx.textBaseline = "middle";
			this._ctx.fillText(value, x, y - 7);
			this._ctx.fillStyle = "#ddd";
			this._ctx.font = `${SIZES.INDEX_FONT_SIZE}px system-ui`;
			this._ctx.fillText(label.bottom, x, y + 12);
		} else {
			// Number mode
			this._ctx.fillStyle = "white";
			this._ctx.font = `bold ${SIZES.NODE_FONT_SIZE}px system-ui`;
			this._ctx.textAlign = "center";
			this._ctx.textBaseline = "middle";
			this._ctx.fillText(value, x, y);
		}
	}

	// Private: Draw an edge between two nodes
	_drawEdge(x1, y1, x2, y2) {
		this._ctx.strokeStyle = COLORS.EDGE;
		this._ctx.lineWidth = 2;
		this._ctx.beginPath();
		this._ctx.moveTo(x1, y1);
		this._ctx.lineTo(x2, y2);
		this._ctx.stroke();
	}

	// Private: Draw index label below node
	_drawIndex(x, y, index) {
		const sc = this._scenario ? this._scenario.config : null;
		const hasName = sc && sc.names;
		const radius = hasName ? SIZES.NODE_RADIUS + 10 : SIZES.NODE_RADIUS;
		this._ctx.fillStyle = "#888";
		this._ctx.font = `${SIZES.INDEX_FONT_SIZE}px system-ui`;
		this._ctx.textAlign = "center";
		this._ctx.textBaseline = "top";
		const label = sc
			? sc.indexLabel(index)
			: index === 0
				? "루트"
				: `${index}번`;
		this._ctx.fillText(label, x, y + radius + 4);
	}

	// Private: Render one trace step
	_animateStep(step) {
		const highlights = {
			active: step.active ?? -1,
			comparing: step.comparing ?? [],
			swapping: step.swapping ?? [],
			sorted: step.sorted ?? [],
		};
		this.render(step.heap, highlights);
	}

	// Private: Play next step using requestAnimationFrame
	_playNext() {
		if (!this._isPlaying || this._trace.length === 0) {
			return;
		}

		const duration = (ANIMATION.STEP_DURATION_BASE * (11 - this._speed)) / 5;
		this._lastFrameTime = performance.now();

		const animate = (timestamp) => {
			if (!this._isPlaying) return;

			const elapsed = timestamp - this._lastFrameTime;
			if (elapsed >= duration) {
				this._lastFrameTime = timestamp;

				if (this._currentStep < this._trace.length - 1) {
					this._currentStep++;
					this._animateStep(this._trace[this._currentStep]);

					if (this._onStepChange) {
						this._onStepChange(this._currentStep, this._trace.length);
					}

					if (this._currentStep >= this._trace.length - 1) {
						this._isPlaying = false;
						if (this._onAnimationEnd) {
							this._onAnimationEnd();
						}
						return;
					}
				}
			}

			this._animationTimer = requestAnimationFrame(animate);
		};

		this._animationTimer = requestAnimationFrame(animate);
	}

	// Private: Resize canvas to container dimensions
	_resizeCanvas() {
		const dpr = window.devicePixelRatio || 1;
		const rect = this._canvas.parentElement.getBoundingClientRect();

		this._canvas.width = rect.width * dpr;
		this._canvas.height = rect.height * dpr;

		this._ctx.scale(dpr, dpr);
		this._canvas.style.width = `${rect.width}px`;
		this._canvas.style.height = `${rect.height}px`;

		// Re-render current state if we have a trace
		if (this._currentStep >= 0 && this._currentStep < this._trace.length) {
			this._animateStep(this._trace[this._currentStep]);
		} else {
			this.render([]);
		}
	}
}
