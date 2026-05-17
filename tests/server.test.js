const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, 'budget.test.json');
process.env.DATA_FILE = TEST_FILE;

const app = require('../server');

before(() => {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
});

after(() => {
  if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
});

beforeEach(() => {
  fs.writeFileSync(TEST_FILE, JSON.stringify({ settings: { currency: 'USD' }, entries: [] }, null, 2));
});

test('GET / returns 200', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
});

test('GET /api/entries returns empty array on fresh file', async () => {
  const res = await request(app).get('/api/entries');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.entries, []);
});

test('POST /api/entries creates an entry', async () => {
  const res = await request(app)
    .post('/api/entries')
    .send({ amount: 25.50, reason: 'Coffee', needed: false, comment: 'Impulse' });
  assert.equal(res.status, 201);
  assert.equal(res.body.amount, 25.50);
  assert.equal(res.body.reason, 'Coffee');
  assert.equal(res.body.needed, false);
  assert.equal(res.body.comment, 'Impulse');
  assert.ok(res.body.id);
  assert.ok(res.body.createdAt);
});

test('PUT /api/entries/:id updates an entry', async () => {
  const post = await request(app)
    .post('/api/entries')
    .send({ amount: 10, reason: 'Tea', needed: true, comment: '' });
  const id = post.body.id;

  const res = await request(app)
    .put(`/api/entries/${id}`)
    .send({ amount: 12, reason: 'Tea updated', needed: false, comment: 'Changed' });
  assert.equal(res.status, 200);
  assert.equal(res.body.amount, 12);
  assert.equal(res.body.reason, 'Tea updated');
  assert.equal(res.body.needed, false);
});

test('DELETE /api/entries/:id removes the entry', async () => {
  const post = await request(app)
    .post('/api/entries')
    .send({ amount: 5, reason: 'Snack', needed: false, comment: '' });
  const id = post.body.id;

  const del = await request(app).delete(`/api/entries/${id}`);
  assert.equal(del.status, 200);
  assert.deepEqual(del.body, { ok: true });

  const get = await request(app).get('/api/entries');
  assert.equal(get.body.entries.find(e => e.id === id), undefined);
});

test('PUT /api/entries/:id returns 404 for unknown id', async () => {
  const res = await request(app)
    .put('/api/entries/nonexistent')
    .send({ amount: 1, reason: 'x', needed: true, comment: '' });
  assert.equal(res.status, 404);
});

test('DELETE /api/entries/:id returns 404 for unknown id', async () => {
  const res = await request(app).delete('/api/entries/nonexistent');
  assert.equal(res.status, 404);
});

test('GET /api/settings returns default currency', async () => {
  const res = await request(app).get('/api/settings');
  assert.equal(res.status, 200);
  assert.equal(res.body.currency, 'USD');
});

test('PUT /api/settings updates currency', async () => {
  const res = await request(app)
    .put('/api/settings')
    .send({ currency: 'EUR' });
  assert.equal(res.status, 200);
  assert.equal(res.body.currency, 'EUR');

  const get = await request(app).get('/api/settings');
  assert.equal(get.body.currency, 'EUR');
});

test('GET /api/export/csv returns CSV with headers', async () => {
  await request(app)
    .post('/api/entries')
    .send({ amount: 50, reason: 'Lunch', needed: true, comment: 'Work lunch' });

  const res = await request(app).get('/api/export/csv');
  assert.equal(res.status, 200);
  assert.ok(res.headers['content-type'].includes('text/csv'));
  assert.ok(res.headers['content-disposition'].includes('budgetty-export.csv'));

  const lines = res.text.trim().split('\n');
  assert.equal(lines[0], 'Date,Amount,Currency,Reason,Needed,Comment');
  assert.ok(lines[1].includes('Lunch'));
  assert.ok(lines[1].includes('Yes'));
  assert.ok(lines[1].includes('50'));
});

test('GET /api/export/csv filters by date range', async () => {
  const data = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
  data.entries.push({
    id: '111', amount: 99, reason: 'Old entry', needed: false, comment: '',
    createdAt: '2020-01-15T12:00:00.000Z'
  });
  data.entries.push({
    id: '222', amount: 10, reason: 'New entry', needed: true, comment: '',
    createdAt: new Date().toISOString()
  });
  fs.writeFileSync(TEST_FILE, JSON.stringify(data, null, 2));

  const res = await request(app).get('/api/export/csv?from=2020-01-01&to=2020-01-31');
  const lines = res.text.trim().split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('Old entry'));
});

test('GET /api/export/csv escapes commas in fields', async () => {
  const data = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
  data.entries.push({
    id: '333', amount: 5, reason: 'Coffee, tea', needed: false, comment: '',
    createdAt: new Date().toISOString()
  });
  fs.writeFileSync(TEST_FILE, JSON.stringify(data, null, 2));

  const res = await request(app).get('/api/export/csv');
  assert.ok(res.text.includes('"Coffee, tea"'));
});
