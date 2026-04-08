/**
 * Shared utility functions
 * Exposes: window.generateCode, window.fmtPhone, window.safeJSONParse, window.Utils
 */

/**
 * Generates a random 6-character team code
 * @returns {string} - 6-character code (A-Z, 2-9, excluding I, O, 0, 1)
 */
function generateCode() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

/**
 * Formats a phone number input with hyphens (###-####-#### pattern)
 * @param {HTMLInputElement} el - Input element containing phone number
 */
function fmtPhone(el) {
	if (!el || typeof el.value === "undefined") return;

	let v = el.value.replace(/\D/g, "");
	if (v.length > 3 && v.length <= 7) {
		v = v.slice(0, 3) + "-" + v.slice(3);
	} else if (v.length > 7) {
		v = v.slice(0, 3) + "-" + v.slice(3, 7) + "-" + v.slice(7, 11);
	}
	el.value = v;
}

/**
 * Safe JSON.parse with fallback value
 * @param {string} str - JSON string to parse
 * @param {*} fallback - Value to return if parsing fails (default: null)
 * @returns {*} - Parsed object or fallback value
 */
function safeJSONParse(str, fallback) {
	try {
		return JSON.parse(str);
	} catch (e) {
		return fallback !== undefined ? fallback : null;
	}
}

// Expose functions on window object (individually and as Utils object)
window.generateCode = generateCode;
window.fmtPhone = fmtPhone;
window.safeJSONParse = safeJSONParse;

window.Utils = {
	generateCode: generateCode,
	fmtPhone: fmtPhone,
	safeJSONParse: safeJSONParse,
};
