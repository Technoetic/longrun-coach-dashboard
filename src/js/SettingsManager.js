/**
 * SettingsManager.js
 * Dashboard module for settings, logout, and legal pages
 */

class SettingsManager {
	constructor() {
		this.legalData = {
			tos: {
				title: "서비스 이용약관",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">제1조 (목적)</h4>
        <p>이 약관은 주식회사 LongRun(이하 "회사")이 제공하는 LongRun Coach 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제2조 (정의)</h4>
        <p>① "서비스"란 회사가 제공하는 선수 건강 관리, 부상 예측, 훈련 계획 수립, AI 기반 코칭 지원 등의 온라인 플랫폼을 의미합니다.</p>
        <p>② "이용자"란 이 약관에 따라 서비스를 이용하는 코치, 트레이너 및 관련 스태프를 말합니다.</p>
        <p>③ "선수 데이터"란 서비스를 통해 수집·분석되는 선수의 건강, 컨디션, 훈련 관련 데이터를 말합니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제3조 (서비스의 제공)</h4>
        <p>회사는 다음 서비스를 제공합니다:</p>
        <p>1. 선수 컨디션 모니터링 및 부상 위험도 분석</p>
        <p>2. 훈련 계획 수립 및 관리 도구</p>
        <p>3. AI 기반 훈련 조언 및 부상 예방 추천</p>
        <p>4. 선수별 건강 데이터 관리 및 리포트 생성</p>
        <p>5. 팀 내 데이터 공유 및 협업 기능</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제4조 (이용계약의 성립)</h4>
        <p>이용계약은 이용자가 본 약관에 동의하고 회원가입 신청을 한 후, 회사가 이를 승낙함으로써 성립됩니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제5조 (서비스 이용의 제한)</h4>
        <p>회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 중지할 수 있습니다:</p>
        <p>1. 타인의 정보를 도용하여 가입한 경우</p>
        <p>2. 서비스 운영을 고의로 방해한 경우</p>
        <p>3. 선수 데이터를 무단으로 외부에 유출한 경우</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제6조 (면책사항)</h4>
        <p>본 서비스에서 제공하는 AI 기반 분석 및 조언은 참고 목적이며, 의학적 진단이나 치료를 대체하지 않습니다. 최종 판단은 이용자(코치)의 책임 하에 이루어져야 합니다.</p>
        <p style="margin-top:20px; color:var(--text-tertiary); font-size:12px;">시행일: 2026년 1월 1일</p>
      `,
			},
			privacy: {
				title: "개인정보 처리방침",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">1. 개인정보의 수집 항목 및 방법</h4>
        <p><strong style="color:#fff;">필수 항목:</strong> 이메일, 비밀번호, 전화번호, 이름</p>
        <p><strong style="color:#fff;">선택 항목:</strong> 소속 팀, 직책, 프로필 사진</p>
        <p><strong style="color:#fff;">자동 수집:</strong> 기기 정보, 접속 로그, 서비스 이용 기록</p>
        <h4 style="color:#fff; margin:20px 0 12px;">2. 개인정보의 수집 및 이용 목적</h4>
        <p>· 서비스 회원 식별 및 본인 인증</p>
        <p>· 서비스 제공, 유지, 개선</p>
        <p>· 선수 건강 데이터 분석 및 리포트 생성</p>
        <p>· 고객 문의 대응 및 공지사항 전달</p>
        <p>· 서비스 이용 통계 및 분석</p>
        <h4 style="color:#fff; margin:20px 0 12px;">3. 개인정보의 보유 및 이용기간</h4>
        <p>회원 탈퇴 시까지 보유하며, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
        <p>· 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</p>
        <p>· 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</p>
        <p>· 소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</p>
        <p>· 접속에 관한 기록: 3개월 (통신비밀보호법)</p>
        <h4 style="color:#fff; margin:20px 0 12px;">4. 개인정보의 파기</h4>
        <p>보유 기간 경과 시 지체없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로, 종이 문서는 분쇄 또는 소각합니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">5. 이용자의 권리</h4>
        <p>이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며, 회원 탈퇴를 통해 처리 정지를 요청할 수 있습니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">6. 개인정보 보호책임자</h4>
        <p>성명: 개인정보보호팀<br>이메일: privacy@longrun.co.kr</p>
        <p style="margin-top:20px; color:var(--text-tertiary); font-size:12px;">시행일: 2026년 1월 1일</p>
      `,
			},
			thirdparty: {
				title: "개인정보 제3자 제공",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">1. 제공받는 자</h4>
        <p>· 소속 팀 관리자 및 의무 스태프 (팀 내 공유 목적)</p>
        <p>· 클라우드 서비스 제공업체 (데이터 호스팅 및 백업)</p>
        <p>· 건강 데이터 연동 파트너 (웨어러블 기기 연동 시)</p>
        <h4 style="color:#fff; margin:20px 0 12px;">2. 제공하는 개인정보 항목</h4>
        <p>· 코치: 이름, 소속 팀, 이메일</p>
        <p>· 선수 데이터: 건강 지표, 훈련 기록 (선수 동의 하에)</p>
        <h4 style="color:#fff; margin:20px 0 12px;">3. 제공받는 자의 이용 목적</h4>
        <p>· 팀 내 선수 관리 및 훈련 데이터 공유</p>
        <p>· 서비스 인프라 운영, 데이터 저장 및 백업</p>
        <p>· 웨어러블 기기 데이터 연동 및 분석</p>
        <h4 style="color:#fff; margin:20px 0 12px;">4. 보유 및 이용기간</h4>
        <p>제공 목적 달성 시 또는 회원 탈퇴 시까지. 법령에 별도 규정이 있는 경우 해당 기간까지.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">5. 동의 거부권</h4>
        <p>이용자는 제3자 제공에 대한 동의를 거부할 수 있으나, 거부 시 팀 내 데이터 공유 기능이 제한될 수 있습니다.</p>
        <p style="margin-top:20px; color:var(--text-tertiary); font-size:12px;">시행일: 2026년 1월 1일</p>
      `,
			},
			location: {
				title: "위치기반서비스 이용약관",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">제1조 (목적)</h4>
        <p>이 약관은 회사가 제공하는 위치기반서비스의 이용조건을 규정합니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제2조 (서비스 내용)</h4>
        <p>· 훈련 장소 기반 날씨·기온 정보 제공</p>
        <p>· 훈련 환경 분석 (고도, 습도, 대기질 등)</p>
        <p>· 위치 기반 훈련 경로 기록</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제3조 (위치정보 수집)</h4>
        <p>· 수집 항목: GPS 좌표, Wi-Fi AP 정보</p>
        <p>· 수집 방법: 이용자 기기의 위치 서비스</p>
        <p>· 이용 목적: 훈련 환경 분석 및 맞춤형 추천</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제4조 (보유 및 이용기간)</h4>
        <p>위치정보는 수집 후 1년간 보유하며, 이용 목적 달성 또는 동의 철회 시 즉시 파기합니다.</p>
        <h4 style="color:#fff; margin:20px 0 12px;">제5조 (동의 철회)</h4>
        <p>이용자는 설정에서 언제든 위치정보 수집 동의를 철회할 수 있습니다.</p>
        <p style="margin-top:20px; color:var(--text-tertiary); font-size:12px;">위치정보관리책임자: 서비스운영팀 / lbs@longrun.co.kr</p>
      `,
			},
			telecom: {
				title: "통신사업 신고번호",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">사업자 정보</h4>
        <p>· 상호: 주식회사 LongRun</p>
        <p>· 대표이사: —</p>
        <p>· 사업자등록번호: 000-00-00000</p>
        <p>· 통신판매업 신고번호: 제2026-서울강남-00000호</p>
        <p>· 부가통신사업 신고번호: 제00000호</p>
        <h4 style="color:#fff; margin:20px 0 12px;">소재지</h4>
        <p>서울특별시 강남구 테헤란로 000, 00층</p>
        <h4 style="color:#fff; margin:20px 0 12px;">연락처</h4>
        <p>· 대표전화: 02-0000-0000</p>
        <p>· 이메일: support@longrun.co.kr</p>
        <p>· 고객센터 운영: 평일 09:00 ~ 18:00 (공휴일 제외)</p>
        <h4 style="color:#fff; margin:20px 0 12px;">호스팅 서비스 제공자</h4>
        <p>Amazon Web Services (AWS)</p>
      `,
			},
			marketing: {
				title: "마케팅 정보 수신 설정",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">수신 항목</h4>
        <p>· 신기능 및 업데이트 안내</p>
        <p>· 스포츠 과학 관련 콘텐츠</p>
        <p>· 이벤트 및 프로모션 알림</p>
        <p>· 서비스 개선을 위한 설문 참여 요청</p>
        <h4 style="color:#fff; margin:20px 0 12px;">수신 방법</h4>
        <p>· 이메일, 앱 푸시 알림, SMS</p>
        <h4 style="color:#fff; margin:20px 0 12px;">수신 거부</h4>
        <p>설정에서 언제든 수신 거부가 가능하며, 수신 거부 후에도 서비스 이용에 필수적인 공지사항(보안 업데이트, 약관 변경 등)은 발송될 수 있습니다.</p>
        <p style="margin-top:12px; color:var(--text-tertiary);">미동의 시에도 서비스 이용에 제한은 없습니다.</p>
      `,
			},
			opensource: {
				title: "오픈소스 라이선스",
				html: `
        <h4 style="color:#fff; margin:0 0 12px;">사용된 오픈소스 소프트웨어</h4>
        <p>본 서비스는 다음의 오픈소스 소프트웨어를 사용하고 있으며, 각 라이선스 조건을 준수합니다.</p>
        <h4 style="color:#fff; margin:20px 0 8px;">Inter Font</h4>
        <p>Copyright (c) Rasmus Andersson<br>License: SIL Open Font License 1.1</p>
        <h4 style="color:#fff; margin:16px 0 8px;">Noto Sans KR</h4>
        <p>Copyright (c) Google<br>License: SIL Open Font License 1.1</p>
        <h4 style="color:#fff; margin:16px 0 8px;">DiceBear Avatars</h4>
        <p>Copyright (c) DiceBear<br>License: MIT License</p>
        <p style="margin-top:20px; color:var(--text-tertiary); font-size:12px;">전체 라이선스 원문은 각 프로젝트의 공식 저장소에서 확인하실 수 있습니다.</p>
      `,
			},
		};
	}

