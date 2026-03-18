import { ANIMATION } from "../utils/constants.js";

export class AnimationManager {
	constructor() {
		this.isPlaying = false;
		this.speed = ANIMATION.defaultSpeed;
		this.timerId = null;
		this.onStep = null; // callback
	}

	play(onStep) {
		if (this.isPlaying) return;
		this.isPlaying = true;
		this.onStep = onStep;
		this._tick();
	}

	pause() {
		this.isPlaying = false;
		if (this.timerId) {
			clearTimeout(this.timerId);
			this.timerId = null;
		}
	}

	toggle(onStep) {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play(onStep);
		}
		return this.isPlaying;
	}

	setSpeed(speedIndex) {
		this.speed = ANIMATION.speedSteps[speedIndex] || ANIMATION.defaultSpeed;
	}

	_tick() {
		if (!this.isPlaying || !this.onStep) return;

		const hasMore = this.onStep();
		if (hasMore) {
			this.timerId = setTimeout(() => this._tick(), this.speed);
		} else {
			this.isPlaying = false;
		}
	}

	stop() {
		this.pause();
		this.onStep = null;
	}
}
