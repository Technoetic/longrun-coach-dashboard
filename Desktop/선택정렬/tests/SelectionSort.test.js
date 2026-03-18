import { describe, it, expect, beforeEach } from 'vitest';
import { SelectionSort } from '../src/js/SelectionSort.js';

describe('SelectionSort', () => {
  let sorter;

  beforeEach(() => {
    sorter = new SelectionSort(5);
    sorter.init();
  });

  it('should initialize with correct array size', () => {
    expect(sorter.array.length).toBe(5);
  });

  it('should generate random values between 10-99', () => {
    sorter.array.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThanOrEqual(99);
    });
  });

  it('should generate steps on init', () => {
    expect(sorter.steps.length).toBeGreaterThan(0);
  });

  it('should have initial step as first step', () => {
    const step = sorter.steps[0];
    expect(step.type).toBe('initial');
  });

  it('should have final sorted step as last step', () => {
    const lastStep = sorter.steps[sorter.steps.length - 1];
    expect(lastStep.type).toBe('mark-complete');
    expect(lastStep.sorted.length).toBe(5);
  });

  it('should produce sorted array in final step', () => {
    const lastStep = sorter.steps[sorter.steps.length - 1];
    const arr = lastStep.array;
    for (let i = 0; i < arr.length - 1; i++) {
      expect(arr[i]).toBeLessThanOrEqual(arr[i + 1]);
    }
  });

  it('nextStep should advance step index', () => {
    expect(sorter.currentStepIndex).toBe(-1);
    sorter.nextStep();
    expect(sorter.currentStepIndex).toBe(0);
  });

  it('prevStep should go back', () => {
    sorter.nextStep();
    sorter.nextStep();
    sorter.prevStep();
    expect(sorter.currentStepIndex).toBe(0);
  });

  it('prevStep should return false at start', () => {
    expect(sorter.prevStep()).toBe(false);
  });

  it('nextStep should return false at end', () => {
    while (sorter.nextStep()) {}
    expect(sorter.nextStep()).toBe(false);
  });

  it('isComplete should be true at end', () => {
    while (sorter.nextStep()) {}
    expect(sorter.isComplete()).toBe(true);
  });

  it('reset should return to beginning', () => {
    sorter.nextStep();
    sorter.nextStep();
    sorter.reset();
    expect(sorter.currentStepIndex).toBe(-1);
  });

  it('getProgress should return 0-1', () => {
    expect(sorter.getProgress()).toBe(0);
    while (sorter.nextStep()) {}
    expect(sorter.getProgress()).toBe(1);
  });

  it('setArraySize should reinitialize', () => {
    sorter.setArraySize(8);
    expect(sorter.array.length).toBe(8);
    expect(sorter.steps.length).toBeGreaterThan(0);
  });

  it('statistics should track comparisons and swaps', () => {
    expect(sorter.statistics.comparisons).toBeGreaterThan(0);
    expect(sorter.statistics.swaps).toBeGreaterThanOrEqual(0);
  });

  it('each step should have required fields', () => {
    sorter.steps.forEach(step => {
      expect(step).toHaveProperty('type');
      expect(step).toHaveProperty('array');
      expect(step).toHaveProperty('message');
      expect(step).toHaveProperty('analogyMessage');
    });
  });

  it('getCurrentStep should return current step', () => {
    const initialStep = sorter.getCurrentStep();
    expect(initialStep.type).toBe('initial');

    sorter.nextStep();
    sorter.nextStep();
    const laterStep = sorter.getCurrentStep();
    expect(laterStep.type).not.toBe('initial');
  });

  it('should track correct number of comparisons', () => {
    const n = sorter.arraySize;
    const expectedComparisons = (n - 1) * n / 2;
    expect(sorter.statistics.comparisons).toBe(expectedComparisons);
  });

  it('each step should have consistent array length', () => {
    sorter.steps.forEach(step => {
      expect(step.array.length).toBe(sorter.arraySize);
    });
  });

  it('sorted indices should increase monotonically', () => {
    const seenTypes = new Set();
    for (let i = 0; i < sorter.steps.length - 1; i++) {
      const step = sorter.steps[i];
      const nextStep = sorter.steps[i + 1];

      // sorted array should only grow or stay same
      expect(nextStep.sorted.length).toBeGreaterThanOrEqual(step.sorted.length);
    }
  });

  it('should handle array size of 1', () => {
    sorter.setArraySize(1);
    expect(sorter.array.length).toBe(1);
    expect(sorter.steps.length).toBeGreaterThan(0);
  });

  it('should handle larger array size', () => {
    sorter.setArraySize(20);
    expect(sorter.array.length).toBe(20);

    // Verify final array is sorted
    while (sorter.nextStep()) {}
    const lastStep = sorter.steps[sorter.steps.length - 1];
    const arr = lastStep.array;
    for (let i = 0; i < arr.length - 1; i++) {
      expect(arr[i]).toBeLessThanOrEqual(arr[i + 1]);
    }
  });

  it('step messages should be strings', () => {
    sorter.steps.forEach(step => {
      expect(typeof step.message).toBe('string');
      expect(typeof step.analogyMessage).toBe('string');
      expect(step.message.length).toBeGreaterThan(0);
      expect(step.analogyMessage.length).toBeGreaterThan(0);
    });
  });

  it('indices should be valid array positions', () => {
    sorter.steps.forEach(step => {
      if (step.indices && step.indices.length > 0) {
        step.indices.forEach(idx => {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(sorter.arraySize);
        });
      }
    });
  });

  it('minIndex and currentIndex should be valid or -1', () => {
    sorter.steps.forEach(step => {
      if (step.minIndex !== -1) {
        expect(step.minIndex).toBeGreaterThanOrEqual(0);
        expect(step.minIndex).toBeLessThan(sorter.arraySize);
      }
      if (step.currentIndex !== -1) {
        expect(step.currentIndex).toBeGreaterThanOrEqual(0);
        expect(step.currentIndex).toBeLessThan(sorter.arraySize);
      }
    });
  });

  it('step type should be valid', () => {
    const validTypes = ['initial', 'mark-start', 'compare', 'found-min', 'swap', 'mark-complete'];
    sorter.steps.forEach(step => {
      expect(validTypes).toContain(step.type);
    });
  });
});
