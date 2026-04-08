class DdayManager {
	constructor() {
		this.init();
	}

	init() {
		const saved = (
			typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
		)(localStorage.getItem("lr_dday") || "null");
		if (saved) {
			this.updateDdayBtn(saved.name, saved.date);
		}
	}

	openDday() {
		const saved = (
			typeof safeJSONParse !== "undefined" ? safeJSONParse : JSON.parse
		)(localStorage.getItem("lr_dday") || "null");
		if (saved) {
			document.getElementById("ddayName").value = saved.name;
			document.getElementById("ddayDate").value = saved.date;
			this.updateDdayPreview();
		} else {
			document.getElementById("ddayName").value = "";
			document.getElementById("ddayDate").value = "";
			document.getElementById("ddayPreview").style.display = "none";
		}
		document.getElementById("ddayOverlay").classList.add("show");
		document.getElementById("ddayDate").onchange = () =>
			this.updateDdayPreview();
		document.getElementById("ddayName").oninput = () =>
			this.updateDdayPreview();
	}

	closeDday() {
		document.getElementById("ddayOverlay").classList.remove("show");
	}

	updateDdayPreview() {
		const name = document.getElementById("ddayName").value.trim();
		const date = document.getElementById("ddayDate").value;
		const preview = document.getElementById("ddayPreview");

		if (name && date) {
			const diff = Math.ceil(
				(new Date(date) - new Date()) / (1000 * 60 * 60 * 24),
			);
			const label =
				diff > 0 ? "D-" + diff : diff === 0 ? "D-Day" : "D+" + Math.abs(diff);
			document.getElementById("ddayPreviewNum").textContent = label;
			document.getElementById("ddayPreviewLabel").textContent = name;
			preview.style.display = "block";
		} else {
			preview.style.display = "none";
		}
	}

	saveDday() {
		const name = document.getElementById("ddayName").value.trim();
		const date = document.getElementById("ddayDate").value;
		if (!name || !date) return;

		localStorage.setItem("lr_dday", JSON.stringify({ name, date }));
		this.updateDdayBtn(name, date);
		this.closeDday();
	}

	deleteDday() {
		localStorage.removeItem("lr_dday");
		const btn = document.getElementById("ddayBtn");
		btn.textContent = "대회 설정";
		btn.style.background = "var(--surface)";
		btn.style.color = "var(--text-tertiary)";
		btn.style.borderColor = "var(--border-2)";
		this.closeDday();
	}

	updateDdayBtn(name, date) {
		const diff = Math.ceil(
			(new Date(date) - new Date()) / (1000 * 60 * 60 * 24),
		);
		const label =
			diff > 0 ? "D-" + diff : diff === 0 ? "D-Day" : "D+" + Math.abs(diff);
		const btn = document.getElementById("ddayBtn");
		btn.textContent = label + " " + name;
		btn.style.background = "var(--blue-dim)";
		btn.style.color = "var(--blue)";
		btn.style.borderColor = "transparent";
	}
}

// Expose class to window (for testing and runtime use)
window.DdayManager = DdayManager;

// Instantiate and expose methods to window
window.ddayManager = new DdayManager();
window.openDday = () => window.ddayManager.openDday();
window.closeDday = () => window.ddayManager.closeDday();
window.updateDdayPreview = () => window.ddayManager.updateDdayPreview();
window.saveDday = () => window.ddayManager.saveDday();
window.deleteDday = () => window.ddayManager.deleteDday();
