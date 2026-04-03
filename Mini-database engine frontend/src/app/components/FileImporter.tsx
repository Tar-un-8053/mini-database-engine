import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FileUp, Upload, FileSpreadsheet, Table as TableIcon,
  CheckCircle2, AlertCircle, Trash2, Search, BarChart3,
  Database, Play, ArrowRight, X, RefreshCw, Eye, Download,
} from 'lucide-react';
import { ResultCharts } from './ResultCharts';

interface FileImporterProps {
  onExecuteSQL: (sql: string) => Promise<any>;
  tables: { name: string; columns: { name: string; type: string }[] }[];
  onRefreshTables: () => void;
}

interface ParsedFile {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: any[][];
  totalRows: number;
}

interface ImportedTable {
  tableName: string;
  fileName: string;
  columns: string[];
  rowCount: number;
  importedAt: Date;
}

// Sanitize a name so it's valid for SQL identifiers
function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'column';
}

// Infer SQL type from values
function inferType(values: any[]): string {
  const sample = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 50);
  if (sample.length === 0) return 'TEXT';
  
  const allIntegers = sample.every(v => Number.isInteger(Number(v)) && !isNaN(Number(v)));
  if (allIntegers) return 'INTEGER';
  
  const allNumbers = sample.every(v => !isNaN(Number(v)));
  if (allNumbers) return 'REAL';
  
  return 'TEXT';
}

