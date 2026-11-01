import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, blankEntry, countChecks, isComplete } from './tracker.js';

test('date arithmetic stays on local calendar days', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-12-31', 1), '2025-01-01');
});

test('completion requires all tasks and a stored photo', () => {
  const entry = blankEntry();
  entry.checks = { diet: true, workouts: true, water: true, reading: true, photo: true };
  assert.equal(countChecks(entry), 5);
  assert.equal(isComplete(entry), false);
  entry.hasPhoto = true;
  assert.equal(isComplete(entry), true);
});

