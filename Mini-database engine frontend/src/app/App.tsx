import { useState, useEffect, useCallback, useMemo } from 'react';
import { QueryEditor } from '@/app/components/QueryEditor';
import { TableViewer, TableData } from '@/app/components/TableViewer';
import { IndexVisualizer, BTreeNode, HashIndex } from '@/app/components/IndexVisualizer';
import { TransactionManager, Transaction } from '@/app/components/TransactionManager';
import { StorageManager, StorageStats } from '@/app/components/StorageManager';
import { QueryPlanVisualizer, QueryPlanNode } from '@/app/components/QueryPlanVisualizer';
import { LoginPage } from '@/app/components/LoginPage';
import { DatabaseSetup } from '@/app/components/DatabaseSetup';
import { ResultCharts } from '@/app/components/ResultCharts';
import { AIChatBot } from '@/app/components/AIChatBot';
import { FileImporter } from '@/app/components/FileImporter';
import {
  Database, Table, Network, GitBranch, HardDrive, Workflow,
  LogOut, ChevronLeft, ChevronRight, Activity, Zap, ArrowLeft,
  Bot, BarChart3, Menu, X, FileUp, Save, FileText, FileSpreadsheet, FileJson,
} from 'lucide-react';
import * as api from '@/app/api';
import * as XLSX from 'xlsx';

type TabKey = 'query' | 'tables' | 'indexes' | 'transactions' | 'storage' | 'plan' | 'ai-chat' | 'charts' | 'import';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'ai-chat', label: 'AI Assistant', icon: Bot, description: 'Natural language to SQL' },
  { key: 'query', label: 'Query Editor', icon: Database, description: 'Execute SQL queries' },
  { key: 'import', label: 'Import File', icon: FileUp, description: 'Load CSV/Excel files' },
  { key: 'charts', label: 'Charts', icon: BarChart3, description: 'Visualize query results' },
  { key: 'tables', label: 'Tables', icon: Table, description: 'Browse table data' },
  { key: 'indexes', label: 'Indexes', icon: Network, description: 'Visualize indexes' },
  { key: 'transactions', label: 'Transactions', icon: GitBranch, description: 'Manage transactions' },
  { key: 'storage', label: 'Storage', icon: HardDrive, description: 'Storage analytics' },
  { key: 'plan', label: 'Query Plan', icon: Workflow, description: 'Execution plans' },
];

