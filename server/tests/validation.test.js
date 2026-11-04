import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv, resultData, date, email} from '../validation.js';
import {hashPassword, verifyPassword} from '../auth.js';

const header = 'student_id,term_name,subject,ca1_score,ca2_score,exam_score';
const row = '1,First,Math,10,20,60';
const invalid = (fn, status = 400) => assert.throws(fn, error => error.status === status);

test('CSV preserves quoted commas, escaped quotes and embedded newlines, including BOM/CRLF', () => {
  const rows = parseCsv(`\uFEFF${header},teacher_remarks\r\n${row},"Good, ""steady"" work\r\nKeep going"\r\n\r\n`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].teacher_remarks, 'Good, "steady" work\r\nKeep going');
  assert.equal(rows[0].exam_score, '60');
});

test('CSV rejects missing/duplicate headers, mismatched rows and malformed quotes', () => {
  for (const csv of [
    '', null, `${header}\n`, `term_name,subject\nFirst,Math`,
    `${header},subject\n${row},Math`, `${header}\n${row},extra`,
    `${header}\n1,First,"Math,10,20,60`, `${header}\n1,Fir"st,Math,10,20,60`,
  ]) invalid(() => parseCsv(csv));
  assert.equal(parseCsv(`${header}\n${Array(1000).fill(row).join('\n')}`).length, 1000);
  invalid(() => parseCsv(`${header}\n${Array(1001).fill(row).join('\n')}`));
});

const result = {term_name: 'First', subject: 'Math', ca1_score: 10, ca2_score: 20, exam_score: 60};
test('scores total correctly, round decimals and derive grade boundaries', () => {
  const values = resultData({...result, ca1_score: '10.1', ca2_score: '20.2', exam_score: '39.7'}, {role: 'admin'});
  assert.equal(values[5], 70);
  assert.equal(values[6], 'A');
  for (const [score, grade] of [[100,'A'],[70,'A'],[69,'B'],[60,'B'],[59,'C'],[50,'C'],[45,'D'],[40,'E'],[39,'F'],[0,'F']]) {
    const data = resultData({...result, ca1_score: 0, ca2_score: 0, exam_score: score}, {role: 'admin'});
    assert.equal(data[5], score);
    assert.equal(data[6], grade);
  }
});

test('invalid scores, totals and publication states are rejected', () => {
  for (const field of ['ca1_score','ca2_score','exam_score']) {
    for (const value of [-1, 101, 'invalid', Infinity]) invalid(() => resultData({...result, [field]: value}, {role: 'admin'}));
  }
  invalid(() => resultData({...result, exam_score: 71}, {role:'admin'}));
  invalid(() => resultData({...result, publication_status:'unknown'}, {role:'admin'}));
  for (const status of ['published','archived']) invalid(() => resultData({...result, publication_status:status}, {role:'teacher'}), 403);
  for (const status of ['draft','pending']) assert.equal(resultData({...result, publication_status:status}, {role:'teacher'})[8], status);
});

test('dates reject calendar rollover and emails normalize', () => {
  assert.equal(date('2024-02-29','Date'), '2024-02-29');
  for (const value of ['2025-02-29','2026-04-31','not-a-date']) invalid(() => date(value,'Date'));
  assert.equal(email(' PARENT@EXAMPLE.COM '), 'parent@example.com');
  invalid(() => email('parent@'));
});

test('password hashes use independent salts and reject the wrong password', async () => {
  const password = 'Fixture-password-123!';
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.match(first, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password, second), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
  assert.equal(await verifyPassword(password, 'salt:00'), false);
});
