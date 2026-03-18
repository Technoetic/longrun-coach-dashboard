import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers.js';

describe('App (boot)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="scroll-progress-bar"></div><div id="timeline-container"></div><span id="hero-stat-done">0</span><span id="hero-stat-prog">0</span><span id="hero-stat-total">0</span>';
    // Load all scripts — App.js auto-runs boot() since readyState is not 'loading'
    loadScripts(['DataStore.js', 'MilestoneCard.js', 'Phase.js', 'ProgressTracker.js', 'Timeline.js', 'App.js']);
  });

  it('should render 3 phase sections (auto-booted)', () => {
    expect(document.querySelectorAll('.phase-block').length).toBe(3);
  });

  it('should render 15 milestone cards (auto-booted)', () => {
    expect(document.querySelectorAll('.milestone-card').length).toBe(15);
  });

  it('should update hero total to 15', () => {
    expect(document.getElementById('hero-stat-total').textContent).toBe('15');
  });

  it('should not render dashboard', () => {
    expect(document.querySelector('.dashboard-section')).toBeNull();
  });

  it('initScrollBar should not throw', () => {
    expect(() => globalThis.initScrollBar()).not.toThrow();
  });
});
