const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_DIST_PATH = path.join(__dirname, '..', 'Mini-database engine frontend', 'dist');

// Middleware
app.use(cors());
app.use(express.json());

// Health check for deployment platforms
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Tables ────────────────────────────────────────────────────────────────────

/**
 * GET /api/tables
 * Returns all tables with schema, rows, and indexed columns
 */
app.get('/api/tables', (req, res) => {
  try {
    const tables = db.getTables();
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Query Execution ───────────────────────────────────────────────────────────

/**
 * POST /api/query
 * Body: { sql: string }
 * Execute an arbitrary SQL query
 */
app.post('/api/query', (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ success: false, message: 'SQL query is required.' });
  }
  const result = db.executeQuery(sql);
  res.json(result);
});

/**
 * POST /api/query/plan
 * Body: { sql: string }
 * Get execution plan for a SELECT query
 */
app.post('/api/query/plan', (req, res) => {
  const { sql } = req.body;
  if (!sql || !sql.trim()) {
    return res.status(400).json({ success: false, message: 'SQL query is required.' });
  }
  try {
    const plan = db.getQueryPlan(sql);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/indexes?table=tableName
 * Get B-Tree and Hash index visualizations for a table
 */
app.get('/api/indexes', (req, res) => {
  const { table } = req.query;
  try {
    const indexes = db.getIndexes(table);
    res.json({ success: true, ...indexes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Transactions ──────────────────────────────────────────────────────────────

/**
 * GET /api/transactions
 * Get transaction log and active transaction info
 */
app.get('/api/transactions', (req, res) => {
  try {
    const log = db.getTransactionLog();
    const active = db.getActiveTransaction();
    res.json({ success: true, transactions: log, activeTransaction: active });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/transactions/begin
 */
app.post('/api/transactions/begin', (req, res) => {
  const result = db.beginTransaction();
  res.json(result);
});

/**
 * POST /api/transactions/commit
 */
app.post('/api/transactions/commit', (req, res) => {
  const result = db.commitTransaction();
  res.json(result);
});

/**
 * POST /api/transactions/rollback
 */
app.post('/api/transactions/rollback', (req, res) => {
  const result = db.rollbackTransaction();
  res.json(result);
});

// ─── Storage ───────────────────────────────────────────────────────────────────

/**
 * GET /api/storage
 * Get storage statistics and data file info
 */
app.get('/api/storage', (req, res) => {
  try {
    const storage = db.getStorageStats();
    res.json({ success: true, ...storage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve frontend build from the backend service
app.use(express.static(FRONTEND_DIST_PATH));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return res.sendFile(path.join(FRONTEND_DIST_PATH, 'index.html'));
});

// ─── Start Server ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  // Initialize DB on startup
  db.getDb();
  console.log(`\n🗄️  Mini Database Engine Backend`);
  console.log(`   Server running on http://0.0.0.0:${PORT}`);
  console.log(`   Accessible from your phone on the same Wi-Fi!`);
  console.log(`   API endpoints ready:\n`);
  console.log(`   GET  /api/tables          - List all tables`);
  console.log(`   POST /api/query           - Execute SQL query`);
  console.log(`   POST /api/query/plan      - Get query plan`);
  console.log(`   GET  /api/indexes?table=x  - Get index info`);
  console.log(`   GET  /api/transactions    - Transaction log`);
  console.log(`   POST /api/transactions/begin`);
  console.log(`   POST /api/transactions/commit`);
  console.log(`   POST /api/transactions/rollback`);
  console.log(`   GET  /api/storage         - Storage stats\n`);
});
