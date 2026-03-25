import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "success" | "warning" | "destructive" | "accent";
  subtitle?: string;
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent/10 text-accent",
};

export function StatCard({ title, value, icon: Icon, color = "primary", subtitle }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 flex items-start gap-4 animate-fade-in">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}