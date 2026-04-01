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
  primary:     { ring: "ring-[rgba(10,110,245,0.15)]",  icon: "bg-[rgba(10,110,245,0.10)] text-[#0a6ef5]" },
  success:     { ring: "ring-[rgba(0,201,167,0.15)]",   icon: "bg-[rgba(0,201,167,0.12)] text-[#00c9a7]"  },
  warning:     { ring: "ring-[rgba(251,191,36,0.15)]",  icon: "bg-[rgba(251,191,36,0.12)] text-amber-500"  },
  destructive: { ring: "ring-[rgba(239,68,68,0.15)]",   icon: "bg-[rgba(239,68,68,0.10)] text-red-500"     },
  accent:      { ring: "ring-[rgba(0,201,167,0.15)]",   icon: "bg-[rgba(0,201,167,0.12)] text-[#00c9a7]"  },
};

export function StatCard({ title, value, icon: Icon, color = "primary", subtitle, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border shadow-card p-5 flex flex-col gap-4 animate-fade-in",
      "ring-1", c.ring
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0", c.icon)}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full",
            trend >= 0
              ? "bg-[rgba(0,201,167,0.12)] text-[#00c9a7]"
              : "bg-[rgba(239,68,68,0.10)] text-red-500"
          )}>
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--nv-navy)' }}>
          {value}
        </p>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--nv-muted)' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate font-mono" style={{ color: 'var(--nv-muted)' }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
