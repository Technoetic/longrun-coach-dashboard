// ============================================================================
// app.js - BFS Tutorial Web 초기화 스크립트
// ============================================================================

// defer 스크립트는 DOM 파싱 완료 후 실행되므로 DOMContentLoaded 대신 즉시 실행
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeApp);
} else {
	initializeApp();
}

// ============================================================================
// 1. 초기화 메인 함수
// ============================================================================

function initializeApp() {
	console.log("[app.js] DOMContentLoaded: 초기화 시작");

	try {
		// [1] DOM 요소 선택
		const bfsCanvas = document.getElementById("bfs-canvas");
		const heroCanvas = document.getElementById("hero-canvas");

		if (!bfsCanvas) {
			console.error("[app.js] bfs-canvas를 찾을 수 없습니다.");
			return;
		}

		// UI 컨트롤 요소
		const btnStepBack = document.getElementById("btn-step-back");
		const btnPlayPause = document.getElementById("btn-play-pause");
		const btnStepForward = document.getElementById("btn-step-forward");
		const btnReset = document.getElementById("btn-reset");
		const speedSlider = document.getElementById("speed-slider");
		const presetButtons = document.querySelectorAll(".btn-preset");

		// 표시 요소
		const currentStepDisplay = document.getElementById("current-step-display");
		const totalStepsDisplay = document.getElementById("total-steps-display");
		const progressFill = document.getElementById("progress-fill");
		const progressLabel = document.getElementById("progress-label");
		const stepIndicator = document.getElementById("step-indicator");
		const statusBadge = document.getElementById("status-badge");
		const speedDisplay = document.getElementById("speed-display");
		const stepExplanation = document.getElementById("step-explanation");
		const queueDisplay = document.getElementById("queue-display");

		// [2] 초기 그래프 생성 (격자 기반 20x20)
		const _createGridGraph =
			(window.GraphUtils?.createGridGraph) || createGridGraph;
		if (!_createGridGraph || typeof _createGridGraph !== "function") {
			console.error("[app.js] createGridGraph 함수가 없습니다.");
			return;
		}
		const currentGraph = _createGridGraph(20, 20);
		if (!currentGraph) {
			console.error("[app.js] 그래프 생성 실패");
			return;
		}
		console.log("[app.js] 초기 그래프 생성: 20x20 격자");

		// [3] 반응형 캔버스 크기 설정
		const _getCanvasSize =
			(window.GraphUtils?.getCanvasSize) || getCanvasSize;
		if (!_getCanvasSize || typeof _getCanvasSize !== "function") {
			console.error("[app.js] getCanvasSize 함수가 없습니다.");
			return;
		}
		const { width, height, cellSize } = _getCanvasSize(bfsCanvas, 20, 20);
		if (!width || !height) {
			console.error("[app.js] 캔버스 크기 계산 실패", { width, height });
			return;
		}
		bfsCanvas.width = width;
		bfsCanvas.height = height;

		if (heroCanvas) {
			const { width: heroWidth, height: heroHeight } = _getCanvasSize(heroCanvas);
			if (heroWidth && heroHeight) {
				heroCanvas.width = heroWidth;
				heroCanvas.height = heroHeight;
			}
		}

		// [4] 클래스 인스턴스 생성 (의존성 주입)
		if (!window.BFSEngine) {
			console.error("[app.js] BFSEngine 클래스가 없습니다.");
			return;
		}
		const bfsEngine = new window.BFSEngine(currentGraph);

		if (!window.GraphRenderer) {
			console.error("[app.js] GraphRenderer 클래스가 없습니다.");
			return;
		}
		const graphRenderer = new window.GraphRenderer(bfsCanvas, "grid");
		if (cellSize) graphRenderer.cellSize = cellSize;

		if (!window.StateManager) {
			console.error("[app.js] StateManager 클래스가 없습니다.");
			return;
		}
		const stateManager = new /** @type {any} */ (window).StateManager();

		if (!window.AnimationController) {
			console.error("[app.js] AnimationController 클래스가 없습니다.");
			return;
		}
		const animationController = new window.AnimationController(
			bfsEngine,
			graphRenderer,
			stateManager,
		);
		// 슬라이더 초기값 반영
		if (speedSlider) animationController.setSpeed(parseFloat(speedSlider.value));

		if (window.InteractionHandler) {
			void new window.InteractionHandler(
				bfsCanvas,
				stateManager,
				bfsEngine,
				animationController,
			);
		} else {
			console.warn("[app.js] InteractionHandler 클래스가 없습니다.");
		}

		if (window.QuizEngine) {
			void new window.QuizEngine();
		} else {
			console.warn("[app.js] QuizEngine 클래스가 없습니다.");
		}

		console.log("[app.js] 모든 클래스 인스턴스 생성 완료");

		// 재생 완료 콜백 등록
		animationController.onEnd = () => {
			updatePlayPauseButton(btnPlayPause, false);
			if (statusBadge) {
				const lastStep = bfsEngine.getStepState(animationController.currentStep);
				if (lastStep?.found) {
					statusBadge.textContent = "경로 발견";
					statusBadge.className = "status-badge status-badge--found";
				} else {
					statusBadge.textContent = "탐색 완료";
					statusBadge.className = "status-badge status-badge--done";
				}
			}
		};

		// [5] 첫 번째 BFS 실행 (초기 상태 계산)
		if (typeof bfsEngine.run !== "function") {
			console.error("[app.js] BFSEngine.run이 함수가 아닙니다.");
			return;
		}

		// 시작점/목표점을 StateManager에 등록
		if (currentGraph.start) {
			const [sr, sc] = currentGraph.start.split("-").map(Number);
			if (typeof stateManager.setStartNode === "function") stateManager.setStartNode(sr, sc);
		}
		if (currentGraph.goal) {
			const [gr, gc] = currentGraph.goal.split("-").map(Number);
			if (typeof stateManager.setGoalNode === "function") stateManager.setGoalNode(gr, gc);
		}

		bfsEngine.run(currentGraph.start, currentGraph.goal);
		console.log("[app.js] 초기 BFS 실행 완료");

		// [6] 초기 상태 렌더링
		const initialStepState = bfsEngine.getStepState(0);
		if (!initialStepState) {
			console.error("[app.js] 초기 상태 조회 실패");
			return;
		}
		if (typeof stateManager.updateFromStep === "function") {
			stateManager.updateFromStep(initialStepState);
		}
		if (typeof graphRenderer.render === "function") {
			graphRenderer.render(
				currentGraph,
				initialStepState,
				stateManager.getNodeStates?.(),
			);
		}

		// 초기 UI 업데이트
		const totalSteps = bfsEngine.getTotalSteps();
		if (totalStepsDisplay) totalStepsDisplay.textContent = totalSteps.toString();
		updateProgressDisplay(
			currentStepDisplay,
			totalStepsDisplay,
			progressFill,
			progressLabel,
			stepIndicator,
			animationController,
			totalSteps,
		);

		console.log("[app.js] 초기 상태 렌더링 및 UI 업데이트 완료");

		// [7] StateManager 이벤트 구독
		if (typeof stateManager.on === "function") {
			stateManager.on("update", (data) => {
				// nodeStates 변경 시 currentGraph 노드의 isWall 속성 동기화
				if (data?.nodeStates && currentGraph?.nodes) {
					for (const node of currentGraph.nodes) {
						const ns = data.nodeStates[node.id];
						node.isWall = (ns === "wall");
					}
					// BFSEngine nodeMap 캐시 무효화
					if (bfsEngine._nodeMap) bfsEngine._nodeMap = null;
				}
				if (typeof graphRenderer.render === "function") {
					const stepState = data?.stepState
						|| bfsEngine.getStepState(animationController.currentStep)
						|| { current: null, frontier: new Set(), reached: new Set(), cameFrom: new Map(), path: [], visitedOrder: {} };
					graphRenderer.render(currentGraph, stepState, data.nodeStates);
				}
				updateProgressDisplay(
					currentStepDisplay,
					totalStepsDisplay,
					progressFill,
					progressLabel,
					stepIndicator,
					animationController,
					totalSteps,
				);
				const _displayStep = data?.stepState || bfsEngine.getStepState(animationController.currentStep) || null;
				updateStepExplanation(stepExplanation, _displayStep, animationController);
				updateQueueDisplay(queueDisplay, _displayStep);
				updatePseudocodeHighlight(animationController.currentStep);
			});
		}

		// [8] UI 이벤트 바인딩
		bindUIEvents(
			btnStepBack,
			btnPlayPause,
			btnStepForward,
			btnReset,
			speedSlider,
			speedDisplay,
			presetButtons,
			animationController,
			bfsEngine,
			graphRenderer,
			stateManager,
			currentGraph,
			totalStepsDisplay,
			statusBadge,
		);

		// [9] Canvas 반응형 조정
		window.addEventListener("resize", () => {
			const { width: newWidth, height: newHeight, cellSize: newCellSize } = _getCanvasSize(bfsCanvas, 20, 20);
			if (newWidth && newHeight) {
				bfsCanvas.width = newWidth;
				bfsCanvas.height = newHeight;
				if (newCellSize) graphRenderer.cellSize = newCellSize;
				if (typeof graphRenderer.updateSize === "function") {
					graphRenderer.updateSize(newWidth, newHeight);
				}
				if (typeof graphRenderer.render === "function") {
					graphRenderer.render(
						currentGraph,
						bfsEngine.getStepState(animationController.currentStep),
						stateManager.getNodeStates?.(),
					);
				}
			}
		});

		// [10] 히어로 섹션 Force Graph 애니메이션 (load 이후 크기 재계산)
		if (heroCanvas) {
			const startHero = () => {
				// 캔버스 크기: 부모 → window → 고정 fallback 순서로 결정
				const heroSection =
					heroCanvas.closest(".hero-section") || heroCanvas.parentElement;
				let w =
					(heroSection?.offsetWidth) || window.innerWidth || 1280;
				let h =
					(heroSection?.offsetHeight) ||
					Math.min(window.innerHeight || 900, 900);
				// 최소 크기 보장
				if (w < 100) w = 1280;
				if (h < 100) h = 600;
				heroCanvas.width = w;
				heroCanvas.height = h;
				const _renderHero = window.renderHeroAnimation || renderHeroAnimation;
				if (typeof _renderHero === "function") {
					_renderHero(heroCanvas);
				} else {
					console.warn("[app.js] renderHeroAnimation 함수가 없습니다.");
				}
			};
			// layout이 완료된 뒤 실행되도록 두 번의 rAF 대기
			requestAnimationFrame(() => requestAnimationFrame(startHero));
		}

		console.log("[app.js] 초기화 완료");

		// [11] 정적 퀴즈 UI 이벤트 바인딩
		_initStaticQuiz();
	} catch (error) {
		console.error("[app.js] 초기화 중 예상치 못한 오류 발생:", error);
	}
}

