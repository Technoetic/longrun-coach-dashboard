import { describe, it, expect, beforeEach } from "vitest";

// BFSEngine은 CommonJS module.exports 방식이므로 require() 사용
const BFSEngine = require("../BFSEngine.js");

/**
 * 테스트용 격자 그래프 생성 헬퍼
 * rows × cols 크기의 격자를 만들고, walls 배열에 지정된 위치(row-col)를 벽으로 설정
 *
 * @param {number} rows - 행의 수
 * @param {number} cols - 열의 수
 * @param {Array} walls - 벽 위치 배열 [['0-1'], ['1-0'], ...]
 * @returns {Object} - {nodes, edges, start, goal}
 */
function makeGrid(rows, cols, walls = []) {
	const wallSet = new Set(walls);
	const nodes = [];
	const edges = [];

	// 노드 생성
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const id = `${r}-${c}`;
			nodes.push({
				id,
				row: r,
				col: c,
				x: c * 50,
				y: r * 50,
				isWall: wallSet.has(id),
			});
		}
	}

	// 엣지 생성 (4방향: 상하좌우)
	const directions = [
		[-1, 0], // 위
		[1, 0], // 아래
		[0, -1], // 좌
		[0, 1], // 우
	];

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const fromId = `${r}-${c}`;
			for (const [dr, dc] of directions) {
				const nr = r + dr;
				const nc = c + dc;
				if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
					const toId = `${nr}-${nc}`;
					edges.push({ from: fromId, to: toId });
				}
			}
		}
	}

	return {
		nodes,
		edges,
		start: "0-0",
		goal: `${rows - 1}-${cols - 1}`,
	};
}

