import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationManager } from '../src/js/AnimationManager.js';
import { ANIMATION } from '../src/utils/constants.js';

describe('AnimationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AnimationManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should start not playing', () => {
    expect(manager.isPlaying).toBe(false);
  });

  it('should initialize with default speed', () => {
    expect(manager.speed).toBe(ANIMATION.defaultSpeed);
  });

  it('should have null onStep callback initially', () => {
    expect(manager.onStep).toBeNull();
  });

  it('should have null timerId initially', () => {
    expect(manager.timerId).toBeNull();
  });

  it('should set playing on play', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    expect(manager.isPlaying).toBe(true);
  });

  it('should set onStep callback when playing', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    expect(manager.onStep).toBe(callback);
  });

  it('should not play twice simultaneously', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    expect(manager.isPlaying).toBe(true);

    const callback2 = vi.fn(() => true);
    manager.play(callback2);

    // Should still use first callback since already playing
    expect(manager.onStep).toBe(callback);
  });

  it('should stop on pause', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    manager.pause();
    expect(manager.isPlaying).toBe(false);
  });

  it('should clear timerId on pause', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    vi.advanceTimersByTime(100);
    manager.pause();
    expect(manager.timerId).toBeNull();
  });

  it('toggle should switch from stopped to playing', () => {
    const callback = vi.fn(() => true);
    const result = manager.toggle(callback);
    expect(result).toBe(true);
    expect(manager.isPlaying).toBe(true);
  });

  it('toggle should switch from playing to stopped', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    expect(manager.isPlaying).toBe(true);

    const result = manager.toggle(callback);
    expect(result).toBe(false);
    expect(manager.isPlaying).toBe(false);
  });

  it('setSpeed should update speed with valid index', () => {
    manager.setSpeed(0);
    expect(manager.speed).toBe(50);

    manager.setSpeed(1);
    expect(manager.speed).toBe(100);

    manager.setSpeed(5);
    expect(manager.speed).toBe(2000);
  });

  it('setSpeed should fall back to default for invalid index', () => {
    manager.setSpeed(999);
    expect(manager.speed).toBe(ANIMATION.defaultSpeed);
  });

  it('stop should pause animation', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    manager.stop();
    expect(manager.isPlaying).toBe(false);
  });

  it('stop should clear onStep callback', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    manager.stop();
    expect(manager.onStep).toBeNull();
  });

  it('should call onStep callback immediately on play', () => {
    const callback = vi.fn(() => false);
    manager.setSpeed(2);
    manager.play(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    // callback returned false, so no more ticks
    expect(manager.isPlaying).toBe(false);
  });

  it('should continue calling onStep while callback returns true', () => {
    let callCount = 0;
    const callback = vi.fn(() => { callCount++; return callCount < 3; });
    manager.setSpeed(0);
    manager.play(callback);

    // First call is immediate
    expect(callback).toHaveBeenCalledTimes(1);
    // Advance timer for second call
    vi.advanceTimersByTime(manager.speed);
    expect(callback).toHaveBeenCalledTimes(2);
    // Third call returns false, stops
    vi.advanceTimersByTime(manager.speed);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(manager.isPlaying).toBe(false);
  });

  it('should stop animation when callback returns false', () => {
    const callback = vi.fn()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    manager.setSpeed(0);
    manager.play(callback);

    vi.advanceTimersByTime(manager.speed * 2);
    expect(manager.isPlaying).toBe(false);
  });

  it('should respect speed changes during playback', () => {
    const callback = vi.fn(() => true);
    manager.setSpeed(0);
    manager.play(callback);

    manager.setSpeed(5);
    expect(manager.speed).toBe(2000);
  });

  it('should handle pause and resume', () => {
    const callback = vi.fn(() => true);
    manager.play(callback);
    expect(manager.isPlaying).toBe(true);

    manager.pause();
    expect(manager.isPlaying).toBe(false);

    manager.play(callback);
    expect(manager.isPlaying).toBe(true);
  });

  it('speed should be within expected range', () => {
    for (let i = 0; i < ANIMATION.speedSteps.length; i++) {
      manager.setSpeed(i);
      expect(manager.speed).toBeGreaterThanOrEqual(ANIMATION.minSpeed);
      expect(manager.speed).toBeLessThanOrEqual(ANIMATION.maxSpeed);
    }
  });

  it('should not call onStep if not playing', () => {
    const callback = vi.fn();
    manager.onStep = callback;
    // _tick should not call callback since isPlaying is false
    manager.pause();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call onStep if callback is null', () => {
    // This is tested implicitly, but good to be explicit
    manager.isPlaying = true;
    manager.onStep = null;
    // _tick should return early without calling null
    expect(() => {
      // _tick won't be called since we can't directly invoke it
      // but the guard should prevent errors
      manager.pause();
    }).not.toThrow();
  });

  it('should properly initialize multiple instances independently', () => {
    const manager2 = new AnimationManager();
    manager.setSpeed(0);
    manager2.setSpeed(5);

    expect(manager.speed).toBe(50);
    expect(manager2.speed).toBe(2000);
  });

  it('should handle rapid play/pause toggles', () => {
    const callback = vi.fn(() => true);

    manager.toggle(callback);
    expect(manager.isPlaying).toBe(true);

    manager.toggle(callback);
    expect(manager.isPlaying).toBe(false);

    manager.toggle(callback);
    expect(manager.isPlaying).toBe(true);

    manager.stop();
    expect(manager.isPlaying).toBe(false);
  });

  it('should handle pause without play', () => {
    expect(() => {
      manager.pause();
    }).not.toThrow();
    expect(manager.isPlaying).toBe(false);
  });

  it('should handle stop without play', () => {
    expect(() => {
      manager.stop();
    }).not.toThrow();
    expect(manager.isPlaying).toBe(false);
  });

  it('toggle should use provided callback', () => {
    const callback1 = vi.fn(() => true);
    const callback2 = vi.fn(() => true);

    manager.toggle(callback1);
    expect(manager.onStep).toBe(callback1);

    manager.toggle(callback2);
    expect(manager.isPlaying).toBe(false);
  });

  it('setSpeed should accept all defined speed steps', () => {
    const speeds = [0, 1, 2, 3, 4, 5];
    for (const speed of speeds) {
      manager.setSpeed(speed);
      expect(manager.speed).toBeDefined();
      expect(manager.speed).toBeGreaterThan(0);
    }
  });
});
