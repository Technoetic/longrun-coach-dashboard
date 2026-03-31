/**
 * ============================================================================
 * InteractionHandler.js - BFS Tutorial Web 사용자 상호작용 처리
 * ============================================================================
 *
 * 역할:
 * - 마우스/터치 이벤트 감지
 * - 드래그로 시작/목표 이동
 * - 클릭/드래그로 벽 토글
 * - Throttle 50ms 적용
 * - 터치 이벤트 지원 (touchstart, touchmove, touchend)
 * - 드래그/스크롤 충돌 방지
 */

class InteractionHandler {
	constructor(canvas, stateManager, bfsEngine, animationController) {
		this.canvas = canvas;
		this.stateManager = stateManager;
		this.bfsEngine = bfsEngine;
		this.animationController = animationController;

		// 드래그 상태 추적
		this._draggingNode = null; // 'start', 'goal', null
		this._isDraggingWall = false;

		// Throttle 상태
		this._lastBFSTime = 0;
		this._throttleDelay = 50; // 50ms

		// 그리드 셀 크기 (렌더러와 동기화)
		this._cellSize = 25;

		// 이벤트 핸들러 바인딩 (나중에 제거할 때 필요)
		this._boundMouseDown = this._onMouseDown.bind(this);
		this._boundMouseMove = this._onMouseMove.bind(this);
		this._boundMouseUp = this._onMouseUp.bind(this);
		this._boundTouchStart = this._onTouchStart.bind(this);
		this._boundTouchMove = this._onTouchMove.bind(this);
		this._boundTouchEnd = this._onTouchEnd.bind(this);

		// 이벤트 리스너 등록
		this._attachEventListeners();
	}

	/**
	 * 이벤트 리스너 등록
	 */
	_attachEventListeners() {
		// 마우스 이벤트
		this.canvas.addEventListener("mousedown", this._boundMouseDown);
		document.addEventListener("mousemove", this._boundMouseMove);
		document.addEventListener("mouseup", this._boundMouseUp);

		// 터치 이벤트
		this.canvas.addEventListener("touchstart", this._boundTouchStart);
		document.addEventListener("touchmove", this._boundTouchMove, {
			passive: false,
		});
		document.addEventListener("touchend", this._boundTouchEnd);
	}

	/**
	 * 마우스 다운 이벤트
	 * @param {MouseEvent} e
	 */
	_onMouseDown(e) {
		if (e.button !== 0) return; // 좌클릭만 처리

		const { row, col } = this._getGridCoord(e);
		if (row === null || col === null) return;

		// 시작/목표 노드 드래그 확인
		const startNode = this.stateManager.getStartNode();
		const goalNode = this.stateManager.getGoalNode();

		if (startNode && startNode.row === row && startNode.col === col) {
			this._draggingNode = "start";
			e.preventDefault();
			return;
		}

		if (goalNode && goalNode.row === row && goalNode.col === col) {
			this._draggingNode = "goal";
			e.preventDefault();
			return;
		}

		// 벽 토글 모드
		this._isDraggingWall = true;
		const state = this.stateManager.getNodeState(row, col);
		const newIsWall = state !== "wall";
		this.stateManager.setWall(row, col, newIsWall);
	}

	/**
	 * 마우스 무브 이벤트
	 * @param {MouseEvent} e
	 */
	_onMouseMove(e) {
		if (!this._draggingNode && !this._isDraggingWall) return;

		const { row, col } = this._getGridCoord(e);
		if (row === null || col === null) return;

		// 드래그로 시작/목표 이동
		if (this._draggingNode) {
			const now = Date.now();
			if (now - this._lastBFSTime < this._throttleDelay) {
				return; // Throttle: 50ms 미만이면 무시
			}

			if (this._draggingNode === "start") {
				this.stateManager.setStartNode(row, col);
			} else if (this._draggingNode === "goal") {
				this.stateManager.setGoalNode(row, col);
			}

			// BFS 재계산
			this._recalculateBFS();
			this._lastBFSTime = now;
		}

		// 벽 토글 드래그
		if (this._isDraggingWall) {
			const now = Date.now();
			if (now - this._lastBFSTime < this._throttleDelay) {
				return;
			}

			const state = this.stateManager.getNodeState(row, col);
			// 벽 추가 모드로 일관성 유지 (최초 클릭한 상태 기준)
			const isWall = state !== "wall";
			if (isWall) {
				this.stateManager.setWall(row, col, true);
			}

			this._lastBFSTime = now;
		}
	}

