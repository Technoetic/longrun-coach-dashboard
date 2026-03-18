import { COLORS, SIZES } from "../utils/constants.js";

export class Visualizer {
	constructor(canvasId) {
		this.canvas = document.getElementById(canvasId);
		this.ctx = this.canvas.getContext("2d");
		this.animationProgress = 1; // 0-1 for interpolation
	}

	resize() {
		const container = this.canvas.parentElement;
		this.canvas.width = container.clientWidth;
		this.canvas.height = container.clientHeight;
	}

	render(step) {
		if (!step) return;
		const { array, indices, minIndex, currentIndex, sorted, type } = step;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const n = array.length;
		const padding = SIZES.canvasPadding;
		const availableWidth = this.canvas.width - padding * 2;
		const barWidth = Math.min(
			SIZES.barMaxWidth,
			Math.max(
				SIZES.barMinWidth,
				(availableWidth - (n - 1) * SIZES.barGap) / n,
			),
		);
		const totalBarsWidth = n * barWidth + (n - 1) * SIZES.barGap;
		const startX = (this.canvas.width - totalBarsWidth) / 2;

		const maxVal = Math.max(...array);
		const maxBarHeight = this.canvas.height - padding * 2 - 30; // 30 for number labels

		for (let i = 0; i < n; i++) {
			const x = startX + i * (barWidth + SIZES.barGap);
			const barHeight = (array[i] / maxVal) * maxBarHeight;
			const y = this.canvas.height - padding - barHeight;

			// Determine bar color
			const color = this._getBarColor(i, step);

			// Draw bar with rounded top
			this.ctx.fillStyle = color;
			this.ctx.beginPath();
			const radius = Math.min(barWidth / 4, 4);
			this.ctx.moveTo(x, y + barHeight);
			this.ctx.lineTo(x, y + radius);
			this.ctx.arcTo(x, y, x + radius, y, radius);
			this.ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
			this.ctx.lineTo(x + barWidth, y + barHeight);
			this.ctx.closePath();
			this.ctx.fill();

			// Draw value label above bar
			this.ctx.fillStyle = COLORS.text;
			this.ctx.font = `${Math.min(12, barWidth - 2)}px system-ui`;
			this.ctx.textAlign = "center";
			this.ctx.fillText(array[i], x + barWidth / 2, y - 5);

			// Draw index label below bar
			this.ctx.fillStyle = COLORS.textSecondary;
			this.ctx.font = "10px system-ui";
			this.ctx.fillText(i, x + barWidth / 2, this.canvas.height - padding + 15);
		}
	}

	_getBarColor(index, step) {
		const { indices, minIndex, currentIndex, sorted, type } = step;

		// Sorted bars are always green
		if (sorted && sorted.includes(index)) {
			return COLORS.barSorted;
		}

		// Current type-specific coloring
		if (type === "swap" && indices && indices.includes(index)) {
			return COLORS.barSwapping;
		}

		if (type === "found-min" && index === minIndex) {
			return COLORS.barMinimum;
		}

		if (indices && indices.includes(index)) {
			if (index === minIndex) return COLORS.barMinimum;
			return COLORS.barComparing;
		}

		if (index === minIndex && minIndex >= 0) {
			return COLORS.barMinimum;
		}

		if (index === currentIndex && currentIndex >= 0) {
			return COLORS.barCurrent;
		}

		return COLORS.barDefault;
	}
}