function _initStaticQuiz() {
	const questions = document.querySelectorAll(".quiz-question");
	if (!questions.length) return;

	const answered = {};

	questions.forEach((questionEl) => {
		const questionId = questionEl.dataset.question;
		const correctAnswer = questionEl.dataset.answer;
		const feedbackEl = document.getElementById("q" + questionId + "-feedback");
		const options = questionEl.querySelectorAll(".quiz-option");

		options.forEach((optionBtn) => {
			optionBtn.addEventListener("click", () => {
				if (answered[questionId]) return;
				answered[questionId] = true;

				const selected = optionBtn.dataset.value;
				const isCorrect = selected === correctAnswer;

				options.forEach((btn) => {
					btn.setAttribute("aria-pressed", "false");
					btn.classList.remove("quiz-option--correct", "quiz-option--wrong");
				});

				optionBtn.setAttribute("aria-pressed", "true");
				optionBtn.classList.add(isCorrect ? "quiz-option--correct" : "quiz-option--wrong");

				if (feedbackEl) {
					feedbackEl.textContent = isCorrect ? "정답입니다!" : "틀렸습니다. 다시 생각해보세요.";
					feedbackEl.className = "quiz-feedback " + (isCorrect ? "quiz-feedback--correct" : "quiz-feedback--wrong");
				}

				// 모든 문제 답변 완료 시 결과 표시
				if (Object.keys(answered).length === questions.length) {
					const resultEl = document.getElementById("quiz-result");
					if (resultEl) {
						resultEl.removeAttribute("hidden");
						const correctCount = Object.keys(answered).filter((qid) => {
							const qEl = document.querySelector(".quiz-question[data-question='" + qid + "']");
							const sel = qEl ? qEl.querySelector(".quiz-option[aria-pressed='true']") : null;
							return sel && sel.dataset.value === qEl.dataset.answer;
						}).length;
						const scoreEl = document.getElementById("quiz-result-score");
						if (scoreEl) scoreEl.textContent = questions.length + "문제 중 " + correctCount + "개 정답";
					}
				}
			});
		});
	});

	// 다시 풀기 버튼
	const retryBtn = document.getElementById("btn-quiz-retry");
	if (retryBtn) {
		retryBtn.addEventListener("click", () => {
			Object.keys(answered).forEach((k) => delete answered[k]);
			questions.forEach((questionEl) => {
				const questionId = questionEl.dataset.question;
				const feedbackEl = document.getElementById("q" + questionId + "-feedback");
				questionEl.querySelectorAll(".quiz-option").forEach((btn) => {
					btn.setAttribute("aria-pressed", "false");
					btn.classList.remove("quiz-option--correct", "quiz-option--wrong");
				});
				if (feedbackEl) { feedbackEl.textContent = ""; feedbackEl.className = "quiz-feedback"; }
			});
			const resultEl = document.getElementById("quiz-result");
			if (resultEl) resultEl.setAttribute("hidden", "");
		});
	}
}

