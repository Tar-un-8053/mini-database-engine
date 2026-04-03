import { useState, useEffect } from 'react';
import {
  Database, Plus, Trash2, ArrowRight, HardDrive, Table, Layers,
  Sparkles, AlertTriangle, CheckCircle2, FolderOpen, MousePointerClick
} from 'lucide-react';

interface DatabaseInfo {
  name: string;
  tables: number;
  size: string;
  createdAt: string;
}

interface DatabaseSetupProps {
  username: string;
  onSelectDatabase: (dbName: string) => void;
}

export function DatabaseSetup({ username, onSelectDatabase }: DatabaseSetupProps) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [newDbName, setNewDbName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingDb, setDeletingDb] = useState<string | null>(null);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);

  // Load databases from localStorage
  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = () => {
    const stored = JSON.parse(localStorage.getItem(`db_databases_${username}`) || '[]');
    setDatabases(stored);
  };

  const handleCreateDatabase = async () => {
    setError('');
    setSuccess('');

    const name = newDbName.trim();
    if (!name) {
      setError('Database name is required');
      return;
    }
    if (name.length < 2) {
      setError('Database name must be at least 2 characters');
      return;
    }
    if (name.length > 30) {
      setError('Database name must be 30 characters or less');
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      setError('Name must start with a letter and contain only letters, numbers, and underscores');
      return;
    }
    if (databases.some((db) => db.name.toLowerCase() === name.toLowerCase())) {
      setError('A database with this name already exists');
      return;
    }

    setIsCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newDb: DatabaseInfo = {
      name,
      tables: 0,
      size: '0 KB',
      createdAt: new Date().toISOString(),
    };

    const updated = [...databases, newDb];
    localStorage.setItem(`db_databases_${username}`, JSON.stringify(updated));
    setDatabases(updated);
    setNewDbName('');
    setIsCreating(false);
    setShowCreateForm(false);
    setSelectedDb(name);
    setSuccess(`Database "${name}" created! Click "Connect" to open it, or it will auto-open in 3 seconds...`);

    // Auto-select after 3 seconds
    setTimeout(() => {
      handleOpenDatabase(name);
    }, 3000);
  };

  const handleDeleteDatabase = async (dbName: string) => {
    setDeletingDb(dbName);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const updated = databases.filter((db) => db.name !== dbName);
    localStorage.setItem(`db_databases_${username}`, JSON.stringify(updated));
    setDatabases(updated);
    setDeletingDb(null);

    // Remove active db if it was deleted
    const activeDb = localStorage.getItem(`db_active_${username}`);
    if (activeDb === dbName) {
      localStorage.removeItem(`db_active_${username}`);
    }
  };

  const handleClickDatabase = (dbName: string) => {
    setSelectedDb(dbName === selectedDb ? null : dbName);
  };

  const handleOpenDatabase = (dbName: string) => {
    localStorage.setItem(`db_active_${username}`, dbName);
    onSelectDatabase(dbName);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#060614]">
      {/* Background */}
      <div className="floating-orb orb-indigo-1" />
      <div className="floating-orb orb-purple-1" />
      <div className="floating-orb orb-cyan-1" />
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="relative z-10 w-full max-w-2xl mx-3 sm:mx-4 animate-fadeInUp">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4 md:mb-5 animate-pulse-glow">
            <Layers className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Database Manager</h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Welcome, <span className="text-indigo-400 font-medium">{username}</span>! Create or select a database to continue.
          </p>
        </div>

        {/* Main card */}
        <div className="glass-card rounded-2xl p-5 sm:p-8 shadow-2xl shadow-black/40 neon-border">

          {/* Success message */}
          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Create Database Section */}
          {!showCreateForm ? (
            <button
              onClick={() => { setShowCreateForm(true); setError(''); setSuccess(''); }}
              className="w-full py-4 rounded-xl border-2 border-dashed border-indigo-500/30 
                hover:border-indigo-500/50 hover:bg-indigo-500/5 
                transition-all duration-300 flex items-center justify-center gap-3 text-slate-400 hover:text-indigo-400 group mb-6"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-medium">Create New Database</span>
            </button>
          ) : (
            <div className="mb-6 p-5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-4 animate-fadeInUp">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Database className="w-4 h-4 text-indigo-400" />
                Create New Database
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={newDbName}
                  onChange={(e) => { setNewDbName(e.target.value); setError(''); }}
                  placeholder="Enter database name (e.g. my_project)"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-indigo-500/20 text-white placeholder-slate-500 
                    focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.07]
                    transition-all duration-300"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateDatabase()}
                />
                <p className="text-[11px] text-slate-600">
                  Must start with a letter. Letters, numbers, and underscores only.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreateDatabase}
                  disabled={isCreating}
                  className="flex-1 py-2.5 rounded-xl font-medium text-white 
                    bg-gradient-to-r from-indigo-600 to-purple-600 
                    hover:from-indigo-500 hover:to-purple-500
                    shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                    disabled:opacity-70 disabled:cursor-not-allowed
                    transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Database
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setError(''); setNewDbName(''); }}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 
                    hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Database list */}
          {databases.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/50 mb-2">
                <FolderOpen className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <p className="text-slate-400 font-medium">No databases yet</p>
                <p className="text-slate-600 text-sm mt-1">
                  Create your first database to start using the Mini Database Engine
                </p>
              </div>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white
                    bg-gradient-to-r from-indigo-600 to-purple-600 
                    hover:from-indigo-500 hover:to-purple-500
                    shadow-lg shadow-indigo-500/25 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Database
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  Your Databases ({databases.length})
                </h3>
              </div>

              {databases.map((db) => {
                const isSelected = selectedDb === db.name;
                return (
                  <div
                    key={db.name}
                    onClick={() => handleClickDatabase(db.name)}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer
                      transition-all duration-300 group animate-fadeInUp
                      ${isSelected
                        ? 'bg-indigo-500/10 border-2 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                        : 'bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/20 hover:bg-white/[0.05]'
                      }`}
                  >
                    {/* DB Icon */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors
                      ${isSelected
                        ? 'bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/30'
                        : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/10 group-hover:border-indigo-500/25'
                      }`}>
                      <Database className={`w-5 h-5 ${isSelected ? 'text-indigo-300' : 'text-indigo-400'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{db.name}</p>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-fadeIn">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Table className="w-3 h-3" />
                          {db.tables} tables
                        </span>
                        <span className="text-[11px] text-slate-600">&bull;</span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(db.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDatabase(db.name); }}
                        disabled={deletingDb === db.name}
                        className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 
                          transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title={`Delete ${db.name}`}
                      >
                        {deletingDb === db.name ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                          </svg>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenDatabase(db.name); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white
                          bg-gradient-to-r from-indigo-600 to-purple-600 
                          hover:from-indigo-500 hover:to-purple-500
                          shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30
                          transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97]"
                      >
                        Open
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Connect to selected database button */}
              {selectedDb && (
                <div className="mt-4 animate-fadeInUp">
                  <button
                    onClick={() => handleOpenDatabase(selectedDb)}
                    className="w-full py-3.5 rounded-xl font-medium text-white text-sm
                      bg-gradient-to-r from-emerald-600 to-teal-600 
                      hover:from-emerald-500 hover:to-teal-500
                      shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40
                      transition-all duration-300 flex items-center justify-center gap-2
                      transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <MousePointerClick className="w-4 h-4" />
                    Connect to "{selectedDb}"
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Databases are stored locally &bull; Mini Database Engine
        </p>
      </div>
    </div>
  );
}
