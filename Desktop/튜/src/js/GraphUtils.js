/**
 * GraphUtils - 그래프 생성 및 유틸리티 함수
 *
 * 책임: 격자 그래프 생성, 캔버스 크기 계산, 프리셋 맵 적용
 */

// ============================================================================
// 1. 격자 그래프 생성
// ============================================================================

function createGridGraph(rows, cols) {
	const nodes = [];
	const edges = [];

	// 노드 생성 (row, col) 형식
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const id = `${r}-${c}`;
			nodes.push({
				id,
				row: r,
				col: c,
				x: c * 25,
				y: r * 25,
				isWall: false,
			});
		}
	}

	// 엣지 생성 (4방향 연결: 상하좌우)
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const current = `${r}-${c}`;

			// 상
			if (r > 0) edges.push({ from: current, to: `${r - 1}-${c}` });
			// 하
			if (r < rows - 1) edges.push({ from: current, to: `${r + 1}-${c}` });
			// 좌
			if (c > 0) edges.push({ from: current, to: `${r}-${c - 1}` });
			// 우
			if (c < cols - 1) edges.push({ from: current, to: `${r}-${c + 1}` });
		}
	}

	return {
		nodes,
		edges,
		start: "0-0", // 좌상단
		goal: "19-19", // 우하단
		rows,
		cols,
	};
}

// ============================================================================
// 2. 캔버스 크기 계산 (반응형)
// ============================================================================

function getCanvasSize(canvas, gridRows = 20, gridCols = 20) {
	const parent = canvas.parentElement;
	if (!parent) {
		return { width: 500, height: 500, cellSize: 25 };
	}

	// padding 제거 (var(--space-4) = 16px × 2 = 32px)
	const style = getComputedStyle(parent);
	const paddingH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
	const paddingV = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

	const availW = (parent.clientWidth - paddingH) || 500;
	const availH = (parent.clientHeight - paddingV) || 500;

	// 그리드 셀 크기: 가로/세로 중 작은 쪽 기준, 최소 10px 최대 40px
	const cellSize = Math.max(10, Math.min(40, Math.floor(Math.min(availW / gridCols, availH / gridRows))));

	return {
		width: cellSize * gridCols,
		height: cellSize * gridRows,
		cellSize,
	};
}

// ============================================================================
// 3. 프리셋 맵 적용
// ============================================================================

function applyPreset(
	preset,
	currentGraph,
	bfsEngine,
	graphRenderer,
	stateManager,
	animCtrl,
	totalStepsDisplay,
) {
	// 입력 검증
	if (!currentGraph || !Array.isArray(currentGraph.nodes)) {
		console.error("[GraphUtils.applyPreset] 유효하지 않은 그래프 객체");
		return;
	}

	const { rows, cols } = currentGraph;
	if (!rows || !cols) {
		console.error("[GraphUtils.applyPreset] 그래프 크기 정보 누락", { rows, cols });
		return;
	}

	switch (preset) {
		case "empty":
			// 벽 모두 즉시 제거
			currentGraph.nodes.forEach((node) => {
				if (node) node.isWall = false;
			});
			break;

		case "clear-walls":
			// 벽을 열(col) 순서대로 sweep 애니메이션으로 제거
			_sweepClearWalls(currentGraph, stateManager, graphRenderer, bfsEngine, animCtrl, totalStepsDisplay);
			return; // 애니메이션 내부에서 BFS 재실행 처리

		case "obstacles":
			// 일부 벽 추가 (패턴)
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					if (
						(r === 10 && c >= 5 && c <= 14) ||
						(c === 10 && r >= 5 && r <= 14)
					) {
						const node = currentGraph.nodes.find(
							(n) => n && n.row === r && n.col === c,
						);
						if (
							node &&
							node.id !== currentGraph.start &&
							node.id !== currentGraph.goal
						) {
							node.isWall = true;
						}
					}
				}
			}
			break;

		case "maze":
			// 미로 패턴 생성
			generateMazePattern(currentGraph);
			break;

		default:
			console.warn("[GraphUtils.applyPreset] 알 수 없는 프리셋:", preset);
			break;
	}

	// StateManager의 _wallNodes를 currentGraph 노드 isWall 상태와 동기화
	if (stateManager) {
		stateManager._wallNodes = new Set();
		for (const node of currentGraph.nodes) {
			if (node && node.isWall) {
				stateManager._wallNodes.add(node.id);
			}
		}
	}

	// BFS 재실행 (bfsEngine 유효성 검증)
	if (!bfsEngine || typeof bfsEngine.run !== "function") {
		console.error("[GraphUtils.applyPreset] BFSEngine이 유효하지 않음");
		return;
	}

	bfsEngine.run(currentGraph.start, currentGraph.goal);
	const totalSteps = bfsEngine.getTotalSteps();
	if (totalStepsDisplay) totalStepsDisplay.textContent = totalSteps.toString();

	// 상태 업데이트 (animCtrl, stateManager, graphRenderer 유효성 검증)
	if (!animCtrl || typeof animCtrl.jumpToStep !== "function") {
		console.error("[GraphUtils.applyPreset] AnimationController가 유효하지 않음");
		return;
	}

	animCtrl.jumpToStep(0);
	const initialStepState = bfsEngine.getStepState(0);
	if (stateManager && typeof stateManager.updateFromStep === "function") {
		stateManager.updateFromStep(initialStepState);
	}
	if (graphRenderer && typeof graphRenderer.render === "function") {
		graphRenderer.render(
			currentGraph,
			initialStepState,
			stateManager?.getNodeStates?.(),
		);
	}
}