// ============================================================================
// 2. UI 이벤트 바인딩
// (createGridGraph, getCanvasSize → GraphUtils.js 참조)
// ============================================================================

function bindUIEvents(
	btnStepBack,
	btnPlayPause,
	btnStepForward,
	btnReset,
	speedSlider,
	speedDisplay,
	presetButtons,
	animCtrl,
	bfsEngine,
	graphRenderer,
	stateManager,
	currentGraph,
	totalStepsDisplay,
	statusBadge,
) {
	// Play/Pause 버튼
	if (btnPlayPause) {
		btnPlayPause.addEventListener("click", () => {
			const isPlaying = btnPlayPause.getAttribute("aria-pressed") === "true";
			if (isPlaying) {
				animCtrl.pause();
				updatePlayPauseButton(btnPlayPause, false);
				if (statusBadge) statusBadge.textContent = "일시정지";
			} else {
				animCtrl.play();
				updatePlayPauseButton(btnPlayPause, true);
				if (statusBadge) statusBadge.textContent = "재생 중";
			}
		});
	}

	// 뒤로 버튼
	if (btnStepBack) {
		btnStepBack.addEventListener("click", () => {
			animCtrl.pause();
			animCtrl.stepBackward();
			updatePlayPauseButton(btnPlayPause, false);
			if (statusBadge) statusBadge.textContent = "일시정지";
		});
	}

	// 앞으로 버튼
	if (btnStepForward) {
		btnStepForward.addEventListener("click", () => {
			animCtrl.pause();
			animCtrl.stepForward();
			updatePlayPauseButton(btnPlayPause, false);
			if (statusBadge) statusBadge.textContent = "일시정지";
		});
	}

	// 초기화 버튼
	if (btnReset) {
		btnReset.addEventListener("click", () => {
			animCtrl.pause();
			animCtrl.jumpToStep(0);
			updatePlayPauseButton(btnPlayPause, false);
			if (statusBadge) statusBadge.textContent = "초기화됨";
		});
	}

	// 속도 슬라이더
	if (speedSlider) {
		speedSlider.addEventListener("input", (e) => {
			const speed = parseFloat(e.target.value);
			const wasPlaying = animCtrl.isPlaying;
			if (wasPlaying) animCtrl.pause();
			animCtrl.setSpeed(speed);
			if (wasPlaying) animCtrl.play();
			if (speedDisplay) speedDisplay.textContent = `${Number.isInteger(speed) ? speed : speed.toFixed(1)}x`;
		});
	}

	// 프리셋 맵 버튼
	if (presetButtons && presetButtons.length > 0) {
		presetButtons.forEach((btn) => {
			btn.addEventListener("click", () => {
				const preset = btn.getAttribute("data-preset");
				const _applyPreset =
					(window.GraphUtils?.applyPreset) || applyPreset;
				_applyPreset(
					preset,
					currentGraph,
					bfsEngine,
					graphRenderer,
					stateManager,
					animCtrl,
					totalStepsDisplay,
				);

				// 버튼 활성화 상태 업데이트
				presetButtons.forEach((b) => { b.classList.remove("btn-preset--active"); });
				btn.classList.add("btn-preset--active");
			});
		});
	}

	// 키보드 단축키
	document.addEventListener("keydown", (e) => {
		if (e.shiftKey && e.key === "ArrowLeft") {
			animCtrl.stepBackward();
		} else if (e.shiftKey && e.key === "ArrowRight") {
			animCtrl.stepForward();
		} else if (e.key.toLowerCase() === "r") {
			animCtrl.jumpToStep(0);
		} else if (e.code === "Space") {
			e.preventDefault();
			const isPlaying = btnPlayPause.getAttribute("aria-pressed") === "true";
			if (isPlaying) {
				animCtrl.pause();
			} else {
				animCtrl.play();
			}
			updatePlayPauseButton(btnPlayPause, !isPlaying);
		}
	});
}

