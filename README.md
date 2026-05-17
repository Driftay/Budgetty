# Budgetty 💰

A clean, modern personal expense tracker that runs entirely on your local machine. No cloud, no accounts — just a single JSON file and a Node.js server.

## Features

- Log expenses with amount, reason, a needed/not-needed flag, and a comment
- Edit or delete any entry
- Filter by custom date range or view all time
- 4 live metrics: Total Spent, Not Needed, Necessary, Waste Rate
- Select your currency (USD, EUR, GBP, and 7 more)
- Export filtered data to CSV

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher

## Preview
![](https://i.imgur.com/zoHsx0P.png)

## Setup

```bash
git clone https://github.com/Driftay/Budgetty.git
cd budgetty
npm install
```

## Running

**Windows:** Double-click `start.bat`, or in a terminal:
```
node server.js
```

**macOS / Linux:**
```bash
chmod +x start.sh
./start.sh
```

Then open **http://localhost:3000** in your browser.

## Data

All data is saved to `budget.json` in the project root. This file is excluded from git — your financial data stays on your machine.

To back up your data, copy `budget.json` somewhere safe.

## Running Tests

```bash
npm test
```

## License

MIT
