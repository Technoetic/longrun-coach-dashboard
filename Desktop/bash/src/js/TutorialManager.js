export default class TutorialManager {
	constructor(explanationPanel) {
		this._panel = explanationPanel;
		this._currentStep = -1;
		this._active = false;
		this._steps = [
			{
				title: "힙이 뭐야?",
				content:
					'🏥 <strong>병원 응급실</strong>을 떠올려 보세요. 환자가 도착한 순서가 아니라 <strong>위급한 순서</strong>대로 치료하죠? 힙도 똑같습니다 — 들어온 순서 상관없이 <strong>"가장 중요한 것"을 항상 맨 위에</strong> 유지하는 구조입니다.',
				action: null,
			},
			{
				title: "어디에 쓰여?",
				content:
					"📱 <strong>카카오택시</strong> — 가장 가까운 기사를 먼저 배정 (Min Heap)<br>🎮 <strong>게임 매칭</strong> — 실력이 비슷한 상대를 빠르게 찾기<br>📦 <strong>배달앱</strong> — 가장 급한 주문을 먼저 처리<br>💻 <strong>운영체제</strong> — 우선순위 높은 작업을 먼저 실행",
				action: null,
			},
			{
				title: "트리 모양 이해하기",
				content:
					'위의 <strong>트리 그림</strong>과 아래 <strong>배열</strong>을 비교해 보세요. 맨 위(루트)가 배열[0]이고, 아래로 한 줄씩 순서대로 채워집니다. <strong>"예제 데이터"</strong> 버튼을 눌러 확인해 보세요!',
				action: "showTree",
			},
			{
				title: "넣기 — 새 환자 도착!",
				content:
					'🏥 새 환자(숫자)가 <strong>대기열 맨 뒤</strong>에 앉습니다. 그런데 앞사람보다 더 위급하면? <strong>앞으로 이동</strong>합니다! 위급도가 맞을 때까지 계속 올라갑니다. 왼쪽에서 숫자를 입력하고 <strong>"넣기"</strong>를 눌러보세요!',
				action: "demoInsert",
			},
			{
				title: "꺼내기 — 가장 급한 환자 치료!",
				content:
					'🚑 항상 <strong>맨 위(가장 큰/작은 값)</strong>를 꺼냅니다. 꺼낸 뒤 맨 뒤의 값이 맨 위로 올라오고, 자기 자리를 찾아 <strong>아래로 내려갑니다</strong>. <strong>"꺼내기"</strong> 버튼을 눌러 과정을 관찰해 보세요!',
				action: "demoExtract",
			},
			{
				title: "정렬 — 전부 순서대로!",
				content:
					'힙에서 맨 위를 <strong>반복해서 꺼내면</strong> 자동으로 정렬됩니다! 📦 배달앱에서 주문을 급한 순서대로 하나씩 처리하는 것과 같습니다. <strong>"정렬하기"</strong>를 눌러 확인해 보세요!',
				action: "demoSort",
			},
		];
	}

	start() {
		this._active = true;
		this._currentStep = 0;
		this._showStep(0);
	}

	nextStep() {
		if (this._currentStep < this._steps.length - 1) {
			this._currentStep++;
			this._showStep(this._currentStep);
		}
		return this.getCurrentStep();
	}

	prevStep() {
		if (this._currentStep > 0) {
			this._currentStep--;
			this._showStep(this._currentStep);
		}
		return this.getCurrentStep();
	}

	goToStep(n) {
		if (n >= 0 && n < this._steps.length) {
			this._currentStep = n;
			this._showStep(n);
		}
		return this.getCurrentStep();
	}

	exit() {
		this._active = false;
		this._currentStep = -1;
		this._panel.innerHTML = "";
	}

	getCurrentStep() {
		if (this._currentStep >= 0 && this._currentStep < this._steps.length) {
			return {
				...this._steps[this._currentStep],
				number: this._currentStep,
			};
		}
		return null;
	}

	getTotalSteps() {
		return this._steps.length;
	}

	isActive() {
		return this._active;
	}

	showMessage(text) {
		this._panel.innerHTML = text;
	}

	clearMessage() {
		this._panel.innerHTML =
			'👈 왼쪽에서 <strong>"예제 데이터"</strong>를 눌러 시작하거나, 숫자를 직접 넣어보세요!';
	}

	_showStep(index) {
		if (index < 0 || index >= this._steps.length) return;

		const step = this._steps[index];
		const stepNumber = index + 1;
		const totalSteps = this._steps.length;
		const isPrevDisabled = index === 0;
		const isNextDisabled = index === this._steps.length - 1;

		const html = `
      <div class="tutorial-step">
        <h3>Step ${stepNumber}: ${step.title}</h3>
        <p>${step.content}</p>
        <div class="tutorial-nav">
          <button id="tutorial-prev" ${isPrevDisabled ? "disabled" : ""}>이전</button>
          <span class="tutorial-counter">${stepNumber} / ${totalSteps}</span>
          <button id="tutorial-next" ${isNextDisabled ? "disabled" : ""}>다음</button>
        </div>
      </div>
    `;

		this._panel.innerHTML = html;

		// Attach event listeners
		const prevBtn = this._panel.querySelector("#tutorial-prev");
		const nextBtn = this._panel.querySelector("#tutorial-next");

		if (prevBtn && !isPrevDisabled) {
			prevBtn.addEventListener("click", () => this.prevStep());
		}

		if (nextBtn && !isNextDisabled) {
			nextBtn.addEventListener("click", () => this.nextStep());
		}
	}
}
