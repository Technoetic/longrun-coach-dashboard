/**
 * ============================================================================
 * QuizEngine.js - BFS Tutorial Web 퀴즈 엔진
 * ============================================================================
 *
 * 역할:
 * - BFS 관련 초보자용 퀴즈 3개 제공
 * - 사용자 답변 검증
 * - 설명 제시
 * - 점수 계산
 */

class QuizEngine {
	// 스타일 상수
	static STYLES = {
		questionContainer: {
			marginBottom: "30px",
			padding: "15px",
			backgroundColor: "#f5f5f5",
			borderRadius: "4px",
			borderLeft: "4px solid #1e90ff",
		},
		explanationDiv: {
			marginTop: "10px",
			padding: "10px",
			backgroundColor: "#e8f5e9",
			borderRadius: "4px",
			borderLeft: "4px solid #4caf50",
		},
		submitButton: {
			marginTop: "20px",
			padding: "10px 20px",
			backgroundColor: "#1e90ff",
			color: "#fff",
			border: "none",
			borderRadius: "4px",
			cursor: "pointer",
			fontSize: "16px",
		},
		resultDiv: {
			marginTop: "20px",
			padding: "20px",
			backgroundColor: "#fff3cd",
			borderRadius: "4px",
			borderLeft: "4px solid #ff9800",
		},
	};

	constructor(containerEl) {
		this.containerEl = containerEl;

		// 퀴즈 문제 3개 (BFS 관련 초보자용)
		this._questions = [
			{
				id: 0,
				question: "BFS(너비 우선 탐색)가 내부적으로 사용하는 자료구조는?",
				options: ["스택(Stack)", "큐(Queue)", "힙(Heap)", "트리(Tree)"],
				correctAnswer: 1, // "큐(Queue)"
				explanation:
					"BFS는 큐(Queue)를 사용합니다. 먼저 발견한 노드를 먼저 처리하는 FIFO(First In First Out) 방식입니다. 이를 통해 가장 가까운 노드부터 순차적으로 방문할 수 있습니다.",
			},
			{
				id: 1,
				question: "BFS로 찾은 경로의 가장 중요한 특징은?",
				options: [
					"가장 깊은 노드를 먼저 방문한다",
					"가장 짧은(최단) 경로를 찾는다",
					"임의의 순서로 노드를 방문한다",
					"무게가 가장 작은 경로를 찾는다",
				],
				correctAnswer: 1, // "가장 짧은(최단) 경로를 찾는다"
				explanation:
					"BFS의 핵심 성질은 시작점에서 목표점까지 최단 경로(가장 적은 간선 수)를 보장한다는 것입니다. 이는 BFS가 거리 순으로 노드를 탐색하기 때문입니다.",
			},
			{
				id: 2,
				question:
					"SNS에서 한 사람과 다른 사람 사이의 '6단계 분리'를 찾을 때 사용되는 알고리즘은?",
				options: [
					"깊이 우선 탐색(DFS)",
					"BFS(너비 우선 탐색)",
					"다익스트라(Dijkstra)",
					"동적 프로그래밍",
				],
				correctAnswer: 1, // "BFS(너비 우선 탐색)"
				explanation:
					"SNS에서 사람 사이의 최단 거리를 찾는 문제는 가중치 없는 그래프에서 최단 경로를 구하는 것이므로 BFS가 가장 효율적입니다. 6단계 분리는 BFS로 찾은 최단 경로 길이를 의미합니다.",
			},
		];

		// 사용자 답변 추적
		this._userAnswers = {}; // {questionId: selectedIndex}

		// 점수 상태
		this._scores = {}; // {questionId: boolean (정답 여부)}
	}

	/**
	 * DOM에 퀴즈 렌더링
	 */
	init() {
		if (!this.containerEl) return;

		// 컨테이너 초기화
		this.containerEl.innerHTML = "";

		// 퀴즈 제목
		const title = document.createElement("h2");
		title.textContent = "BFS 알고리즘 이해도 퀴즈";
		title.style.marginBottom = "20px";
		this.containerEl.appendChild(title);

		// 각 문제별 UI 생성
		for (const question of this._questions) {
			const questionDiv = this._createQuestionUI(question);
			this.containerEl.appendChild(questionDiv);
		}

		// 제출 버튼
		const submitBtn = document.createElement("button");
		submitBtn.textContent = "제출";
		Object.assign(submitBtn.style, QuizEngine.STYLES.submitButton);
		submitBtn.addEventListener("click", () => this._submitQuiz());
		this.containerEl.appendChild(submitBtn);

		// 결과 표시 영역
		const resultDiv = document.createElement("div");
		resultDiv.id = "quiz-result";
		resultDiv.style.marginTop = "20px";
		this.containerEl.appendChild(resultDiv);
	}