	openSettings() {
		const setOverlay = document.getElementById("setOverlay");
		const setPanel = document.getElementById("setPanel");

		if (!setOverlay || !setPanel) {
			console.error("Settings panel elements not found");
			return;
		}

		setOverlay.classList.add("show");
		setTimeout(() => {
			setPanel.classList.add("open");
		}, 10);
	}

	closeSettings() {
		const setPanel = document.getElementById("setPanel");
		const setOverlay = document.getElementById("setOverlay");

		if (!setPanel || !setOverlay) {
			console.error("Settings panel elements not found");
			return;
		}

		setPanel.classList.remove("open");
		setTimeout(() => {
			setOverlay.classList.remove("show");
		}, 400);
	}

	doLogout() {
		this.closeSettings();
		sessionStorage.clear();
		sessionStorage.setItem("lr_nav", "login");
		location.href = "login.html";
	}

	openLegal(key) {
		if (!key || !this.legalData[key]) {
			console.error("Invalid legal document key:", key);
			return;
		}

		const data = this.legalData[key];
		const legalTitle = document.getElementById("legalTitle");
		const legalBody = document.getElementById("legalBody");
		const legalPanel = document.getElementById("legalPanel");

		if (!legalTitle || !legalBody || !legalPanel) {
			console.error("Legal panel elements not found");
			return;
		}

		legalTitle.textContent = data.title;
		legalBody.innerHTML = data.html;
		legalPanel.classList.add("open");
	}

	closeLegal() {
		const legalPanel = document.getElementById("legalPanel");

		if (!legalPanel) {
			console.error("Legal panel element not found");
			return;
		}

		legalPanel.classList.remove("open");
	}
}

// Instantiate and expose on window
window.settingsManager = new SettingsManager();

// Expose methods on window for inline HTML event handlers
window.openSettings = () => {
	window.settingsManager.openSettings();
};

window.closeSettings = () => {
	window.settingsManager.closeSettings();
};

window.doLogout = () => {
	window.settingsManager.doLogout();
};

window.openLegal = (key) => {
	window.settingsManager.openLegal(key);
};

window.closeLegal = () => {
	window.settingsManager.closeLegal();
};
