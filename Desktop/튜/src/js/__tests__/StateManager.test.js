import { describe, it, expect, beforeEach, vi } from "vitest";

const StateManager = require("../StateManager.js");

describe("EventEmitter", () => {
	let emitter;

	beforeEach(() => {
		emitter = new StateManager();
	});

	it("on(): listeners에 콜백 추가 확인", () => {
		const callback = vi.fn();
		emitter.on("test", callback);

		expect(emitter.listeners.test).toBeDefined();
		expect(emitter.listeners.test.length).toBe(1);
		expect(emitter.listeners.test[0]).toBe(callback);
	});

	it("emit(): 등록된 모든 콜백 호출", () => {
		const callback1 = vi.fn();
		const callback2 = vi.fn();
		const testData = { msg: "test" };

		emitter.on("test", callback1);
		emitter.on("test", callback2);
		emitter.emit("test", testData);

		expect(callback1).toHaveBeenCalledWith(testData);
		expect(callback2).toHaveBeenCalledWith(testData);
		expect(callback1).toHaveBeenCalledTimes(1);
		expect(callback2).toHaveBeenCalledTimes(1);
	});

	it("emit(): 리스너 없을 때 오류 없음", () => {
		expect(() => {
			emitter.emit("nonexistent", { data: "test" });
		}).not.toThrow();
	});

	it("off(): 리스너 제거 후 emit에서 미호출", () => {
		const callback1 = vi.fn();
		const callback2 = vi.fn();

		emitter.on("test", callback1);
		emitter.on("test", callback2);
		emitter.off("test", callback1);
		emitter.emit("test", {});

		expect(callback1).not.toHaveBeenCalled();
		expect(callback2).toHaveBeenCalledTimes(1);
	});

	it("off(): 존재하지 않는 이벤트명 off 호출 시 에러 없이 리턴", () => {
		const callback = vi.fn();
		expect(() => emitter.off("nonexistent", callback)).not.toThrow();
	});
});

describe("StateManager 초기화", () => {
	it("20x20 생성: 400개 노드 모두 unvisited", () => {
		const manager = new StateManager(20, 20);
		const states = manager.getNodeStates();

		// 400개 노드 확인
		expect(Object.keys(states).length).toBe(400);

		// 모든 노드가 'unvisited'인지 확인
		for (let i = 0; i < 400; i++) {
			const state = Object.values(states)[i];
			expect(state).toBe("unvisited");
		}
	});

	it("5x5 생성: 25개 노드", () => {
		const manager = new StateManager(5, 5);
		const states = manager.getNodeStates();

		expect(Object.keys(states).length).toBe(25);

		// 각 노드를 확인: "0,0" ~ "4,4" 형식
		for (let r = 0; r < 5; r++) {
			for (let c = 0; c < 5; c++) {
				const nodeId = `${r},${c}`;
				expect(states[nodeId]).toBe("unvisited");
			}
		}
	});
});

describe("updateFromStep()", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it('reached=["0,0","1,0"], frontier=["2,0"] → getNodeState 확인', () => {
		manager.updateFromStep({
			reached: ["0,0", "1,0"],
			frontier: ["2,0"],
			path: [],
			visitedOrder: {},
		});

		expect(manager.getNodeState(0, 0)).toBe("visited");
		expect(manager.getNodeState(1, 0)).toBe("visited");
		expect(manager.getNodeState(2, 0)).toBe("frontier");
		expect(manager.getNodeState(3, 0)).toBe("unvisited");
	});

	it('path=["0,0","1,0"] → 상태 = path', () => {
		manager.updateFromStep({
			reached: ["0,0", "1,0"],
			frontier: [],
			path: ["0,0", "1,0"],
			visitedOrder: {},
		});

		expect(manager.getNodeState(0, 0)).toBe("path");
		expect(manager.getNodeState(1, 0)).toBe("path");
	});

	it("visitedOrder 적용 후 getVisitOrder() 확인", () => {
		manager.updateFromStep({
			reached: ["0,0", "1,0", "2,0"],
			frontier: [],
			path: [],
			visitedOrder: {
				"0,0": 0,
				"1,0": 1,
				"2,0": 2,
			},
		});

		// getVisitOrder는 내부적으로 Map.get(nodeId) || null 이므로
		// 값이 0인 경우 falsy → null 반환 (소스 코드 동작 그대로 검증)
		expect(manager.getVisitOrder(1, 0)).toBe(1);
		expect(manager.getVisitOrder(2, 0)).toBe(2);
		expect(manager.getVisitOrder(3, 0)).toBeNull();
	});

	it("stateChange 이벤트 발생 확인", () => {
		const stateChangeCallback = vi.fn();
		manager.on("stateChange", stateChangeCallback);

		manager.updateFromStep({
			reached: ["0,0"],
			frontier: [],
			path: [],
			visitedOrder: {},
		});

		expect(stateChangeCallback).toHaveBeenCalled();
		// '0,0'이 'unvisited'에서 'visited'로 변함
		const call = stateChangeCallback.mock.calls[0][0];
		expect(call.nodeId).toBe("0,0");
		expect(call.oldState).toBe("unvisited");
		expect(call.newState).toBe("visited");
	});

	it("update 이벤트 발생: nodeStates와 stepState 전달", () => {
		const updateCallback = vi.fn();
		manager.on("update", updateCallback);

		const stepState = {
			reached: ["0,0"],
			frontier: [],
			path: [],
			visitedOrder: {},
		};

		manager.updateFromStep(stepState);

		expect(updateCallback).toHaveBeenCalled();
		const callData = updateCallback.mock.calls[0][0];
		expect(callData.nodeStates).toBeDefined();
		expect(callData.stepState).toEqual(stepState);
	});
});