// ============================================================================
// 5. UI 업데이트 함수들
// ============================================================================

function updatePlayPauseButton(btn, isPlaying) {
	if (!btn) return;
	const iconPlay = btn.querySelector(".icon-play");
	const iconPause = btn.querySelector(".icon-pause");
	const label = btn.querySelector("#play-btn-label");

	btn.setAttribute("aria-pressed", isPlaying.toString());

	if (isPlaying) {
		if (iconPlay) iconPlay.style.display = "none";
		if (iconPause) iconPause.style.display = "block";
		if (label) label.textContent = "일시정지";
	} else {
		if (iconPlay) iconPlay.style.display = "block";
		if (iconPause) iconPause.style.display = "none";
		if (label) label.textContent = "시작";
	}
}

function updateProgressDisplay(
	currentStepDisplay,
	_totalStepsDisplay,
	progressFill,
	progressLabel,
	stepIndicator,
	animCtrl,
	totalSteps,
) {
	const progress = animCtrl.getProgress();

	if (currentStepDisplay) {
		currentStepDisplay.textContent = progress.current.toString();
	}

	if (progressFill) {
		progressFill.style.width = `${progress.percentage}%`;
	}

	if (progressLabel) {
		progressLabel.textContent = `${Math.round(progress.percentage)}%`;
	}

	if (stepIndicator) {
		stepIndicator.textContent = `Step ${progress.current} / ${totalSteps}`;
	}
}

