import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand, completeVoiceCommand } from '../src/services/voiceCommands.ts';

test('BP spoken as "over" and "by" and slash', () => {
  for (const t of ['record my blood pressure as 120 over 80', 'Mera BP reading 140 by 90 hai', 'BP 130/85']) {
    const r = parseVoiceCommand(t);
    assert.equal(r.intent, 'measurement');
    assert.equal(r.valid, true);
  }
  assert.equal(parseVoiceCommand('BP 120 over 80').secondaryNumericValue, 80);
});
test('implausible BP is rejected, not saved', () => {
  const r = parseVoiceCommand('blood pressure 80 over 120');
  assert.equal(r.valid, false);
  assert.ok(r.error);
});
test('symptom without severity asks instead of inventing 5', () => {
  const r = parseVoiceCommand('I have a headache today');
  assert.equal(r.intent, 'symptom');
  assert.equal(r.valid, false);
  assert.deepEqual(r.missing, ['severity']);
  const done = completeVoiceCommand(r, 'severity', 6);
  assert.equal(done.valid, true);
  assert.equal(done.severity, 6);
});
test('symptom with explicit severity is valid', () => {
  const r = parseVoiceCommand('Aaj headache 6 out of 10 hai');
  assert.equal(r.severity, 6);
  assert.equal(r.valid, true);
});
test('sleep with number words; missing hours asks', () => {
  assert.equal(parseVoiceCommand('Kal raat sirf paanch ghante soyi').sleepHours, 5);
  const r = parseVoiceCommand('I slept badly');
  assert.deepEqual(r.missing, ['sleepHours']);
  assert.equal(r.valid, false);
});
test('unknown command never reports valid', () => {
  const r = parseVoiceCommand('what a lovely day');
  assert.equal(r.intent, 'unknown');
  assert.equal(r.valid, false);
});
test('glucose range check', () => {
  assert.equal(parseVoiceCommand('sugar 110').valid, true);
  assert.equal(parseVoiceCommand('sugar 5').valid, false);
});
