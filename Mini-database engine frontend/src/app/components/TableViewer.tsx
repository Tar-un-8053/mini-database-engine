import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Database, Table as TableIcon, Download, FileText, FileSpreadsheet, FileJson, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface TableData {
  name: string;
  columns: { name: string; type: string; primaryKey?: boolean }[];
  rows: Record<string, any>[];
  indexedColumns?: string[];
}

interface TableViewerProps {
  tables: TableData[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

export function TableViewer({ tables, selectedTable, onSelectTable }: TableViewerProps) {
  const currentTable = tables.find((t) => t.name === selectedTable);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportTable = (format: 'csv' | 'xlsx' | 'json') => {
    if (!currentTable || currentTable.rows.length === 0) return;
    const tableName = currentTable.name;
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(currentTable.rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(currentTable.rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tableName);
      XLSX.writeFile(wb, `${tableName}_${Date.now()}.${format}`, format === 'csv' ? { bookType: 'csv' } : undefined);
    }
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Database Tables
          </CardTitle>
          <CardDescription>
            {tables.length} table{tables.length !== 1 ? 's' : ''} in database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tables.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tables created yet</p>
            ) : (
              tables.map((table) => (
                <Badge
                  key={table.name}
                  variant={selectedTable === table.name ? 'default' : 'outline'}
                  className="cursor-pointer gap-2"
                  onClick={() => onSelectTable(table.name)}
                >
                  <TableIcon className="size-3" />
                  {table.name} ({table.rows.length})
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {currentTable && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Table Schema: {currentTable.name}</CardTitle>
              <CardDescription>Column definitions and constraints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column Name</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Constraints</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTable.columns.map((column) => (
                      <TableRow key={column.name}>
                        <TableCell className="font-mono">{column.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{column.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {column.primaryKey && <Badge variant="outline">PRIMARY KEY</Badge>}
                            {currentTable.indexedColumns?.includes(column.name) && (
                              <Badge variant="outline">INDEXED</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Table Data: {currentTable.name}</CardTitle>
                  <CardDescription>{currentTable.rows.length} rows</CardDescription>
                </div>
                {currentTable.rows.length > 0 && (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                    >
                      <Save className="size-4" />
                      <span className="hidden sm:inline">Save</span>
                    </Button>
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-popover border shadow-xl z-50 py-1.5">
                        <button
                          onClick={() => exportTable('csv')}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2.5 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-green-500" />
                          Save as CSV
                        </button>
                        <button
                          onClick={() => exportTable('xlsx')}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2.5 transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                          Save as Excel (.xlsx)
                        </button>
                        <button
                          onClick={() => exportTable('json')}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2.5 transition-colors"
                        >
                          <FileJson className="w-4 h-4 text-amber-500" />
                          Save as JSON
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentTable.columns.map((column) => (
                        <TableHead key={column.name}>{column.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTable.rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={currentTable.columns.length}
                          className="text-center text-muted-foreground"
                        >
                          No data in this table
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentTable.rows.map((row, index) => (
                        <TableRow key={index}>
                          {currentTable.columns.map((column) => (
                            <TableCell key={column.name}>{row[column.name] ?? 'NULL'}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