	/**
	 * 마우스 업 이벤트
	 */
	_onMouseUp(_e) {
		if (this._draggingNode) {
			// 드래그 완료
			this._draggingNode = null;
		}

		if (this._isDraggingWall) {
			// 벽 토글 완료
			this._isDraggingWall = false;
			// 최종 BFS 계산
			this._recalculateBFS();
		}
	}

	/**
	 * 터치 시작 이벤트
	 * @param {TouchEvent} e
	 */
	_onTouchStart(e) {
		if (e.touches.length !== 1) return;

		const touch = e.touches[0];
		const { row, col } = this._getGridCoordFromTouch(touch);
		if (row === null || col === null) return;

		// 시작/목표 노드 드래그 확인
		const startNode = this.stateManager.getStartNode();
		const goalNode = this.stateManager.getGoalNode();

		if (startNode && startNode.row === row && startNode.col === col) {
			this._draggingNode = "start";
			e.preventDefault();
			return;
		}

		if (goalNode && goalNode.row === row && goalNode.col === col) {
			this._draggingNode = "goal";
			e.preventDefault();
			return;
		}

		// 벽 토글 모드
		this._isDraggingWall = true;
		const state = this.stateManager.getNodeState(row, col);
		const newIsWall = state !== "wall";
		this.stateManager.setWall(row, col, newIsWall);
	}

	/**
	 * 터치 무브 이벤트
	 * @param {TouchEvent} e
	 */
	_onTouchMove(e) {
		if (e.touches.length !== 1) return;
		if (!this._draggingNode && !this._isDraggingWall) return;

		e.preventDefault(); // 스크롤 방지

		const touch = e.touches[0];
		const { row, col } = this._getGridCoordFromTouch(touch);
		if (row === null || col === null) return;

		// 드래그로 시작/목표 이동
		if (this._draggingNode) {
			const now = Date.now();
			if (now - this._lastBFSTime < this._throttleDelay) {
				return;
			}

			if (this._draggingNode === "start") {
				this.stateManager.setStartNode(row, col);
			} else if (this._draggingNode === "goal") {
				this.stateManager.setGoalNode(row, col);
			}

			this._recalculateBFS();
			this._lastBFSTime = now;
		}

		// 벽 토글 드래그
		if (this._isDraggingWall) {
			const now = Date.now();
			if (now - this._lastBFSTime < this._throttleDelay) {
				return;
			}

			const state = this.stateManager.getNodeState(row, col);
			const isWall = state !== "wall";
			if (isWall) {
				this.stateManager.setWall(row, col, true);
			}

			this._lastBFSTime = now;
		}
	}

	/**
	 * 터치 종료 이벤트
	 */
	_onTouchEnd(_e) {
		if (this._draggingNode) {
			this._draggingNode = null;
		}

		if (this._isDraggingWall) {
			this._isDraggingWall = false;
			this._recalculateBFS();
		}
	}

	/**
	 * 마우스/터치 이벤트에서 그리드 좌표 추출
	 * @param {MouseEvent|Touch} e
	 * @returns {{row: number|null, col: number|null}}
	 */
	_getGridCoord(e) {
		// 캔버스 요소 검증
		if (!this.canvas || typeof this.canvas.getBoundingClientRect !== "function") {
			console.error("[InteractionHandler._getGridCoord] 캔버스가 유효하지 않음");
			return { row: null, col: null };
		}

		// 이벤트 객체 검증
		if (!e || e.clientX === undefined || e.clientY === undefined) {
			console.error("[InteractionHandler._getGridCoord] 이벤트 객체가 유효하지 않음");
			return { row: null, col: null };
		}

		const rect = this.canvas.getBoundingClientRect();
		if (!rect) {
			console.error("[InteractionHandler._getGridCoord] getBoundingClientRect 실패");
			return { row: null, col: null };
		}

		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		return this._pixelToGridCoord(x, y);
	}