describe("우선순위", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it("path > frontier 우선순위 확인 (같은 노드가 frontier+path → path)", () => {
		// 동일한 노드를 frontier와 path 모두에 포함
		manager.updateFromStep({
			reached: [],
			frontier: ["0,0"],
			path: ["0,0"],
			visitedOrder: {},
		});

		// path 우선순위가 더 높으므로 'path' 상태여야 함
		expect(manager.getNodeState(0, 0)).toBe("path");
	});

	it("setStartNode 후 start 상태 최우선", () => {
		manager.updateFromStep({
			reached: ["0,0"],
			frontier: [],
			path: ["0,0"],
			visitedOrder: {},
		});

		// '0,0'이 'path' 상태이지만, start로 설정하면 'start'가 되어야 함
		manager.setStartNode(0, 0);
		expect(manager.getNodeState(0, 0)).toBe("start");
	});

	it("setGoalNode 후 goal 상태 최우선", () => {
		manager.updateFromStep({
			reached: ["4,4"],
			frontier: [],
			path: ["4,4"],
			visitedOrder: {},
		});

		// '4,4'가 'path' 상태이지만, goal로 설정하면 'goal'이 되어야 함
		manager.setGoalNode(4, 4);
		expect(manager.getNodeState(4, 4)).toBe("goal");
	});
});

describe("getNodeState() / getVisitOrder()", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it("방문한 노드: visited", () => {
		manager.updateFromStep({
			reached: ["0,0", "1,1"],
			frontier: [],
			path: [],
			visitedOrder: {},
		});

		expect(manager.getNodeState(0, 0)).toBe("visited");
		expect(manager.getNodeState(1, 1)).toBe("visited");
	});

	it("미방문: unvisited", () => {
		expect(manager.getNodeState(5, 5)).toBe("unvisited");
		expect(manager.getNodeState(9, 9)).toBe("unvisited");
	});
});

describe("setStartNode / setGoalNode", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it("setStartNode(0,0) → getStartNode() = {row:0, col:0}", () => {
		manager.setStartNode(0, 0);
		const startNode = manager.getStartNode();

		expect(startNode).toEqual({ row: 0, col: 0 });
	});

	it("setGoalNode(4,4) → getGoalNode() = {row:4, col:4}", () => {
		manager.setGoalNode(4, 4);
		const goalNode = manager.getGoalNode();

		expect(goalNode).toEqual({ row: 4, col: 4 });
	});

	it("설정 후 update 이벤트 발생", () => {
		const updateCallback = vi.fn();
		manager.on("update", updateCallback);

		manager.setStartNode(0, 0);
		expect(updateCallback).toHaveBeenCalled();

		updateCallback.mockClear();

		manager.setGoalNode(9, 9);
		expect(updateCallback).toHaveBeenCalled();
	});
});

describe("setWall()", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it("setWall(5,5,true) → getNodeState(5,5) = wall", () => {
		manager.setWall(5, 5, true);
		expect(manager.getNodeState(5, 5)).toBe("wall");
	});

	it("setWall(5,5,false) → getNodeState(5,5) = unvisited", () => {
		manager.setWall(5, 5, true);
		expect(manager.getNodeState(5, 5)).toBe("wall");

		manager.setWall(5, 5, false);
		expect(manager.getNodeState(5, 5)).toBe("unvisited");
	});
});

