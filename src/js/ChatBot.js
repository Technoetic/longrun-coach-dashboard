class ChatBot {
	constructor() {
		this.sessionId = 'coach_' + Math.random().toString(36).substring(2, 10);
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

		// 스트리밍 메시지 버블 생성
		const msg = document.createElement("div");
		msg.className = "chat-msg ai";
		const sender = document.createElement("span");
		sender.className = "sender";
		sender.textContent = "LongRun AI";
		const bubble = document.createElement("div");
		bubble.className = "chat-bubble";
		bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
		msg.appendChild(sender);
		msg.appendChild(bubble);
		wrap.appendChild(msg);
		wrap.scrollTop = wrap.scrollHeight;

		// SSE 스트리밍 시도
		fetch("/api/kg/coach-chat/stream", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: question, session_id: this.sessionId })
		}).then(response => {
			if (!response.ok || !response.body) {
				// 스트리밍 미지원 시 일반 API 폴백
				return this._fallbackChat(question, bubble, wrap);
			}
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let fullReply = '';
			let papers = [];
			bubble.innerHTML = '';

			const read = () => {
				reader.read().then(({ done, value }) => {
					if (done) {
						// 스트리밍 완료 — 최종 렌더링
						bubble.innerHTML = this.renderMd(fullReply);
						wrap.scrollTop = wrap.scrollHeight;
						if (papers.length > 0) {
							const refText = papers.map(p => (p.doi && p.doi !== 'N/A' && p.doi !== '') ? `<a href="https://doi.org/${p.doi}" target="_blank">${p.citation}</a>` : p.citation).join('<br>');
							this.addRef('📚 ' + refText);
						}
						return;
					}
					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split('\n');
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') continue;
							try {
								const parsed = JSON.parse(data);
								if (parsed.token) {
									fullReply += parsed.token;
									bubble.innerHTML = this.renderMd(fullReply) + '<span class="cursor">▊</span>';
									wrap.scrollTop = wrap.scrollHeight;
								}
								if (parsed.papers) papers = parsed.papers;
							} catch (e) {}
						}
					}
					read();
				});
			};
			read();
		}).catch(() => {
			this._fallbackChat(question, bubble, wrap);
		});
	}

	_fallbackChat(question, bubble, wrap) {
		// 일반 (비스트리밍) API 호출
		return fetch("/api/kg/coach-chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: question, session_id: this.sessionId })
		})
			.then(r => r.json())
			.then(data => {
				const reply = data.reply || '';
				if (reply && !reply.startsWith('AI 응답 오류')) {
					bubble.innerHTML = this.renderMd(reply);
					wrap.scrollTop = wrap.scrollHeight;
					if (data.papers && data.papers.length > 0) {
						const refText = data.papers.map(p => (p.doi && p.doi !== 'N/A' && p.doi !== '') ? `<a href="https://doi.org/${p.doi}" target="_blank">${p.citation}</a>` : p.citation).join('<br>');
						this.addRef('📚 ' + refText);
					}
				} else {
					const { answer } = this.getReply();
					bubble.innerHTML = this.renderMd(answer);
				}
			})
			.catch(() => {
				const { answer } = this.getReply();
				bubble.innerHTML = this.renderMd(answer);
			});
	}

	getReply() {
		return {
			answer: "일시적으로 연결이 불안정합니다. 잠시 후 다시 질문해주세요.",
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
