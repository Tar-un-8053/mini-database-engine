import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Network, Hash } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';


export interface BTreeNode {
  keys: any[];
  children?: BTreeNode[];
  isLeaf: boolean;
}

export interface HashIndex {
  buckets: { key: any; value: any }[][];
}

interface IndexVisualizerProps {
  tableName: string;
  bTreeIndexes: { columnName: string; tree: BTreeNode }[];
  hashIndexes: { columnName: string; hash: HashIndex }[];
}

const AXIS_TICK_STYLE = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const AXIS_LINE_STYLE = { stroke: 'hsl(var(--border))' };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || '#64748b' }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BTreeVisualization({ tree }: { tree: BTreeNode }) {
  const levelChartData = (() => {
    const statsByLevel = new Map<number, { nodes: number; keys: number }>();
    const queue: Array<{ node: BTreeNode; level: number }> = [{ node: tree, level: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      const entry = statsByLevel.get(current.level) || { nodes: 0, keys: 0 };
      entry.nodes += 1;
      entry.keys += current.node.keys.length;
      statsByLevel.set(current.level, entry);

      if (current.node.children && current.node.children.length > 0) {
        for (const child of current.node.children) {
          queue.push({ node: child, level: current.level + 1 });
        }
      }
    }

    return Array.from(statsByLevel.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, stats]) => ({
        level: `L${level}`,
        nodes: stats.nodes,
        keys: stats.keys,
      }));
  })();

  const renderNode = (node: BTreeNode, level: number = 0): JSX.Element => {
    return (
      <div className="flex flex-col items-center gap-2" key={level}>
        <div className="flex gap-1 p-2 border rounded bg-blue-50 dark:bg-blue-950">
          {node.keys.map((key, index) => (
            <Badge key={index} variant="secondary">
              {String(key)}
            </Badge>
          ))}
        </div>
        {node.children && node.children.length > 0 && (
          <div className="flex gap-4 ml-4">
            {node.children.map((child, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-px h-4 bg-border" />
                {renderNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const bTreeSummary = levelChartData.reduce(
    (acc, level) => {
      acc.totalLevels += 1;
      acc.totalNodes += level.nodes;
      acc.totalKeys += level.keys;
      return acc;
    },
    { totalLevels: 0, totalNodes: 0, totalKeys: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Tree Levels</p>
          <p className="text-lg font-semibold text-foreground">{bTreeSummary.totalLevels}</p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Total Nodes</p>
          <p className="text-lg font-semibold text-foreground">{bTreeSummary.totalNodes}</p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Total Keys</p>
          <p className="text-lg font-semibold text-foreground">{bTreeSummary.totalKeys}</p>
        </div>
      </div>

      <div className="h-[220px] w-full rounded-md border p-2 sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={levelChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="level" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="nodes"
              name="Nodes"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="keys"
              name="Keys"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-auto p-4">
        <div className="inline-block min-w-full">
          {renderNode(tree)}
        </div>
      </div>
    </div>
  );
}

function HashVisualization({ hash }: { hash: HashIndex }) {
  const bucketChartData = hash.buckets.map((bucket, index) => {
    const rowReferences = bucket.reduce((sum, entry) => {
      if (Array.isArray(entry.value)) return sum + entry.value.length;
      if (entry.value == null) return sum;
      return sum + 1;
    }, 0);

    return {
      bucket: `B${index}`,
      keys: bucket.length,
      rowReferences,
    };
  });

  const hashSummary = bucketChartData.reduce(
    (acc, bucket) => {
      acc.totalBuckets += 1;
      acc.nonEmptyBuckets += bucket.keys > 0 ? 1 : 0;
      acc.totalDistinctKeys += bucket.keys;
      acc.totalRowReferences += bucket.rowReferences;
      return acc;
    },
    { totalBuckets: 0, nonEmptyBuckets: 0, totalDistinctKeys: 0, totalRowReferences: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Total Buckets</p>
          <p className="text-lg font-semibold text-foreground">{hashSummary.totalBuckets}</p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Non-empty Buckets</p>
          <p className="text-lg font-semibold text-foreground">{hashSummary.nonEmptyBuckets}</p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Distinct Keys</p>
          <p className="text-lg font-semibold text-foreground">{hashSummary.totalDistinctKeys}</p>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Row References</p>
          <p className="text-lg font-semibold text-foreground">{hashSummary.totalRowReferences}</p>
        </div>
      </div>

      <div className="h-[220px] w-full rounded-md border p-2 sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bucketChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="bucket" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="keys"
              name="Distinct Keys"
              fill="#4f46e5"
              radius={[4, 4, 0, 0]}
              animationDuration={700}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="rowReferences"
              name="Row References"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-auto">
        {hash.buckets.map((bucket, index) => (
          <div key={index} className="flex items-start gap-2 p-2 border rounded">
            <Badge variant="outline" className="shrink-0">
              Bucket {index}
            </Badge>
            <div className="flex flex-wrap gap-1">
              {bucket.length === 0 ? (
                <span className="text-sm text-muted-foreground">Empty</span>
              ) : (
                bucket.map((entry, entryIndex) => (
                  <Badge key={entryIndex} variant="secondary">
                    {String(entry.key)}: {String(entry.value)}
                  </Badge>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IndexVisualizer({ tableName, bTreeIndexes, hashIndexes }: IndexVisualizerProps) {
  const hasIndexes = bTreeIndexes.length > 0 || hashIndexes.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="size-5" />
          Index Structures
        </CardTitle>
        <CardDescription>
          Visualize B-Tree and Hash indexes for table: {tableName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasIndexes ? (
          <p className="text-sm text-muted-foreground">
            No indexes created for this table yet
          </p>
        ) : (
          <Tabs defaultValue={bTreeIndexes[0]?.columnName || hashIndexes[0]?.columnName}>
            <TabsList className="mb-4 flex w-full justify-start gap-1 overflow-x-auto">
              {bTreeIndexes.map((index) => (
                <TabsTrigger key={index.columnName} value={index.columnName}>
                  B-Tree: {index.columnName}
                </TabsTrigger>
              ))}
              {hashIndexes.map((index) => (
                <TabsTrigger key={index.columnName} value={index.columnName}>
                  <Hash className="size-3 mr-1" />
                  Hash: {index.columnName}
                </TabsTrigger>
              ))}
            </TabsList>

            {bTreeIndexes.map((index) => (
              <TabsContent key={index.columnName} value={index.columnName}>
                <Card>
                  <CardHeader>
                    <CardTitle>B-Tree Index on {index.columnName}</CardTitle>
                    <CardDescription>
                      Balanced tree structure for efficient range queries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BTreeVisualization tree={index.tree} />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            {hashIndexes.map((index) => (
              <TabsContent key={index.columnName} value={index.columnName}>
                <Card>
                  <CardHeader>
                    <CardTitle>Hash Index on {index.columnName}</CardTitle>
                    <CardDescription>
                      Hash table for O(1) equality lookups
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HashVisualization hash={index.hash} />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
