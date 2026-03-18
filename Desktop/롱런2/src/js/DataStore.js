"use strict";

/* ─── DATA ────────────────────────────────────────────────── */
var ROADMAP = {
	phases: [
		{
			phaseId: "P1",
			phaseNum: 1,
			title: "MVP 완성 및 투자 유치 집중",
			month: "3월",
			theme: "dark",
			milestones: [
				{
					id: "M01",
					date: "2026-03-23",
					displayDate: "3.23 (월)",
					icon: "📄",
					title: "정부 지원사업 사업계획서 제출",
					desc: "KSPO, K-스타트업 2곳 서류 제출 완료.",
					status: "completed",
				},
				{
					id: "M02",
					date: "2026-03-25",
					displayDate: "3.25 (수)",
					icon: "📊",
					title: "기록 예측 모델 프로젝트 발표",
					desc: "내부 AI 모델링 결과 및 로직 발표.",
					status: "completed",
				},
				{
					id: "M03",
					date: "2026-03-27",
					displayDate: "3.27 (금)",
					icon: "🎨",
					title: "프론트엔드 UI 최종 마무리",
					desc: "B2B 감독 대시보드 및 퍼포먼스 예측 UI 완료.",
					status: "in-progress",
				},
				{
					id: "M04",
					date: "2026-03-30",
					displayDate: "3.30 (월)",
					icon: "🔗",
					title: "백엔드 데이터-UI 연동",
					desc: "사전 오픈데이터셋(Mock Data) 활용, 화면 완벽 연동.",
					status: "pending",
				},
				{
					id: "M05",
					date: "2026-03-31",
					displayDate: "3.31 (화)",
					icon: "🚀",
					title: "앱 마켓 심사 제출 및 API 권한 신청",
					desc: "안드로이드/iOS 양대 마켓 제출. HealthKit / Google Fit API 승인 신청.",
					status: "pending",
				},
			],
		},
		{
			phaseId: "P2",
			phaseNum: 2,
			title: "대학·기관 세일즈 및 실증 파이프라인 구축",
			month: "4월",
			theme: "mid",
			milestones: [
				{
					id: "M06",
					date: "2026-04-13",
					displayDate: "4.06–4.13",
					icon: "🎤",
					title: "공단 스타트업 대면 프레젠테이션 평가",
					desc: "심사위원들에게 작동하는 앱(MVP) 직접 시연.",
					status: "pending",
				},
				{
					id: "M07",
					date: "2026-04-17",
					displayDate: "4.17 (금)",
					icon: "🤝",
					title: "한체대 박재현 교수 1차 미팅",
					desc: "현장 실데이터 파이프라인 구축을 위한 연구 총괄(PI) 합류 제안 및 앱 시연.",
					status: "pending",
				},
				{
					id: "M08",
					date: "2026-04-21",
					displayDate: "4.21 (화)",
					icon: "🏛️",
					title: "한체대 총장 톡대 미팅",
					desc: "한체대 'AI 스마트 스포츠 캠퍼스' 전면 도입 및 MOU 체결 담판.",
					status: "pending",
				},
				{
					id: "M09",
					date: "2026-04-24",
					displayDate: "4.24 (금)",
					icon: "🏆",
					title: "국민체육진흥공단 스타트업 최종 결과",
					desc: "정부 지원사업 최종 선정 결과 발표.",
					status: "pending",
				},
				{
					id: "M10",
					date: "2026-04-29",
					displayDate: "4.26–4.29",
					icon: "🏃",
					title: "스포웰 지원사업 신청 및 면접",
					desc: "은퇴선수 지원 스타트업 사업 신청 및 면접 인터뷰 진행.",
					status: "pending",
				},
			],
		},
		{
			phaseId: "P3",
			phaseNum: 3,
			title: "실데이터 수집 가동 및 국가대표 세일즈",
			month: "5월",
			theme: "deep",
			milestones: [
				{
					id: "M11",
					date: "2026-05-01",
					displayDate: "5.01 (금)",
					icon: "🎉",
					title: "스포웰 합격 공고",
					desc: "은퇴선수 지원 스타트업 사업에 최종 선정.",
					status: "pending",
				},
				{
					id: "M12",
					date: "2026-05-05",
					displayDate: "5월 초",
					icon: "⌚",
					title: "한체대 선수단 스마트워치 배부 및 실데이터 수집",
					desc: "역도·실내조정·수영부 우선 적용. 실시간 대시보드 운영 시작.",
					status: "pending",
				},
				{
					id: "M13",
					date: "2026-05-15",
					displayDate: "5.15 (금)",
					icon: "📈",
					title: "실시간 대시보드 인사이트 리포트 표출",
					desc: "스마트워치 + sRPE 분석, 감독용 대시보드 정상 표출 확인.",
					status: "pending",
				},
				{
					id: "M14",
					date: "2026-05-24",
					displayDate: "5.24 (일)",
					icon: "🇰🇷",
					title: "유승민 대한체육회장 독대 미팅",
					desc: "한체대 성과 기반 진천 국가대표선수촌 무상 도입 및 공식 MOU 제안.",
					status: "pending",
				},
				{
					id: "M15",
					date: "2026-05-31",
					displayDate: "5.31 (토)",
					icon: "✅",
					title: "상반기 로드맵 완료 및 하반기 계획 수립",
					desc: "모든 주요 마일스톤 완료 및 하반기 전국 확대 계획 확정.",
					status: "pending",
				},
			],
		},
	],
};

/* ─── STATUS HELPERS ──────────────────────────────────────── */
function resolveStatus(milestone) {
	if (milestone.status === "completed") return "done";
	if (milestone.status === "in-progress") return "prog";
	var today = new Date();
	today.setHours(0, 0, 0, 0);
	var d = new Date(milestone.date);
	d.setHours(0, 0, 0, 0);
	if (d < today) return "del";
	return "pend";
}

function statusLabel(s) {
	return (
		{ done: "완료", prog: "진행중", pend: "예정", del: "지연" }[s] || "예정"
	);
}