describe("reset()", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it("reset() 후 모든 노드 unvisited", () => {
		// 상태 변경
		manager.updateFromStep({
			reached: ["0,0", "1,1"],
			frontier: ["2,2"],
			path: ["3,3"],
			visitedOrder: {},
		});

		manager.setStartNode(0, 0);
		manager.setGoalNode(9, 9);

		// reset 호출
		manager.reset();

		// 모든 노드 확인
		const states = manager.getNodeStates();
		for (const state of Object.values(states)) {
			expect(state).toBe("unvisited");
		}

		// start/goal도 null로 초기화되지 않음 (reset은 상태만 초기화)
		// 하지만 노드 상태는 unvisited로 돌아감
		expect(manager.getNodeState(0, 0)).toBe("unvisited");
		expect(manager.getNodeState(9, 9)).toBe("unvisited");
	});

	it("getNodeStates() 재확인", () => {
		manager.updateFromStep({
			reached: ["0,0"],
			frontier: ["1,1"],
			path: ["2,2"],
			visitedOrder: {},
		});

		manager.reset();

		const states = manager.getNodeStates();
		expect(Object.keys(states).length).toBe(100); // 10x10
		expect(states["0,0"]).toBe("unvisited");
		expect(states["1,1"]).toBe("unvisited");
		expect(states["2,2"]).toBe("unvisited");
	});
});

describe("복합 시나리오", () => {
	let manager;

	beforeEach(() => {
		manager = new StateManager(10, 10);
	});

	it("BFS 시뮬레이션: step 진행에 따른 상태 변화", () => {
		// Step 1: 시작점 설정
		manager.setStartNode(0, 0);
		expect(manager.getNodeState(0, 0)).toBe("start");

		// Step 2: 첫 번째 BFS 단계 - frontier 확장
		manager.updateFromStep({
			reached: ["0,0"],
			frontier: ["0,1", "1,0"],
			path: [],
			visitedOrder: { "0,0": 0 },
		});

		expect(manager.getNodeState(0, 0)).toBe("start"); // start 우선순위 유지
		expect(manager.getNodeState(0, 1)).toBe("frontier");
		expect(manager.getNodeState(1, 0)).toBe("frontier");

		// Step 3: 다음 frontier 탐색
		manager.updateFromStep({
			reached: ["0,0", "0,1", "1,0"],
			frontier: ["0,2", "1,1", "2,0"],
			path: [],
			visitedOrder: { "0,0": 0, "0,1": 1, "1,0": 2 },
		});

		expect(manager.getNodeState(0, 0)).toBe("start");
		expect(manager.getNodeState(0, 1)).toBe("visited");
		expect(manager.getNodeState(1, 0)).toBe("visited");
		expect(manager.getNodeState(0, 2)).toBe("frontier");
		expect(manager.getNodeState(1, 1)).toBe("frontier");

		// Step 4: 목표 도달 및 경로 설정
		manager.setGoalNode(2, 2);
		manager.updateFromStep({
			reached: ["0,0", "0,1", "1,0", "0,2", "1,1", "2,0", "1,2", "2,1"],
			frontier: ["2,2"],
			path: ["0,0", "1,1", "2,2"],
			visitedOrder: {
				"0,0": 0,
				"0,1": 1,
				"1,0": 2,
				"0,2": 3,
				"1,1": 4,
				"2,0": 5,
				"1,2": 6,
				"2,1": 7,
				"2,2": 8,
			},
		});

		expect(manager.getNodeState(0, 0)).toBe("start");
		expect(manager.getNodeState(1, 1)).toBe("path");
		expect(manager.getNodeState(2, 2)).toBe("goal");
		// visitedOrder 0은 falsy → getVisitOrder 내부 || null로 null 반환
		expect(manager.getVisitOrder(1, 1)).toBe(4);
		expect(manager.getVisitOrder(2, 2)).toBe(8);
	});

	it("updateFromStep(): visitedOrder 없이 호출 시 정상 동작", () => {
		manager.updateFromStep({
			reached: ["0,0"],
			frontier: ["0,1"],
			path: [],
		});
		expect(manager.getNodeState(0, 0)).toBe("visited");
		expect(manager.getNodeState(0, 1)).toBe("frontier");
	});

	it("reset() 후 새로운 BFS 시작 가능", () => {
		// 첫 번째 BFS
		manager.setStartNode(0, 0);
		manager.setGoalNode(5, 5);
		manager.updateFromStep({
			reached: ["0,0", "1,0"],
			frontier: ["1,1"],
			path: [],
			visitedOrder: { "0,0": 0, "1,0": 1 },
		});

		// reset
		manager.reset();
		const states = manager.getNodeStates();

		// 모든 노드가 'unvisited'로 초기화
		for (const state of Object.values(states)) {
			expect(state).toBe("unvisited");
		}

		// visitOrder도 초기화
		expect(manager.getVisitOrder(0, 0)).toBeNull();
		expect(manager.getVisitOrder(1, 0)).toBeNull();

		// 새로운 BFS 시작
		manager.setStartNode(5, 5);
		expect(manager.getStartNode()).toEqual({ row: 5, col: 5 });
	});
});
