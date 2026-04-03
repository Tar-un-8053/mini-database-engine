import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { HardDrive, FileText, Database, Layers } from 'lucide-react';

export interface StorageStats {
  totalPages: number;
  usedPages: number;
  pageSize: number;
  bufferPoolSize: number;
  bufferPoolUsed: number;
  totalRecords: number;
}

interface StorageManagerProps {
  stats: StorageStats;
  dataFiles: { name: string; size: number; records: number }[];
}

export function StorageManager({ stats, dataFiles }: StorageManagerProps) {
  const storageUsage = (stats.usedPages / stats.totalPages) * 100;
  const bufferUsage = (stats.bufferPoolUsed / stats.bufferPoolSize) * 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-5" />
            Storage Overview
          </CardTitle>
          <CardDescription>
            Physical storage and memory management statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="size-4" />
                  Page Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used / Total</span>
                    <span className="font-medium">
                      {stats.usedPages} / {stats.totalPages}
                    </span>
                  </div>
                  <Progress value={storageUsage} />
                  <p className="text-xs text-muted-foreground">
                    {storageUsage.toFixed(1)}% utilized
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="size-4" />
                  Buffer Pool
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Used / Total</span>
                    <span className="font-medium">
                      {stats.bufferPoolUsed} / {stats.bufferPoolSize}
                    </span>
                  </div>
                  <Progress value={bufferUsage} />
                  <p className="text-xs text-muted-foreground">
                    {bufferUsage.toFixed(1)}% in memory
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="size-4" />
                  Page Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{stats.pageSize} KB</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalRecords} total records
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Files</CardTitle>
          <CardDescription>Physical storage files on disk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dataFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data files created yet</p>
            ) : (
              dataFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium font-mono text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.records} records
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{file.size} KB</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Concepts</CardTitle>
          <CardDescription>Understanding database storage mechanisms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">Pages & Blocks</h4>
              <p className="text-xs text-muted-foreground">
                Fixed-size units of storage (typically 4KB-16KB) that hold multiple records.
                Databases read/write entire pages for efficiency.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Buffer Pool</h4>
              <p className="text-xs text-muted-foreground">
                In-memory cache of frequently accessed pages to reduce disk I/O.
                Uses replacement policies like LRU to manage limited memory.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">File Organization</h4>
              <p className="text-xs text-muted-foreground">
                Data is organized into files with headers, metadata, and data pages.
                Different organizations (heap, sorted, hashed) optimize for different access patterns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
