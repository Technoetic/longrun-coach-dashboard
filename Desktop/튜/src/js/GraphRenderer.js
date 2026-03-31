/**
 * GraphRenderer - Canvas 기반 그래프 렌더링
 *
 * 책임: 그리드 또는 그래프를 Canvas에 렌더링하고 노드 클릭 좌표 변환
 */

class GraphRenderer {
	/**
	 * @param {HTMLCanvasElement} canvas - Canvas DOM 요소
	 * @param {string} layoutType - 'grid' (격자) | 'force' (물리 시뮬레이션)
	 */
	constructor(canvas, layoutType = "grid") {
		this.canvas = canvas;
		this.layoutType = layoutType;
		this.ctx = canvas.getContext("2d");
		this.cellSize = 25; // 격자 셀 크기 (px)
		this.nodeRadius = 12; // 노드 원형 반지름 (force 모드)

		// 색상 상수
		this.colors = {
			unvisited: "#e0e0e0", // 연회색
			frontier: "#ff9800", // 주황색
			visited: "#00bcd4", // 청록색
			goal: "#d32f2f", // 빨강
			path: "#9c27b0", // 보라
			start: "#388e3c", // 초록
			wall: "#333333", // 어두운 회색
		};

		this.nodeStates = {}; // 캐시
	}

	/**
	 * Canvas에 그래프 전체 렌더링
	 *
	 * @param {Object} graph - 그래프 객체
	 * @param {Object} stepState - BFSEngine.getStepState() 반환값
	 * @param {Object} nodeStates - {nodeId: stateString}
	 * @returns {void}
	 */
	render(graph, stepState, nodeStates) {
		this.nodeStates = nodeStates || {};

		// Canvas 클리어
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (this.layoutType === "grid") {
			this._renderGrid(graph, stepState, nodeStates);
		} else if (this.layoutType === "force") {
			this._renderForceGraph(graph, stepState, nodeStates);
		}
	}

	/**
	 * 격자 모드 렌더링
	 *
	 * @param {Object} graph - 그래프 객체
	 * @param {Object} stepState - 현재 단계 상태
	 * @param {Object} nodeStates - 노드 상태 맵
	 * @returns {void}
	 * @private
	 */
	_renderGrid(graph, stepState, nodeStates) {
		// 텍스트 렌더링 속성은 루프 외부에서 1회 설정 (성능 최적화)
		this.ctx.font = "12px sans-serif";
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "middle";

		// 모든 노드를 순회하며 그리기
		for (const node of graph.nodes) {
			const state = nodeStates[node.id] || "unvisited";

			// row, col 계산 (노드 ID가 "row-col" 형식이라 가정)
			let row, col;
			if (typeof node.row !== "undefined" && typeof node.col !== "undefined") {
				row = node.row;
				col = node.col;
			} else {
				// 폴백: ID에서 추출
				const parts = node.id.split("-");
				row = parseInt(parts[0], 10);
				col = parseInt(parts[1], 10);
			}

			const x = col * this.cellSize;
			const y = row * this.cellSize;

			this._drawCell(x, y, state, node, stepState.visitedOrder);
		}

		// 격자선 그리기
		this._drawGrid(graph);
	}

	/**
	 * 개별 셀 렌더링 (색상 + 테두리 + 텍스트)
	 *
	 * @param {number} x - 픽셀 X 좌표
	 * @param {number} y - 픽셀 Y 좌표
	 * @param {string} state - 노드 상태
	 * @param {Object} node - 노드 객체
	 * @param {Object} visitedOrder - 방문 순서 맵
	 * @returns {void}
	 * @private
	 */
	_drawCell(x, y, state, node, visitedOrder = {}) {
		const effectiveState = (node?.isWall && state !== "start" && state !== "goal") ? "wall" : state;
		const color = this.colors[effectiveState] || this.colors.unvisited;

		// 배경색 채우기
		this.ctx.fillStyle = color;
		this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

		// 테두리 그리기
		if (state === "frontier") {
			this.ctx.strokeStyle = "#ff6600";
			this.ctx.setLineDash([2, 2]); // 점선
		} else {
			this.ctx.strokeStyle = "#cccccc";
			this.ctx.setLineDash([]); // 실선
		}
		this.ctx.lineWidth = 1;
		this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

		// 텍스트: 상태별 표시 (font/textAlign/textBaseline은 _renderGrid에서 설정)
		this.ctx.fillStyle = "#000";

		const centerX = x + this.cellSize / 2;
		const centerY = y + this.cellSize / 2;

		if (
			state === "visited" &&
			visitedOrder &&
			visitedOrder[node.id] !== undefined
		) {
			// 방문 순서 숫자 표시
			this.ctx.fillText(visitedOrder[node.id].toString(), centerX, centerY);
		} else if (state === "start") {
			this.ctx.fillText("S", centerX, centerY);
		} else if (state === "goal") {
			this.ctx.fillText("G", centerX, centerY);
		}
	}

	/**
	 * 격자선 그리기
	 *
	 * @param {Object} graph - 그래프 객체
	 * @returns {void}
	 * @private
	 */
	_drawGrid(graph) {
		// 행과 열 수 계산
		let maxRow = 0,
			maxCol = 0;
		for (const node of graph.nodes) {
			const row =
				node.row !== undefined ? node.row : parseInt(node.id.split("-")[0], 10);
			const col =
				node.col !== undefined ? node.col : parseInt(node.id.split("-")[1], 10);
			maxRow = Math.max(maxRow, row);
			maxCol = Math.max(maxCol, col);
		}

		const rows = maxRow + 1;
		const cols = maxCol + 1;

		// 수직선
		this.ctx.strokeStyle = "#2a2a3e";
		this.ctx.lineWidth = 0.5;
		for (let c = 1; c < cols; c++) {
			const x = c * this.cellSize;
			this.ctx.beginPath();
			this.ctx.moveTo(x, 0);
			this.ctx.lineTo(x, rows * this.cellSize);
			this.ctx.stroke();
		}

		// 수평선
		for (let r = 1; r < rows; r++) {
			const y = r * this.cellSize;
			this.ctx.beginPath();
			this.ctx.moveTo(0, y);
			this.ctx.lineTo(cols * this.cellSize, y);
			this.ctx.stroke();
		}
	}

