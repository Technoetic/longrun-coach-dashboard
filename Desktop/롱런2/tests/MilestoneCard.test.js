import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers.js';

describe('MilestoneCard (buildCard)', () => {
  beforeEach(() => {
    loadScripts(['DataStore.js', 'MilestoneCard.js']);
  });

  it('should create an article element', () => {
    const m = { id: 'M01', date: '2026-03-23', displayDate: '3.23', icon: '📄', title: 'Test', desc: 'desc', status: 'completed' };
    const card = globalThis.buildCard(m, 'left');
    expect(card.tagName).toBe('ARTICLE');
  });

  it('should have milestone-card class', () => {
    const m = { id: 'M01', date: '2026-03-23', displayDate: '3.23', icon: '📄', title: 'Test', desc: 'desc', status: 'completed' };
    const card = globalThis.buildCard(m, 'left');
    expect(card.classList.contains('milestone-card')).toBe(true);
  });

  it('should display the title', () => {
    const m = { id: 'M01', date: '2026-03-23', displayDate: '3.23', icon: '📄', title: '테스트 제목', desc: 'desc', status: 'completed' };
    const card = globalThis.buildCard(m, 'left');
    const titleEl = card.querySelector('.card-title');
    expect(titleEl.textContent).toBe('테스트 제목');
  });

  it('should not have status badge', () => {
    const m = { id: 'M01', date: '2026-03-23', displayDate: '3.23', icon: '📄', title: 'Test', desc: 'desc', status: 'completed' };
    const card = globalThis.buildCard(m, 'left');
    const badge = card.querySelector('.card-status-badge');
    expect(badge).toBeNull();
  });

  it('should contain the icon', () => {
    const m = { id: 'M01', date: '2026-03-23', displayDate: '3.23', icon: '🚀', title: 'Test', desc: 'desc', status: 'pending' };
    const card = globalThis.buildCard(m, 'right');
    const iconWrap = card.querySelector('.card-icon-wrap');
    expect(iconWrap.textContent).toBe('🚀');
  });

  it('should have description', () => {
    const m = { id: 'M01', date: '2026-03-23', displayDate: '3.23', icon: '📄', title: 'Test', desc: '설명', status: 'completed' };
    const card = globalThis.buildCard(m, 'left');
    expect(card.querySelector('.card-desc').textContent).toBe('설명');
  });
});