function updateStepExplanation(element, stepState, animCtrl) {
	if (!element) return;

	const step = animCtrl.currentStep;
	let text = "";

	if (step === 0) {
		text =
			"시작 버튼을 눌러 BFS 탐색을 시작하세요.<br>시작점(초록)에서 목표점(빨강)까지 탐색합니다.";
	} else if (stepState) {
		const reachedCount = stepState.reached
			? (Array.isArray(stepState.reached) ? stepState.reached.length : stepState.reached.size ?? 0)
			: 0;
		const frontierCount = stepState.frontier
			? (Array.isArray(stepState.frontier) ? stepState.frontier.length : stepState.frontier.size ?? 0)
			: 0;

		if (stepState.found) {
			text = `목표를 찾았습니다! 경로 길이: ${stepState.path ? stepState.path.length : 0}`;
		} else {
			text = `탐색 중... 방문: ${reachedCount}, 경계: ${frontierCount}`;
		}
	}

	// textContent 사용 (XSS 방지) — text는 내부 상태 값으로만 구성됨
	element.textContent = text.replace(/<br>/g, "\n");
}

function updateQueueDisplay(element, stepState) {
	if (!element) return;
	if (!stepState) {
		element.innerHTML = '<span class="queue-display__empty">비어있음</span>';
		return;
	}

	const frontierRaw = stepState.frontier || [];
	const frontier = Array.isArray(frontierRaw) ? frontierRaw : Array.from(frontierRaw);

	// DOM API 사용으로 XSS 방지 (frontier 값은 내부 노드 ID 문자열)
	element.textContent = "";
	const span = document.createElement("span");
	if (frontier.length === 0) {
		span.className = "queue-display__empty";
		span.textContent = "비어있음";
	} else {
		span.className = "queue-display__items";
		const queueStr =
			frontier.slice(0, 5).join(", ") +
			(frontier.length > 5 ? `, ... (${frontier.length} 총 개)` : "");
		span.textContent = queueStr;
	}
	element.appendChild(span);
}

function updatePseudocodeHighlight(_step) {
	// 의사코드 라인 하이라이팅 (선택사항)
	// step에 따라 어떤 라인을 강조할지 결정
	// 현재는 구현하지 않음 (스타일만 준비)
}

// applyPreset, generateMazePattern → GraphUtils.js 참조

// renderHeroAnimation → HeroAnimation.js 참조

// ============================================================================
// 7. 전체 코드 끝
// ============================================================================

console.log("[app.js] 모듈 로드 완료");
