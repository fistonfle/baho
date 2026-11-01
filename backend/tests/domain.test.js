// Unit tests for the domain classes: no server and no database needed.
import assert from 'node:assert/strict';
import test from 'node:test';

import { LessonWorkflow } from '../src/domain/LessonWorkflow.js';
import { LoginGuard, PhoneNumber } from '../src/modules/auth/phone.js';
import { MediaStore } from '../src/modules/media/MediaStore.js';

test('LessonWorkflow holds a publish request in review until a specialist approves', () => {
  const withSpecialist = new LessonWorkflow({ hasSpecialist: true });
  assert.equal(withSpecialist.resolve('published', 'draft'), 'review');
  assert.equal(withSpecialist.resolve('published', 'review'), 'review');
  assert.equal(withSpecialist.resolve('published', 'approved'), 'published');
  assert.equal(withSpecialist.isHeldForReview('published', 'draft'), true);
  assert.equal(withSpecialist.resolve('draft', 'review'), 'draft', 'other moves are not blocked');

  const withoutSpecialist = new LessonWorkflow({ hasSpecialist: false });
  assert.equal(withoutSpecialist.resolve('published', 'draft'), 'published');
  assert.equal(withoutSpecialist.isHeldForReview('published', 'draft'), false);
});

test('LessonWorkflow knows the valid statuses and what each role may set', () => {
  assert.equal(LessonWorkflow.isValid('approved'), true);
  assert.equal(LessonWorkflow.isValid('archived'), false);
  assert.deepEqual(LessonWorkflow.allowedFor('creator'), ['draft', 'review']);
  assert.ok(LessonWorkflow.allowedFor('admin').includes('published'));
  assert.equal(LessonWorkflow.reviewOutcome('approve'), 'approved');
  assert.equal(LessonWorkflow.reviewOutcome('changes'), 'rejected');
});

test('PhoneNumber accepts every common way of writing a Rwandan mobile number', () => {
  for (const written of ['0781234567', '078 123 4567', '+250 78 123 4567', '250781234567', '(078) 123-4567']) {
    assert.equal(PhoneNumber.normalize(written), '+250781234567', written);
  }
  assert.equal(PhoneNumber.normalize('0721234567'), '+250721234567', 'Airtel');
  for (const wrong of ['0712345678', '078123456', '07812345678', '+254781234567', 'abc', '', null]) {
    assert.equal(PhoneNumber.normalize(wrong), null, String(wrong));
  }
});

test('PhoneNumber accepts PINs of 4 to 6 digits only', () => {
  for (const pin of ['1234', '12345', '123456']) assert.equal(PhoneNumber.isPin(pin), true, pin);
  for (const pin of ['123', '1234567', '12a4', '', undefined]) assert.equal(PhoneNumber.isPin(pin), false, String(pin));
});

test('LoginGuard locks after repeated failures and unlocks when the time is up', () => {
  let clock = 1_000_000;
  const guard = new LoginGuard({ maxFailures: 3, lockMinutes: 15, now: () => clock });
  guard.recordFailure('+250781234567');
  guard.recordFailure('+250781234567');
  assert.equal(guard.isLocked('+250781234567'), false);
  guard.recordFailure('+250781234567');
  assert.equal(guard.isLocked('+250781234567'), true);
  assert.equal(guard.isLocked('+250791112233'), false, 'other numbers are not affected');

  clock += 15 * 60 * 1000 + 1;
  assert.equal(guard.isLocked('+250781234567'), false);

  guard.recordFailure('+250791112233');
  guard.clear('+250791112233');
  guard.recordFailure('+250791112233');
  guard.recordFailure('+250791112233');
  assert.equal(guard.isLocked('+250791112233'), false, 'a successful sign-in resets the count');
});

test('MediaStore recognises recordings by their first bytes', () => {
  const pad = (head) => Buffer.concat([head, Buffer.alloc(32)]);
  assert.equal(MediaStore.detect(pad(Buffer.from('ID3')))?.extension, 'mp3');
  assert.equal(MediaStore.detect(pad(Buffer.from([0xff, 0xfb, 0x90, 0x64])))?.extension, 'mp3', 'MP3 without a tag');
  assert.equal(MediaStore.detect(pad(Buffer.from('\0\0\0\x20ftypM4A ', 'latin1')))?.extension, 'm4a');
  assert.equal(MediaStore.detect(pad(Buffer.from('OggS')))?.extension, 'ogg');
  assert.equal(MediaStore.detect(pad(Buffer.from('RIFF\0\0\0\0WAVE', 'latin1')))?.extension, 'wav');
  assert.equal(MediaStore.detect(pad(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))?.extension, 'webm');
  assert.equal(MediaStore.detect(pad(Buffer.from('<html>'))), null, 'a web page is not audio');
  assert.equal(MediaStore.detect(Buffer.from('ID3')), null, 'too short');
});
