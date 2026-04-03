# BuildDB - Mini Database Engine

A simplified Database Management System (DBMS) for educational purposes, demonstrating core database concepts including persistent storage, indexing, query parsing, execution, and transaction management.

## 🎯 Overview

BuildDB is a minimal but functional database engine that implements the fundamental components of a real DBMS like MySQL or SQLite. It's designed for **educational value** rather than performance, making database internals clear and understandable.

## 🏗️ Architecture

BuildDB consists of five core components:

```
┌─────────────────────────────────────────────┐
│           BuildDB Engine (CLI)              │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │   Query Parser      │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │  Query Executor     │
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐    ┌────▼────┐    ┌────▼────┐
│Storage│    │  Index  │    │Transaction│
│Manager│    │ Manager │    │ Manager  │
└───────┘    └─────────┘    └──────────┘
```

### 1. Storage Manager (`storage_manager.py`)

**Purpose**: Manages persistent storage of table data on disk.

**How it works**:
- Stores tables in binary format with fixed-size records
- Each table has:
  - A `.dat` file containing the actual data
  - A `.json` metadata file containing schema information
- Records are serialized using Python's `struct` module
- Supports three data types: INT (4 bytes), FLOAT (8 bytes), TEXT (256 bytes)

**Key Features**:
- Binary serialization for efficient storage
- Fixed-size records for simple offset calculation
- Row ID-based direct access
- Full table scan capability

**Example File Structure**:
```
builddb_data/
├── tables/
│   └── users.dat          # Binary data file
└── metadata/
    └── users.json         # Schema definition
```

### 2. Index Manager (`index_manager.py`)

**Purpose**: Manages indexes for accelerating query execution.

**How it works**:
- Implements B-Tree index for range queries
- Implements Hash index for equality searches
- Indexes map column values to row IDs
- Persisted to disk using Python's `pickle`

**B-Tree Structure**:
- Each node contains keys and values
- Leaf nodes store row IDs
- Internal nodes store child pointers
- Supports insertion, search, and range queries

**Key Features**:
- Automatic index selection during query execution
- Support for equality and range searches
- Persistent storage of index structures
- Index building from existing data

**When Indexes are Used**:
- `column = value` → Hash/B-Tree index
- `column > value` → B-Tree range search
- `column < value` → B-Tree range search
- `column >= value` → B-Tree range search
- `column <= value` → B-Tree range search

### 3. Query Parser (`query_parser.py`)

**Purpose**: Parses SQL-like commands into structured format.

**How it works**:
- Uses regular expressions to match SQL patterns
- Breaks down queries into components
- Handles WHERE clause parsing with operator precedence
- Supports nested conditions (AND/OR)

**Supported Statements**:
```sql
CREATE TABLE table_name (col1 TYPE1, col2 TYPE2, ...)
CREATE INDEX index_name ON table_name(column)
INSERT INTO table_name VALUES (val1, val2, ...)
SELECT columns FROM table_name [WHERE condition]
UPDATE table_name SET col=val [WHERE condition]
DELETE FROM table_name [WHERE condition]
```

**Parsed Output Example**:
```python
# Input:  SELECT * FROM users WHERE age > 25
# Output:
{
    "type": "SELECT",
    "table": "users",
    "columns": ["*"],
    "condition": {
        "type": "COMPARISON",
        "column": "age",
        "operator": ">",
        "value": 25
    }
}
```

### 4. Query Executor (`query_executor.py`)

**Purpose**: Executes parsed queries using storage and indexes.

**How it works**:
- Coordinates between storage manager, index manager, and transaction manager
- Implements query optimization through index selection
- Builds filter functions from WHERE clauses
- Handles data projection and formatting

**Execution Flow**:
```
1. Receive parsed query
2. Check for applicable indexes
3. If index exists:
   - Use index to get row IDs
   - Fetch records by row ID
4. If no index:
   - Perform full table scan
5. Apply WHERE filters
6. Project requested columns
7. Return results
```

**Optimization Examples**:
- `WHERE id = 5` with index on `id` → Index lookup (fast)
- `WHERE age > 30` with index on `age` → B-Tree range scan (faster)
- `WHERE name = 'Alice'` without index → Full table scan (slow)

### 5. Transaction Manager (`transaction_manager.py`)

