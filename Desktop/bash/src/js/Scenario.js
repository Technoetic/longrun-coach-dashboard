const SCENARIOS = {
	hospital: {
		name: "응급실",
		icon: "🏥",
		heapType: "max",
		valueLabel: "위급도",
		placeholder: "위급도 (1~10)",
		minVal: 1,
		maxVal: 10,
		insertLabel: "환자 접수",
		extractLabel: "치료 시작 (가장 위급한 환자)",
		peekLabel: "다음 환자 확인",
		buildLabel: "응급실 시뮬레이션",
		sortLabel: "전체 치료 순서",
		sampleLabel: "예제 환자들",
		names: [
			"김환자", "이환자", "박환자", "최환자", "정환자",
			"강환자", "조환자", "윤환자", "장환자", "임환자",
			"한환자", "오환자", "서환자", "신환자", "황환자",
		],
		nodePrefix: "🤒",
		insertMsg: (name, val) =>
			`환자 <strong>${name}</strong>(위급도 ${val}) 접수!`,
		extractMsg: (name, val) =>
			`환자 <strong>${name}</strong>(위급도 ${val}) 치료 시작!`,
		compareMsg: (a, b) =>
			`위급도 <strong>${a}</strong> vs <strong>${b}</strong> 비교`,
		swapMsg: (a, b, type) =>
			`위급도 ${a}이(가) 더 ${type === "max" ? "높아서" : "낮아서"} 앞으로!`,
		doneInsertMsg: "환자 대기열 정리 완료!",
		doneExtractMsg: "다음 환자 대기 중...",
		buildMsg: (n) => `환자 ${n}명 접수! 위급도순 정렬 중...`,
		buildDoneMsg: "가장 위급한 환자가 맨 위에!",
		sortStartMsg: "치료 순서대로 환자를 호출합니다",
		emptyMsg: "대기 환자가 없습니다",
		rootLabel: "1순위",
		indexLabel: (i) => (i === 0 ? "1순위" : `${i + 1}순위`),
		arrayTitle: "치료 대기 순서",
		emptyArrayMsg: "대기 환자가 없습니다 — 환자를 접수하세요!",
	},
	taxi: {
		name: "택시 배차",
		icon: "🚕",
		heapType: "min",
		valueLabel: "거리(km)",
		placeholder: "거리 km (1~50)",
		minVal: 1,
		maxVal: 50,
		insertLabel: "기사 등록",
		extractLabel: "배차하기 (가장 가까운 기사)",
		peekLabel: "가장 가까운 기사 확인",
		buildLabel: "주변 기사 시뮬레이션",
		sortLabel: "가까운 순 정렬",
		sampleLabel: "예제 기사들",
		names: [
			"김기사", "이기사", "박기사", "최기사", "정기사",
			"강기사", "조기사", "윤기사", "장기사", "임기사",
			"한기사", "오기사", "서기사", "신기사", "황기사",
		],
		nodePrefix: "🚗",
		insertMsg: (name, val) =>
			`<strong>${name}</strong>(${val}km) 등록!`,
		extractMsg: (name, val) =>
			`<strong>${name}</strong>(${val}km) 배차 완료!`,
		compareMsg: (a, b) =>
			`거리 <strong>${a}km</strong> vs <strong>${b}km</strong> 비교`,
		swapMsg: (a, b, type) =>
			`${a}km이(가) 더 ${type === "min" ? "가까워서" : "멀어서"} 앞으로!`,
		doneInsertMsg: "기사 대기열 정리 완료!",
		doneExtractMsg: "다음 배차 대기 중...",
		buildMsg: (n) => `주변 기사 ${n}명 탐색 중...`,
		buildDoneMsg: "가장 가까운 기사가 맨 위에!",
		sortStartMsg: "가까운 순서대로 기사를 배치합니다",
		emptyMsg: "대기 기사가 없습니다",
		rootLabel: "최근접",
		indexLabel: (i) => (i === 0 ? "최근접" : `${i + 1}번째`),
		arrayTitle: "배차 대기 순서",
		emptyArrayMsg: "대기 기사가 없습니다 — 기사를 등록하세요!",
	},
	number: {
		name: "숫자",
		icon: "🔢",
		heapType: "max",
		valueLabel: "값",
		placeholder: "숫자 (1~999)",
		minVal: 1,
		maxVal: 999,
		insertLabel: "넣기",
		extractLabel: "꺼내기 (루트 추출)",
		peekLabel: "엿보기 (루트 확인)",
		buildLabel: "랜덤 생성",
		sortLabel: "정렬하기",
		sampleLabel: "예제 데이터",
		names: null,
		nodePrefix: "",
		insertMsg: (name, val) =>
			`새 값 <strong>${val}</strong> 삽입!`,
		extractMsg: (name, val) =>
			`값 <strong>${val}</strong> 추출!`,
		compareMsg: (a, b) =>
			`<strong>${a}</strong> vs <strong>${b}</strong> 비교`,
		swapMsg: (a, b, type) =>
			`${type === "max" ? "더 큰" : "더 작은"} 값이 위로!`,
		doneInsertMsg: "자기 자리를 찾았습니다! 삽입 완료",
		doneExtractMsg: "꺼내기 완료! 힙이 다시 정리되었습니다",
		buildMsg: (n) => `${n}개 숫자를 힙으로 만들기 시작!`,
		buildDoneMsg: "힙 완성! 맨 위에 가장 큰(또는 작은) 값이 있습니다",
		sortStartMsg: "정렬 시작! 맨 위를 반복해서 꺼내면 순서대로 정렬됩니다",
		emptyMsg: "힙이 비어있습니다",
		rootLabel: "루트",
		indexLabel: (i) => (i === 0 ? "루트" : `${i}번`),
		arrayTitle: "배열 저장 순서",
		emptyArrayMsg: "아직 데이터가 없습니다 — 숫자를 넣어보세요!",
	},
};

export default class Scenario {
	constructor() {
		this._current = "hospital";
		this._nameMap = new Map(); // value -> assigned name
		this._usedNames = [];
	}

	get config() {
		return SCENARIOS[this._current];
	}

	get id() {
		return this._current;
	}

	set(scenarioId) {
		if (SCENARIOS[scenarioId]) {
			this._current = scenarioId;
			this._nameMap.clear();
			this._usedNames = [];
		}
	}

	getNameForValue(value) {
		if (!this.config.names) return null;
		if (this._nameMap.has(value)) return this._nameMap.get(value);
		const available = this.config.names.filter(
			(n) => !this._usedNames.includes(n),
		);
		const name = available.length > 0 ? available[0] : `${value}번`;
		this._nameMap.set(value, name);
		this._usedNames.push(name);
		return name;
	}

	clearNames() {
		this._nameMap.clear();
		this._usedNames = [];
	}

	getNodeLabel(value) {
		const name = this.getNameForValue(value);
		if (name && this.config.nodePrefix) {
			return { top: this.config.nodePrefix, main: value, bottom: name };
		}
		return { top: "", main: value, bottom: "" };
	}
}
