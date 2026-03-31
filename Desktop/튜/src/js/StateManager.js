/**
 * ============================================================================
 * StateManager.js - BFS Tutorial Web 상태 관리 클래스
 * ============================================================================
 *
 * 역할:
 * - 노드 상태 추적 (unvisited, frontier, visited, path, start, goal, wall)
 * - 방문 순서 기록
 * - EventEmitter 패턴으로 상태 변화 통지
 */

/**
 * 간단한 EventEmitter 구현
 * 이벤트 리스너 등록, 제거, 발생을 담당
 */
class EventEmitter {
	constructor() {
		this.listeners = {}; // {eventName: [callback1, callback2, ...]}
	}

	/**
	 * 이벤트 리스너 등록
	 * @param {string} eventName - 이벤트 이름
	 * @param {Function} callback - 콜백 함수
	 */
	on(eventName, callback) {
		if (!this.listeners[eventName]) {
			this.listeners[eventName] = [];
		}
		this.listeners[eventName].push(callback);
	}

	/**
	 * 이벤트 발생
	 * @param {string} eventName - 이벤트 이름
	 * @param {*} data - 전달할 데이터
	 */
	emit(eventName, data) {
		if (!this.listeners[eventName]) return;
		for (const callback of this.listeners[eventName]) {
			callback(data);
		}
	}

	/**
	 * 이벤트 리스너 제거
	 * @param {string} eventName - 이벤트 이름
	 * @param {Function} callback - 제거할 콜백 함수
	 */
	off(eventName, callback) {
		if (!this.listeners[eventName]) return;
		this.listeners[eventName] = this.listeners[eventName].filter(
			(cb) => cb !== callback,
		);
	}
}

/**
 * StateManager 클래스
 * BFS 알고리즘 실행 중 노드 상태를 관리하고 변화를 통지
 */
class StateManager extends EventEmitter {
	constructor(rows = 20, cols = 20) {
		super();

		// 그리드 크기
		this.rows = rows;
		this.cols = cols;

		// 노드 상태: Map<string, string>
		// 키: "row,col" 형식
		// 값: 'unvisited' | 'frontier' | 'visited' | 'path' | 'start' | 'goal' | 'wall'
		this._nodeStates = new Map();

		// 방문 순서: Map<string, number>
		// 키: "row,col" 형식
		// 값: 방문 순번 (0부터 시작)
		this._visitOrder = new Map();

		// 시작점과 목표점 좌표
		this._startNode = null; // {row, col} 또는 null
		this._goalNode = null; // {row, col} 또는 null

		// 추적 변수
		this._visitedNodes = new Set();
		this._frontierNodes = new Set();
		this._pathNodes = [];
		this._wallNodes = new Set(); // 벽 노드 별도 관리

		// 초기화: 모든 노드를 'unvisited'로 설정
		this.reset();
	}

	/**
	 * AnimationController가 호출
	 * BFS 단계 상태를 받아서 노드 상태 업데이트
	 *
	 * @param {Object} stepState - {reached, frontier, path, visitedOrder}
	 */
	updateFromStep(stepState) {
		// 기존 상태 보존 (변화 감지용)
		const oldStates = new Map(this._nodeStates);

		// 새로운 상태 적용
		this._visitedNodes = new Set(stepState.reached || []);
		this._frontierNodes = new Set(stepState.frontier || []);
		this._pathNodes = stepState.path || [];

		// visitedOrder 업데이트 (있으면)
		if (stepState.visitedOrder) {
			this._visitOrder.clear();
			for (const [nodeId, order] of Object.entries(stepState.visitedOrder)) {
				this._visitOrder.set(nodeId, order);
			}
		}

		// 노드 상태 재계산 (우선순위 적용)
		this._refreshNodeStates();

		// 변화한 노드별 상세 이벤트 발생
		for (const [nodeId, newState] of this._nodeStates.entries()) {
			const oldState = oldStates.get(nodeId) || "unvisited";
			if (oldState !== newState) {
				this.emit("stateChange", {
					nodeId,
					oldState,
					newState,
				});
			}
		}

		// 전체 업데이트 이벤트 발생 (GraphRenderer가 구독)
		this.emit("update", {
			nodeStates: this.getNodeStates(),
			stepState,
		});
	}