	/**
	 * 터치 이벤트에서 그리드 좌표 추출
	 * @param {Touch} touch
	 * @returns {{row: number|null, col: number|null}}
	 */
	_getGridCoordFromTouch(touch) {
		// 터치 객체 검증
		if (!touch || touch.clientX === undefined || touch.clientY === undefined) {
			console.error("[InteractionHandler._getGridCoordFromTouch] 터치 객체가 유효하지 않음");
			return { row: null, col: null };
		}

		// 캔버스 요소 검증
		if (!this.canvas || typeof this.canvas.getBoundingClientRect !== "function") {
			console.error("[InteractionHandler._getGridCoordFromTouch] 캔버스가 유효하지 않음");
			return { row: null, col: null };
		}

		const rect = this.canvas.getBoundingClientRect();
		if (!rect) {
			console.error("[InteractionHandler._getGridCoordFromTouch] getBoundingClientRect 실패");
			return { row: null, col: null };
		}

		const x = touch.clientX - rect.left;
		const y = touch.clientY - rect.top;

		return this._pixelToGridCoord(x, y);
	}

	/**
	 * 픽셀 좌표를 그리드 좌표로 변환
	 * @param {number} x - 픽셀 X 좌표
	 * @param {number} y - 픽셀 Y 좌표
	 * @returns {{row: number|null, col: number|null}}
	 */
	_pixelToGridCoord(x, y) {
		const col = Math.floor(x / this._cellSize);
		const row = Math.floor(y / this._cellSize);

		// 범위 확인 (20x20 그리드 기준)
		if (row < 0 || row >= 20 || col < 0 || col >= 20) {
			return { row: null, col: null };
		}

		return { row, col };
	}

	/**
	 * BFS 재계산
	 * 현재 시작점과 목표점을 기반으로 BFS 실행
	 */
	_recalculateBFS() {
		const startNode = this.stateManager?.getStartNode?.();
		const goalNode = this.stateManager?.getGoalNode?.();

		if (!startNode || !goalNode) {
			console.warn("[InteractionHandler._recalculateBFS] 시작 또는 목표 노드가 없음");
			return;
		}

		// 노드 객체 검증
		if (startNode.row === undefined || startNode.col === undefined ||
			goalNode.row === undefined || goalNode.col === undefined) {
			console.error("[InteractionHandler._recalculateBFS] 노드 좌표가 유효하지 않음", {
				startNode,
				goalNode,
			});
			return;
		}

		// BFS 엔진이 있으면 재계산
		if (this.bfsEngine?.run && typeof this.bfsEngine.run === "function") {
			const startId = `${startNode.row}-${startNode.col}`;
			const goalId = `${goalNode.row}-${goalNode.col}`;

			// BFS 실행 (구현 방식은 BFSEngine에 따름)
			try {
				this.bfsEngine.run(startId, goalId);
			} catch (error) {
				console.error("[InteractionHandler._recalculateBFS] BFS 실행 중 오류 발생", error);
				return;
			}

			// AnimationController 초기화
			if (this.animationController && typeof this.animationController.jumpToStep === "function") {
				this.animationController.jumpToStep(0);
			}
		} else {
			console.warn("[InteractionHandler._recalculateBFS] BFSEngine이 유효하지 않음");
		}
	}

	/**
	 * 이벤트 리스너 제거 (소멸자 역할)
	 */
	destroy() {
		this.canvas.removeEventListener("mousedown", this._boundMouseDown);
		document.removeEventListener("mousemove", this._boundMouseMove);
		document.removeEventListener("mouseup", this._boundMouseUp);

		this.canvas.removeEventListener("touchstart", this._boundTouchStart);
		document.removeEventListener("touchmove", this._boundTouchMove);
		document.removeEventListener("touchend", this._boundTouchEnd);

		this._draggingNode = null;
		this._isDraggingWall = false;
	}
}

// 브라우저 전역 등록 (script 태그 방식)
if (typeof window !== "undefined")
	window.InteractionHandler = InteractionHandler;

// ES6 모듈 export (필요시)
if (typeof module !== "undefined" && module.exports) {
	module.exports = InteractionHandler;
}
