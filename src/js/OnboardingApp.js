/**
 * OnboardingApp
 * Encapsulates the onboarding page's JavaScript logic
 * Handles slide navigation, keyboard/touch input, and DOM state management
 */
class OnboardingApp {
	constructor() {
		// Cache DOM elements
		this.slides = document.querySelectorAll(".slide");
		this.dots = document.querySelectorAll(".dot");
		this.nextBtn = document.getElementById("nextBtn");

		// State variables
		this.current = 0;
		this.total = this.slides.length;
		this.prevIndex = 0;
		this.touchStartX = 0;

		// Bind methods to preserve 'this' context in event listeners
		this.handleTouchStart = this.handleTouchStart.bind(this);
		this.handleTouchEnd = this.handleTouchEnd.bind(this);
		this.handleKeyDown = this.handleKeyDown.bind(this);

		// Initialize event listeners
		this.attachEventListeners();
	}

	/**
	 * Attach all event listeners
	 */
	attachEventListeners() {
		document.addEventListener("touchstart", this.handleTouchStart, false);
		document.addEventListener("touchend", this.handleTouchEnd, false);
		document.addEventListener("keydown", this.handleKeyDown, false);
	}

	/**
	 * Remove all event listeners (cleanup)
	 */
	detachEventListeners() {
		document.removeEventListener("touchstart", this.handleTouchStart, false);
		document.removeEventListener("touchend", this.handleTouchEnd, false);
		document.removeEventListener("keydown", this.handleKeyDown, false);
	}

	/**
	 * Handle touch start event
	 */
	handleTouchStart(e) {
		this.touchStartX = e.changedTouches[0].screenX;
	}

	/**
	 * Handle touch end event (swipe detection)
	 */
	handleTouchEnd(e) {
		const touchEndX = e.changedTouches[0].screenX;
		const diff = this.touchStartX - touchEndX;

		// Detect swipe with 60px threshold
		if (Math.abs(diff) > 60) {
			// Swipe left (positive diff): go to next slide
			if (diff > 0 && this.current < this.total - 1) {
				this.goTo(this.current + 1);
			}
			// Swipe right (negative diff): go to previous slide
			else if (diff < 0 && this.current > 0) {
				this.goTo(this.current - 1);
			}
		}
	}

	/**
	 * Handle keyboard events
	 */
	handleKeyDown(e) {
		if (e.key === "ArrowRight" || e.key === " ") {
			this.next();
		}
		if (e.key === "ArrowLeft" && this.current > 0) {
			this.goTo(this.current - 1);
		}
	}

	/**
	 * Navigate to specific slide index
	 * @param {number} index - Target slide index
	 */
	goTo(index) {
		// Prevent redundant navigation
		if (index === this.current) return;

		// Fade out previous slide
		this.prevIndex = this.current;
		this.slides[this.prevIndex].classList.remove("active");
		this.slides[this.prevIndex].classList.add("exit");

		// Remove exit animation class after animation completes (600ms)
		setTimeout(() => {
			this.slides[this.prevIndex].classList.remove("exit");
		}, 600);

		// Update current slide
		this.current = index;
		this.slides[this.current].classList.add("active");

		// Update dots
		this.dots.forEach((dot, i) => {
			dot.classList.toggle("active", i === this.current);
		});

		// Update next button text and styling
		if (this.current === this.total - 1) {
			this.nextBtn.textContent = "시작하기";
			this.nextBtn.classList.add("final");
		} else {
			this.nextBtn.textContent = "다음";
			this.nextBtn.classList.remove("final");
		}
	}

	/**
	 * Navigate to next slide or redirect to login
	 */
	next() {
		if (this.current < this.total - 1) {
			this.goTo(this.current + 1);
		} else {
			// Last slide: redirect to login
			sessionStorage.setItem("lr_nav", "login");
			window.location.href = "login.html";
		}
	}

	/**
	 * Skip onboarding and redirect to signup
	 */
	skip() {
		sessionStorage.setItem("lr_nav", "signup");
		window.location.href = "signup.html";
	}
}

// Instantiate and attach to window for global access
window.onboardingApp = new OnboardingApp();

// Expose methods on window for HTML onclick handlers
window.goTo = (index) => window.onboardingApp.goTo(index);
window.next = () => window.onboardingApp.next();
window.skip = () => window.onboardingApp.skip();
