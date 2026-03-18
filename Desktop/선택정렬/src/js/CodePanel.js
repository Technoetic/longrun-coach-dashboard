import { PSEUDOCODE, STEP_TO_LINE } from "../utils/constants.js";

export class CodePanel {
	constructor(containerId) {
		this.container = document.getElementById(containerId);
		this._renderCode();
	}

	_renderCode() {
		this.container.textContent = "";
		PSEUDOCODE.forEach((line, i) => {
			const indent = line.match(/^(\s*)/)[0].length;
			const div = document.createElement("div");
			div.className = "code-line";
			div.dataset.line = i;
			div.style.paddingLeft = `${indent * 12}px`;

			const numSpan = document.createElement("span");
			numSpan.className = "code-line__number";
			numSpan.textContent = i + 1;

			const textSpan = document.createElement("span");
			textSpan.className = "code-line__text";
			textSpan.textContent = line.trim();

			div.appendChild(numSpan);
			div.appendChild(textSpan);
			this.container.appendChild(div);
		});
	}

	highlight(lineNum) {
		// Remove previous highlights
		const lines = this.container.querySelectorAll(".code-line");
		lines.forEach((line) => line.classList.remove("code-line--active"));

		// Add highlight to current line
		if (lineNum >= 0 && lineNum < lines.length) {
			lines[lineNum].classList.add("code-line--active");
			lines[lineNum].scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}

	update(step) {
		if (!step) return;
		this.highlight(step.pseudoLineNum || 0);
	}
}