	/**
	 * Force 그래프 모드 렌더링
	 *
	 * @param {Object} graph - 그래프 객체
	 * @param {Object} stepState - 현재 단계 상태
	 * @param {Object} nodeStates - 노드 상태 맵
	 * @returns {void}
	 * @private
	 */
	_renderForceGraph(graph, _stepState, nodeStates) {
		// 엣지 먼저 그리기
		this.ctx.strokeStyle = "#cccccc";
		this.ctx.lineWidth = 1;

		const nodeMap = new Map();
		for (const node of graph.nodes) {
			nodeMap.set(node.id, node);
		}

		for (const edge of graph.edges) {
			const node1 = nodeMap.get(edge.from);
			const node2 = nodeMap.get(edge.to);

			if (node1 && node2) {
				this.ctx.beginPath();
				this.ctx.moveTo(node1.x, node1.y);
				this.ctx.lineTo(node2.x, node2.y);
				this.ctx.stroke();
			}
		}

		// 노드 그리기
		for (const node of graph.nodes) {
			const rawState = nodeStates[node.id] || "unvisited";
			const state = (node?.isWall && rawState !== "start" && rawState !== "goal") ? "wall" : rawState;
			const color = this.colors[state];

			// 원형 노드
			this.ctx.fillStyle = color;
			this.ctx.beginPath();
			this.ctx.arc(node.x, node.y, this.nodeRadius, 0, 2 * Math.PI);
			this.ctx.fill();

			// 테두리
			this.ctx.strokeStyle = "#666";
			this.ctx.lineWidth = 1;
			this.ctx.stroke();

			// 텍스트
			this.ctx.fillStyle = "#000";
			this.ctx.font = "10px sans-serif";
			this.ctx.textAlign = "center";
			this.ctx.textBaseline = "middle";

			if (state === "start") {
				this.ctx.fillText("S", node.x, node.y);
			} else if (state === "goal") {
				this.ctx.fillText("G", node.x, node.y);
			}
		}
	}

	/**
	 * 픽셀 좌표에 해당하는 노드 ID 조회 (히트 테스트)
	 *
	 * @param {number} pixelX - 마우스 X 좌표
	 * @param {number} pixelY - 마우스 Y 좌표
	 * @returns {string|null} - 노드 ID 또는 null
	 */
	getNodeAtPosition(pixelX, pixelY) {
		if (this.layoutType === "grid") {
			return this._getNodeAtPositionGrid(pixelX, pixelY);
		} else if (this.layoutType === "force") {
			return this._getNodeAtPositionForce(pixelX, pixelY);
		}
		return null;
	}

	/**
	 * 격자 모드: 픽셀 좌표 → 노드 ID
	 *
	 * @param {number} pixelX - 픽셀 X 좌표
	 * @param {number} pixelY - 픽셀 Y 좌표
	 * @returns {string|null} - 노드 ID 또는 null
	 * @private
	 */
	_getNodeAtPositionGrid(pixelX, pixelY) {
		const col = Math.floor(pixelX / this.cellSize);
		const row = Math.floor(pixelY / this.cellSize);

		// 노드 ID 형식: "row-col"
		const nodeId = `${row}-${col}`;
		return nodeId;
	}

	/**
	 * Force 모드: 픽셀 좌표 → 노드 ID (반지름 히트 테스트)
	 *
	 * @param {number} pixelX - 픽셀 X 좌표
	 * @param {number} pixelY - 픽셀 Y 좌표
	 * @returns {string|null} - 노드 ID 또는 null
	 * @private
	 */
	_getNodeAtPositionForce(_pixelX, _pixelY) {
		// 그래프에서 노드를 순회하며 반지름 내에 있는지 확인
		// (그래프 참조가 필요하므로 외부에서 전달받거나 캐시 필요)
		// 간단한 구현으로 null 반환
		return null;
	}

	/**
	 * 픽셀 좌표를 격자 행/열로 변환
	 *
	 * @param {number} pixelX - 픽셀 X 좌표
	 * @param {number} pixelY - 픽셀 Y 좌표
	 * @returns {Object} - {row, col}
	 */
	pixelToGridCoord(pixelX, pixelY) {
		return {
			row: Math.floor(pixelY / this.cellSize),
			col: Math.floor(pixelX / this.cellSize),
		};
	}

	/**
	 * Canvas 동적 크기 조정
	 *
	 * @param {number} width - 새로운 너비 (px)
	 * @param {number} height - 새로운 높이 (px)
	 * @returns {void}
	 */
	updateSize(width, height) {
		this.canvas.width = width;
		this.canvas.height = height;
	}

	/**
	 * Canvas 클리어
	 *
	 * @returns {void}
	 */
	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
}

// 브라우저 전역 등록 (script 태그 방식)
if (typeof window !== "undefined") window.GraphRenderer = GraphRenderer;

// ES6 모듈 export (필요시)
if (typeof module !== "undefined" && module.exports) {
	module.exports = GraphRenderer;
}
