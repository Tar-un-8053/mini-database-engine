import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  AreaChart as AreaChartIcon, Table as TableIcon,
  Maximize2, Minimize2, Radar as RadarIcon, ChevronDown,
  BookmarkPlus, Trash2,
  Save, FileSpreadsheet, FileJson, FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type ChartType = 'table' | 'bar' | 'line' | 'area' | 'pie' | 'radar';

interface ResultChartsProps {
  data: Record<string, any>[];
  columns?: string[];
  persistKey?: string;
}

interface SavedChartSnapshot {
  id: string;
  name: string;
  chartType: ChartType;
  xAxisKey: string;
  data: Record<string, any>[];
  columns: string[];
  createdAt: string;
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#14b8a6',
  '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6',
  '#22d3ee', '#84cc16',
];

const GRADIENT_PAIRS = [
  ['#6366f1', '#8b5cf6'],
  ['#06b6d4', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#34d399'],
  ['#3b82f6', '#60a5fa'],
];

export function ResultCharts({ data, columns, persistKey }: ResultChartsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [expanded, setExpanded] = useState(false);
  const [xAxisKey, setXAxisKey] = useState('');
  const [showAxisPicker, setShowAxisPicker] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [savedCharts, setSavedCharts] = useState<SavedChartSnapshot[]>([]);
  const [selectedSavedChartId, setSelectedSavedChartId] = useState('');

  const savedChartsStorageKey = persistKey ? `${persistKey}:savedCharts` : '';

  useEffect(() => {
    if (!savedChartsStorageKey) {
      setSavedCharts([]);
      setSelectedSavedChartId('');
      return;
    }

    try {
      const raw = localStorage.getItem(savedChartsStorageKey);
      if (!raw) {
        setSavedCharts([]);
      } else {
        const parsed = JSON.parse(raw);
        setSavedCharts(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setSavedCharts([]);
    }

    setSelectedSavedChartId('');
  }, [savedChartsStorageKey]);

  useEffect(() => {
    if (!savedChartsStorageKey) return;

    try {
      localStorage.setItem(savedChartsStorageKey, JSON.stringify(savedCharts));
    } catch {
      // Ignore localStorage write errors (quota/private mode)
    }
  }, [savedCharts, savedChartsStorageKey]);

  const activeSavedChart = useMemo(
    () => savedCharts.find((chart) => chart.id === selectedSavedChartId) || null,
    [savedCharts, selectedSavedChartId]
  );

  useEffect(() => {
    if (!activeSavedChart) return;
    setChartType(activeSavedChart.chartType);
    setXAxisKey(activeSavedChart.xAxisKey || '');
  }, [activeSavedChart]);

  useEffect(() => {
    if (selectedSavedChartId && !savedCharts.some((chart) => chart.id === selectedSavedChartId)) {
      setSelectedSavedChartId('');
      return;
    }

    if (!selectedSavedChartId && data.length === 0 && savedCharts.length > 0) {
      setSelectedSavedChartId(savedCharts[0].id);
    }
  }, [data.length, savedCharts, selectedSavedChartId]);

  const activeData = activeSavedChart?.data?.length ? activeSavedChart.data : data;
  const activeColumnsInput = activeSavedChart?.columns?.length ? activeSavedChart.columns : columns;

  const handleDeleteSavedChart = (chartId: string) => {
    setSavedCharts((prev) => prev.filter((chart) => chart.id !== chartId));
    if (selectedSavedChartId === chartId) {
      setSelectedSavedChartId('');
    }
  };

  const handleSaveSnapshot = (
    currentData: Record<string, any>[],
    currentColumns: string[],
    currentXKey: string
  ) => {
    if (currentData.length === 0) return;

    const timestamp = new Date();
    const snapshot: SavedChartSnapshot = {
      id: `${Date.now()}`,
      name: `${chartType.toUpperCase()} - ${timestamp.toLocaleString()}`,
      chartType,
      xAxisKey: currentXKey,
      data: currentData.map((row) => ({ ...row })),
      columns: [...currentColumns],
      createdAt: timestamp.toISOString(),
    };

    setSavedCharts((prev) => [snapshot, ...prev].slice(0, 25));
    setSelectedSavedChartId(snapshot.id);
    setShowSaveMenu(false);
  };

  // Save / Export functions
  const handleSaveCSV = () => {
    const ws = XLSX.utils.json_to_sheet(activeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `data_export_${Date.now()}.csv`, { bookType: 'csv' });
    setShowSaveMenu(false);
  };

  const handleSaveExcel = () => {
    const ws = XLSX.utils.json_to_sheet(activeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `data_export_${Date.now()}.xlsx`);
    setShowSaveMenu(false);
  };

  const handleSaveJSON = () => {
    const blob = new Blob([JSON.stringify(activeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSaveMenu(false);
  };

  // Determine columns
  const allColumns = useMemo(() => {
    if (activeColumnsInput && activeColumnsInput.length > 0) return activeColumnsInput;
    if (activeData.length === 0) return [];
    return Object.keys(activeData[0]);
  }, [activeColumnsInput, activeData]);

  // Categorize columns
  const { numericCols, labelCols } = useMemo(() => {
    const numeric: string[] = [];
    const labels: string[] = [];
    allColumns.forEach((col) => {
      const hasNumber = activeData.some((row) => typeof row[col] === 'number' || (!isNaN(Number(row[col])) && row[col] !== null && row[col] !== ''));
      if (hasNumber) numeric.push(col);
      else labels.push(col);
    });
    return { numericCols: numeric, labelCols: labels };
  }, [allColumns, activeData]);

  // Auto-select xAxisKey
  const effectiveXKey = useMemo(() => {
    if (xAxisKey && allColumns.includes(xAxisKey)) return xAxisKey;
    if (labelCols.length > 0) return labelCols[0];
    if (allColumns.length > 0) return allColumns[0];
    return '';
  }, [xAxisKey, allColumns, labelCols]);

  // Numeric columns to plot (exclude xAxis if it's numeric)
  const valueCols = useMemo(() => {
    const nums = numericCols.filter((c) => c !== effectiveXKey);
    if (nums.length > 0) return nums;
    // If no separate numeric columns, try all non-x columns
    return allColumns.filter((c) => c !== effectiveXKey);
  }, [numericCols, effectiveXKey, allColumns]);

  // Prepare chart data (ensure numbers)
  const chartData = useMemo(() => {
    return activeData.map((row) => {
      const newRow: Record<string, any> = { ...row };
      valueCols.forEach((col) => {
        const val = row[col];
        newRow[col] = typeof val === 'number' ? val : parseFloat(val) || 0;
      });
      return newRow;
    });
  }, [activeData, valueCols]);

  // Pie data
  const pieData = useMemo(() => {
    if (valueCols.length === 0) return [];
    const valueCol = valueCols[0];
    return chartData.map((row, i) => ({
      name: String(row[effectiveXKey] || `Item ${i + 1}`),
      value: row[valueCol] || 0,
    }));
  }, [chartData, effectiveXKey, valueCols]);

  if (!activeData || activeData.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center">
        <p className="text-sm font-medium text-slate-300">No chart data available</p>
        <p className="mt-1 text-xs text-slate-500">Run a SELECT query to visualize data here.</p>
      </div>
    );
  }

  const chartButtons: { type: ChartType; icon: React.ElementType; label: string }[] = [
    { type: 'table', icon: TableIcon, label: 'Table' },
    { type: 'bar', icon: BarChart3, label: 'Bar' },
    { type: 'line', icon: LineChartIcon, label: 'Line' },
    { type: 'area', icon: AreaChartIcon, label: 'Area' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie' },
    { type: 'radar', icon: RadarIcon, label: 'Radar' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-xl bg-[#0f0f2e]/95 backdrop-blur-lg border border-indigo-500/20 px-4 py-3 shadow-xl shadow-black/40">
        <p className="text-xs font-semibold text-indigo-300 mb-1.5">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="text-white font-medium">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const axisStyle = {
    tick: { fill: '#64748b', fontSize: 11 },
    axisLine: { stroke: '#334155' },
  };

  return (
    <div className={`rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden transition-all duration-500 ${expanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 md:px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
          {chartButtons.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0
                ${chartType === type
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                  : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {savedCharts.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedSavedChartId}
                onChange={(e) => setSelectedSavedChartId(e.target.value)}
                className="max-w-[170px] rounded-lg border border-white/10 bg-[#0f0f2e] px-2.5 py-1.5 text-xs text-slate-300 outline-none hover:border-indigo-500/30"
                title="Load saved chart"
              >
                <option value="">Live Query Data</option>
                {savedCharts.map((chart) => (
                  <option key={chart.id} value={chart.id}>
                    {chart.name}
                  </option>
                ))}
              </select>
              {selectedSavedChartId && (
                <button
                  onClick={() => handleDeleteSavedChart(selectedSavedChartId)}
                  className="p-1.5 rounded-lg text-rose-400 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 transition-all"
                  title="Delete selected saved chart"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* X-Axis picker */}
          {chartType !== 'table' && (
            <div className="relative">
              <button
                onClick={() => setShowAxisPicker(!showAxisPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-white/10 hover:border-indigo-500/30 hover:text-white transition-all"
              >
                X: {effectiveXKey}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showAxisPicker && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-[#0f0f2e] border border-indigo-500/20 shadow-xl z-50 py-1 animate-fadeInUp">
                  {allColumns.map((col) => (
                    <button
                      key={col}
                      onClick={() => { setXAxisKey(col); setShowAxisPicker(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                        ${col === effectiveXKey ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save / Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10
                hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all font-medium"
              title="Save / Export data"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>
            {showSaveMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-[#0f0f2e] border border-indigo-500/20 shadow-xl z-50 py-1.5 animate-fadeInUp">
                <button
                  onClick={() => handleSaveSnapshot(activeData, allColumns, effectiveXKey)}
                  className="w-full text-left px-3 py-2 text-xs text-indigo-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <BookmarkPlus className="w-4 h-4 text-indigo-400" />
                  Save Graph Snapshot
                </button>
                <div className="my-1 h-px bg-white/10" />
                <button
                  onClick={handleSaveCSV}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-green-400" />
                  Save as CSV
                </button>
                <button
                  onClick={handleSaveExcel}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Save as Excel (.xlsx)
                </button>
                <button
                  onClick={handleSaveJSON}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <FileJson className="w-4 h-4 text-amber-400" />
                  Save as JSON
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className={`p-3 md:p-5 ${expanded ? 'h-[calc(100%-56px)]' : ''}`}>
        {chartType === 'table' ? (
          /* Data Table */
          <div className="max-h-[400px] overflow-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  {allColumns.map((col) => (
                    <th key={col} className="text-left px-4 py-2.5 text-xs font-semibold text-indigo-300 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeData.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    {allColumns.map((col) => (
                      <td key={col} className="px-4 py-2 text-slate-300 whitespace-nowrap font-mono text-xs">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-600 italic">NULL</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : chartType === 'bar' ? (
          /* Bar Chart */
          <div className={expanded ? 'h-full' : 'h-[250px] md:h-[350px]'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <defs>
                  {valueCols.map((col, i) => (
                    <linearGradient key={col} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][1]} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey={effectiveXKey} {...axisStyle} />
                <YAxis {...axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                {valueCols.map((col, i) => (
                  <Bar key={col} dataKey={col} fill={`url(#barGrad${i})`} radius={[6, 6, 0, 0]} maxBarSize={50} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : chartType === 'line' ? (
          /* Line Chart */
          <div className={expanded ? 'h-full' : 'h-[250px] md:h-[350px]'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey={effectiveXKey} {...axisStyle} />
                <YAxis {...axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                {valueCols.map((col, i) => (
                  <Line
                    key={col} type="monotone" dataKey={col}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2.5} dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4 }}
                    activeDot={{ r: 6, fill: CHART_COLORS[i % CHART_COLORS.length], stroke: '#fff', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartType === 'area' ? (
          /* Area Chart */
          <div className={expanded ? 'h-full' : 'h-[250px] md:h-[350px]'}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <defs>
                  {valueCols.map((col, i) => (
                    <linearGradient key={col} id={`areaGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey={effectiveXKey} {...axisStyle} />
                <YAxis {...axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                {valueCols.map((col, i) => (
                  <Area
                    key={col} type="monotone" dataKey={col}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={`url(#areaGrad${i})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : chartType === 'pie' ? (
          /* Pie Chart */
          <div className={expanded ? 'h-full' : 'h-[250px] md:h-[350px]'}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  innerRadius="40%" outerRadius="70%"
                  paddingAngle={3} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#475569' }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : chartType === 'radar' ? (
          /* Radar Chart */
          <div className={expanded ? 'h-full' : 'h-[250px] md:h-[350px]'}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey={effectiveXKey} {...axisStyle} />
                <PolarRadiusAxis {...axisStyle} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                {valueCols.map((col, i) => (
                  <Radar
                    key={col} name={col} dataKey={col}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={0.2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {/* Data summary */}
        <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-600">
          <span>{activeData.length} rows</span>
          <span>&bull;</span>
          <span>{allColumns.length} columns</span>
          {activeSavedChart && (
            <>
              <span>&bull;</span>
              <span className="text-indigo-300">Saved: {activeSavedChart.name}</span>
            </>
          )}
          {numericCols.length > 0 && (
            <>
              <span>&bull;</span>
              <span>{numericCols.length} numeric ({numericCols.join(', ')})</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
