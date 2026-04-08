/**
 * DraggableFab - Draggable Floating Action Button Controller
 *
 * Handles drag-and-drop behavior for FAB with snap-back to home position
 * and touch/mouse event support.
 */
class DraggableFab {
	constructor(fabElementId) {
		this.fab = document.getElementById(fabElementId);

		// Fail gracefully if element not found
		if (!this.fab) {
			console.warn(
				`[DraggableFab] Element with id "${fabElementId}" not found`,
			);
			return;
		}

		// Configuration constants
		this.SNAP_DIST = 80;
		this.homeRight = 28;
		this.homeBottom = 28;

		// State tracking
		this.homeX = 0;
		this.homeY = 0;
		this.dragging = false;
		this.didMove = false;
		this.offsetX = 0;
		this.offsetY = 0;
		this.curX = 0;
		this.curY = 0;
		this.touchActive = false;

		// Bind methods to preserve 'this' context
		this.onStart = this.onStart.bind(this);
		this.onMove = this.onMove.bind(this);
		this.onEnd = this.onEnd.bind(this);
		this.onWindowResize = this.onWindowResize.bind(this);

		// Initialize position and attach listeners
		this.calcHome();
		this.setPos(this.homeX, this.homeY);
		this.attachListeners();
	}

	/**
	 * Calculate home position based on viewport and FAB dimensions
	 */
	calcHome() {
		if (!this.fab) return;

		const bodyRect = document.body.getBoundingClientRect();
		this.homeX =
			bodyRect.left + bodyRect.width - this.homeRight - this.fab.offsetWidth;
		this.homeY = window.innerHeight - this.homeBottom - this.fab.offsetHeight;
	}

	/**
	 * Set FAB position in viewport coordinates
	 */
	setPos(x, y) {
		if (!this.fab) return;

		this.fab.style.left = x + "px";
		this.fab.style.top = y + "px";
	}

	/**
	 * Start drag operation (mouse or touch)
	 */
	onStart(clientX, clientY) {
		if (!this.fab) return;

		this.dragging = true;
		this.didMove = false;
		this.fab.classList.remove("snapping");
		this.fab.classList.add("dragging");

		const r = this.fab.getBoundingClientRect();
		this.offsetX = clientX - r.left;
		this.offsetY = clientY - r.top;
	}

	/**
	 * Handle drag movement with boundary clamping
	 */
	onMove(clientX, clientY) {
		if (!this.dragging || !this.fab) return;

		this.didMove = true;
		this.curX = clientX - this.offsetX;
		this.curY = clientY - this.offsetY;

		// Clamp to viewport bounds
		this.curX = Math.max(
			0,
			Math.min(this.curX, window.innerWidth - this.fab.offsetWidth),
		);
		this.curY = Math.max(
			0,
			Math.min(this.curY, window.innerHeight - this.fab.offsetHeight),
		);

		this.setPos(this.curX, this.curY);
	}

	/**
	 * End drag operation with snap-back behavior
	 */
	onEnd() {
		if (!this.dragging || !this.fab) return;

		this.dragging = false;
		this.touchActive = false;
		this.fab.classList.remove("dragging");

		this.calcHome();

		// Calculate distance from home position
		const dx = this.curX - this.homeX;
		const dy = this.curY - this.homeY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		// Snap back to home if close enough or didn't move
		if (dist < this.SNAP_DIST || !this.didMove) {
			this.fab.classList.add("snapping");
			this.setPos(this.homeX, this.homeY);
			setTimeout(() => {
				if (this.fab) {
					this.fab.classList.remove("snapping");
				}
			}, 400);
		}

		// Trigger chat if tapped without dragging
		if (!this.didMove && typeof window.openChat === "function") {
			window.openChat();
		}
	}

	/**
	 * Handle window resize to recalculate home position
	 */
	onWindowResize() {
		if (!this.fab || this.dragging) return;

		this.calcHome();
		this.setPos(this.homeX, this.homeY);
	}

	/**
	 * Attach all event listeners (mouse and touch)
	 */
	attachListeners() {
		if (!this.fab) return;

		// Mouse events
		this.fab.addEventListener("mousedown", (e) => {
			e.preventDefault();
			this.touchActive = false;
			this.onStart(e.clientX, e.clientY);
		});

		window.addEventListener("mousemove", (e) => {
			if (!this.touchActive) {
				this.onMove(e.clientX, e.clientY);
			}
		});

		window.addEventListener("mouseup", () => {
			if (!this.touchActive) {
				this.onEnd();
			}
		});

		// Touch events with passive listeners for performance
		this.fab.addEventListener(
			"touchstart",
			(e) => {
				this.touchActive = true;
				this.onStart(e.touches[0].clientX, e.touches[0].clientY);
			},
			{ passive: true },
		);

		window.addEventListener(
			"touchmove",
			(e) => {
				if (this.dragging && this.touchActive) {
					e.preventDefault();
					this.onMove(e.touches[0].clientX, e.touches[0].clientY);
				}
			},
			{ passive: false },
		);

		window.addEventListener("touchend", () => {
			if (this.touchActive) {
				this.onEnd();
			}
		});

		// Handle window resize
		window.addEventListener("resize", this.onWindowResize);
	}

	/**
	 * Cleanup: remove all event listeners
	 */
	destroy() {
		if (!this.fab) return;

		window.removeEventListener("resize", this.onWindowResize);
		window.removeEventListener("mousemove", this.onMove);
		window.removeEventListener("mouseup", this.onEnd);
		window.removeEventListener("touchmove", this.onMove);
		window.removeEventListener("touchend", this.onEnd);

		this.fab.removeEventListener("mousedown", this.onStart);
		this.fab.removeEventListener("touchstart", this.onStart);
	}
}

// Auto-instantiate if FAB element exists on page load
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		if (document.getElementById("fabChat")) {
			window.draggableFab = new DraggableFab("fabChat");
		}
	});
} else {
	// Already loaded
	if (document.getElementById("fabChat")) {
		window.draggableFab = new DraggableFab("fabChat");
	}
}
