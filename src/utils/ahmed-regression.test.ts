import { describe, expect, it } from 'vitest';
import { AHMED_REGRESSION_EXPECTED, AHMED_REGRESSION_INPUT } from './ahmed-regression.fixture';
import { estimateGame } from './calculators';

describe('石油王回归用例（AHMED_REGRESSION）', () => {
  it('与 fixture 快照一致', () => {
    const r = estimateGame(AHMED_REGRESSION_INPUT);
    const e = AHMED_REGRESSION_EXPECTED;

    expect(r.wgCount).toBe(e.wgCount);
    expect(r.remain).toBe(e.remain);
    expect(r.gridSlotInferenceActive).toBe(e.gridSlotInferenceActive);
    expect(r.orangeList).toEqual([...e.orangeList]);
    expect(r.purpleList).toEqual([...e.purpleList]);
    expect(r.redList).toEqual([...e.redList]);
    expect(r.expectedValue).toBe(e.expectedValue);
    expect(r.expectedGridValue).toBe(e.expectedGridValue);
    expect(r.minValue).toBe(e.minValue);
    expect(r.maxValue).toBe(e.maxValue);

    expect(r.expectedCombo).toMatchObject(e.expectedCombo);
    expect(r.expectedGridCombo).toMatchObject(e.expectedGridCombo);
    expect(r.gridMinCombo).toMatchObject(e.gridMinCombo);
    expect(r.gridMaxCombo).toMatchObject(e.gridMaxCombo);
  });
});