**Purpose**: Provides basic transaction support for data consistency.

**How it works**:
- Assigns unique transaction IDs
- Tracks transaction state (ACTIVE, COMMITTED, ABORTED)
- Implements table-level locking
- Supports commit and rollback operations

**Transaction Flow**:
```
1. BEGIN TRANSACTION → Get transaction ID
2. EXECUTE OPERATIONS → Log operations
3. COMMIT → Persist changes, release locks
   OR
   ROLLBACK → Discard changes, release locks
```

**Key Features**:
- Atomic operations (all or nothing)
- Isolation through table locks
- Transaction logging
- Automatic cleanup of old transactions

## 📦 Installation & Setup

### Requirements
- Python 3.7 or higher
- No external dependencies required (uses only Python standard library)

### Installation

```bash
# Clone or download the files
# All files should be in the same directory:
# - builddb.py
# - storage_manager.py
# - index_manager.py
# - query_parser.py
# - query_executor.py
# - transaction_manager.py

# Make builddb.py executable (optional)
chmod +x builddb.py
```

## 🚀 Usage

### Starting BuildDB

```bash
# Start with default data directory (builddb_data)
python3 builddb.py

# Or specify custom data directory
python3 builddb.py /path/to/data
```

### Interactive Commands

```
builddb> help           # Show help
builddb> tables         # List all tables
builddb> describe users # Show table schema
builddb> exit           # Exit BuildDB
```

### Example Session

```sql
-- Create a table
builddb> CREATE TABLE employees (id INT, name TEXT, salary FLOAT, age INT);
✓ Table 'employees' created successfully

-- Insert data
builddb> INSERT INTO employees VALUES (1, 'Alice', 75000.0, 30);
✓ 1 row inserted into 'employees'

builddb> INSERT INTO employees VALUES (2, 'Bob', 65000.0, 25);
✓ 1 row inserted into 'employees'

builddb> INSERT INTO employees VALUES (3, 'Charlie', 80000.0, 35);
✓ 1 row inserted into 'employees'

-- Query without index (full table scan)
builddb> SELECT * FROM employees WHERE age > 28;
[Executor] Performing full table scan on employees
[Storage] Scanned 3 records from 'employees', returned 3
✓ Query executed successfully

────────────────────────────────────────────────────────
│ id │ name    │ salary  │ age │
────────────────────────────────────────────────────────
│ 1  │ Alice   │ 75000.0 │ 30  │
│ 3  │ Charlie │ 80000.0 │ 35  │
────────────────────────────────────────────────────────

2 row(s) returned

-- Create an index
builddb> CREATE INDEX idx_age ON employees(age);
[Index] Created btree index on employees.age
[Index] Built index on employees.age with 3 records
✓ Index created on employees.age

-- Query with index (fast lookup)
builddb> SELECT name, salary FROM employees WHERE age = 30;
[Executor] Using index on employees.age
[Index] Search on employees.age found 1 results
✓ Query executed successfully

──────────────────────────
│ name  │ salary  │
──────────────────────────
│ Alice │ 75000.0 │
──────────────────────────

1 row(s) returned

-- Update records
builddb> UPDATE employees SET salary=70000.0 WHERE age < 30;
[Executor] Using index range search on employees.age
[Index] Range search on employees.age found 1 results
[Transaction] Started transaction 1
[Transaction] Committed transaction 1
✓ 1 row(s) updated in 'employees'

-- Delete records
builddb> DELETE FROM employees WHERE age > 33;
[Executor] Using index range search on employees.age
[Index] Range search on employees.age found 1 results
[Transaction] Started transaction 2
[Transaction] Committed transaction 2
✓ 1 row(s) deleted from 'employees'

-- View table structure
builddb> describe employees;

Table: employees
──────────────────────────────────────────────────
Column               Type            Indexed   
──────────────────────────────────────────────────
id                   INT             No        
name                 TEXT            No        
salary               FLOAT           No        
age                  INT             Yes       
──────────────────────────────────────────────────
```

## 🔍 How It Demonstrates Database Concepts

### 1. Data Storage

**Concept**: How databases persist data to disk

**Implementation**:
- Fixed-size binary records
- Offset-based access using row IDs
- Separate metadata storage

**See it in action**:
```bash
# After creating and inserting data, check the files:
ls -la builddb_data/tables/      # Binary data files
ls -la builddb_data/metadata/    # Schema definitions
```

