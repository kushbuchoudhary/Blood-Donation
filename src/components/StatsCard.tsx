import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
}

const StatsCard = ({ title, value, icon: Icon, trend, loading }: StatsCardProps) => {
  return (
    <Card className="card-gradient border-border/50 hover:shadow-lg transition-smooth">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded mt-2" />
            ) : (
              <p className="text-3xl font-bold mt-2">{value}</p>
            )}
            {trend && (
              <p className="text-xs text-muted-foreground mt-1">{trend}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;