import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "primary" | "success" | "warning" | "destructive" | "accent";
  subtitle?: string;
  trend?: number;
}

const colorMap = {
  primary:     { ring: "ring-[rgba(74,123,190,0.15)] dark:ring-[rgba(94,151,232,0.25)]",   icon: "bg-[rgba(74,123,190,0.10)] text-[#4A7BBE] dark:bg-[rgba(94,151,232,0.18)] dark:text-[#93C5FD]" },
  success:     { ring: "ring-[rgba(5,150,105,0.15)] dark:ring-[rgba(56,211,159,0.25)]",    icon: "bg-[rgba(5,150,105,0.12)] text-[#065F46] dark:bg-[rgba(56,211,159,0.16)] dark:text-[#6EE7B7]" },
  warning:     { ring: "ring-[rgba(217,119,6,0.15)] dark:ring-[rgba(245,158,11,0.3)]",     icon: "bg-[rgba(217,119,6,0.12)] text-[#B45309] dark:bg-[rgba(245,158,11,0.18)] dark:text-[#FCD34D]" },
  destructive: { ring: "ring-[rgba(220,38,38,0.15)] dark:ring-[rgba(236,106,106,0.3)]",    icon: "bg-[rgba(220,38,38,0.10)] text-[#B91C1C] dark:bg-[rgba(236,106,106,0.18)] dark:text-[#FCA5A5]" },
  accent:      { ring: "ring-[rgba(217,119,6,0.15)] dark:ring-[rgba(245,158,11,0.3)]",     icon: "bg-[rgba(217,119,6,0.10)] text-[#D97706] dark:bg-[rgba(245,158,11,0.18)] dark:text-[#FCD34D]" },
};

export function StatCard({ title, value, icon: Icon, color = "primary", subtitle, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border shadow-card p-5 flex flex-col gap-4 animate-fade-in",
      "ring-1", c.ring
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", c.icon)}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full",
            trend >= 0
              ? "bg-[rgba(143,211,179,0.14)] text-[#4D7F67] dark:bg-[rgba(56,211,159,0.16)] dark:text-[#6EE7B7]"
              : "bg-[rgba(227,140,140,0.14)] text-[#8E5555] dark:bg-[rgba(236,106,106,0.16)] dark:text-[#FCA5A5]"
          )}>
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
          {value}
        </p>
        <p className="text-xs font-medium mt-1 text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate font-mono text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
