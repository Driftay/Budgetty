const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'budget.json');

const DEFAULT_DATA = { settings: { currency: 'USD' }, entries: [] };

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_DATA));
    writeData(fresh);
    return fresh;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

if (!fs.existsSync(DATA_FILE)) {
  writeData(DEFAULT_DATA);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/entries', (req, res) => {
  const data = readData();
  res.json({ entries: data.entries });
});

app.post('/api/entries', (req, res) => {
  const { amount, reason, needed, comment } = req.body;
  const data = readData();
  const entry = {
    id: Date.now().toString(),
    amount: parseFloat(amount),
    reason,
    needed: Boolean(needed),
    comment: comment || '',
    createdAt: new Date().toISOString()
  };
  data.entries.push(entry);
  writeData(data);
  res.status(201).json(entry);
});

app.put('/api/entries/:id', (req, res) => {
  const { amount, reason, needed, comment } = req.body;
  const data = readData();
  const idx = data.entries.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.entries[idx] = {
    ...data.entries[idx],
    amount: parseFloat(amount),
    reason,
    needed: Boolean(needed),
    comment: comment || ''
  };
  writeData(data);
  res.json(data.entries[idx]);
});

app.delete('/api/entries/:id', (req, res) => {
  const data = readData();
  const idx = data.entries.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.entries.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

app.get('/api/settings', (req, res) => {
  const data = readData();
  res.json(data.settings);
});

app.put('/api/settings', (req, res) => {
  const { currency } = req.body;
  const data = readData();
  data.settings.currency = currency;
  writeData(data);
  res.json(data.settings);
});

app.get('/api/export/csv', (req, res) => {
  const { from, to } = req.query;
  const data = readData();
  let entries = [...data.entries];

  if (from) {
    const fromDate = new Date(from + 'T00:00:00.000Z');
    entries = entries.filter(e => new Date(e.createdAt) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to + 'T23:59:59.999Z');
    entries = entries.filter(e => new Date(e.createdAt) <= toDate);
  }

  const escape = (val) => {
    const str = String(val == null ? '' : val);
    return (str.includes(',') || str.includes('"') || str.includes('\n'))
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const rows = [
    'Date,Amount,Currency,Reason,Needed,Comment',
    ...entries.map(e => [
      e.createdAt.slice(0, 10),
      e.amount,
      data.settings.currency,
      escape(e.reason),
      e.needed ? 'Yes' : 'No',
      escape(e.comment)
    ].join(','))
  ];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="budgetty-export.csv"');
  res.send(rows.join('\n'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Budgetty running at http://localhost:${PORT}`));
}

module.exports = app;
