/**
 * AnimationController - 단계별 애니메이션 제어
 *
 * 책임: Cursor 기반으로 단계를 진행/후진하고 자동 재생 관리
 * BFS 알고리즘의 단계를 차례차례 시각화
 */

class AnimationController {
	/**
	 * @param {BFSEngine} bfsEngine - BFS 알고리즘 엔진
	 * @param {GraphRenderer} graphRenderer - Canvas 렌더러
	 * @param {StateManager} stateManager - 상태 관리자
	 */
	constructor(bfsEngine, graphRenderer, stateManager) {
		this.engine = bfsEngine;
		this.renderer = graphRenderer;
		this.state = stateManager;

		this.isPlaying = false; // 재생 중 여부
		this.speed = 1.0; // 배속 (1.0=정상, 0.5=반속, 2.0=2배속)
		this.currentStep = 0; // Cursor (현재 단계 인덱스)
		this.animationId = null; // setTimeout ID (폐기용)
		this.onEnd = null; // 재생 완료 콜백
	}

	/**
	 * 자동 재생 시작
	 *
	 * @returns {void}
	 */
	play() {
		if (this.isPlaying) return;

		this.isPlaying = true;
		this._animateStep();
	}

	/**
	 * 자동 재생 일시정지
	 *
	 * @returns {void}
	 */
	pause() {
		this.isPlaying = false;

		if (this.animationId !== null) {
			clearTimeout(this.animationId);
			this.animationId = null;
		}
	}

	/**
	 * 다음 단계로 이동
	 *
	 * @returns {void}
	 */
	stepForward() {
		const totalSteps = this.engine.getTotalSteps();

		if (this.currentStep < totalSteps - 1) {
			this.currentStep++;
			this._renderStep(this.currentStep);
		}
	}

	/**
	 * 이전 단계로 이동
	 *
	 * @returns {void}
	 */
	stepBackward() {
		if (this.currentStep > 0) {
			this.currentStep--;
			this._renderStep(this.currentStep);
		}
	}

	/**
	 * 특정 단계로 즉시 점프
	 *
	 * @param {number} stepIndex - 이동할 단계 인덱스
	 * @returns {void}
	 */
	jumpToStep(stepIndex) {
		const totalSteps = this.engine.getTotalSteps();

		// 범위 체크
		if (stepIndex < 0) {
			this.currentStep = 0;
		} else if (stepIndex >= totalSteps) {
			this.currentStep = totalSteps - 1;
		} else {
			this.currentStep = stepIndex;
		}

		this._renderStep(this.currentStep);
	}

	/**
	 * 배속 설정
	 *
	 * @param {number} speedFactor - 배속 (예: 0.5, 1.0, 2.0)
	 * @returns {void}
	 */
	setSpeed(speedFactor) {
		this.speed = Math.max(0.1, Math.min(10, speedFactor));
	}

	/**
	 * 현재 진행 상황 조회
	 *
	 * @returns {Object} - {current, total, percentage}
	 */
	getProgress() {
		const total = this.engine.getTotalSteps();
		const percentage = total > 0 ? (this.currentStep / (total - 1)) * 100 : 0;

		return {
			current: this.currentStep,
			total: total,
			percentage: Number.isNaN(percentage) ? 0 : percentage,
		};
	}

	/**
	 * 애니메이션 상태 초기화
	 *
	 * @returns {void}
	 */
	reset() {
		this.pause();
		this.currentStep = 0;
		this._renderStep(0);
	}

	/**
	 * 재귀 기반 애니메이션 루프
	 * setTimeout으로 지연 후 stepForward() 호출
	 *
	 * @returns {void}
	 * @private
	 */
	_animateStep() {
		if (!this.isPlaying) {
			return;
		}

		const totalSteps = this.engine.getTotalSteps();

		// 마지막 단계에 도달하면 재생 중지
		if (this.currentStep >= totalSteps - 1) {
			this.isPlaying = false;
			if (typeof this.onEnd === "function") this.onEnd();
			return;
		}

		// 다음 단계로 진행
		this.stepForward();

		// 배속에 따른 지연 시간 계산
		// speed = 1.0일 때 1000ms (1초)
		const delay = 1000 / this.speed;

		// 다음 애니메이션 예약
		this.animationId = setTimeout(() => {
			this._animateStep();
		}, delay);
	}

	/**
	 * 특정 단계 렌더링
	 *
	 * @param {number} stepIndex - 단계 인덱스
	 * @returns {void}
	 * @private
	 */
	_renderStep(stepIndex) {
		const stepState = this.engine.getStepState(stepIndex);

		// StateManager 상태 업데이트
		this.state.updateFromStep(stepState);

		// GraphRenderer에서는 StateManager의 update 이벤트를 구독하여
		// 자동으로 렌더링됨
		// 또는 명시적으로 호출할 수도 있음 (필요시):
		// this.renderer.render(this.engine.graph, stepState, this.state.getNodeStates());
	}
}

// 브라우저 전역 등록 (script 태그 방식)
if (typeof window !== "undefined")
	window.AnimationController = AnimationController;

// ES6 모듈 export (필요시)
if (typeof module !== "undefined" && module.exports) {
	module.exports = AnimationController;
}
