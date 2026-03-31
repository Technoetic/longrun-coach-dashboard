import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const AnimationController = require("../AnimationController.js");

/**
 * Mock 객체 생성 헬퍼 함수
 * @param {number} totalSteps - 총 단계 수 (기본값: 5)
 * @returns {Object} - {bfsEngine, graphRenderer, stateManager}
 */
function createMocks(totalSteps = 5) {
	const bfsEngine = {
		getTotalSteps: vi.fn(() => totalSteps),
		getStepState: vi.fn((_idx) => ({
			reached: [],
			frontier: [],
			path: [],
			visitedOrder: {},
		})),
	};
	const graphRenderer = {
		render: vi.fn(),
	};
	const stateManager = {
		updateFromStep: vi.fn(),
	};
	return { bfsEngine, graphRenderer, stateManager };
}

describe("AnimationController", () => {
	let controller;
	let mocks;

	beforeEach(() => {
		mocks = createMocks(5);
		controller = new AnimationController(
			mocks.bfsEngine,
			mocks.graphRenderer,
			mocks.stateManager,
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe("constructor", () => {
		it("should initialize with correct default values", () => {
			expect(controller.engine).toBe(mocks.bfsEngine);
			expect(controller.renderer).toBe(mocks.graphRenderer);
			expect(controller.state).toBe(mocks.stateManager);
			expect(controller.isPlaying).toBe(false);
			expect(controller.speed).toBe(1.0);
			expect(controller.currentStep).toBe(0);
			expect(controller.animationId).toBe(null);
		});
	});

	describe("play()", () => {
		it("should set isPlaying to true when initially false", () => {
			expect(controller.isPlaying).toBe(false);
			controller.play();
			expect(controller.isPlaying).toBe(true);
		});

		it("should not call _animateStep multiple times if play() called twice (idempotent)", () => {
			vi.useFakeTimers();
			const animateSpyFn = vi.spyOn(controller, "_animateStep");

			controller.play();
			const firstCallCount = animateSpyFn.mock.calls.length;

			controller.play();
			const secondCallCount = animateSpyFn.mock.calls.length;

			expect(secondCallCount).toBe(firstCallCount);
			vi.useRealTimers();
		});

		it("should trigger _animateStep which calls stepForward", () => {
			vi.useFakeTimers();
			const stepForwardSpy = vi.spyOn(controller, "stepForward");

			controller.play();
			vi.advanceTimersByTime(1001);

			expect(stepForwardSpy).toHaveBeenCalled();
			vi.useRealTimers();
		});
	});

	describe("pause()", () => {
		it("should set isPlaying to false", () => {
			controller.isPlaying = true;
			controller.pause();
			expect(controller.isPlaying).toBe(false);
		});

		it("should call clearTimeout if animationId exists", () => {
			const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
			controller.animationId = 123;

			controller.pause();

			expect(clearTimeoutSpy).toHaveBeenCalledWith(123);
			clearTimeoutSpy.mockRestore();
		});

		it("should set animationId to null after clearing", () => {
			controller.animationId = 456;
			controller.pause();
			expect(controller.animationId).toBeNull();
		});
	});

	describe("stepForward()", () => {
		it("should increment currentStep by 1 when not at last step", () => {
			controller.currentStep = 0;
			controller.stepForward();
			expect(controller.currentStep).toBe(1);
		});

		it("should not increment currentStep when at last step", () => {
			controller.currentStep = 4;
			controller.stepForward();
			expect(controller.currentStep).toBe(4);
		});

		it("should call _renderStep with updated step index", () => {
			const renderSpy = vi.spyOn(controller, "_renderStep");
			controller.currentStep = 0;

			controller.stepForward();

			expect(renderSpy).toHaveBeenCalledWith(1);
			renderSpy.mockRestore();
		});
	});

	describe("stepBackward()", () => {
		it("should decrement currentStep by 1 when not at first step", () => {
			controller.currentStep = 2;
			controller.stepBackward();
			expect(controller.currentStep).toBe(1);
		});

		it("should not decrement currentStep when at first step", () => {
			controller.currentStep = 0;
			controller.stepBackward();
			expect(controller.currentStep).toBe(0);
		});

		it("should call _renderStep with updated step index", () => {
			const renderSpy = vi.spyOn(controller, "_renderStep");
			controller.currentStep = 3;

			controller.stepBackward();

			expect(renderSpy).toHaveBeenCalledWith(2);
			renderSpy.mockRestore();
		});
	});

	describe("jumpToStep()", () => {
		it("should jump to specified step within range", () => {
			controller.jumpToStep(2);
			expect(controller.currentStep).toBe(2);
		});

		it("should clamp negative index to 0", () => {
			controller.jumpToStep(-1);
			expect(controller.currentStep).toBe(0);
		});

		it("should clamp out-of-range index to totalSteps - 1", () => {
			controller.jumpToStep(10);
			expect(controller.currentStep).toBe(4);
		});

		it("should always call _renderStep", () => {
			const renderSpy = vi.spyOn(controller, "_renderStep");

			controller.jumpToStep(3);

			expect(renderSpy).toHaveBeenCalledWith(3);
			renderSpy.mockRestore();
		});
	});

	describe("setSpeed()", () => {
		it("should set speed to specified factor", () => {
			controller.setSpeed(1.5);
			expect(controller.speed).toBe(1.5);
		});

		it("should clamp speed to minimum 0.1", () => {
			controller.setSpeed(0.05);
			expect(controller.speed).toBe(0.1);
		});

		it("should clamp speed to maximum 10", () => {
			controller.setSpeed(15);
			expect(controller.speed).toBe(10);
		});

		it("should accept valid speed values without clamping", () => {
			controller.setSpeed(2.5);
			expect(controller.speed).toBe(2.5);

			controller.setSpeed(0.5);
			expect(controller.speed).toBe(0.5);

			controller.setSpeed(5);
			expect(controller.speed).toBe(5);
		});
	});

	describe("getProgress()", () => {
		it("should return 0% when at first step", () => {
			controller.currentStep = 0;
			const progress = controller.getProgress();
			expect(progress.percentage).toBe(0);
		});

		it("should return 50% when at middle step (2 of 5)", () => {
			controller.currentStep = 2;
			const progress = controller.getProgress();
			expect(progress.percentage).toBe(50);
		});

		it("should return 100% when at last step", () => {
			controller.currentStep = 4;
			const progress = controller.getProgress();
			expect(progress.percentage).toBe(100);
		});

		it("should return 0% when totalSteps is 1 (avoid NaN)", () => {
			mocks.bfsEngine.getTotalSteps.mockReturnValue(1);
			controller.currentStep = 0;
			const progress = controller.getProgress();
			expect(progress.percentage).toBe(0);
		});

		it("should return object with correct structure", () => {
			controller.currentStep = 1;
			const progress = controller.getProgress();

			expect(progress).toHaveProperty("current");
			expect(progress).toHaveProperty("total");
			expect(progress).toHaveProperty("percentage");
			expect(progress.current).toBe(1);
			expect(progress.total).toBe(5);
			expect(typeof progress.percentage).toBe("number");
		});

		it("should handle NaN by returning 0", () => {
			// When totalSteps is 0, (currentStep / (total - 1)) becomes division by -1
			mocks.bfsEngine.getTotalSteps.mockReturnValue(0);
			controller.currentStep = 0;
			const progress = controller.getProgress();

			expect(progress.percentage).toBe(0);
		});
	});

	describe("reset()", () => {
		it("should set currentStep to 0", () => {
			controller.currentStep = 3;
			controller.reset();
			expect(controller.currentStep).toBe(0);
		});

		it("should call _renderStep(0) after reset", () => {
			const renderSpy = vi.spyOn(controller, "_renderStep");
			controller.currentStep = 2;

			controller.reset();

			expect(renderSpy).toHaveBeenCalledWith(0);
			renderSpy.mockRestore();
		});

		it("should call pause() to stop animation", () => {
			const pauseSpy = vi.spyOn(controller, "pause");
			controller.isPlaying = true;

			controller.reset();

			expect(pauseSpy).toHaveBeenCalled();
			pauseSpy.mockRestore();
		});
	});

	describe("_animateStep() - animation loop", () => {
		it("should return early if isPlaying is false", () => {
			vi.useFakeTimers();
			controller.isPlaying = false;
			const stepForwardSpy = vi.spyOn(controller, "stepForward");

			controller._animateStep();

			expect(stepForwardSpy).not.toHaveBeenCalled();
			vi.useRealTimers();
		});

		it("should set isPlaying to false when reaching last step", () => {
			vi.useFakeTimers();
			controller.isPlaying = true;
			controller.currentStep = 4; // At last step for totalSteps=5

			controller._animateStep();

			expect(controller.isPlaying).toBe(false);
			vi.useRealTimers();
		});

		it("should call stepForward to advance animation", () => {
			vi.useFakeTimers();
			controller.isPlaying = true;
			controller.currentStep = 0;
			const stepForwardSpy = vi.spyOn(controller, "stepForward");

			controller._animateStep();

			expect(stepForwardSpy).toHaveBeenCalled();
			vi.useRealTimers();
		});

		it("should schedule next _animateStep with correct delay based on speed", () => {
			vi.useFakeTimers();
			controller.isPlaying = true;
			controller.speed = 2.0;
			const setTimeoutSpy = vi.spyOn(global, "setTimeout");

			controller._animateStep();

			// Delay should be 1000 / 2.0 = 500ms
			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
			vi.useRealTimers();
		});

		it("should use default 1000ms delay when speed is 1.0", () => {
			vi.useFakeTimers();
			controller.isPlaying = true;
			controller.speed = 1.0;
			const setTimeoutSpy = vi.spyOn(global, "setTimeout");

			controller._animateStep();

			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
			vi.useRealTimers();
		});
	});

	describe("_renderStep()", () => {
		it("should call engine.getStepState with correct index", () => {
			controller._renderStep(2);

			expect(mocks.bfsEngine.getStepState).toHaveBeenCalledWith(2);
		});

		it("should call state.updateFromStep with stepState", () => {
			const mockStepState = {
				reached: [1, 2],
				frontier: [3],
				path: [],
			};
			mocks.bfsEngine.getStepState.mockReturnValue(mockStepState);

			controller._renderStep(1);

			expect(mocks.stateManager.updateFromStep).toHaveBeenCalledWith(
				mockStepState,
			);
		});

		it("should render for step 0", () => {
			controller._renderStep(0);

			expect(mocks.bfsEngine.getStepState).toHaveBeenCalledWith(0);
			expect(mocks.stateManager.updateFromStep).toHaveBeenCalled();
		});
	});

	describe("integration - play and animation sequence", () => {
		it("should advance steps automatically when playing", () => {
			vi.useFakeTimers();
			controller.play();

			// play() → _animateStep() → 즉시 stepForward() 호출 → currentStep=1
			expect(controller.isPlaying).toBe(true);
			expect(controller.currentStep).toBe(1);

			// Advance time by 1001ms to trigger next callback
			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(2);

			// Advance time again
			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(3);

			vi.useRealTimers();
		});

		it("should stop animation at last step", () => {
			vi.useFakeTimers();
			controller.currentStep = 3;
			controller.play();

			// Advance to last step
			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(4);

			// Next advance should not happen since at last step
			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(4);
			expect(controller.isPlaying).toBe(false);

			vi.useRealTimers();
		});

		it("should respect speed setting during playback", () => {
			vi.useFakeTimers();
			controller.setSpeed(2.0);
			controller.play();

			// play() → _animateStep() → 즉시 stepForward() → currentStep=1
			// 그 후 500ms 지연 후 다음 stepForward
			expect(controller.currentStep).toBe(1);

			vi.advanceTimersByTime(501);
			expect(controller.currentStep).toBe(2);

			vi.advanceTimersByTime(501);
			expect(controller.currentStep).toBe(3);

			vi.useRealTimers();
		});

		it("should allow pause during playback", () => {
			vi.useFakeTimers();
			controller.play();

			// 즉시 stepForward → currentStep=1, 그 후 1001ms 후 currentStep=2
			expect(controller.currentStep).toBe(1);

			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(2);

			controller.pause();
			const pausedStep = controller.currentStep;

			vi.advanceTimersByTime(5000);
			expect(controller.currentStep).toBe(pausedStep);

			vi.useRealTimers();
		});

		it("should allow resuming after pause", () => {
			vi.useFakeTimers();
			controller.play();

			// 즉시 stepForward → currentStep=1
			expect(controller.currentStep).toBe(1);

			controller.pause();
			controller.play();

			// 재시작 후 즉시 stepForward → currentStep=2
			expect(controller.currentStep).toBe(2);

			vi.useRealTimers();
		});
	});

	describe("edge cases", () => {
		it("should handle manual step advance while playing", () => {
			vi.useFakeTimers();
			controller.play();

			// 즉시 stepForward → currentStep=1
			expect(controller.currentStep).toBe(1);

			// Manually jump
			controller.jumpToStep(3);
			expect(controller.currentStep).toBe(3);

			// Should resume from jumped position (1001ms 후 stepForward → 4)
			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(4);

			vi.useRealTimers();
		});

		it("should handle rapid speed changes", () => {
			vi.useFakeTimers();
			controller.play();

			// 즉시 stepForward → currentStep=1
			// 이미 첫 delay는 play() 시점의 speed로 결정됨 (1000ms)
			expect(controller.currentStep).toBe(1);

			// 1001ms 후 다음 stepForward → currentStep=2
			vi.advanceTimersByTime(1001);
			expect(controller.currentStep).toBe(2);

			controller.setSpeed(4.0); // 250ms delay
			vi.advanceTimersByTime(251);
			// setSpeed는 다음 _animateStep에서 적용됨
			expect(controller.currentStep).toBe(2); // 아직 이전 delay 기다리는 중

			vi.useRealTimers();
		});

		it("should handle totalSteps changing", () => {
			mocks.bfsEngine.getTotalSteps.mockReturnValue(3);
			controller.jumpToStep(5); // Try to jump beyond new total

			expect(controller.currentStep).toBe(2); // Should clamp to 3-1
		});

		it("should maintain state after multiple resets", () => {
			controller.currentStep = 3;
			controller.reset();
			expect(controller.currentStep).toBe(0);

			controller.currentStep = 2;
			controller.reset();
			expect(controller.currentStep).toBe(0);
		});
	});
});
