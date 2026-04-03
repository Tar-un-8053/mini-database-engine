const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mini_database.db');

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    seedDatabase();
  }
  return db;
}

/**
 * Seed default tables if they don't exist
 */
function seedDatabase() {
  const d = db;

  // Ensure baseline schema exists for both fresh and existing databases.
  d.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      major TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      course_id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      credits INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      semester TEXT NOT NULL,
      grade TEXT,
      PRIMARY KEY (student_id, course_id, semester),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (course_id) REFERENCES courses(course_id)
    );

    CREATE TABLE IF NOT EXISTS exam_scores (
      id INTEGER PRIMARY KEY,
      student_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      score INTEGER NOT NULL,
      exam_date TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_students_age ON students(age);
    CREATE INDEX IF NOT EXISTS idx_students_major ON students(major);
    CREATE INDEX IF NOT EXISTS idx_courses_credits ON courses(credits);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_semester ON enrollments(semester);
    CREATE INDEX IF NOT EXISTS idx_exam_scores_student_id ON exam_scores(student_id);
    CREATE INDEX IF NOT EXISTS idx_exam_scores_subject ON exam_scores(subject);
  `);

  const students = [
    [1, 'Alice Johnson', 20, 'Computer Science'],
    [2, 'Bob Smith', 22, 'Mathematics'],
    [3, 'Carol Williams', 19, 'Computer Science'],
    [4, 'David Brown', 21, 'Physics'],
    [5, 'Emma Davis', 20, 'Engineering'],
    [6, 'Farhan Khan', 23, 'Economics'],
    [7, 'Grace Lee', 21, 'Computer Science'],
    [8, 'Henry Patel', 24, 'Mathematics'],
    [9, 'Isha Verma', 20, 'Biology'],
    [10, 'Jack Wilson', 22, 'Physics'],
    [11, 'Kriti Sharma', 19, 'Engineering'],
    [12, 'Liam Thomas', 23, 'Computer Science'],
    [13, 'Maya Singh', 21, 'Economics'],
    [14, 'Noah Garcia', 20, 'Biology'],
    [15, 'Olivia Martin', 22, 'Mathematics'],
  ];

  const courses = [
    [101, 'Database Systems', 4],
    [102, 'Algorithms', 3],
    [103, 'Operating Systems', 4],
    [104, 'Linear Algebra', 3],
    [105, 'Statistics', 3],
    [106, 'Computer Networks', 4],
    [107, 'Machine Learning Basics', 3],
    [108, 'Software Engineering', 4],
  ];

  const enrollments = [
    [1, 101, '2026-Spring', 'A'],
    [1, 107, '2026-Spring', 'A-'],
    [2, 104, '2026-Spring', 'B+'],
    [2, 105, '2026-Spring', 'A'],
    [3, 101, '2026-Spring', 'B'],
    [3, 102, '2026-Spring', 'A'],
    [4, 103, '2026-Spring', 'B+'],
    [4, 106, '2026-Spring', 'A-'],
    [5, 108, '2026-Spring', 'A'],
    [6, 105, '2026-Spring', 'B'],
    [7, 102, '2026-Spring', 'A'],
    [7, 106, '2026-Spring', 'A-'],
    [8, 104, '2026-Spring', 'B+'],
    [9, 105, '2026-Spring', 'A-'],
    [10, 103, '2026-Spring', 'B'],
    [11, 108, '2026-Spring', 'A'],
    [12, 101, '2026-Spring', 'A'],
    [12, 107, '2026-Spring', 'A-'],
    [13, 105, '2026-Spring', 'B+'],
    [14, 104, '2026-Spring', 'B'],
    [15, 102, '2026-Spring', 'A-'],
  ];

  const examScores = [
    [1, 1, 'Database Systems', 88, '2026-01-14'],
    [2, 1, 'Machine Learning Basics', 91, '2026-02-02'],
    [3, 2, 'Linear Algebra', 79, '2026-01-11'],
    [4, 2, 'Statistics', 85, '2026-02-05'],
    [5, 3, 'Database Systems', 82, '2026-01-13'],
    [6, 3, 'Algorithms', 89, '2026-02-01'],
    [7, 4, 'Operating Systems', 76, '2026-01-16'],
    [8, 4, 'Computer Networks', 84, '2026-02-06'],
    [9, 5, 'Software Engineering', 93, '2026-01-18'],
    [10, 6, 'Statistics', 74, '2026-01-21'],
    [11, 7, 'Algorithms', 95, '2026-01-19'],
    [12, 7, 'Computer Networks', 87, '2026-02-04'],
    [13, 8, 'Linear Algebra', 81, '2026-01-10'],
    [14, 9, 'Statistics', 90, '2026-02-07'],
    [15, 10, 'Operating Systems', 78, '2026-01-24'],
    [16, 11, 'Software Engineering', 92, '2026-02-09'],
    [17, 12, 'Database Systems', 94, '2026-01-15'],
    [18, 12, 'Machine Learning Basics', 90, '2026-02-03'],
    [19, 13, 'Statistics', 83, '2026-01-20'],
    [20, 14, 'Linear Algebra', 77, '2026-01-12'],
    [21, 15, 'Algorithms', 88, '2026-01-22'],
    [22, 5, 'Database Systems', 86, '2026-02-11'],
    [23, 8, 'Statistics', 80, '2026-02-14'],
    [24, 9, 'Biology Lab Analytics', 89, '2026-02-15'],
    [25, 10, 'Computer Networks', 82, '2026-02-12'],
  ];

  const seedData = d.transaction(() => {
    const insertStudent = d.prepare(
      'INSERT OR IGNORE INTO students (id, name, age, major) VALUES (?, ?, ?, ?)'
    );
    for (const student of students) {
      insertStudent.run(...student);
    }

    const insertCourse = d.prepare(
      'INSERT OR IGNORE INTO courses (course_id, title, credits) VALUES (?, ?, ?)'
    );
    for (const course of courses) {
      insertCourse.run(...course);
    }

    const insertEnrollment = d.prepare(
      'INSERT OR IGNORE INTO enrollments (student_id, course_id, semester, grade) VALUES (?, ?, ?, ?)'
    );
    for (const enrollment of enrollments) {
      insertEnrollment.run(...enrollment);
    }

    const insertExamScore = d.prepare(
      'INSERT OR IGNORE INTO exam_scores (id, student_id, subject, score, exam_date) VALUES (?, ?, ?, ?, ?)'
    );
    for (const examScore of examScores) {
      insertExamScore.run(...examScore);
    }
  });

  seedData();
}

/**
 * Execute an arbitrary SQL query
 */
function executeQuery(sql) {
  const d = getDb();
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();
  const startTime = performance.now();

  try {
    if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('EXPLAIN')) {
      const stmt = d.prepare(trimmed);
      const rows = stmt.all();
      const executionTime = Math.round(performance.now() - startTime);
      return {
        success: true,
        message: `Query executed successfully. ${rows.length} row(s) returned.`,
        data: rows,
        executionTime,
        rowsAffected: 0,
      };
    } else {
      const result = d.exec(trimmed);
      const executionTime = Math.round(performance.now() - startTime);
      
      // Get changes count for INSERT/UPDATE/DELETE
      const changes = d.prepare('SELECT changes() as count').get();
      
      let message = 'Query executed successfully.';
      if (upper.startsWith('INSERT')) {
        message = `Row(s) inserted successfully.`;
      } else if (upper.startsWith('UPDATE')) {
        message = `Row(s) updated successfully.`;
      } else if (upper.startsWith('DELETE')) {
        message = `Row(s) deleted successfully.`;
      } else if (upper.startsWith('CREATE TABLE')) {
        message = `Table created successfully.`;
      } else if (upper.startsWith('DROP TABLE')) {
        message = `Table dropped successfully.`;
      } else if (upper.startsWith('CREATE INDEX')) {
        message = `Index created successfully.`;
      } else if (upper.startsWith('ALTER')) {
        message = `Table altered successfully.`;
      }

      return {
        success: true,
        message,
        executionTime,
        rowsAffected: changes?.count || 0,
      };
    }
  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);
    return {
      success: false,
      message: `Error: ${error.message}`,
      executionTime,
      rowsAffected: 0,
    };
  }
}

/**
 * Get all table names, columns, rows, and indexed columns
 */
function getTables() {
  const d = getDb();
  const tables = d.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();

  return tables.map((t) => {
    // Get column info
    const columns = d.prepare(`PRAGMA table_info('${t.name}')`).all().map((col) => ({
      name: col.name,
      type: col.type || 'TEXT',
      primaryKey: col.pk === 1,
    }));

    // Get rows
    const rows = d.prepare(`SELECT * FROM "${t.name}"`).all();

    // Get indexed columns
    const indexes = d.prepare(`PRAGMA index_list('${t.name}')`).all();
    const indexedColumns = [];
    for (const idx of indexes) {
      const indexInfo = d.prepare(`PRAGMA index_info('${idx.name}')`).all();
      for (const col of indexInfo) {
        if (!indexedColumns.includes(col.name)) {
          indexedColumns.push(col.name);
        }
      }
    }

    return {
      name: t.name,
      columns,
      rows,
      indexedColumns,
    };
  });
}

/**
 * Get index information for visualization
 */
function getIndexes(tableName) {
  const d = getDb();
  const bTreeIndexes = [];
  const hashIndexes = [];

  if (!tableName) return { bTreeIndexes, hashIndexes };

  const indexes = d.prepare(`PRAGMA index_list('${tableName}')`).all();

  for (const idx of indexes) {
    const indexInfo = d.prepare(`PRAGMA index_info('${idx.name}')`).all();
    
    for (const col of indexInfo) {
      // Get distinct values for this column to build a visualization tree
      const values = d.prepare(
        `SELECT DISTINCT "${col.name}" FROM "${tableName}" ORDER BY "${col.name}"`
      ).all().map(r => r[col.name]);

      if (values.length > 0) {
        // Build a simple B-Tree visualization
        const midIdx = Math.floor(values.length / 2);
        const rootKey = values[midIdx];
        const leftKeys = values.slice(0, midIdx);
        const rightKeys = values.slice(midIdx);

        const tree = {
          keys: [rootKey],
          isLeaf: false,
          children: [
            { keys: leftKeys.length > 0 ? leftKeys : [rootKey], isLeaf: true },
            { keys: rightKeys, isLeaf: true },
          ],
        };

        bTreeIndexes.push({
          columnName: col.name,
          tree,
        });
      }
    }
  }

  // Build hash index for non-numeric text columns
  try {
    const columns = d.prepare(`PRAGMA table_info('${tableName}')`).all();
    const textColumns = columns.filter(c => 
      (c.type || '').toUpperCase().includes('TEXT') || 
      (c.type || '').toUpperCase().includes('VARCHAR')
    );

    for (const col of textColumns) {
      const rows = d.prepare(`SELECT rowid, "${col.name}" FROM "${tableName}"`).all();
      const bucketMap = {};
      
      for (const row of rows) {
        const key = row[col.name];
        if (key == null) continue;
        if (!bucketMap[key]) bucketMap[key] = [];
        bucketMap[key].push(row.rowid);
      }

      // Create 5 buckets (or fewer if less data)
      const entries = Object.entries(bucketMap);
      const numBuckets = Math.max(5, entries.length);
      const buckets = Array.from({ length: numBuckets }, () => []);

      entries.forEach(([key, ids]) => {
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
          hash = (hash * 31 + key.charCodeAt(i)) % numBuckets;
        }
        buckets[hash].push({ key, value: ids });
      });

      hashIndexes.push({
        columnName: col.name,
        hash: { buckets },
      });
    }
  } catch (e) {
    // Ignore errors for hash index generation
  }

  return { bTreeIndexes, hashIndexes };
}

/**
 * Get query execution plan
 */
function getQueryPlan(sql) {
  const d = getDb();
  const trimmed = sql.trim();

  try {
    const planRows = d.prepare(`EXPLAIN QUERY PLAN ${trimmed}`).all();
    
    // Build a tree from EXPLAIN QUERY PLAN output
    if (planRows.length === 0) return null;

    const rootChildren = planRows.map((row) => {
      const detail = row.detail || '';
      let operation = 'SCAN';
      if (detail.includes('INDEX')) operation = 'INDEX SCAN';
      else if (detail.includes('SEARCH')) operation = 'SEARCH';
      else if (detail.includes('SCAN')) operation = 'TABLE SCAN';
      else if (detail.includes('COMPOUND')) operation = 'COMPOUND';

      return {
        operation,
        details: detail,
        cost: parseFloat((Math.random() * 10 + 1).toFixed(1)),
        rows: Math.floor(Math.random() * 10 + 1),
      };
    });

    return {
      operation: 'SELECT',
      details: 'Root query execution',
      cost: parseFloat(rootChildren.reduce((sum, c) => sum + c.cost, 0).toFixed(1)),
      rows: rootChildren.reduce((sum, c) => sum + c.rows, 0),
      children: rootChildren,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get storage statistics
 */
function getStorageStats() {
  const d = getDb();
  const fs = require('fs');

  let fileSize = 0;
  try {
    const stats = fs.statSync(DB_PATH);
    fileSize = stats.size;
  } catch (e) {}

  const pageSize = d.prepare('PRAGMA page_size').get()?.page_size || 4096;
  const pageCount = d.prepare('PRAGMA page_count').get()?.page_count || 0;
  const freePages = d.prepare('PRAGMA freelist_count').get()?.freelist_count || 0;
  const usedPages = pageCount - freePages;

  // Count total records across all tables
  const tables = d.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all();
  
  let totalRecords = 0;
  const dataFiles = [];

  for (const t of tables) {
    try {
      const count = d.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get()?.cnt || 0;
      totalRecords += count;
      dataFiles.push({
        name: `${t.name}.dbf`,
        size: Math.round((count * 100 + 512) / 1024), // estimated size in KB
        records: count,
      });
    } catch (e) {}
  }

  return {
    stats: {
      totalPages: pageCount || 100,
      usedPages: usedPages || 10,
      pageSize: Math.round(pageSize / 1024), // in KB
      bufferPoolSize: 100,
      bufferPoolUsed: Math.min(usedPages, 100),
      totalRecords,
    },
    dataFiles,
  };
}

// --- Transaction Support ---
let activeTransactionId = null;
let transactionLog = [];
let transactionCounter = 0;

function beginTransaction() {
  const d = getDb();
  if (activeTransactionId) {
    return { success: false, message: 'A transaction is already active.' };
  }
  try {
    d.exec('BEGIN TRANSACTION');
    transactionCounter++;
    activeTransactionId = transactionCounter;
    const transaction = {
      id: activeTransactionId,
      operations: [],
      status: 'active',
      timestamp: new Date().toISOString(),
    };
    return { success: true, transaction };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function commitTransaction() {
  const d = getDb();
  if (!activeTransactionId) {
    return { success: false, message: 'No active transaction to commit.' };
  }
  try {
    d.exec('COMMIT');
    const committed = {
      id: activeTransactionId,
      status: 'committed',
      timestamp: new Date().toISOString(),
    };
    transactionLog.push(committed);
    activeTransactionId = null;
    return { success: true, transaction: committed };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function rollbackTransaction() {
  const d = getDb();
  if (!activeTransactionId) {
    return { success: false, message: 'No active transaction to rollback.' };
  }
  try {
    d.exec('ROLLBACK');
    const aborted = {
      id: activeTransactionId,
      status: 'aborted',
      timestamp: new Date().toISOString(),
    };
    transactionLog.push(aborted);
    activeTransactionId = null;
    return { success: true, transaction: aborted };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function getTransactionLog() {
  return transactionLog;
}

function getActiveTransaction() {
  if (!activeTransactionId) return null;
  return { id: activeTransactionId, status: 'active' };
}

module.exports = {
  getDb,
  executeQuery,
  getTables,
  getIndexes,
  getQueryPlan,
  getStorageStats,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  getTransactionLog,
  getActiveTransaction,
};
