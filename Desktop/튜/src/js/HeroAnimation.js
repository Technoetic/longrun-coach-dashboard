/**
 * HeroAnimation - 히어로 섹션 Force Graph 애니메이션
 *
 * 책임: BFS 파동 효과 Force Graph 캔버스 렌더링
 */

class HeroAnimation {
	constructor(canvas) {
		this._canvas = canvas;
		this._ctx = canvas.getContext("2d");
		this._rafId = null;
		this._startTime = performance.now();
		this._graph = null;
		this._CYCLE_MS = 4000;
		this._onResize = null;
		this._onVisibility = null;
	}

	init() {
		if (!this._ctx) return;
		this._syncSize();
		this._graph = this._buildGraph(this._canvas.width, this._canvas.height);

		this._onResize = () => {
			this._syncSize();
			this._graph = this._buildGraph(this._canvas.width, this._canvas.height);
		};
		window.addEventListener("resize", this._onResize);

		this._onVisibility = () => {
			if (document.hidden) {
				if (this._rafId) {
					cancelAnimationFrame(this._rafId);
					this._rafId = null;
				}
			} else {
				this._startTime = performance.now() - (this._startTime % this._CYCLE_MS);
				this._rafId = requestAnimationFrame((ts) => this._drawFrame(ts));
			}
		};
		document.addEventListener("visibilitychange", this._onVisibility);

		this._rafId = requestAnimationFrame((ts) => this._drawFrame(ts));
	}

	destroy() {
		if (this._rafId) {
			cancelAnimationFrame(this._rafId);
			this._rafId = null;
		}
		if (this._onResize) window.removeEventListener("resize", this._onResize);
		if (this._onVisibility) document.removeEventListener("visibilitychange", this._onVisibility);
	}

	_syncSize() {
		const rect = this._canvas.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			this._canvas.width = rect.width;
			this._canvas.height = rect.height;
		}
	}

	_isMobile() {
		return window.innerWidth < 768;
	}

	_buildGraph(w, h) {
		const cx = w / 2;
		const cy = h / 2;
		const r = Math.min(w, h) * 0.32;
		const nodeCount = 8;
		const nodes = [];
		for (let i = 0; i < nodeCount; i++) {
			const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2;
			nodes.push({
				id: i,
				x: cx + Math.cos(angle) * r,
				y: cy + Math.sin(angle) * r,
				vx: 0,
				vy: 0,
				bfsOrder: i,
			});
		}
		nodes.push({ id: nodeCount, x: cx, y: cy, vx: 0, vy: 0, bfsOrder: -1 });

		const edges = [];
		for (let i = 0; i < nodeCount; i++) {
			edges.push({ from: nodeCount, to: i });
		}
		for (let i = 0; i < nodeCount; i++) {
			edges.push({ from: i, to: (i + 1) % nodeCount });
		}
		return { nodes, edges, startId: nodeCount };
	}

	_getNodeState(node, progress) {
		if (node.id === this._graph.startId) return "start";
		const visitThreshold = (node.bfsOrder / 8) * 0.6;
		const frontierWindow = 0.08;
		if (progress < visitThreshold) return "unvisited";
		if (progress < visitThreshold + frontierWindow) return "frontier";
		return "visited";
	}

	_drawFrame(ts) {
		const canvas = this._canvas;
		const ctx = this._ctx;
		const w = canvas.width;
		const h = canvas.height;

		if (w === 0 || h === 0) {
			this._rafId = requestAnimationFrame((t) => this._drawFrame(t));
			return;
		}

		const opacity = this._isMobile() ? 0.25 : 0.75;
		const elapsed = ts - this._startTime;
		const progress = (elapsed % this._CYCLE_MS) / this._CYCLE_MS;

		ctx.clearRect(0, 0, w, h);
		ctx.globalAlpha = opacity;

		const { nodes, edges } = this._graph;

		ctx.strokeStyle = "rgba(180, 200, 255, 0.25)";
		ctx.lineWidth = 1;
		for (const edge of edges) {
			const a = nodes[edge.from];
			const b = nodes[edge.to];
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}

		for (const node of nodes) {
			const state = this._getNodeState(node, progress);
			const nr = node.id === this._graph.startId ? 9 : 6;

			let fill, stroke;
			if (state === "start") {
				fill = "#388e3c";
				stroke = "#66bb6a";
			} else if (state === "frontier") {
				fill = "#ff9800";
				stroke = "#ffb74d";
			} else if (state === "visited") {
				fill = "#00bcd4";
				stroke = "#4dd0e1";
			} else {
				fill = "rgba(224,224,224,0.5)";
				stroke = "rgba(150,150,150,0.4)";
			}

			if (state === "frontier") {
				ctx.shadowColor = "#ff9800";
				ctx.shadowBlur = 10;
			} else {
				ctx.shadowBlur = 0;
			}

			ctx.beginPath();
			ctx.arc(node.x, node.y, nr, 0, Math.PI * 2);
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.strokeStyle = stroke;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.shadowBlur = 0;
		}

		ctx.globalAlpha = 1;
		this._rafId = requestAnimationFrame((t) => this._drawFrame(t));
	}
}

// 브라우저 전역 등록 (하위 호환)
if (typeof window !== "undefined") {
	window.HeroAnimation = HeroAnimation;
	// 기존 함수형 API 호환 래퍼
	window.renderHeroAnimation = function(canvas) {
		const anim = new HeroAnimation(canvas);
		anim.init();
		return anim;
	};
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = { HeroAnimation };
}