	/**
	 * 그리드의 모든 노드를 'unvisited'로 초기화
	 * @private
	 */
	_initializeAllNodes() {
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				const nodeId = `${r}-${c}`;
				this._nodeStates.set(nodeId, "unvisited");
			}
		}
	}

	/**
	 * 노드 상태를 우선순위에 따라 재계산
	 * 우선순위: path > frontier > visited > unvisited
	 * 단, start/goal은 항상 최우선으로 덮어쓰기
	 */
	_refreshNodeStates() {
		this._nodeStates.clear();

		// [1] 모든 노드를 'unvisited'로 초기화
		this._initializeAllNodes();

		// [2] visited 적용
		for (const nodeId of this._visitedNodes) {
			this._nodeStates.set(nodeId, "visited");
		}

		// [3] frontier 적용 (visited 위에서 덮어쓰기)
		for (const nodeId of this._frontierNodes) {
			this._nodeStates.set(nodeId, "frontier");
		}

		// [4] wall 적용 (path보다 낮은 우선순위, visited/frontier 위에서 덮어쓰기)
		for (const nodeId of this._wallNodes) {
			this._nodeStates.set(nodeId, "wall");
		}

		// [5] path 적용 (벽보다 높은 우선순위)
		for (const nodeId of this._pathNodes) {
			this._nodeStates.set(nodeId, "path");
		}

		// [6] start/goal 적용 (모든 것을 덮어쓰기)
		if (this._startNode) {
			const startId = `${this._startNode.row}-${this._startNode.col}`;
			this._nodeStates.set(startId, "start");
		}

		if (this._goalNode) {
			const goalId = `${this._goalNode.row}-${this._goalNode.col}`;
			this._nodeStates.set(goalId, "goal");
		}
	}

	/**
	 * 특정 노드의 현재 상태 반환
	 * @param {number} row
	 * @param {number} col
	 * @returns {string} - 'unvisited' | 'frontier' | 'visited' | 'path' | 'start' | 'goal' | 'wall'
	 */
	getNodeState(row, col) {
		const nodeId = `${row}-${col}`;
		return this._nodeStates.get(nodeId) || "unvisited";
	}

	/**
	 * 특정 노드의 방문 순서 반환
	 * @param {number} row
	 * @param {number} col
	 * @returns {number|null} - 방문 순번 또는 null
	 */
	getVisitOrder(row, col) {
		const nodeId = `${row}-${col}`;
		return this._visitOrder.get(nodeId) || null;
	}

	/**
	 * 시작 노드 설정
	 * @param {number} row
	 * @param {number} col
	 */
	setStartNode(row, col) {
		this._startNode = { row, col };
		this._refreshNodeStates();
		this.emit("update", {
			nodeStates: this.getNodeStates(),
		});
	}

	/**
	 * 목표 노드 설정
	 * @param {number} row
	 * @param {number} col
	 */
	setGoalNode(row, col) {
		this._goalNode = { row, col };
		this._refreshNodeStates();
		this.emit("update", {
			nodeStates: this.getNodeStates(),
		});
	}

	/**
	 * 벽 토글
	 * 현재 구현에서는 벽 상태를 별도 관리하지 않으므로
	 * 필요시 _nodeStates에 'wall' 상태로 설정
	 *
	 * @param {number} row
	 * @param {number} col
	 * @param {boolean} isWall - true면 벽, false면 벽 제거
	 */
	setWall(row, col, isWall) {
		const nodeId = `${row}-${col}`;
		if (isWall) {
			this._wallNodes.add(nodeId);
		} else {
			this._wallNodes.delete(nodeId);
		}
		this._refreshNodeStates();
		this.emit("update", {
			nodeStates: this.getNodeStates(),
		});
	}

	/**
	 * 전체 상태 초기화
	 */
	reset() {
		this._nodeStates.clear();
		this._visitOrder.clear();
		this._visitedNodes.clear();
		this._frontierNodes.clear();
		this._pathNodes = [];
		this._wallNodes = new Set();

		// 모든 노드를 'unvisited'로 설정
		this._initializeAllNodes();

		this.emit("update", {
			nodeStates: this.getNodeStates(),
		});
	}

	/**
	 * 모든 노드 상태 객체 반환
	 * GraphRenderer가 한 번에 전체 상태를 받기 위함
	 *
	 * @returns {Object} - {nodeId: state, ...}
	 */
	getNodeStates() {
		const states = {};
		for (const [nodeId, state] of this._nodeStates.entries()) {
			states[nodeId] = state;
		}
		return states;
	}

	/**
	 * 시작 노드 반환
	 * @returns {Object|null} - {row, col} 또는 null
	 */
	getStartNode() {
		return this._startNode;
	}

	/**
	 * 목표 노드 반환
	 * @returns {Object|null} - {row, col} 또는 null
	 */
	getGoalNode() {
		return this._goalNode;
	}
}

// 브라우저 전역 등록 (script 태그 방식)
if (typeof window !== "undefined") window.StateManager = StateManager;

// ES6 모듈 export (필요시)
if (typeof module !== "undefined" && module.exports) {
	module.exports = StateManager;
}
