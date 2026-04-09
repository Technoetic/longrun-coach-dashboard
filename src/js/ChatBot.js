class ChatBot {
	constructor() {
		// No special initialization needed
	}

	renderMd(text) {
		if (!text) return '';
		return text
			// 불릿 리스트 (줄바꿈 전에 처리)
			.replace(/^\s*[\*\-]\s+(.+)/gm, '{{BULLET}}$1{{/BULLET}}')
			// 번호 리스트
			.replace(/^(\d+)\.\s+/gm, '{{NUM}}$1.{{/NUM}} ')
			// 볼드 (** 먼저)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			// 줄바꿈
			.replace(/\n/g, '<br>')
			// 불릿 복원
			.replace(/\{\{BULLET\}\}(.+?)\{\{\/BULLET\}\}/g, '<div style="display:flex;gap:6px;margin:2px 0;padding-left:8px"><span style="color:#4ade80">•</span><span>$1</span></div>')
			// 번호 복원
			.replace(/\{\{NUM\}\}(.+?)\{\{\/NUM\}\}/g, '<strong>$1</strong>');
	}

	openChat() {
		document.getElementById("chatOverlay").classList.add("show");
		setTimeout(
			() => document.getElementById("chatPanel").classList.add("open"),
			10,
		);
		document.getElementById("fabChat").style.display = "none";
	}

	closeChat() {
		document.getElementById("chatPanel").classList.remove("open");
		setTimeout(() => {
			document.getElementById("chatOverlay").classList.remove("show");
			document.getElementById("fabChat").style.display = "flex";
		}, 400);
	}

	sendQuick(btn) {
		const text = btn.textContent;
		const quickWrap = btn.closest(".chat-msg");
		if (quickWrap) quickWrap.remove();
		this.addMsg("user", text);
		this.showTypingThenReply(text);
	}

	sendMsg() {
		const input = document.getElementById("chatInput");
		const text = input.value.trim();
		if (!text) return;
		input.value = "";
		this.addMsg("user", text);
		this.showTypingThenReply(text);
	}

	addMsg(type, content) {
		const wrap = document.getElementById("chatMessages");
		const msg = document.createElement("div");
		msg.className = "chat-msg " + type;
		const sender = document.createElement("span");
		sender.className = "sender";
		sender.textContent = type === "ai" ? "LongRun AI" : "";
		const bubble = document.createElement("div");
		bubble.className = "chat-bubble";
		if (type === "user") {
			bubble.textContent = content;
		} else {
			bubble.innerHTML = this.renderMd(content);
		}
		msg.appendChild(sender);
		msg.appendChild(bubble);
		wrap.appendChild(msg);
		wrap.scrollTop = wrap.scrollHeight;
		return msg;
	}

	addRef(refText) {
		const wrap = document.getElementById("chatMessages");
		const ref = document.createElement("div");
		ref.className = "chat-msg ai";
		ref.innerHTML =
			'<span class="sender"></span><div class="chat-ref">' + refText + "</div>";
		wrap.appendChild(ref);
		wrap.scrollTop = wrap.scrollHeight;
	}

	showTypingThenReply(question) {
		const wrap = document.getElementById("chatMessages");
		const typing = document.createElement("div");
		typing.className = "chat-msg ai";
		typing.innerHTML =
			'<span class="sender">LongRun AI</span><div class="typing-dots"><span></span><span></span><span></span></div>';
		wrap.appendChild(typing);
		wrap.scrollTop = wrap.scrollHeight;

		// KG 코치 챗 API 호출 (백엔드 경유)
		fetch("https://ravishing-grace-production.up.railway.app/api/kg/coach-chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: question })
		})
			.then(r => r.json())
			.then(data => {
				typing.remove();
				const reply = data.reply || '';
				if (reply && !reply.startsWith('AI 응답 오류')) {
					this.addMsg("ai", reply.replace(/\n/g, '<br>'));
					if (data.papers && data.papers.length > 0) {
						const refText = data.papers.map(p => (p.doi && p.doi !== 'N/A' && p.doi !== '') ? `<a href="https://doi.org/${p.doi}" target="_blank">${p.citation}</a>` : p.citation).join('<br>');
						this.addRef('📚 ' + refText);
					}
				} else {
					// KG/LLM 실패 시 하드코딩 폴백
					const { answer, ref } = this.getReply(question);
					this.addMsg("ai", answer);
					if (ref) this.addRef(ref);
				}
			})
			.catch(() => {
				typing.remove();
				const { answer, ref } = this.getReply(question);
				this.addMsg("ai", answer);
				if (ref) this.addRef(ref);
			});
	}

	getReply(q) {
		const lq = q.toLowerCase();

		if (lq.includes("acwr") || lq.includes("부하")) {
			return {
				answer:
					"<strong>ACWR(급성:만성 부하 비율)이 1.5 이상</strong>이면 부상 위험이 급격히 증가합니다. Hulin et al.(2014) 연구에 따르면 ACWR 1.5 이상 시 부상 확률이 2~4배 상승합니다.<br><br>권장 대응:<br>· 훈련 부하를 즉시 20~30% 감소<br>· 고강도 훈련을 저강도 회복 세션으로 대체<br>· ACWR이 0.8~1.3 범위로 돌아올 때까지 점진적 복귀<br>· 수면 및 영양 섭취 모니터링 강화",
				ref: "Ref: Hulin et al. (2014) Br J Sports Med; Gabbett (2016) Br J Sports Med",
			};
		}

		if (lq.includes("햄스트링")) {
			return {
				answer:
					"<strong>햄스트링 부상 예방</strong>의 핵심은 편심성(eccentric) 근력 강화입니다. Nordic Hamstring Exercise는 메타분석에서 햄스트링 부상을 최대 51% 감소시킨 것으로 나타났습니다.<br><br>권장 프로토콜:<br>· Nordic Hamstring Exercise 주 2~3회, 3세트 x 6~8회<br>· 단계적 볼륨 증가 (4주 적응기)<br>· 고속 달리기 전 충분한 워밍업 (15분 이상)<br>· HRV 저하 시 고강도 스프린트 제한",
				ref: "Ref: Al Attar et al. (2017) Br J Sports Med; Van Dyk et al. (2019) Br J Sports Med",
			};
		}

		if (lq.includes("수면") || lq.includes("회복")) {
			return {
				answer:
					"<strong>수면은 운동 회복의 가장 핵심적인 요소</strong>입니다. Mah et al.(2011) 연구에서 선수들의 수면을 10시간으로 연장했을 때 스프린트 시간 향상, 반응 시간 개선, 피로도 감소가 확인되었습니다.<br><br>핵심 포인트:<br>· 최소 7~9시간 수면 확보<br>· 수면 질이 낮으면 HRV가 평균 12~18% 저하<br>· 일정한 취침/기상 시간 유지가 수면 질에 가장 큰 영향<br>· 취침 2시간 전 블루라이트 차단 권장",
				ref: "Ref: Mah et al. (2011) SLEEP; Fullagar et al. (2015) Sports Med",
			};
		}

		if (lq.includes("테이퍼링") || lq.includes("시합")) {
			return {
				answer:
					"<strong>테이퍼링</strong>은 시합 전 훈련량을 점진적으로 줄여 최상의 컨디션을 만드는 전략입니다. Bosquet et al.(2007) 메타분석에 따르면 최적의 테이퍼링 기간은 <strong>8~14일</strong>입니다.<br><br>권장 전략:<br>· 훈련 볼륨 40~60% 감소 (점진적)<br>· 훈련 강도는 유지 (90~100%)<br>· 훈련 빈도는 소폭 감소 (20% 이내)<br>· 수면과 영양에 집중<br>· 기대 퍼포먼스 향상: 평균 2~3%",
				ref: "Ref: Bosquet et al. (2007) Med Sci Sports Exerc; Mujika & Padilla (2003) Med Sci Sports Exerc",
			};
		}

		if (lq.includes("hrv") || lq.includes("심박변이")) {
			return {
				answer:
					"<strong>HRV(심박변이도)</strong>는 자율신경계의 균형 상태를 반영하는 지표로, 회복 상태의 가장 신뢰성 높은 바이오마커 중 하나입니다.<br><br>· HRV가 개인 기준선 대비 지속적으로 감소하면 과훈련 위험 신호<br>· 아침 기상 직후 측정이 가장 정확<br>· 주간 평균 추세가 일일 변동보다 더 의미 있음<br>· HRV 저하 시 고강도 훈련을 저강도로 전환 권장",
				ref: "Ref: Plews et al. (2013) Int J Sports Physiol Perform; Buchheit (2014) Sports Med",
			};
		}

		if (lq.includes("spo2") || lq.includes("산소포화도")) {
			return {
				answer:
					"<strong>SpO2(혈중 산소포화도)</strong>는 정상 범위가 95~100%입니다. 운동선수에서 93% 이하로 떨어지면 주의가 필요합니다.<br><br>· 고지대 훈련 시 자연적으로 저하될 수 있음<br>· 수면 중 반복적 저하는 수면무호흡 가능성 확인 필요<br>· 과훈련 시 안정 시 SpO2가 소폭 감소할 수 있음<br>· 지속적 저하 시 의료진 상담 권장",
				ref: "Ref: Mairbäurl (2013) Compr Physiol; Chapman et al. (2014) J Appl Physiol",
			};
		}

		return {
			answer:
				"좋은 질문입니다. 해당 주제에 대해 관련 연구 데이터를 분석해보겠습니다.<br><br>현재 선수단의 데이터를 종합하면, <strong>개별 선수의 컨디션 추이와 훈련 부하 밸런스</strong>를 함께 고려하는 것이 중요합니다. 보다 구체적인 선수명이나 지표를 말씀해주시면 상세한 분석을 제공해드리겠습니다.<br><br>자주 묻는 질문:<br>· ACWR 관리 전략<br>· 부상 예방 훈련법<br>· 수면/회복 최적화<br>· 시합 전 테이퍼링",
			ref: null,
		};
	}
}

// Instantiate and expose on window
window.chatBot = new ChatBot();

// Expose main methods on window for backward compatibility
window.openChat = () => {
	window.chatBot.openChat();
};

window.closeChat = () => {
	window.chatBot.closeChat();
};

window.sendQuick = (btn) => {
	window.chatBot.sendQuick(btn);
};

window.sendMsg = () => {
	window.chatBot.sendMsg();
};
