import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers.js';

describe('Phase (buildPhase, buildDot)', () => {
  beforeEach(() => {
    loadScripts(['DataStore.js', 'MilestoneCard.js', 'Phase.js']);
  });

  it('buildDot should create timeline-dot-col', () => {
    const col = globalThis.buildDot('done');
    expect(col.className).toContain('timeline-dot-col');
  });

  it('buildDot should have status class', () => {
    const col = globalThis.buildDot('prog');
    const dot = col.querySelector('.timeline-dot');
    expect(dot.classList.contains('timeline-dot--prog')).toBe(true);
  });

  it('buildPhase should create a section', () => {
    const section = globalThis.buildPhase(globalThis.ROADMAP.phases[0]);
    expect(section.tagName).toBe('SECTION');
  });

  it('buildPhase should have correct id', () => {
    const section = globalThis.buildPhase(globalThis.ROADMAP.phases[0]);
    expect(section.id).toBe('phase-P1');
  });

  it('buildPhase should render 5 cards for P1', () => {
    const section = globalThis.buildPhase(globalThis.ROADMAP.phases[0]);
    const cards = section.querySelectorAll('.milestone-card');
    expect(cards.length).toBe(5);
  });

  it('buildPhase should display title', () => {
    const section = globalThis.buildPhase(globalThis.ROADMAP.phases[0]);
    const title = section.querySelector('.phase-title-h2');
    expect(title.textContent).toContain('MVP');
  });
});