export function FileImporter({ onExecuteSQL, tables, onRefreshTables }: FileImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [tableName, setTableName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [importedTables, setImportedTables] = useState<ImportedTable[]>([]);
  
  // Query & chart state for imported data
  const [queryMode, setQueryMode] = useState(false);
  const [selectedImportedTable, setSelectedImportedTable] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [queryResult, setQueryResult] = useState<Record<string, any>[] | null>(null);
  const [queryError, setQueryError] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Parse file
  const parseFile = useCallback((file: File) => {
    setImportStatus(null);
    setQueryMode(false);
    setQueryResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (jsonData.length < 2) {
          setImportStatus({ success: false, message: 'File must have at least a header row and one data row.' });
          return;
        }

        const headers = (jsonData[0] as string[]).map((h, i) => {
          const name = sanitizeName(String(h || `col_${i + 1}`));
          return name || `col_${i + 1}`;
        });

        // Make headers unique
        const uniqueHeaders: string[] = [];
        const seen = new Map<string, number>();
        for (const h of headers) {
          const lower = h.toLowerCase();
          if (seen.has(lower)) {
            const count = seen.get(lower)! + 1;
            seen.set(lower, count);
            uniqueHeaders.push(`${h}_${count}`);
          } else {
            seen.set(lower, 0);
            uniqueHeaders.push(h);
          }
        }

        const rows = jsonData.slice(1).filter(row => row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined));

        const suggestedName = sanitizeName(
          file.name.replace(/\.(csv|xlsx|xls|tsv)$/i, '')
        ) || 'imported_data';

        setParsedFile({
          fileName: file.name,
          sheetName,
          headers: uniqueHeaders,
          rows,
          totalRows: rows.length,
        });
        setTableName(suggestedName);
      } catch (err: any) {
        setImportStatus({ success: false, message: `Failed to parse file: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Handle file input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    // Reset so user can re-upload same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext || '')) {
        parseFile(file);
      } else {
        setImportStatus({ success: false, message: 'Unsupported file type. Use CSV, XLSX, XLS, or TSV.' });
      }
    }
  };

  // Import to database
  const handleImport = async () => {
    if (!parsedFile || !tableName.trim()) return;
    setImporting(true);
    setImportStatus(null);

    try {
      const finalName = sanitizeName(tableName.trim());
      
      // Infer column types
      const colTypes = parsedFile.headers.map((_, colIdx) => {
        const values = parsedFile.rows.map(row => row[colIdx]);
        return inferType(values);
      });

      // Build CREATE TABLE
      const colDefs = parsedFile.headers.map((h, i) => `"${h}" ${colTypes[i]}`).join(', ');
      const createSQL = `CREATE TABLE IF NOT EXISTS "${finalName}" (${colDefs})`;
      
      const createResult = await onExecuteSQL(createSQL);
      if (!createResult.success) {
        setImportStatus({ success: false, message: `Create table failed: ${createResult.message}` });
        setImporting(false);
        return;
      }

      // Insert data in batches
      const BATCH_SIZE = 100;
      let insertedCount = 0;

      for (let i = 0; i < parsedFile.rows.length; i += BATCH_SIZE) {
        const batch = parsedFile.rows.slice(i, i + BATCH_SIZE);
        const placeholders = parsedFile.headers.map(() => '?').join(', ');
        
        // Build multi-row INSERT 
        const valueRows = batch.map(row => {
          const values = parsedFile.headers.map((_, colIdx) => {
            const val = row[colIdx];
            if (val === '' || val === null || val === undefined) return 'NULL';
            if (colTypes[colIdx] === 'INTEGER' || colTypes[colIdx] === 'REAL') {
              const num = Number(val);
              return isNaN(num) ? `'${String(val).replace(/'/g, "''")}'` : String(num);
            }
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          return `(${values.join(', ')})`;
        });

        const insertSQL = `INSERT INTO "${finalName}" (${parsedFile.headers.map(h => `"${h}"`).join(', ')}) VALUES ${valueRows.join(', ')}`;
        const insertResult = await onExecuteSQL(insertSQL);
        
        if (!insertResult.success) {
          setImportStatus({ 
            success: false, 
            message: `Import failed at row ${i + 1}: ${insertResult.message}. ${insertedCount} rows were inserted before the error.` 
          });
          setImporting(false);
          onRefreshTables();
          return;
        }
        insertedCount += batch.length;
      }

      setImportStatus({ 
        success: true, 
        message: `Successfully imported ${insertedCount} rows into table "${finalName}"!` 
      });
      
      setImportedTables(prev => [...prev, {
        tableName: finalName,
        fileName: parsedFile.fileName,
        columns: parsedFile.headers,
        rowCount: insertedCount,
        importedAt: new Date(),
      }]);

      setSelectedImportedTable(finalName);
      setCustomQuery(`SELECT * FROM "${finalName}" LIMIT 100`);
      onRefreshTables();
      
    } catch (err: any) {
      setImportStatus({ success: false, message: `Import error: ${err.message}` });
    } finally {
      setImporting(false);
    }
  };

  // Run query on imported data
  const handleRunQuery = async () => {
    if (!customQuery.trim()) return;
    setQueryLoading(true);
    setQueryError('');
    setQueryResult(null);
    setShowCharts(false);

    try {
      const result = await onExecuteSQL(customQuery);
      if (result.success && result.data) {
        setQueryResult(result.data);
      } else {
        setQueryError(result.message || 'Query failed');
      }
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  // Quick queries
  const quickQueries = selectedImportedTable ? [
    { label: 'All Data', sql: `SELECT * FROM "${selectedImportedTable}" LIMIT 100` },
    { label: 'Count', sql: `SELECT COUNT(*) as total_rows FROM "${selectedImportedTable}"` },
    { label: 'Preview', sql: `SELECT * FROM "${selectedImportedTable}" LIMIT 10` },
  ] : [];

  return (
    <div className="space-y-5 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/15">
          <FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Import &amp; Analyze</h2>
          <p className="text-xs text-slate-500">Load CSV/Excel files, query data &amp; visualize with charts</p>
        </div>
      </div>

      {/* Upload Zone */}
      {!queryMode && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-6 md:p-10 text-center transition-all duration-300 group
            ${dragActive 
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]' 
              : 'border-slate-700/50 bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/5'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv"
            onChange={handleFileSelect}
            className="hidden"
            title="Upload CSV or Excel file"
          />
          <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
            ${dragActive ? 'bg-emerald-500/20 scale-110' : 'bg-slate-800/50 group-hover:bg-emerald-500/10'}`}>
            <Upload className={`w-7 h-7 md:w-8 md:h-8 transition-colors ${dragActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400'}`} />
          </div>
          <p className="text-sm md:text-base font-semibold text-white mb-1">
            {dragActive ? 'Drop your file here!' : 'Drop CSV or Excel file here'}
          </p>
          <p className="text-xs text-slate-500">
            or <span className="text-emerald-400 underline underline-offset-2">click to browse</span> &bull; Supports .csv, .xlsx, .xls, .tsv
          </p>
        </div>
      )}

      {/* Parsed File Preview */}
      {parsedFile && !queryMode && (
        <div className="glass-card rounded-2xl border border-indigo-500/10 overflow-hidden">
          {/* File info header */}
          <div className="px-4 md:px-6 py-4 border-b border-indigo-500/10 bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{parsedFile.fileName}</p>
                  <p className="text-[11px] text-slate-500">
                    Sheet: {parsedFile.sheetName} &bull; {parsedFile.headers.length} columns &bull; {parsedFile.totalRows.toLocaleString()} rows
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setParsedFile(null); setImportStatus(null); }}
                className="self-end sm:self-auto p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Clear file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                  {parsedFile.headers.map((h, i) => (
                    <th key={i} className="px-3 md:px-4 py-2.5 text-left text-xs font-semibold text-indigo-300 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedFile.rows.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-indigo-500/5 hover:bg-white/[0.02]">
                    {parsedFile.headers.map((_, colIdx) => (
                      <td key={colIdx} className="px-3 md:px-4 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                        {row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedFile.totalRows > 5 && (
              <div className="px-4 py-2 text-center text-[11px] text-slate-600 border-t border-indigo-500/5">
                Showing 5 of {parsedFile.totalRows.toLocaleString()} rows
              </div>
            )}
          </div>

          {/* Import controls */}
          <div className="px-4 md:px-6 py-4 border-t border-indigo-500/10 bg-white/[0.01]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Table Name</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Enter table name..."
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-600 
                    focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={importing || !tableName.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold
                  hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Import to DB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Status */}
      {importStatus && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
          importStatus.success 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {importStatus.success ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium">{importStatus.message}</p>
            {importStatus.success && (
              <button
                onClick={() => { setQueryMode(true); setParsedFile(null); }}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                Query &amp; Visualize this data
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Imported Tables List ─── */}
      {importedTables.length > 0 && !queryMode && (
        <div className="glass-card rounded-2xl border border-indigo-500/10 p-4 md:p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-emerald-400" />
            Imported Tables ({importedTables.length})
          </h3>
          <div className="space-y-2">
            {importedTables.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-indigo-500/5 hover:border-emerald-500/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.tableName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{t.fileName} &bull; {t.rowCount} rows &bull; {t.columns.length} cols</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedImportedTable(t.tableName);
                    setCustomQuery(`SELECT * FROM "${t.tableName}" LIMIT 100`);
                    setQueryMode(true);
                    setQueryResult(null);
                    setShowCharts(false);
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-all flex-shrink-0"
                >
                  <Search className="w-3 h-3" />
                  <span className="hidden sm:inline">Query</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Query & Visualization Mode ─── */}
      {queryMode && (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => { setQueryMode(false); setQueryResult(null); setShowCharts(false); }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-1 transition-colors"
          >
            <ArrowRight className="w-3 h-3 rotate-180" />
            Back to Import
          </button>

          {/* Table selector */}
          {importedTables.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {importedTables.map(t => (
                <button
                  key={t.tableName}
                  onClick={() => {
                    setSelectedImportedTable(t.tableName);
                    setCustomQuery(`SELECT * FROM "${t.tableName}" LIMIT 100`);
                    setQueryResult(null);
                    setShowCharts(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    selectedImportedTable === t.tableName
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700/30 bg-white/[0.02] text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {t.tableName}
                </button>
              ))}
              {/* Show all existing tables too */}
              {tables.filter(t => !importedTables.some(it => it.tableName === t.name)).map(t => (
                <button
                  key={t.name}
                  onClick={() => {
                    setSelectedImportedTable(t.name);
                    setCustomQuery(`SELECT * FROM "${t.name}" LIMIT 100`);
                    setQueryResult(null);
                    setShowCharts(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    selectedImportedTable === t.name
                      ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                      : 'border-slate-700/30 bg-white/[0.02] text-slate-500 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Quick queries */}
          {quickQueries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setCustomQuery(q.sql); }}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-indigo-500/15 bg-indigo-500/5 text-indigo-300 
                    hover:bg-indigo-500/10 hover:border-indigo-500/25 transition-all"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Query input */}
          <div className="glass-card rounded-2xl border border-indigo-500/10 overflow-hidden">
            <div className="p-3 md:p-4">
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Write your SQL query here..."
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-xs md:text-sm text-white font-mono
                  placeholder-slate-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none resize-y
                  min-h-[80px] md:min-h-[100px] transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleRunQuery();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <p className="text-[10px] text-slate-600">Ctrl+Enter to run</p>
                <button
                  onClick={handleRunQuery}
                  disabled={queryLoading || !customQuery.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs md:text-sm font-semibold
                    hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  {queryLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Run Query
                </button>
              </div>
            </div>
          </div>

          {/* Query Error */}
          {queryError && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{queryError}</p>
            </div>
          )}

          {/* Query Results */}
          {queryResult && queryResult.length > 0 && (
            <div className="space-y-4">
              {/* Result header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-slate-400">
                  <span className="text-white font-semibold">{queryResult.length}</span> rows returned
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCharts(!showCharts)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      showCharts
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                        : 'bg-white/[0.03] text-slate-400 border border-slate-700/30 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    {showCharts ? 'Hide Charts' : 'Show Charts'}
                  </button>
                  <button
                    onClick={() => {
                      // Export result as CSV
                      const ws = XLSX.utils.json_to_sheet(queryResult);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Results');
                      XLSX.writeFile(wb, `query_results_${Date.now()}.csv`);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-white/[0.03] text-slate-400 border border-slate-700/30 hover:text-white hover:border-slate-600 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                </div>
              </div>

              {/* Charts */}
              {showCharts && (
                <div className="animate-fadeInUp">
                  <ResultCharts data={queryResult} />
                </div>
              )}

              {/* Result Table */}
              <div className="glass-card rounded-2xl border border-indigo-500/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                        {Object.keys(queryResult[0]).map((col, i) => (
                          <th key={i} className="px-3 md:px-4 py-2.5 text-left text-xs font-semibold text-indigo-300 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.slice(0, 50).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-indigo-500/5 hover:bg-white/[0.02]">
                          {Object.values(row).map((val: any, colIdx) => (
                            <td key={colIdx} className="px-3 md:px-4 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                              {val !== null && val !== undefined ? String(val) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {queryResult.length > 50 && (
                    <div className="px-4 py-2 text-center text-[11px] text-slate-600 border-t border-indigo-500/5">
                      Showing 50 of {queryResult.length} rows
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {queryResult && queryResult.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              Query returned no results
            </div>
          )}
        </div>
      )}

      {/* Empty state when no file and no query mode */}
      {!parsedFile && !queryMode && importedTables.length === 0 && !importStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: FileUp, title: 'Upload File', desc: 'CSV, Excel (.xlsx, .xls), TSV', color: 'emerald' },
            { icon: Search, title: 'Run Queries', desc: 'SQL queries on imported data', color: 'indigo' },
            { icon: BarChart3, title: 'Visualize', desc: 'Bar, line, pie charts & more', color: 'violet' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-indigo-500/5 text-center">
              <div className={`w-10 h-10 mx-auto rounded-xl bg-${item.color}-500/10 flex items-center justify-center mb-2`}>
                <item.icon className={`w-5 h-5 text-${item.color}-400`} />
              </div>
              <p className="text-xs font-semibold text-white">{item.title}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