export default function App() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('db_authenticated') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('db_user') || '';
  });
  const [activeDatabase, setActiveDatabase] = useState(() => {
    const user = localStorage.getItem('db_user') || '';
    return user ? localStorage.getItem(`db_active_${user}`) || '' : '';
  });

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<TabKey>('ai-chat');
  const [queryResultData, setQueryResultData] = useState<Record<string, any>[]>([]);
  const [chartDataHydrated, setChartDataHydrated] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showChartExport, setShowChartExport] = useState(false);

  const chartDataStorageKey = currentUser && activeDatabase
    ? `db_chart_data_${currentUser}_${activeDatabase}`
    : '';
  const chartSnapshotsStorageKey = currentUser && activeDatabase
    ? `db_saved_graphs_${currentUser}_${activeDatabase}`
    : '';

  // Export helpers
  const exportQueryData = (format: 'csv' | 'xlsx' | 'json') => {
    if (queryResultData.length === 0) return;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(queryResultData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_data_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(queryResultData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      XLSX.writeFile(wb, `query_data_${Date.now()}.${format}`, format === 'csv' ? { bookType: 'csv' } : undefined);
    }
    setShowChartExport(false);
  };

  // Close mobile sidebar on tab change
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // --- Data State ---
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [queryHistory, setQueryHistory] = useState<{ query: string; timestamp: Date; success: boolean }[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [queryPlan, setQueryPlan] = useState<QueryPlanNode | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  const [bTreeIndexes, setBTreeIndexes] = useState<{ columnName: string; tree: BTreeNode }[]>([]);
  const [hashIndexes, setHashIndexes] = useState<{ columnName: string; hash: HashIndex }[]>([]);

  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalPages: 0, usedPages: 0, pageSize: 4,
    bufferPoolSize: 100, bufferPoolUsed: 0, totalRecords: 0,
  });
  const [dataFiles, setDataFiles] = useState<{ name: string; size: number; records: number }[]>([]);

  const chartFallbackData = useMemo(() => {
    return tables.map((table) => ({
      table: table.name,
      rows: table.rows.length,
      columns: table.columns.length,
      indexedColumns: table.indexedColumns?.length || 0,
    }));
  }, [tables]);

  const chartSourceData = queryResultData.length > 0 ? queryResultData : chartFallbackData;
  const usingFallbackChartsData = queryResultData.length === 0 && chartFallbackData.length > 0;

  // --- Auth Handlers ---
  const handleLogin = (username: string) => {
    setIsAuthenticated(true);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('db_authenticated');
    localStorage.removeItem('db_user');
    setIsAuthenticated(false);
    setCurrentUser('');
    setActiveDatabase('');
  };

  const handleSelectDatabase = (dbName: string) => {
    setActiveDatabase(dbName);
  };

  const handleSwitchDatabase = () => {
    const user = currentUser;
    localStorage.removeItem(`db_active_${user}`);
    setActiveDatabase('');
  };

  // --- Data Fetching ---
  const loadTables = useCallback(async () => {
    try {
      const data = await api.fetchTables();
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0].name);
      }
    } catch (e) {
      console.error('Failed to load tables:', e);
    }
  }, [selectedTable]);

  const loadIndexes = useCallback(async (tableName: string) => {
    try {
      const data = await api.fetchIndexes(tableName);
      setBTreeIndexes(data.bTreeIndexes);
      setHashIndexes(data.hashIndexes);
    } catch (e) {
      console.error('Failed to load indexes:', e);
    }
  }, []);

  const loadStorage = useCallback(async () => {
    try {
      const data = await api.fetchStorage();
      setStorageStats(data.stats);
      setDataFiles(data.dataFiles);
    } catch (e) {
      console.error('Failed to load storage:', e);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await api.fetchTransactions();
      setTransactions(
        data.transactions.map((t: any) => ({
          ...t,
          operations: t.operations || [],
          timestamp: new Date(t.timestamp),
        }))
      );
      if (data.activeTransaction) {
        setActiveTransaction((prev) => ({
          id: data.activeTransaction.id,
          operations: prev?.operations || [],
          status: 'active' as const,
          timestamp: prev?.timestamp || new Date(),
        }));
      }
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeDatabase) {
      loadTables();
      loadStorage();
      loadTransactions();
    }
  }, [isAuthenticated, activeDatabase]);

  useEffect(() => {
    if (selectedTable) {
      loadIndexes(selectedTable);
    }
  }, [selectedTable, loadIndexes]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || !activeDatabase || !chartDataStorageKey) {
      setChartDataHydrated(false);
      return;
    }

    try {
      const saved = localStorage.getItem(chartDataStorageKey);
      if (!saved) {
        setQueryResultData([]);
      } else {
        const parsed = JSON.parse(saved);
        setQueryResultData(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('Failed to load saved chart data:', e);
      setQueryResultData([]);
    } finally {
      setChartDataHydrated(true);
    }
  }, [isAuthenticated, currentUser, activeDatabase, chartDataStorageKey]);

  useEffect(() => {
    if (!chartDataHydrated || !chartDataStorageKey) return;

    try {
      localStorage.setItem(chartDataStorageKey, JSON.stringify(queryResultData));
    } catch (e) {
      console.error('Failed to persist chart data:', e);
    }
  }, [chartDataHydrated, chartDataStorageKey, queryResultData]);

  // --- Handlers ---
  const handleExecuteQuery = (query: string) => {
    const statements = query
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    if (statements.length === 0) {
      return { success: false, message: 'SQL query is required.', executionTime: 0, rowsAffected: 0 };
    }

    const firstStatementUpper = statements[0].toUpperCase();
    const timestamp = new Date();

    (async () => {
      let latestData: Record<string, any>[] | null = null;
      let hasMutation = false;
      let lastReadableStatement = '';

      try {
        for (const statement of statements) {
          const result = await api.executeQuery(statement);
          const upper = statement.toUpperCase();

          if (!result.success) {
            setQueryHistory((prev) => [...prev, { query, timestamp, success: false }]);
            return;
          }

          if (Array.isArray(result.data)) {
            latestData = result.data;
          }

          if (['SELECT', 'PRAGMA', 'EXPLAIN', 'WITH'].some((k) => upper.startsWith(k))) {
            lastReadableStatement = statement;
          }

          if (['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'].some((k) => upper.startsWith(k))) {
            hasMutation = true;
          }

          if (activeTransaction) {
            setActiveTransaction((prev) =>
              prev ? { ...prev, operations: [...prev.operations, statement] } : prev
            );
          }
        }

        setQueryHistory((prev) => [...prev, { query, timestamp, success: true }]);

        if (latestData !== null) {
          // Always replace old results with the latest SELECT output, even if empty.
          setQueryResultData(latestData);
        }

        if (lastReadableStatement) {
          setLastQuery(lastReadableStatement);
          const plan = await api.getQueryPlan(lastReadableStatement);
          setQueryPlan(plan);
        }

        if (hasMutation) {
          await loadTables();
          await loadStorage();
          if (selectedTable) await loadIndexes(selectedTable);
        }
      } catch (e) {
        setQueryHistory((prev) => [...prev, { query, timestamp, success: false }]);
      }
    })();

    if (statements.length > 1) {
      return {
        success: true,
        message: `Executing ${statements.length} statements...`,
        executionTime: 0,
        rowsAffected: 0,
      };
    }

    if (firstStatementUpper.startsWith('SELECT') || firstStatementUpper.startsWith('WITH')) {
      return { success: true, message: 'Executing query...', executionTime: 0 };
    } else if (firstStatementUpper.startsWith('CREATE TABLE')) {
      return { success: true, message: 'Creating table...', executionTime: 0, rowsAffected: 0 };
    } else if (firstStatementUpper.startsWith('INSERT')) {
      return { success: true, message: 'Inserting row...', executionTime: 0, rowsAffected: 0 };
    } else if (firstStatementUpper.startsWith('UPDATE')) {
      return { success: true, message: 'Updating rows...', executionTime: 0, rowsAffected: 0 };
    } else if (firstStatementUpper.startsWith('DELETE')) {
      return { success: true, message: 'Deleting rows...', executionTime: 0, rowsAffected: 0 };
    }
    return { success: true, message: 'Executing...', executionTime: 0 };
  };

  const handleBeginTransaction = async () => {
    try {
      const result = await api.beginTransaction();
      if (result.success && result.transaction) {
        setActiveTransaction({
          id: result.transaction.id,
          operations: [],
          status: 'active',
          timestamp: new Date(result.transaction.timestamp),
        });
      }
    } catch (e) {
      console.error('Failed to begin transaction:', e);
    }
  };

  const handleCommitTransaction = async () => {
    try {
      const result = await api.commitTransaction();
      if (result.success) {
        if (activeTransaction) {
          setTransactions((prev) => [...prev, { ...activeTransaction, status: 'committed' as const }]);
        }
        setActiveTransaction(null);
        await loadTables();
        await loadStorage();
      }
    } catch (e) {
      console.error('Failed to commit transaction:', e);
    }
  };

  const handleRollbackTransaction = async () => {
    try {
      const result = await api.rollbackTransaction();
      if (result.success) {
        if (activeTransaction) {
          setTransactions((prev) => [...prev, { ...activeTransaction, status: 'aborted' as const }]);
        }
        setActiveTransaction(null);
        await loadTables();
        await loadStorage();
      }
    } catch (e) {
      console.error('Failed to rollback transaction:', e);
    }
  };

  // --- Render Login if not authenticated ---
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // --- Render Database Setup if no database selected ---
  if (!activeDatabase) {
    return <DatabaseSetup username={currentUser} onSelectDatabase={handleSelectDatabase} />;
  }

  // --- Render Dashboard ---
  const activeNavItem = NAV_ITEMS.find((item) => item.key === activeTab)!;

  return (
    <div className="min-h-screen flex bg-[#060614] relative overflow-hidden">
      {/* Background effects */}
      <div className="floating-orb orb-indigo-2" />
      <div className="floating-orb orb-purple-2" />
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* ===== Mobile Sidebar Overlay ===== */}
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-overlay md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside
        className={`
          ${mobileSidebarOpen ? 'mobile-sidebar' : 'hidden'}
          md:relative md:flex md:flex-col
          flex flex-col
          border-r border-indigo-500/10 bg-[#0a0a1e]/95 md:bg-[#0a0a1e]/80 backdrop-blur-xl transition-all duration-300
          ${!mobileSidebarOpen ? (sidebarCollapsed ? 'md:w-20' : 'md:w-72') : ''}
          z-50 md:z-20
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-indigo-500/10">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30">
            <Database className="w-5 h-5 text-white" />
          </div>
          {(!sidebarCollapsed || mobileSidebarOpen) && (
            <div className="animate-fadeIn flex-1">
              <h1 className="text-sm font-bold text-white leading-tight">Mini Database</h1>
              <p className="text-[11px] text-slate-500">Engine Dashboard</p>
            </div>
          )}
          {/* Mobile close button */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Database */}
        <div className="px-3 py-3 border-b border-indigo-500/10">
          <button
            onClick={handleSwitchDatabase}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/15 
              hover:bg-indigo-500/15 hover:border-indigo-500/25 transition-all duration-200 group ${sidebarCollapsed && !mobileSidebarOpen ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? `DB: ${activeDatabase} (click to switch)` : 'Switch database'}
          >
            <HardDrive className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <div className="flex-1 min-w-0 text-left animate-fadeIn">
                <p className="text-xs font-medium text-indigo-300 truncate">{activeDatabase}</p>
                <p className="text-[10px] text-slate-600 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Switch database
                </p>
              </div>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border border-indigo-500/20 shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                title={sidebarCollapsed && !mobileSidebarOpen ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-r-full" />
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                {(!sidebarCollapsed || mobileSidebarOpen) && (
                  <div className="animate-fadeIn">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-[11px] ${isActive ? 'text-indigo-300/60' : 'text-slate-600'}`}>{item.description}</div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar toggle - desktop only */}
        <div className="hidden md:block px-3 py-2 border-t border-indigo-500/10">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>

        {/* User section */}
        <div className="px-3 py-4 border-t border-indigo-500/10 safe-bottom">
          <div className={`flex items-center gap-3 ${sidebarCollapsed && !mobileSidebarOpen ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-indigo-500/20">
              {currentUser.charAt(0).toUpperCase()}
            </div>
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <div className="flex-1 min-w-0 animate-fadeIn">
                <p className="text-sm font-medium text-white truncate">{currentUser}</p>
                <p className="text-[11px] text-slate-500">Online</p>
              </div>
            )}
            <button
              onClick={() => { handleLogout(); setMobileSidebarOpen(false); }}
              className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 w-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-indigo-500/10 bg-[#0a0a1e]/50 backdrop-blur-md safe-top">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl ${
              activeTab === 'ai-chat' ? 'bg-violet-500/20 text-violet-400' :
              activeTab === 'query' ? 'bg-indigo-500/20 text-indigo-400' :
              activeTab === 'charts' ? 'bg-teal-500/20 text-teal-400' :
              activeTab === 'tables' ? 'bg-emerald-500/20 text-emerald-400' :
              activeTab === 'indexes' ? 'bg-cyan-500/20 text-cyan-400' :
              activeTab === 'transactions' ? 'bg-amber-500/20 text-amber-400' :
              activeTab === 'storage' ? 'bg-purple-500/20 text-purple-400' :
              'bg-pink-500/20 text-pink-400'
            }`}>
              <activeNavItem.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white">{activeNavItem.label}</h2>
              <p className="text-[10px] md:text-xs text-slate-500 hidden sm:block">{activeNavItem.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Connected</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] md:text-xs text-indigo-400 font-medium truncate max-w-[80px] md:max-w-none">{activeDatabase}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">{tables.length} Tables</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          <div className="animate-fadeInUp">
            {activeTab === 'ai-chat' && (
              <AIChatBot
                onExecuteSQL={async (sql: string) => {
                  const result = await api.executeQuery(sql);
                  if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                    setQueryResultData(result.data);
                  }
                  // Refresh tables after mutations
                  const upper = sql.trim().toUpperCase();
                  if (['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'].some((k) => upper.startsWith(k))) {
                    await loadTables();
                    await loadStorage();
                  }
                  return result;
                }}
                tables={tables.map(t => ({ name: t.name, columns: t.columns }))}
              />
            )}
            {activeTab === 'import' && (
              <FileImporter
                onExecuteSQL={async (sql: string) => {
                  const result = await api.executeQuery(sql);
                  return result;
                }}
                tables={tables.map(t => ({ name: t.name, columns: t.columns }))}
                onRefreshTables={loadTables}
              />
            )}
            {activeTab === 'query' && (
              <div className="space-y-6">
                <QueryEditor onExecuteQuery={handleExecuteQuery} queryHistory={queryHistory} />
                {queryResultData.length > 0 && (
                  <div className="animate-fadeInUp">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      Query Results Visualization
                    </h3>
                    <ResultCharts data={queryResultData} persistKey={chartSnapshotsStorageKey} />
                  </div>
                )}
              </div>
            )}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center border border-indigo-500/15">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Data Visualization</h3>
                        <p className="text-xs text-slate-500">
                          {queryResultData.length > 0
                            ? `${queryResultData.length} rows • Switch between chart types above`
                              : usingFallbackChartsData
                                ? `Showing table summary data (${chartFallbackData.length} tables)`
                                : 'Run a SELECT query or load your saved graph snapshot'}
                        </p>
                      </div>
                    </div>
                    {queryResultData.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowChartExport(!showChartExport)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400
                            hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all"
                          title="Save data"
                        >
                          <Save className="w-4 h-4" />
                          <span className="hidden sm:inline">Save</span>
                        </button>
                        {showChartExport && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#0f0f2e] border border-indigo-500/20 shadow-xl z-50 py-1.5 animate-fadeInUp">
                            <button
                              onClick={() => exportQueryData('csv')}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-green-400" />
                              Save as CSV
                            </button>
                            <button
                              onClick={() => exportQueryData('xlsx')}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                              Save as Excel (.xlsx)
                            </button>
                            <button
                              onClick={() => exportQueryData('json')}
                              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                            >
                              <FileJson className="w-4 h-4 text-amber-400" />
                              Save as JSON
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ResultCharts data={chartSourceData} persistKey={chartSnapshotsStorageKey} />
                </div>
              </div>
            )}
            {activeTab === 'tables' && (
              <TableViewer
                tables={tables}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
              />
            )}
            {activeTab === 'indexes' && (
              <IndexVisualizer
                tableName={selectedTable}
                bTreeIndexes={bTreeIndexes}
                hashIndexes={hashIndexes}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionManager
                transactions={transactions}
                activeTransaction={activeTransaction}
                onBeginTransaction={handleBeginTransaction}
                onCommitTransaction={handleCommitTransaction}
                onRollbackTransaction={handleRollbackTransaction}
              />
            )}
            {activeTab === 'storage' && (
              <StorageManager stats={storageStats} dataFiles={dataFiles} />
            )}
            {activeTab === 'plan' && (
              <QueryPlanVisualizer plan={queryPlan} query={lastQuery} />
            )}
          </div>
        </div>

        {/* Bottom status bar - desktop only */}
        <footer className="hidden md:flex items-center justify-between px-8 py-2.5 border-t border-indigo-500/10 bg-[#0a0a1e]/50 backdrop-blur-md text-[11px] text-slate-600">
          <div className="flex items-center gap-4">
            <span>Mini Database Engine v1.0</span>
            <span className="text-slate-700">|</span>
            <span>{queryHistory.length} queries executed</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Storage: {storageStats.usedPages}/{storageStats.totalPages} pages</span>
            <span className="text-slate-700">|</span>
            <span>{storageStats.totalRecords} records</span>
          </div>
        </footer>

        {/* ===== Mobile Bottom Navigation ===== */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a1e]/95 backdrop-blur-xl border-t border-indigo-500/10 safe-bottom">
          <div className="flex items-center justify-around px-1 py-1.5">
            {[
              { key: 'ai-chat' as TabKey, icon: Bot, label: 'AI Chat' },
              { key: 'query' as TabKey, icon: Database, label: 'Query' },
              { key: 'import' as TabKey, icon: FileUp, label: 'Import' },
              { key: 'tables' as TabKey, icon: Table, label: 'Tables' },
            ].map(({ key, icon: Icon, label }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px]
                    ${isActive
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-slate-600 hover:text-slate-400'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : ''}`} />
                  <span className="text-[9px] font-medium">{label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-400 transition-all min-w-[60px]"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[9px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </main>
    </div>
  );
}
