import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Workflow, ArrowDown } from 'lucide-react';

export interface QueryPlanNode {
  operation: string;
  details: string;
  cost: number;
  rows: number;
  children?: QueryPlanNode[];
}

interface QueryPlanVisualizerProps {
  plan: QueryPlanNode | null;
  query: string;
}

function PlanNodeVisualization({ node, level = 0 }: { node: QueryPlanNode; level?: number }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 ${level > 0 ? 'ml-8' : ''}`}>
        {level > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <div className="w-4 h-px bg-border" />
            <ArrowDown className="size-3" />
          </div>
        )}
        <Card className="flex-1">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="default">{node.operation}</Badge>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Cost: {node.cost}</span>
                  <span>Rows: {node.rows}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{node.details}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child, index) => (
            <PlanNodeVisualization key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function QueryPlanVisualizer({ plan, query }: QueryPlanVisualizerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="size-5" />
          Query Execution Plan
        </CardTitle>
        <CardDescription>
          Visual representation of how the query optimizer plans to execute this query
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!plan ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Execute a SELECT query to see the execution plan
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm font-mono">{query}</p>
              </CardContent>
            </Card>
            <PlanNodeVisualization node={plan} />
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <h4 className="font-medium text-sm mb-1">Total Estimated Cost</h4>
                <p className="text-2xl font-bold">{plan.cost}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Estimated Rows</h4>
                <p className="text-2xl font-bold">{plan.rows}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
