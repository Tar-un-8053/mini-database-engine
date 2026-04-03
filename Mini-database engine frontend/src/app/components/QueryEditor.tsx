import { useState } from 'react';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Play, RotateCcw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';

interface QueryResult {
  success: boolean;
  message: string;
  data?: any[];
  executionTime?: number;
  rowsAffected?: number;
}

interface QueryEditorProps {
  onExecuteQuery: (query: string) => QueryResult;
  queryHistory: { query: string; timestamp: Date; success: boolean }[];
}

export function QueryEditor({ onExecuteQuery, queryHistory }: QueryEditorProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);

  const handleExecute = () => {
    if (!query.trim()) return;
    const res = onExecuteQuery(query);
    setResult(res);
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
  };

  const exampleQueries = [
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
    'SELECT * FROM students;',
    'SELECT * FROM courses;',
    'SELECT * FROM students LIMIT 5; SELECT * FROM courses LIMIT 5;',
    'SELECT major, COUNT(*) AS total FROM students GROUP BY major ORDER BY total DESC;',
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SQL Query Editor</CardTitle>
          <CardDescription>
            Run single or multiple SQL statements (use semicolon ; to separate)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Example: SELECT * FROM students; SELECT * FROM courses;"
              className="min-h-[100px] md:min-h-[150px] font-mono text-xs md:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Ek hi line me kitni bhi queries likho, bas unhe ; se separate karo.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleExecute} className="gap-2 text-xs md:text-sm">
                <Play className="size-4" />
                Execute
              </Button>
              <Button onClick={handleClear} variant="outline" className="gap-2 text-xs md:text-sm">
                <RotateCcw className="size-4" />
                Clear
              </Button>
            </div>
          </div>

          {result && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="size-5 text-green-600" />
                ) : (
                  <XCircle className="size-5 text-red-600" />
                )}
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.message}
                </span>
              </div>
              {result.executionTime !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  Execution time: {result.executionTime}ms
                </div>
              )}
              {result.rowsAffected !== undefined && (
                <div className="text-sm text-muted-foreground">
                  Rows affected: {result.rowsAffected}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Queries</CardTitle>
          <CardDescription>Click to populate the editor with example queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((exampleQuery, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => setQuery(exampleQuery)}
              >
                {exampleQuery.split(' ')[0]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Query History</CardTitle>
          <CardDescription>Recent executed queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[200px] overflow-auto">
            {queryHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No queries executed yet</p>
            ) : (
              queryHistory.slice(-10).reverse().map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                >
                  {item.success ? (
                    <CheckCircle className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-red-600" />
                  )}
                  <code className="flex-1 truncate">{item.query}</code>
                  <span className="text-xs text-muted-foreground">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