	/**
	 * 단일 문제 UI 생성
	 * @param {Object} question
	 * @returns {HTMLElement}
	 */
	_createQuestionUI(question) {
		const div = document.createElement("div");
		div.id = `question-${question.id}`;
		Object.assign(div.style, QuizEngine.STYLES.questionContainer);

		// 문제 텍스트
		const qText = document.createElement("p");
		qText.style.fontWeight = "bold";
		qText.style.marginBottom = "10px";
		qText.textContent = `Q${question.id + 1}. ${question.question}`;
		div.appendChild(qText);

		// 선택지 (라디오 버튼)
		const optionsDiv = document.createElement("div");
		optionsDiv.style.marginLeft = "10px";

		for (let i = 0; i < question.options.length; i++) {
			const label = document.createElement("label");
			label.style.display = "block";
			label.style.marginBottom = "8px";
			label.style.cursor = "pointer";

			const input = document.createElement("input");
			input.type = "radio";
			input.name = `question-${question.id}`;
			input.value = i;
			input.addEventListener("change", (e) => {
				this._userAnswers[question.id] = parseInt(e.target.value, 10);
			});

			const span = document.createElement("span");
			span.style.marginLeft = "8px";
			span.textContent = question.options[i];

			label.appendChild(input);
			label.appendChild(span);
			optionsDiv.appendChild(label);
		}

		div.appendChild(optionsDiv);

		// 설명 영역 (초기에는 숨김)
		const explanationDiv = document.createElement("div");
		explanationDiv.id = `explanation-${question.id}`;
		explanationDiv.style.display = "none";
		Object.assign(explanationDiv.style, QuizEngine.STYLES.explanationDiv);

		const exTitle = document.createElement("strong");
		exTitle.textContent = "설명: ";
		explanationDiv.appendChild(exTitle);

		const exText = document.createElement("span");
		exText.textContent = question.explanation;
		explanationDiv.appendChild(exText);

		div.appendChild(explanationDiv);

		return div;
	}

	/**
	 * 퀴즈 제출 처리
	 */
	_submitQuiz() {
		let correctCount = 0;

		for (const question of this._questions) {
			const selectedIndex = this._userAnswers[question.id];

			if (selectedIndex === undefined) {
				// 답변하지 않은 문제
				this._scores[question.id] = false;
			} else {
				const isCorrect = selectedIndex === question.correctAnswer;
				this._scores[question.id] = isCorrect;
				if (isCorrect) correctCount++;

				// 설명 표시
				this._showExplanation(question.id);
			}
		}

		// 결과 표시
		const resultDiv = document.getElementById("quiz-result");
		if (resultDiv) {
			resultDiv.innerHTML = "";
			Object.assign(resultDiv.style, QuizEngine.STYLES.resultDiv);

			const resultText = document.createElement("p");
			resultText.style.fontSize = "18px";
			resultText.style.fontWeight = "bold";
			resultText.textContent = `결과: ${correctCount} / ${this._questions.length} 정답`;
			resultDiv.appendChild(resultText);

			const percentage = Math.round(
				(correctCount / this._questions.length) * 100,
			);
			const percentageText = document.createElement("p");
			percentageText.style.fontSize = "16px";
			percentageText.textContent = `정답률: ${percentage}%`;
			resultDiv.appendChild(percentageText);

			// 피드백 메시지
			const feedbackText = document.createElement("p");
			feedbackText.style.marginTop = "10px";
			if (correctCount === this._questions.length) {
				feedbackText.textContent =
					"🎉 완벽합니다! BFS의 개념을 완전히 이해하셨습니다.";
				feedbackText.style.color = "#4caf50";
			} else if (correctCount >= 2) {
				feedbackText.textContent =
					"👍 좋습니다! 기본 개념은 잘 이해하셨습니다.";
				feedbackText.style.color = "#ff9800";
			} else {
				feedbackText.textContent = "📚 BFS의 개념을 다시 한 번 학습해보세요.";
				feedbackText.style.color = "#f44336";
			}
			resultDiv.appendChild(feedbackText);
		}
	}

	/**
	 * 특정 문제의 설명 표시
	 * @param {number} questionId
	 */
	_showExplanation(questionId) {
		const explanationDiv = document.getElementById(`explanation-${questionId}`);
		if (explanationDiv) {
			explanationDiv.style.display = "block";
		}
	}

	/**
	 * 답변 확인 (특정 문제)
	 * @param {number} questionIndex
	 * @param {number} selectedIndex
	 * @returns {boolean} - 정답 여부
	 */
	checkAnswer(questionIndex, selectedIndex) {
		if (questionIndex < 0 || questionIndex >= this._questions.length) {
			return false;
		}

		const question = this._questions[questionIndex];
		this._userAnswers[questionIndex] = selectedIndex;
		const isCorrect = selectedIndex === question.correctAnswer;
		this._scores[questionIndex] = isCorrect;

		return isCorrect;
	}

	/**
	 * 특정 문제의 설명 보기
	 * @param {number} questionIndex
	 * @returns {string} - 설명 텍스트
	 */
	showExplanation(questionIndex) {
		if (questionIndex < 0 || questionIndex >= this._questions.length) {
			return "";
		}

		const question = this._questions[questionIndex];
		return question.explanation;
	}

	/**
	 * 현재 점수 반환
	 * @returns {Object} - {total: 총 문제 수, correct: 정답 수, percentage: 정답률}
	 */
	getScore() {
		const total = this._questions.length;
		const correct = Object.values(this._scores).filter(
			(v) => v === true,
		).length;
		const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

		return {
			total,
			correct,
			percentage,
		};
	}

	/**
	 * 퀴즈 초기화 (모든 답변과 점수 리셋)
	 */
	reset() {
		this._userAnswers = {};
		this._scores = {};

		// DOM에서 선택 상태 초기화
		for (const question of this._questions) {
			const inputs = document.querySelectorAll(
				`input[name="question-${question.id}"]`,
			);
			inputs.forEach((input) => {
				input.checked = false;
			});

			// 설명 숨김
			const explanationDiv = document.getElementById(
				`explanation-${question.id}`,
			);
			if (explanationDiv) {
				explanationDiv.style.display = "none";
			}
		}

		// 결과 영역 초기화
		const resultDiv = document.getElementById("quiz-result");
		if (resultDiv) {
			resultDiv.innerHTML = "";
		}
	}
}

// 브라우저 전역 등록 (script 태그 방식)
if (typeof window !== "undefined") window.QuizEngine = QuizEngine;

// ES6 모듈 export (필요시)
if (typeof module !== "undefined" && module.exports) {
	module.exports = QuizEngine;
}