// ============================================================================
// 4. sweep 벽 제거 애니메이션
// ============================================================================

function _sweepClearWalls(currentGraph, stateManager, graphRenderer, bfsEngine, animCtrl, totalStepsDisplay) {
	const cols = currentGraph.cols;
	const delayPerCol = 18; // 열당 딜레이 (ms) — 20열 × 18ms = 360ms 총 소요

	// 애니메이션 진행 중 조작 방지
	if (animCtrl && typeof animCtrl.pause === "function") animCtrl.pause();

	let col = 0;

	function removeNextCol() {
		if (col >= cols) {
			// 애니메이션 완료 → BFS 재실행
			if (stateManager) {
				stateManager._wallNodes = new Set();
			}
			if (bfsEngine && typeof bfsEngine.run === "function") {
				bfsEngine.run(currentGraph.start, currentGraph.goal);
			}
			const totalSteps = bfsEngine ? bfsEngine.getTotalSteps() : 0;
			if (totalStepsDisplay) totalStepsDisplay.textContent = totalSteps.toString();
			if (animCtrl && typeof animCtrl.jumpToStep === "function") animCtrl.jumpToStep(0);
			const initialStepState = bfsEngine ? bfsEngine.getStepState(0) : null;
			if (stateManager && initialStepState && typeof stateManager.updateFromStep === "function") {
				stateManager.updateFromStep(initialStepState);
			}
			if (graphRenderer && initialStepState && typeof graphRenderer.render === "function") {
				graphRenderer.render(currentGraph, initialStepState, stateManager?.getNodeStates?.());
			}
			return;
		}

		// 현재 열의 벽 제거
		for (const node of currentGraph.nodes) {
			if (node && node.col === col && node.isWall) {
				node.isWall = false;
			}
		}

		// 즉시 렌더링 (stepState 없이 현재 nodeStates 유지)
		if (graphRenderer && typeof graphRenderer.render === "function") {
			const stepState = bfsEngine
				? (bfsEngine.getStepState(animCtrl?.currentStep ?? 0) || { current: null, frontier: new Set(), reached: new Set(), cameFrom: new Map(), path: [], visitedOrder: {} })
				: { current: null, frontier: new Set(), reached: new Set(), cameFrom: new Map(), path: [], visitedOrder: {} };
			// nodeStates에서 해당 열 벽 상태 반영
			const ns = stateManager?.getNodeStates?.() || {};
			for (const node of currentGraph.nodes) {
				if (node && node.col === col) ns[node.id] = "unvisited";
			}
			graphRenderer.render(currentGraph, stepState, ns);
		}

		col++;
		setTimeout(removeNextCol, delayPerCol);
	}

	removeNextCol();
}

// ============================================================================
// 5. 미로 패턴 생성
// ============================================================================

function generateMazePattern(graph) {
	// 입력 검증
	if (!graph || !Array.isArray(graph.nodes)) {
		console.error("[GraphUtils.generateMazePattern] 유효하지 않은 그래프 객체");
		return;
	}

	const { rows, cols } = graph;
	if (!rows || !cols) {
		console.error("[GraphUtils.generateMazePattern] 그래프 크기 정보 누락");
		return;
	}

	// 간단한 미로 패턴 (가로 및 세로 라인)
	for (let r = 2; r < rows - 2; r += 3) {
		for (let c = 0; c < cols; c++) {
			const node = graph.nodes.find((n) => n && n.row === r && n.col === c);
			if (node && node.id !== graph.start && node.id !== graph.goal) {
				node.isWall = true;
			}
		}
	}
}

// ============================================================================
// 브라우저 전역 및 모듈 내보내기
// ============================================================================

// 브라우저 전역 등록
if (typeof window !== "undefined") {
	window.GraphUtils = {
		createGridGraph,
		getCanvasSize,
		applyPreset,
		generateMazePattern,
	};
}

// ES6 모듈 export
if (typeof module !== "undefined" && module.exports) {
	module.exports = {
		createGridGraph,
		getCanvasSize,
		applyPreset,
		generateMazePattern,
	};
}

console.log("[GraphUtils.js] 모듈 로드 완료");
