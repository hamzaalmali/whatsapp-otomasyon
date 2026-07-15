import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/lib/hooks/use-count-up";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  icon: Icon,
  label,
  value,
  accentClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: number | ReactNode;
  accentClassName: string;
}) {
  const animated = useCountUp(typeof value === "number" ? value : 0);

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            accentClassName,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums leading-tight">
            {typeof value === "number" ? animated : value}
          </p>
          <p className="text-sm text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
