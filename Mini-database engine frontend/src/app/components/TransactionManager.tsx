import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { GitBranch, Check, X, Play, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/app/components/ui/scroll-area';

export interface Transaction {
  id: number;
  operations: string[];
  status: 'active' | 'committed' | 'aborted';
  timestamp: Date;
}

interface TransactionManagerProps {
  transactions: Transaction[];
  activeTransaction: Transaction | null;
  onBeginTransaction: () => void;
  onCommitTransaction: () => void;
  onRollbackTransaction: () => void;
}

export function TransactionManager({
  transactions,
  activeTransaction,
  onBeginTransaction,
  onCommitTransaction,
  onRollbackTransaction,
}: TransactionManagerProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="size-5" />
            Transaction Control
          </CardTitle>
          <CardDescription>
            Manage database transactions with ACID properties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={onBeginTransaction}
              disabled={activeTransaction !== null}
              className="gap-2"
            >
              <Play className="size-4" />
              Begin Transaction
            </Button>
            <Button
              onClick={onCommitTransaction}
              disabled={activeTransaction === null}
              variant="outline"
              className="gap-2"
            >
              <Check className="size-4" />
              Commit
            </Button>
            <Button
              onClick={onRollbackTransaction}
              disabled={activeTransaction === null}
              variant="destructive"
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Rollback
            </Button>
          </div>

          {activeTransaction && (
            <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-sm">Active Transaction #{activeTransaction.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">Operations in this transaction:</p>
                  <div className="space-y-1">
                    {activeTransaction.operations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No operations yet</p>
                    ) : (
                      activeTransaction.operations.map((op, index) => (
                        <div key={index} className="text-sm font-mono bg-background p-1 rounded">
                          {op}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Log</CardTitle>
          <CardDescription>History of all database transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions yet</p>
              ) : (
                transactions.slice().reverse().map((transaction) => (
                  <Card key={transaction.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">Transaction #{transaction.id}</span>
                            <Badge
                              variant={
                                transaction.status === 'committed'
                                  ? 'default'
                                  : transaction.status === 'aborted'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {transaction.status === 'committed' && <Check className="size-3 mr-1" />}
                              {transaction.status === 'aborted' && <X className="size-3 mr-1" />}
                              {transaction.status.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {transaction.timestamp.toLocaleString()}
                          </span>
                        </div>
                        {transaction.operations.length > 0 && (
                          <div className="space-y-1">
                            {transaction.operations.map((op, index) => (
                              <div key={index} className="text-xs font-mono bg-muted p-1 rounded">
                                {op}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ACID Properties</CardTitle>
          <CardDescription>Understanding transaction guarantees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Atomicity</h4>
              <p className="text-xs text-muted-foreground">
                All operations in a transaction succeed or all fail
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Consistency</h4>
              <p className="text-xs text-muted-foreground">
                Database remains in valid state before and after transaction
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Isolation</h4>
              <p className="text-xs text-muted-foreground">
                Concurrent transactions don't interfere with each other
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Durability</h4>
              <p className="text-xs text-muted-foreground">
                Committed changes persist even after system failure
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
