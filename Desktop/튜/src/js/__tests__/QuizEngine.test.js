import { describe, it, expect, beforeEach, afterEach } from "vitest";

const QuizEngine = require("../QuizEngine.js");

describe("QuizEngine", () => {
	let quiz;
	let container;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		quiz = new QuizEngine(container);
	});

	afterEach(() => {
		if (document.body.contains(container)) {
			document.body.removeChild(container);
		}
	});

	// ============================================================================
	// Constructor 초기화 (4개)
	// ============================================================================

	describe("constructor", () => {
		it("should assign containerEl to the instance", () => {
			expect(quiz.containerEl).toBe(container);
		});

		it("should initialize _questions array with length 3", () => {
			expect(quiz._questions).toHaveLength(3);
		});

		it("should have all required properties on each question object", () => {
			quiz._questions.forEach((question) => {
				expect(question).toHaveProperty("id");
				expect(question).toHaveProperty("question");
				expect(question).toHaveProperty("options");
				expect(question).toHaveProperty("correctAnswer");
				expect(question).toHaveProperty("explanation");
			});
		});

		it("should initialize _userAnswers and _scores as empty objects", () => {
			expect(quiz._userAnswers).toEqual({});
			expect(quiz._scores).toEqual({});
		});
	});

	// ============================================================================
	// Question correctAnswer 검증
	// ============================================================================

	describe("question correctAnswers", () => {
		it("question 0 should have correctAnswer = 1 (Queue)", () => {
			expect(quiz._questions[0].correctAnswer).toBe(1);
			expect(quiz._questions[0].options[1]).toContain("큐");
		});

		it("question 1 should have correctAnswer = 1 (shortest path)", () => {
			expect(quiz._questions[1].correctAnswer).toBe(1);
			expect(quiz._questions[1].options[1]).toContain("최단");
		});

		it("question 2 should have correctAnswer = 1 (BFS)", () => {
			expect(quiz._questions[2].correctAnswer).toBe(1);
			expect(quiz._questions[2].options[1]).toContain("BFS");
		});
	});

	// ============================================================================
	// checkAnswer() (5개)
	// ============================================================================

	describe("checkAnswer", () => {
		it("should return true when the selected answer is correct (q0, index 1)", () => {
			const result = quiz.checkAnswer(0, 1);
			expect(result).toBe(true);
		});

		it("should return false when the selected answer is incorrect (q0, index 0)", () => {
			const result = quiz.checkAnswer(0, 0);
			expect(result).toBe(false);
		});

		it("should return false when questionIndex is negative", () => {
			const result = quiz.checkAnswer(-1, 0);
			expect(result).toBe(false);
		});

		it("should return false when questionIndex is out of range", () => {
			const result = quiz.checkAnswer(10, 0);
			expect(result).toBe(false);
		});

		it("should update _userAnswers and _scores internal state", () => {
			quiz.checkAnswer(0, 1);
			expect(quiz._userAnswers[0]).toBe(1);
			expect(quiz._scores[0]).toBe(true);

			quiz.checkAnswer(1, 0);
			expect(quiz._userAnswers[1]).toBe(0);
			expect(quiz._scores[1]).toBe(false);
		});
	});

	// ============================================================================
	// getScore() (3개)
	// ============================================================================

	describe("getScore", () => {
		it("should return {total:3, correct:0, percentage:0} initially", () => {
			const score = quiz.getScore();
			expect(score.total).toBe(3);
			expect(score.correct).toBe(0);
			expect(score.percentage).toBe(0);
		});

		it("should return {total:3, correct:1, percentage:33} after 1 correct answer", () => {
			quiz.checkAnswer(0, 1); // correct
			const score = quiz.getScore();
			expect(score.total).toBe(3);
			expect(score.correct).toBe(1);
			expect(score.percentage).toBe(33);
		});

		it("should return {total:3, correct:3, percentage:100} after all 3 correct answers", () => {
			quiz.checkAnswer(0, 1); // correct
			quiz.checkAnswer(1, 1); // correct
			quiz.checkAnswer(2, 1); // correct
			const score = quiz.getScore();
			expect(score.total).toBe(3);
			expect(score.correct).toBe(3);
			expect(score.percentage).toBe(100);
		});
	});

	// ============================================================================
	// showExplanation() (3개)
	// ============================================================================

	describe("showExplanation", () => {
		it("should return a non-empty explanation string for valid question index", () => {
			const explanation = quiz.showExplanation(0);
			expect(explanation).toBeTruthy();
			expect(typeof explanation).toBe("string");
			expect(explanation.length).toBeGreaterThan(0);
		});

		it("should return empty string for negative question index", () => {
			const explanation = quiz.showExplanation(-1);
			expect(explanation).toBe("");
		});

		it("should return empty string for out-of-range question index", () => {
			const explanation = quiz.showExplanation(10);
			expect(explanation).toBe("");
		});
	});

	// ============================================================================
	// init() DOM 생성 (2개)
	// ============================================================================

	describe("init", () => {
		it("should create h2 tag in container after init", () => {
			quiz.init();
			const h2 = container.querySelector("h2");
			expect(h2).toBeTruthy();
			expect(h2.textContent).toContain("BFS");
		});

		it("should create submit button in container after init", () => {
			quiz.init();
			const button = container.querySelector("button");
			expect(button).toBeTruthy();
			expect(button.textContent).toContain("제출");
		});

		it("should create 3 question divs with proper IDs", () => {
			quiz.init();
			const q0 = container.querySelector("#question-0");
			const q1 = container.querySelector("#question-1");
			const q2 = container.querySelector("#question-2");
			expect(q0).toBeTruthy();
			expect(q1).toBeTruthy();
			expect(q2).toBeTruthy();
		});

		it("should create radio buttons for each question option", () => {
			quiz.init();
			const radios = container.querySelectorAll('input[type="radio"]');
			// 3 questions * 4 options = 12 radio buttons
			expect(radios.length).toBe(12);
		});

		it("should clear previous container HTML on init", () => {
			container.innerHTML = "<p>old content</p>";
			quiz.init();
			const _oldParagraph = container.querySelector(
				'p:not(p[style*="fontWeight"])',
			);
			// The old <p> should be gone, but new <p> tags from questions may exist
			expect(container.innerHTML).not.toContain("old content");
		});

		it('should create result div with id "quiz-result"', () => {
			quiz.init();
			const resultDiv = container.querySelector("#quiz-result");
			expect(resultDiv).toBeTruthy();
		});
	});

	// ============================================================================
	// reset() (4개)
	// ============================================================================

	describe("reset", () => {
		it("should clear _userAnswers after calling reset", () => {
			quiz.checkAnswer(0, 1);
			quiz.checkAnswer(1, 0);
			expect(Object.keys(quiz._userAnswers).length).toBeGreaterThan(0);

			quiz.reset();
			expect(quiz._userAnswers).toEqual({});
		});

		it("should clear _scores after calling reset", () => {
			quiz.checkAnswer(0, 1);
			quiz.checkAnswer(1, 0);
			expect(Object.keys(quiz._scores).length).toBeGreaterThan(0);

			quiz.reset();
			expect(quiz._scores).toEqual({});
		});

		it("should uncheck all radio buttons after init and reset", () => {
			quiz.init();

			// Simulate user selecting answers via DOM
			const radios = container.querySelectorAll('input[type="radio"]');
			if (radios.length > 0) {
				radios[0].checked = true;
				radios[4].checked = true;
			}

			quiz.reset();

			const allRadios = container.querySelectorAll('input[type="radio"]');
			allRadios.forEach((radio) => {
				expect(radio.checked).toBe(false);
			});
		});

		it("should clear resultDiv innerHTML after init and reset", () => {
			quiz.init();

			// Simulate submission result
			const resultDiv = document.getElementById("quiz-result");
			if (resultDiv) {
				resultDiv.innerHTML = "<p>Some result</p>";
			}

			quiz.reset();

			const resultDiv2 = document.getElementById("quiz-result");
			expect(resultDiv2.innerHTML).toBe("");
		});

		it("should hide all explanation divs after init and reset", () => {
			quiz.init();

			// Show explanations by setting display: block
			for (let i = 0; i < 3; i++) {
				const exDiv = document.getElementById(`explanation-${i}`);
				if (exDiv) {
					exDiv.style.display = "block";
				}
			}

			quiz.reset();

			for (let i = 0; i < 3; i++) {
				const exDiv = document.getElementById(`explanation-${i}`);
				if (exDiv) {
					expect(exDiv.style.display).toBe("none");
				}
			}
		});
	});

	// ============================================================================
	// Integration tests (2개)
	// ============================================================================

	describe("integration", () => {
		it("should handle complete quiz flow: answer all questions and get score", () => {
			quiz.checkAnswer(0, 1); // correct
			quiz.checkAnswer(1, 1); // correct
			quiz.checkAnswer(2, 1); // correct

			const score = quiz.getScore();
			expect(score.correct).toBe(3);
			expect(score.percentage).toBe(100);
		});

		it("should handle mixed correct and incorrect answers", () => {
			quiz.checkAnswer(0, 1); // correct
			quiz.checkAnswer(1, 0); // incorrect
			quiz.checkAnswer(2, 1); // correct

			const score = quiz.getScore();
			expect(score.correct).toBe(2);
			expect(score.percentage).toBe(67);
		});

		it("should allow reset and re-answer questions", () => {
			quiz.checkAnswer(0, 0); // incorrect
			let score = quiz.getScore();
			expect(score.correct).toBe(0);

			quiz.reset();
			quiz.checkAnswer(0, 1); // correct
			score = quiz.getScore();
			expect(score.correct).toBe(1);
			expect(score.percentage).toBe(33);
		});

		it("should properly initialize and reset DOM multiple times", () => {
			quiz.init();
			let h2 = container.querySelector("h2");
			expect(h2).toBeTruthy();

			quiz.reset();
			h2 = container.querySelector("h2");
			expect(h2).toBeTruthy(); // h2 should still exist after reset

			const resultDiv = document.getElementById("quiz-result");
			expect(resultDiv.innerHTML).toBe("");
		});
	});
});