### 2. Indexing

**Concept**: How indexes accelerate searches

**Implementation**:
- B-Tree for ordered data and range queries
- Hash for equality lookups
- Automatic index selection

**See it in action**:
```sql
-- Without index: Full table scan
SELECT * FROM employees WHERE salary > 70000;

-- With index: Direct lookup
CREATE INDEX idx_salary ON employees(salary);
SELECT * FROM employees WHERE salary > 70000;
-- Notice the [Executor] message changes!
```

### 3. Query Parsing

**Concept**: How SQL is converted to internal representation

**Implementation**:
- Regex-based parsing
- AST-like structure for conditions
- Type inference

**See it in action**: Enable verbose mode (add print statements) in `query_parser.py`

### 4. Query Execution

**Concept**: How queries are optimized and executed

**Implementation**:
- Cost-based decision (index vs scan)
- Filter pushdown
- Column projection

**See it in action**: Watch the execution logs showing index usage vs table scans

### 5. Transactions

**Concept**: How databases maintain consistency

**Implementation**:
- Transaction IDs and state tracking
- Table-level locking
- Commit/rollback semantics

**See it in action**:
```python
# Transactions prevent partial updates
# If an error occurs mid-operation, changes are rolled back
```

## 📊 Performance Characteristics

### Without Index
- INSERT: O(1) - append to file
- SELECT: O(n) - full table scan
- UPDATE: O(n) - scan + update
- DELETE: O(n) - scan + mark deleted

### With B-Tree Index
- INSERT: O(log n) - index update
- SELECT (equality): O(log n) - index lookup
- SELECT (range): O(log n + k) - k = results
- UPDATE: O(log n + m) - m = matches
- DELETE: O(log n + m) - m = matches

### With Hash Index
- INSERT: O(1) - hash update
- SELECT (equality): O(1) - hash lookup
- SELECT (range): Not supported
- UPDATE: O(1 + m) - m = matches
- DELETE: O(1 + m) - m = matches

## 🧪 Testing

Run the demonstration script:

```bash
python3 demo_builddb.py
```

This script demonstrates:
- Table creation
- Data insertion
- Index creation and usage
- Query optimization
- Transaction handling
- All CRUD operations

## 🔧 Limitations

This is an educational tool with intentional simplifications:

1. **No concurrency**: Single-threaded execution
2. **Simple types**: Only INT, FLOAT, TEXT
3. **Fixed TEXT size**: 256 bytes per text field
4. **No query optimizer**: Basic index selection only
5. **Table-level locks**: Not row-level
6. **No WAL**: Write-ahead logging not implemented
7. **No JOIN**: Single-table queries only
8. **Simple transactions**: No multi-version concurrency control

## 📚 Learning Path

To understand database internals using BuildDB:

1. **Start with Storage**: 
   - Read `storage_manager.py`
   - Insert data and examine `.dat` files with a hex editor

2. **Understand Indexing**:
   - Read `index_manager.py`
   - Create indexes and compare query performance

3. **Study Parsing**:
   - Read `query_parser.py`
   - Add print statements to see parsed output

4. **Follow Execution**:
   - Read `query_executor.py`
   - Watch logs to see index selection

5. **Explore Transactions**:
   - Read `transaction_manager.py`
   - Try operations that trigger rollbacks

## 🎓 Educational Extensions

Ideas for learning exercises:

1. Add a new data type (BOOLEAN, DATE)
2. Implement JOIN operations
3. Add an LRU cache for frequently accessed pages
4. Implement row-level locking
5. Add support for NULL values
6. Implement aggregate functions (COUNT, SUM, AVG)
7. Add write-ahead logging (WAL)
8. Implement MVCC for better concurrency

## 📖 References

BuildDB concepts are inspired by:
- SQLite architecture
- PostgreSQL internals
- "Database System Concepts" by Silberschatz
- "Architecture of a Database System" paper

## 🤝 Contributing

This is an educational project. Feel free to:
- Extend functionality
- Add more query types
- Improve documentation
- Create teaching materials

## 📄 License

Free to use for educational purposes.

---

**Remember**: BuildDB is a teaching tool. For production use, rely on mature database systems like PostgreSQL, MySQL, or SQLite.
