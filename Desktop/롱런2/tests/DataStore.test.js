import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('DataStore', () => {
  let ROADMAP, resolveStatus, statusLabel;

  beforeEach(() => {
    // Load the script into isolated scope
    const code = fs.readFileSync(path.resolve(__dirname, '../src/js/DataStore.js'), 'utf8');
    // Create a new function scope to eval the code
    const context = {};
    const fn = new Function('ROADMAP', 'resolveStatus', 'statusLabel', code);
    fn.call(context);
    // Extract globals from eval context
    ROADMAP = eval(`(function() { ${code}; return ROADMAP; })()`);
    resolveStatus = eval(`(function() { ${code}; return resolveStatus; })()`);
    statusLabel = eval(`(function() { ${code}; return statusLabel; })()`);
  });

  describe('ROADMAP data structure', () => {
    it('should define ROADMAP object', () => {
      expect(ROADMAP).toBeDefined();
      expect(typeof ROADMAP).toBe('object');
    });

    it('should have phases array', () => {
      expect(ROADMAP.phases).toBeDefined();
      expect(Array.isArray(ROADMAP.phases)).toBe(true);
    });

    it('should have exactly 3 phases', () => {
      expect(ROADMAP.phases).toHaveLength(3);
    });

    it('should have exactly 15 milestones total', () => {
      const total = ROADMAP.phases.reduce((sum, p) => sum + p.milestones.length, 0);
      expect(total).toBe(15);
    });

    it('should have 5 milestones per phase', () => {
      ROADMAP.phases.forEach(phase => {
        expect(phase.milestones).toHaveLength(5);
      });
    });
  });

  describe('Phase structure', () => {
    it('should have correct phase IDs', () => {
      expect(ROADMAP.phases[0].phaseId).toBe('P1');
      expect(ROADMAP.phases[1].phaseId).toBe('P2');
      expect(ROADMAP.phases[2].phaseId).toBe('P3');
    });

    it('should have correct phase numbers', () => {
      expect(ROADMAP.phases[0].phaseNum).toBe(1);
      expect(ROADMAP.phases[1].phaseNum).toBe(2);
      expect(ROADMAP.phases[2].phaseNum).toBe(3);
    });

    it('should have phase titles', () => {
      expect(ROADMAP.phases[0].title).toBe('MVP 완성 및 투자 유치 집중');
      expect(ROADMAP.phases[1].title).toBe('대학·기관 세일즈 및 실증 파이프라인 구축');
      expect(ROADMAP.phases[2].title).toBe('실데이터 수집 가동 및 국가대표 세일즈');
    });

    it('should have phase months', () => {
      expect(ROADMAP.phases[0].month).toBe('3월');
      expect(ROADMAP.phases[1].month).toBe('4월');
      expect(ROADMAP.phases[2].month).toBe('5월');
    });

    it('should have phase themes', () => {
      expect(ROADMAP.phases[0].theme).toBe('dark');
      expect(ROADMAP.phases[1].theme).toBe('mid');
      expect(ROADMAP.phases[2].theme).toBe('deep');
    });
  });

  describe('Milestone structure', () => {
    it('each milestone should have required fields', () => {
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(m.id).toBeDefined();
          expect(typeof m.id).toBe('string');
          expect(m.date).toBeDefined();
          expect(typeof m.date).toBe('string');
          expect(m.displayDate).toBeDefined();
          expect(typeof m.displayDate).toBe('string');
          expect(m.title).toBeDefined();
          expect(typeof m.title).toBe('string');
          expect(m.desc).toBeDefined();
          expect(typeof m.desc).toBe('string');
          expect(m.icon).toBeDefined();
          expect(typeof m.icon).toBe('string');
          expect(m.status).toBeDefined();
          expect(typeof m.status).toBe('string');
        });
      });
    });

    it('should have valid milestone IDs (M01-M15)', () => {
      let count = 1;
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          const expectedId = 'M' + String(count).padStart(2, '0');
          expect(m.id).toBe(expectedId);
          count++;
        });
      });
    });

    it('should have valid date formats (YYYY-MM-DD)', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(m.date).toMatch(dateRegex);
        });
      });
    });

    it('should have valid status values', () => {
      const validStatuses = ['completed', 'in-progress', 'pending'];
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(validStatuses).toContain(m.status);
        });
      });
    });

    it('should have emoji icons', () => {
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(m.icon).toMatch(/[\p{Emoji}]/u);
        });
      });
    });
  });

  describe('resolveStatus function', () => {
    it('should resolve completed status to done', () => {
      const milestone = { status: 'completed', date: '2026-01-01' };
      expect(resolveStatus(milestone)).toBe('done');
    });

    it('should resolve in-progress status to prog', () => {
      const milestone = { status: 'in-progress', date: '2026-01-01' };
      expect(resolveStatus(milestone)).toBe('prog');
    });

    it('should resolve future pending dates to pend', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateStr = futureDate.toISOString().split('T')[0];
      const milestone = { status: 'pending', date: dateStr };
      expect(resolveStatus(milestone)).toBe('pend');
    });

    it('should resolve past pending dates to del (delayed)', () => {
      const milestone = { status: 'pending', date: '2020-01-01' };
      expect(resolveStatus(milestone)).toBe('del');
    });

    it('should default to pend for unknown status with future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateStr = futureDate.toISOString().split('T')[0];
      const milestone = { status: 'unknown', date: dateStr };
      expect(resolveStatus(milestone)).toBe('pend');
    });
  });

  describe('statusLabel function', () => {
    it('should return 완료 for done', () => {
      expect(statusLabel('done')).toBe('완료');
    });

    it('should return 진행중 for prog', () => {
      expect(statusLabel('prog')).toBe('진행중');
    });

    it('should return 예정 for pend', () => {
      expect(statusLabel('pend')).toBe('예정');
    });

    it('should return 지연 for del', () => {
      expect(statusLabel('del')).toBe('지연');
    });

    it('should return 예정 for unknown status', () => {
      expect(statusLabel('unknown')).toBe('예정');
    });

    it('should handle null gracefully', () => {
      expect(statusLabel(null)).toBe('예정');
    });

    it('should handle undefined gracefully', () => {
      expect(statusLabel(undefined)).toBe('예정');
    });
  });

  describe('Phase 1 milestones (MVP 완성 및 투자 유치 집중)', () => {
    let phase1;

    beforeEach(() => {
      phase1 = ROADMAP.phases[0];
    });

    it('should have milestone M01 with government submission', () => {
      const m01 = phase1.milestones[0];
      expect(m01.id).toBe('M01');
      expect(m01.title).toContain('정부 지원사업');
      expect(m01.status).toBe('completed');
    });

    it('should have milestone M02 with model presentation', () => {
      const m02 = phase1.milestones[1];
      expect(m02.id).toBe('M02');
      expect(m02.title).toContain('기록 예측 모델');
      expect(m02.status).toBe('completed');
    });

    it('should have milestone M03 with UI frontend', () => {
      const m03 = phase1.milestones[2];
      expect(m03.id).toBe('M03');
      expect(m03.title).toContain('프론트엔드 UI');
      expect(m03.status).toBe('in-progress');
    });

    it('should have milestone M04 with backend integration', () => {
      const m04 = phase1.milestones[3];
      expect(m04.id).toBe('M04');
      expect(m04.title).toContain('백엔드 데이터-UI 연동');
      expect(m04.status).toBe('pending');
    });

    it('should have milestone M05 with app market submission', () => {
      const m05 = phase1.milestones[4];
      expect(m05.id).toBe('M05');
      expect(m05.title).toContain('앱 마켓 심사 제출');
      expect(m05.status).toBe('pending');
    });
  });

  describe('Phase 2 milestones (대학·기관 세일즈)', () => {
    let phase2;

    beforeEach(() => {
      phase2 = ROADMAP.phases[1];
    });

    it('should have milestone M06 with startup presentation', () => {
      const m06 = phase2.milestones[0];
      expect(m06.id).toBe('M06');
      expect(m06.title).toContain('공단 스타트업');
    });

    it('should have milestone M07 with university professor meeting', () => {
      const m07 = phase2.milestones[1];
      expect(m07.id).toBe('M07');
      expect(m07.title).toContain('한체대');
    });

    it('should have milestone M08 with university president meeting', () => {
      const m08 = phase2.milestones[2];
      expect(m08.id).toBe('M08');
      expect(m08.title).toContain('총장');
    });

    it('should have milestone M09 with government final results', () => {
      const m09 = phase2.milestones[3];
      expect(m09.id).toBe('M09');
      expect(m09.title).toContain('국민체육진흥공단');
    });

    it('should have milestone M10 with retirement athlete support', () => {
      const m10 = phase2.milestones[4];
      expect(m10.id).toBe('M10');
      expect(m10.title).toContain('스포웰');
    });
  });

  describe('Phase 3 milestones (실데이터 수집 및 국가대표 세일즈)', () => {
    let phase3;

    beforeEach(() => {
      phase3 = ROADMAP.phases[2];
    });

    it('should have milestone M11 with spowell announcement', () => {
      const m11 = phase3.milestones[0];
      expect(m11.id).toBe('M11');
      expect(m11.title).toContain('스포웰');
    });

    it('should have milestone M12 with smartwatch distribution', () => {
      const m12 = phase3.milestones[1];
      expect(m12.id).toBe('M12');
      expect(m12.title).toContain('스마트워치');
    });

    it('should have milestone M13 with realtime dashboard', () => {
      const m13 = phase3.milestones[2];
      expect(m13.id).toBe('M13');
      expect(m13.title).toContain('대시보드');
    });

    it('should have milestone M14 with national team meeting', () => {
      const m14 = phase3.milestones[3];
      expect(m14.id).toBe('M14');
      expect(m14.title).toContain('대한체육회장');
    });

    it('should have milestone M15 with final roadmap completion', () => {
      const m15 = phase3.milestones[4];
      expect(m15.id).toBe('M15');
      expect(m15.title).toContain('상반기 로드맵 완료');
    });
  });

  describe('Data integrity', () => {
    it('all milestones should have non-empty titles', () => {
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(m.title.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('all milestones should have non-empty descriptions', () => {
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(m.desc.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('dates should be in chronological order within phases', () => {
      ROADMAP.phases.forEach(phase => {
        for (let i = 0; i < phase.milestones.length - 1; i++) {
          const currentDate = new Date(phase.milestones[i].date);
          const nextDate = new Date(phase.milestones[i + 1].date);
          expect(currentDate.getTime()).toBeLessThanOrEqual(nextDate.getTime());
        }
      });
    });

    it('dates should be in chronological order across phases', () => {
      const allMilestones = ROADMAP.phases.flatMap(p => p.milestones);
      for (let i = 0; i < allMilestones.length - 1; i++) {
        const currentDate = new Date(allMilestones[i].date);
        const nextDate = new Date(allMilestones[i + 1].date);
        expect(currentDate.getTime()).toBeLessThanOrEqual(nextDate.getTime());
      }
    });

    it('all displayDates should be non-empty strings', () => {
      ROADMAP.phases.forEach(phase => {
        phase.milestones.forEach(m => {
          expect(typeof m.displayDate).toBe('string');
          expect(m.displayDate.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });
});
