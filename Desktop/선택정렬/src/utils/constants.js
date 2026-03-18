// Color palette (GitHub dark theme inspired)
export const COLORS = {
	background: "#0d1117",
	panelBg: "#161b22",
	panelBorder: "#30363d",
	text: "#e6edf3",
	textSecondary: "#8b949e",

	// Bar states
	barDefault: "#58a6ff", // Default blue
	barComparing: "#f59e0b", // Amber - comparing
	barMinimum: "#ef4444", // Red - current minimum
	barSorted: "#22c55e", // Green - sorted/complete
	barSwapping: "#a855f7", // Purple - swapping
	barCurrent: "#3b82f6", // Blue - current position (i)

	// UI
	accent: "#238636", // Green accent (buttons)
	accentHover: "#2ea043",
	link: "#58a6ff",

	// Code panel
	codeBg: "#0d1117",
	codeHighlight: "#1f2937",
	codeText: "#e6edf3",
	lineNumber: "#6e7681",
};

// Sizes
export const SIZES = {
	barGap: 2,
	barMinWidth: 4,
	barMaxWidth: 40,
	canvasMinHeight: 300,
	canvasPadding: 20,
	headerHeight: 48,
	controlHeight: 60,

	// Responsive breakpoints
	mobileMax: 767,
	tabletMax: 1023,
};

// Animation
export const ANIMATION = {
	defaultSpeed: 500, // ms per step
	minSpeed: 50,
	maxSpeed: 2000,
	speedSteps: [50, 100, 200, 500, 1000, 2000],
	easing: "easeInOutQuad",
};

// Tutorial messages (Korean)
export const MESSAGES = {
	// Real-life analogy: sorting test scores
	analogies: {
		"mark-start": (i) =>
			`📋 ${i + 1}번째 자리: 아직 정렬되지 않은 학생들 중에서 가장 낮은 점수를 찾아볼까요?`,
		compare: (j, minIdx, valJ, valMin) =>
			`🔍 ${j}번 학생(${valJ}점)과 현재 최저점 학생(${valMin}점)을 비교합니다`,
		"found-min": (j, val) =>
			`⭐ 새로운 최저점 발견! ${j}번 학생(${val}점)이 지금까지 가장 낮습니다`,
		swap: (i, minIdx, valI, valMin) =>
			`🔄 ${i}번 자리의 학생(${valI}점)과 ${minIdx}번 자리의 학생(${valMin}점)의 자리를 바꿉니다`,
		"mark-complete": (i) =>
			`✅ ${i + 1}번째 자리까지 정렬 완료! 가장 작은 값들이 앞에 정렬되었습니다`,
	},

	// Technical descriptions
	technical: {
		"mark-start": (i) => `Pass ${i + 1}: 인덱스 ${i}부터 최솟값 탐색 시작`,
		compare: (j, minIdx, valJ, valMin) =>
			`arr[${j}](${valJ}) vs arr[${minIdx}](${valMin}) 비교`,
		"found-min": (j, val) => `최솟값 갱신: minIdx = ${j} (값: ${val})`,
		swap: (i, minIdx, valI, valMin) =>
			`arr[${i}]과 arr[${minIdx}] 교환 (${valI} ↔ ${valMin})`,
		"mark-complete": (i) => `인덱스 0~${i} 정렬 완료`,
	},
};

// Pseudocode for display
export const PSEUDOCODE = [
	"function selectionSort(arr):",
	"  for i = 0 to n-2:",
	"    minIdx = i",
	"    for j = i+1 to n-1:",
	"      if arr[j] < arr[minIdx]:",
	"        minIdx = j",
	"    swap(arr[i], arr[minIdx])",
	"  return arr",
];

// Map step types to pseudocode line numbers
export const STEP_TO_LINE = {
	"mark-start": 1,
	compare: 4,
	"found-min": 5,
	swap: 6,
	"mark-complete": 1,
};
