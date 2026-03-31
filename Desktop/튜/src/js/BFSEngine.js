/**
 * BFSEngine - BFS 알고리즘 실행 및 상태 Tracer 패턴 구현
 *
 * 책임: BFS 알고리즘 수행 및 모든 단계를 사전 계산하여 메모리에 저장
 * 각 단계의 불변 스냅샷을 steps[] 배열에 저장하여 O(1) 조회 가능
 */

class BFSEngine {
	/**
	 * @param {Object} graph - 그래프 객체
	 * @param {Array} graph.nodes - 노드 배열 [{id, row, col, x, y, isWall}, ...]
	 * @param {Array} graph.edges - 엣지 배열 [{from, to}, ...]
	 * @param {string} graph.start - 시작 노드 ID
	 * @param {string} graph.goal - 목표 노드 ID (선택)
	 */
	constructor(graph) {
		this.graph = graph;
		this.steps = []; // 각 반복 단계의 불변 스냅샷
		this.currentStep = 0; // 참고용 (외부에서 관리)
	}

	/**
	 * BFS 알고리즘 실행 - 모든 단계를 steps[] 배열에 사전 계산하여 저장
	 *
	 * @param {string} startNode - 시작 노드 ID
	 * @param {string} goalNode - 목표 노드 ID (선택)
	 * @returns {void} - 내부 상태 변경만 (steps[] 배열 초기화)
	 */
	run(startNode, goalNode = null) {
		this.steps = [];

		// 초기화
		const frontier = [startNode]; // FIFO Queue
		const reached = new Set([startNode]); // 방문한 노드
		const cameFrom = new Map(); // 경로 복원용
		cameFrom.set(startNode, null);

		const visitedOrder = {}; // 방문 순서 기록
		let visitOrder = 0;

		// [Step 0] 초기 상태 스냅샷
		this.steps.push({
			current: null, // 처리 중인 노드
			frontier: new Set(frontier), // 스냅샷
			reached: new Set(reached),
			cameFrom: new Map(cameFrom),
			path: [], // 아직 찾지 못함
			visitedOrder: { ...visitedOrder },
		});

		// BFS 메인 루프
		while (frontier.length > 0) {
			const current = frontier.shift(); // 큐에서 노드 제거
			visitedOrder[current] = visitOrder++;

			// 인접 노드 탐색 (4방향: 상하좌우)
			const neighbors = this._getNeighbors(current);

			for (const neighbor of neighbors) {
				if (!reached.has(neighbor)) {
					reached.add(neighbor);
					frontier.push(neighbor);
					cameFrom.set(neighbor, current);
				}
			}

			// [Step N] 각 반복 후 상태 스냅샷
			const foundGoal = !!(goalNode && reached.has(goalNode));
			this.steps.push({
				current,
				frontier: new Set(frontier),
				reached: new Set(reached),
				cameFrom: new Map(cameFrom),
				found: foundGoal,
				path: foundGoal
					? this.reconstructPath(cameFrom, startNode, goalNode)
					: [],
				visitedOrder: { ...visitedOrder },
			});

			// 목표를 찾으면 종료 (단, 모든 노드를 계속 탐색할 수도 있음)
			// 여기서는 모든 노드를 탐색하도록 계속 진행
		}
	}

	/**
	 * 특정 단계의 상태 조회 (O(1) 시간)
	 *
	 * @param {number} stepIndex - 단계 인덱스
	 * @returns {Object} - {current, frontier, reached, cameFrom, path, visitedOrder}
	 */
	getStepState(stepIndex) {
		if (stepIndex < 0) return this.steps[0];
		if (stepIndex >= this.steps.length) {
			return this.steps[this.steps.length - 1];
		}
		return this.steps[stepIndex];
	}

	/**
	 * 총 단계 수 반환
	 *
	 * @returns {number} - steps 배열 길이
	 */
	getTotalSteps() {
		return this.steps.length;
	}

	/**
	 * 경로 재구성 - cameFrom 딕셔너리로 start → goal 경로 복원
	 *
	 * @param {Map} cameFrom - 경로 복원 맵
	 * @param {string} startNode - 시작 노드
	 * @param {string} goalNode - 목표 노드
	 * @returns {Array} - 경로 배열 [start, ..., goal]
	 */
	reconstructPath(cameFrom, _startNode, goalNode) {
		// 경로 복원 입력 검증
		if (!cameFrom || !goalNode) {
			console.error("[BFSEngine.reconstructPath] 유효하지 않은 입력:", { cameFrom, goalNode });
			return [];
		}

		const path = [];
		let current = goalNode;
		let iterations = 0;
		const maxIterations = this.graph.nodes.length + 1; // 무한 루프 방지

		while (current !== null && iterations < maxIterations) {
			path.unshift(current);
			current = cameFrom.get(current);
			iterations++;
		}

		// 무한 루프 감지
		if (iterations >= maxIterations) {
			console.error("[BFSEngine.reconstructPath] 경로 재구성 중 무한 루프 감지");
			return [];
		}

		return path;
	}

	/**
	 * 노드의 인접 노드 목록 조회 (4방향: 상하좌우)
	 * 격자 기반 그래프 가정
	 *
	 * @param {string} nodeId - 노드 ID (형식: "row-col")
	 * @returns {Array} - 인접 노드 ID 배열
	 * @private
	 */
	_getNeighbors(nodeId) {
		const neighbors = [];
		const nodeMap = this._buildNodeMap();

		// 엣지 기반으로 인접 노드 찾기
		for (const edge of this.graph.edges) {
			if (edge.from === nodeId) {
				const neighbor = nodeMap.get(edge.to);
				// 벽이 아닌 경우만 추가
				if (neighbor && !neighbor.isWall) {
					neighbors.push(edge.to);
				}
			}
		}

		return neighbors;
	}

	/**
	 * 노드 ID → 노드 객체 맵 빌드
	 *
	 * @returns {Map} - {nodeId: nodeObject}
	 * @private
	 */
	_buildNodeMap() {
		if (!this._nodeMap) {
			this._nodeMap = new Map();
			// 그래프 및 노드 배열 유효성 검증
			if (!this.graph || !Array.isArray(this.graph.nodes)) {
				console.error("[BFSEngine._buildNodeMap] 그래프 노드 배열이 유효하지 않음");
				return this._nodeMap;
			}
			for (const node of this.graph.nodes) {
				if (!node || !node.id) {
					console.warn("[BFSEngine._buildNodeMap] 유효하지 않은 노드 객체 발견", node);
					continue;
				}
				this._nodeMap.set(node.id, node);
			}
		}
		return this._nodeMap;
	}

	/**
	 * 그래프 초기화 (새로운 그래프로 리셋)
	 *
	 * @param {Object} graph - 새 그래프 객체
	 * @returns {void}
	 */
	reset(graph = null) {
		if (graph) {
			this.graph = graph;
		}
		this.steps = [];
		this.currentStep = 0;
		this._nodeMap = null;
	}
}

// 브라우저 전역 등록 (script 태그 방식)
if (typeof window !== "undefined") window.BFSEngine = BFSEngine;

// ES6 모듈 export (필요시)
if (typeof module !== "undefined" && module.exports) {
	module.exports = BFSEngine;
}