describe("BFSEngine", () => {
	let engine;
	let graph;

	beforeEach(() => {
		engine = new BFSEngine({});
	});

	// ====== 생성자 테스트 ======
	describe("constructor", () => {
		it("1. 빈 그래프로 초기화 시 currentStep은 0이어야 한다", () => {
			const emptyEngine = new BFSEngine({});
			expect(emptyEngine.currentStep).toBe(0);
			expect(emptyEngine.steps).toEqual([]);
		});
	});

	// ====== run() 메서드 테스트 ======
	describe("run()", () => {
		it("2. 3×3 격자에서 (0-0)→(2-2) 경로 탐색이 성공해야 한다", () => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			expect(finalStep.path).toBeTruthy();
			expect(finalStep.path.length).toBeGreaterThan(0);
			expect(finalStep.path[0]).toBe(graph.start);
			expect(finalStep.path[finalStep.path.length - 1]).toBe(graph.goal);
		});

		it("3. 벽으로 완전 차단 시 found는 false여야 한다", () => {
			// 목표 노드를 완전히 벽으로 감싸기
			// 2×2 격자에서 (1-1)을 목표로, 모든 경로를 벽으로 차단
			graph = makeGrid(2, 2, ["1-0", "0-1"]);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			// 벽으로 차단되면 경로가 비어있어야 함
			expect(finalStep.path.length).toBe(0);
		});
	});

	// ====== getStepState() 메서드 테스트 ======
	describe("getStepState()", () => {
		beforeEach(() => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);
		});

		it("4. getStepState(0)은 초기 상태를 반환해야 한다", () => {
			const step0 = engine.getStepState(0);
			expect(step0.current).toBeNull();
			expect(step0.frontier.size).toBe(1);
			expect(step0.frontier.has(graph.start)).toBe(true);
			expect(step0.reached.has(graph.start)).toBe(true);
			expect(step0.path).toEqual([]);
		});

		it("5. getStepState(n)은 마지막 단계를 반환해야 한다", () => {
			const totalSteps = engine.getTotalSteps();
			const lastStep = engine.getStepState(totalSteps - 1);
			expect(lastStep).toBeTruthy();
			expect(lastStep.reached.size).toBeGreaterThan(0);
		});

		it("6. getStepState(-1)은 경계값 처리로 첫 단계를 반환해야 한다", () => {
			const negativeStep = engine.getStepState(-1);
			const step0 = engine.getStepState(0);
			expect(negativeStep).toEqual(step0);
		});

		it("7. getStepState(매우큰값)은 마지막 단계를 반환해야 한다", () => {
			const largeStep = engine.getStepState(9999);
			const lastStep = engine.getStepState(engine.getTotalSteps() - 1);
			expect(largeStep).toEqual(lastStep);
		});
	});

	// ====== getTotalSteps() 메서드 테스트 ======
	describe("getTotalSteps()", () => {
		it("8. getTotalSteps()는 양수를 반환해야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const totalSteps = engine.getTotalSteps();
			expect(totalSteps).toBeGreaterThan(0);
		});

		it("8b. getTotalSteps()는 steps.length과 일치해야 한다", () => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			expect(engine.getTotalSteps()).toBe(engine.steps.length);
		});
	});

	// ====== reset() 메서드 테스트 ======
	describe("reset()", () => {
		it("9. reset()은 currentStep을 0으로 초기화해야 한다", () => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.currentStep = 5;
			engine.steps = [{ some: "data" }];

			engine.reset();

			expect(engine.currentStep).toBe(0);
			expect(engine.steps).toEqual([]);
		});

		it("9b. reset(newGraph)는 그래프를 교체하고 상태를 초기화해야 한다", () => {
			const graph1 = makeGrid(2, 2);
			const graph2 = makeGrid(3, 3);
			engine = new BFSEngine(graph1);
			engine.run(graph1.start, graph1.goal);

			engine.reset(graph2);

			expect(engine.graph).toEqual(graph2);
			expect(engine.currentStep).toBe(0);
			expect(engine.steps).toEqual([]);
		});
	});

	// ====== 경로 추적 테스트 ======
	describe("path tracking", () => {
		it("10. 경로는 start→goal 순서로 진행해야 한다", () => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			const path = finalStep.path;

			if (path.length > 0) {
				expect(path[0]).toBe(graph.start);
				expect(path[path.length - 1]).toBe(graph.goal);

				// 경로의 각 인접 노드가 실제로 엣지로 연결되어 있는지 확인
				for (let i = 0; i < path.length - 1; i++) {
					const from = path[i];
					const to = path[i + 1];
					const edgeExists = graph.edges.some(
						(e) => e.from === from && e.to === to,
					);
					expect(edgeExists).toBe(true);
				}
			}
		});
	});

	// ====== frontier 테스트 ======
	describe("frontier management", () => {
		it("11. 첫 단계(Step 0)에서 frontier는 start의 인접 노드를 포함해야 한다", () => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const step1 = engine.getStepState(1);
			expect(step1.frontier.size).toBeGreaterThan(0);

			// start가 0-0이고 3×3 격자면, 이웃은 1-0, 0-1 (위/좌는 경계 밖)
			expect(step1.frontier.has("1-0") || step1.frontier.has("0-1")).toBe(true);
		});
	});

	// ====== reached 테스트 ======
	describe("reached tracking", () => {
		it("12. reached는 방문을 완료한 노드들을 추적해야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			expect(finalStep.reached.size).toBeGreaterThan(0);
			expect(finalStep.reached.has(graph.start)).toBe(true);
		});
	});

	// ====== 소규모 격자 테스트 ======
	describe("minimal grids", () => {
		it("13. 2×2 최소 격자에서 경로 탐색이 성공해야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			expect(finalStep.path.length).toBeGreaterThan(0);
			expect(finalStep.path[0]).toBe("0-0");
			expect(finalStep.path[finalStep.path.length - 1]).toBe("1-1");
		});
	});

	// ====== 직선 통로 테스트 ======
	describe("linear corridor", () => {
		it("14. 직선 통로에서 경로는 최단 경로여야 한다", () => {
			// 1×5 격자 (일렬)
			graph = makeGrid(1, 5);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			const path = finalStep.path;

			// 최단 경로는 0-0 → 0-1 → 0-2 → 0-3 → 0-4 (5개 노드)
			expect(path).toEqual(["0-0", "0-1", "0-2", "0-3", "0-4"]);
		});
	});

	// ====== 벽 노드 제외 테스트 ======
	describe("wall avoidance", () => {
		it("15. 벽 노드는 탐색에서 제외되어야 한다", () => {
			// 3×3 격자에서 중앙을 벽으로 설정
			graph = makeGrid(3, 3, ["1-1"]);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			expect(finalStep.reached.has("1-1")).toBe(false);
		});
	});

	// ====== BFS 탐색 순서 테스트 ======
	describe("BFS order validation", () => {
		it("16. BFS는 너비우선 탐색으로 레벨별로 노드를 방문해야 한다", () => {
			graph = makeGrid(4, 1); // 4×1 수직 격자
			engine = new BFSEngine(graph);
			engine.run(graph.start);

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			const visitedOrder = finalStep.visitedOrder;

			// BFS 방문 순서: 0-0(0) → 1-0(1) → 2-0(2) → 3-0(3)
			expect(visitedOrder["0-0"]).toBe(0);
			expect(visitedOrder["1-0"]).toBe(1);
			expect(visitedOrder["2-0"]).toBe(2);
			expect(visitedOrder["3-0"]).toBe(3);
		});
	});

	// ====== 경로 재구성 테스트 ======
	describe("path reconstruction", () => {
		it("17. reconstructPath()는 정확한 역추적 경로를 반환해야 한다", () => {
			graph = makeGrid(3, 3);
			engine = new BFSEngine(graph);
			engine.run(graph.start, graph.goal);

			const cameFrom = new Map([
				["0-0", null],
				["1-0", "0-0"],
				["2-0", "1-0"],
				["2-1", "2-0"],
				["2-2", "2-1"],
			]);

			const path = engine.reconstructPath(cameFrom, "0-0", "2-2");
			expect(path).toEqual(["0-0", "1-0", "2-0", "2-1", "2-2"]);
		});
	});

	// ====== 엣지 기반 인접 노드 테스트 ======
	describe("neighbor detection", () => {
		it("18. _getNeighbors()는 엣지 기반으로 인접 노드를 반환해야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);

			const neighbors = engine._getNeighbors("0-0");
			expect(neighbors).toContain("1-0");
			expect(neighbors).toContain("0-1");
			expect(neighbors.length).toBeGreaterThan(0);
		});

		it("18b. _getNeighbors()는 벽 노드를 제외해야 한다", () => {
			graph = makeGrid(2, 2, ["1-0"]);
			engine = new BFSEngine(graph);

			const neighbors = engine._getNeighbors("0-0");
			expect(neighbors).not.toContain("1-0");
			expect(neighbors).toContain("0-1");
		});
	});

	// ====== 노드 맵 캐싱 테스트 ======
	describe("node map caching", () => {
		it("19. _buildNodeMap()은 노드를 ID로 맵핑해야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);

			const nodeMap = engine._buildNodeMap();
			expect(nodeMap.get("0-0")).toBeTruthy();
			expect(nodeMap.get("0-0").id).toBe("0-0");
			expect(nodeMap.get("1-1").row).toBe(1);
			expect(nodeMap.get("1-1").col).toBe(1);
		});

		it("19b. 캐시된 노드 맵은 재사용되어야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);

			const map1 = engine._buildNodeMap();
			const map2 = engine._buildNodeMap();

			expect(map1).toBe(map2); // 같은 객체 참조
		});
	});

	// ====== 목표 없는 탐색 테스트 ======
	describe("search without goal", () => {
		it("20. goalNode를 지정하지 않으면 모든 도달 가능 노드를 탐색해야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			engine.run(graph.start); // goalNode 없음

			const finalStep = engine.getStepState(engine.getTotalSteps() - 1);
			// 2×2 격자에서 도달 가능한 노드는 4개
			expect(finalStep.reached.size).toBe(4);
		});
	});

	// ====== 경계 케이스: reconstructPath 입력 검증 ======
	describe("reconstructPath edge cases", () => {
		it("21. null cameFrom 입력 시 빈 배열 반환", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			const path = engine.reconstructPath(null, "0-0", "1-1");
			expect(path).toEqual([]);
		});

		it("22. null goalNode 입력 시 빈 배열 반환", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			const path = engine.reconstructPath(new Map(), "0-0", null);
			expect(path).toEqual([]);
		});
	});

	// ====== 경계 케이스: _buildNodeMap 유효성 검증 ======
	describe("_buildNodeMap edge cases", () => {
		it("23. 노드 배열이 null인 그래프에서 빈 맵 반환", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			engine.graph = { nodes: null, edges: [] };
			engine._nodeMap = null;
			const map = engine._buildNodeMap();
			expect(map.size).toBe(0);
		});

		it("24. id 없는 노드 객체는 스킵되어야 한다", () => {
			graph = makeGrid(2, 2);
			engine = new BFSEngine(graph);
			engine.graph = { nodes: [null, { id: "0-0", row: 0, col: 0 }], edges: [] };
			engine._nodeMap = null;
			const map = engine._buildNodeMap();
			expect(map.has("0-0")).toBe(true);
		});
	});
});
