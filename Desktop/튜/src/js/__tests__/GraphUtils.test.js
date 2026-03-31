import { describe, it, expect, beforeEach, vi } from "vitest";

const {
	createGridGraph,
	getCanvasSize,
	generateMazePattern,
	applyPreset,
} = require("../GraphUtils.js");

describe("GraphUtils", () => {
	// ============================================================================
	// createGridGraph 테스트
	// ============================================================================

	describe("createGridGraph", () => {
		it("20×20 격자: nodes.length === 400", () => {
			const graph = createGridGraph(20, 20);
			expect(graph.nodes.length).toBe(400);
		});

		it("20×20 격자: 4방향 연결 확인 (내부 노드)", () => {
			const graph = createGridGraph(20, 20);
			// 중앙의 10-10 노드는 상하좌우 4개 엣지를 가짐
			const edgesFromCenter = graph.edges.filter(
				(edge) => edge.from === "10-10",
			);
			expect(edgesFromCenter.length).toBe(4);
			expect(edgesFromCenter.map((e) => e.to)).toEqual(
				expect.arrayContaining(["9-10", "11-10", "10-9", "10-11"]),
			);
		});

		it('start = "0-0", goal = "19-19" 기본값', () => {
			const graph = createGridGraph(20, 20);
			expect(graph.start).toBe("0-0");
			expect(graph.goal).toBe("19-19");
		});

		it("5×5 격자: 코너 노드(0-0)는 2개 엣지만 가짐", () => {
			const graph = createGridGraph(5, 5);
			const edgesFromCorner = graph.edges.filter((edge) => edge.from === "0-0");
			expect(edgesFromCorner.length).toBe(2); // 아래, 오른쪽만
			expect(edgesFromCorner.map((e) => e.to)).toEqual(
				expect.arrayContaining(["1-0", "0-1"]),
			);
		});

		it("isWall = false 기본값", () => {
			const graph = createGridGraph(10, 10);
			const allWallsFalse = graph.nodes.every((node) => node.isWall === false);
			expect(allWallsFalse).toBe(true);
		});

		it("노드의 좌표 계산: x = col * 25, y = row * 25", () => {
			const graph = createGridGraph(5, 5);
			const node = graph.nodes.find((n) => n.row === 2 && n.col === 3);
			expect(node.x).toBe(75); // 3 * 25
			expect(node.y).toBe(50); // 2 * 25
		});

		it("각 노드는 고유한 id를 가짐 (row-col 형식)", () => {
			const graph = createGridGraph(5, 5);
			const ids = graph.nodes.map((n) => n.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(25);
			expect(ids).toEqual(expect.arrayContaining(["0-0", "2-3", "4-4"]));
		});

		it("rows와 cols 정보 포함", () => {
			const graph = createGridGraph(15, 25);
			expect(graph.rows).toBe(15);
			expect(graph.cols).toBe(25);
		});
	});

	// ============================================================================
	// getCanvasSize 테스트
	// ============================================================================

	describe("getCanvasSize", () => {
		it("parentElement가 null이면 {width:500, height:500} 반환", () => {
			const canvas = { parentElement: null };
			const size = getCanvasSize(canvas);
			expect(size).toEqual({ width: 500, height: 500 });
		});

		it("clientWidth/Height가 있는 부모이면 해당 값 반환", () => {
			const canvas = {
				parentElement: {
					clientWidth: 800,
					clientHeight: 600,
				},
			};
			const size = getCanvasSize(canvas);
			expect(size).toEqual({ width: 800, height: 600 });
		});

		it("clientWidth=0이면 fallback 500 반환", () => {
			const canvas = {
				parentElement: {
					clientWidth: 0,
					clientHeight: 0,
				},
			};
			const size = getCanvasSize(canvas);
			expect(size).toEqual({ width: 500, height: 500 });
		});

		it("clientWidth만 0이 아니고 clientHeight=0이면 width는 사용, height는 fallback", () => {
			const canvas = {
				parentElement: {
					clientWidth: 720,
					clientHeight: 0,
				},
			};
			const size = getCanvasSize(canvas);
			expect(size).toEqual({ width: 720, height: 500 });
		});
	});

	// ============================================================================
	// generateMazePattern 테스트
	// ============================================================================

	describe("generateMazePattern", () => {
		it("미로 패턴 적용 후 벽이 생성됨", () => {
			const graph = createGridGraph(20, 20);
			const wallsBefore = graph.nodes.filter((n) => n.isWall).length;
			generateMazePattern(graph);
			const wallsAfter = graph.nodes.filter((n) => n.isWall).length;
			expect(wallsAfter).toBeGreaterThan(wallsBefore);
		});

		it("start 노드(0-0)는 벽이 되지 않음", () => {
			const graph = createGridGraph(20, 20);
			generateMazePattern(graph);
			const startNode = graph.nodes.find((n) => n.id === graph.start);
			expect(startNode.isWall).toBe(false);
		});

		it("goal 노드(19-19)는 벽이 되지 않음", () => {
			const graph = createGridGraph(20, 20);
			generateMazePattern(graph);
			const goalNode = graph.nodes.find((n) => n.id === graph.goal);
			expect(goalNode.isWall).toBe(false);
		});

		it("3행 간격으로 벽 생성 확인 (row 2, 5, 8, 11, ...)", () => {
			const graph = createGridGraph(20, 20);
			generateMazePattern(graph);
			// row 2부터 시작해서 3 간격으로 벽이 생성되어야 함
			const wallRows = new Set();
			graph.nodes.forEach((node) => {
				if (node.isWall) wallRows.add(node.row);
			});
			// 예상 행: 2, 5, 8, 11, 14, 17
			expect(wallRows.has(2)).toBe(true);
			expect(wallRows.has(5)).toBe(true);
			expect(wallRows.has(8)).toBe(true);
		});

		it("각 벽 행은 모든 열을 포함해야 함 (start/goal 제외)", () => {
			const graph = createGridGraph(20, 20);
			generateMazePattern(graph);
			// row 2에서 모든 노드가 벽이어야 함 (start, goal 제외)
			const row2Nodes = graph.nodes.filter((n) => n.row === 2);
			const row2Walls = row2Nodes.filter((n) => n.isWall);
			// start/goal이 row 2에 없으므로 20개 모두 벽이어야 함
			expect(row2Walls.length).toBe(20);
		});
	});

	// ============================================================================
	// applyPreset 테스트
	// ============================================================================

	describe("applyPreset", () => {
		let mockBfsEngine;
		let mockGraphRenderer;
		let mockStateManager;
		let mockAnimCtrl;
		let mockTotalStepsDisplay;

		beforeEach(() => {
			// Mock 객체들
			mockBfsEngine = {
				run: vi.fn(),
				getTotalSteps: vi.fn().mockReturnValue(100),
				getStepState: vi.fn().mockReturnValue({ visited: [] }),
			};

			mockStateManager = {
				updateFromStep: vi.fn(),
				getNodeStates: vi.fn().mockReturnValue({}),
			};

			mockAnimCtrl = {
				jumpToStep: vi.fn(),
			};

			mockGraphRenderer = {
				render: vi.fn(),
			};

			mockTotalStepsDisplay = {
				textContent: "",
			};
		});

		it("'empty' 프리셋: 모든 벽 제거", () => {
			const graph = createGridGraph(10, 10);
			// 먼저 일부 벽 추가
			graph.nodes[0].isWall = true;
			graph.nodes[1].isWall = true;
			graph.nodes[2].isWall = true;

			applyPreset(
				"empty",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			const wallCount = graph.nodes.filter((n) => n.isWall).length;
			expect(wallCount).toBe(0);
		});

		it("'clear-walls' 프리셋: 모든 벽 제거", () => {
			const graph = createGridGraph(10, 10);
			// 먼저 일부 벽 추가
			graph.nodes[0].isWall = true;
			graph.nodes[1].isWall = true;

			applyPreset(
				"clear-walls",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			const wallCount = graph.nodes.filter((n) => n.isWall).length;
			expect(wallCount).toBe(0);
		});

		it("'maze' 프리셋: generateMazePattern 호출", () => {
			const graph = createGridGraph(20, 20);
			applyPreset(
				"maze",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			// 미로 패턴이 적용되어 벽이 생성되어야 함
			const wallCount = graph.nodes.filter((n) => n.isWall).length;
			expect(wallCount).toBeGreaterThan(0);
		});

		it("'obstacles' 프리셋: 십자형 벽 생성 (r==10 또는 c==10, 범위 제한)", () => {
			const graph = createGridGraph(20, 20);
			applyPreset(
				"obstacles",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			// row 10에서 col 5~14의 노드들이 벽이어야 함 (start/goal 제외)
			const row10Walls = graph.nodes.filter(
				(n) => n.row === 10 && n.col >= 5 && n.col <= 14 && n.isWall,
			);
			expect(row10Walls.length).toBeGreaterThan(0);
		});

		it("applyPreset 호출 시 BFS 재실행 (bfsEngine.run 호출)", () => {
			const graph = createGridGraph(10, 10);
			applyPreset(
				"empty",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			expect(mockBfsEngine.run).toHaveBeenCalledWith("0-0", "19-19");
		});

		it("applyPreset 호출 시 totalStepsDisplay 업데이트", () => {
			const graph = createGridGraph(10, 10);
			applyPreset(
				"empty",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			expect(mockTotalStepsDisplay.textContent).toBe("100");
		});

		it("applyPreset 호출 시 animCtrl.jumpToStep(0) 실행", () => {
			const graph = createGridGraph(10, 10);
			applyPreset(
				"empty",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			expect(mockAnimCtrl.jumpToStep).toHaveBeenCalledWith(0);
		});

		it("applyPreset 호출 시 stateManager와 graphRenderer 업데이트", () => {
			const graph = createGridGraph(10, 10);
			applyPreset(
				"empty",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			expect(mockStateManager.updateFromStep).toHaveBeenCalled();
			expect(mockGraphRenderer.render).toHaveBeenCalled();
		});

		it("존재하지 않는 프리셋: 아무 변화 없음", () => {
			const graph = createGridGraph(10, 10);
			const nodesBefore = JSON.stringify(graph.nodes.map((n) => n.isWall));

			applyPreset(
				"unknown-preset",
				graph,
				mockBfsEngine,
				mockGraphRenderer,
				mockStateManager,
				mockAnimCtrl,
				mockTotalStepsDisplay,
			);

			const nodesAfter = JSON.stringify(graph.nodes.map((n) => n.isWall));
			expect(nodesBefore).toBe(nodesAfter);
		});

		it("totalStepsDisplay가 null일 경우 오류 없이 처리", () => {
			const graph = createGridGraph(10, 10);

			expect(() => {
				applyPreset(
					"empty",
					graph,
					mockBfsEngine,
					mockGraphRenderer,
					mockStateManager,
					mockAnimCtrl,
					null,
				);
			}).not.toThrow();
		});
	});
});
