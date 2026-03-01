import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

type StatCardProps = {
  title: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
};

export function StatCard({ title, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card className="rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">{title}</p>
        {Icon ? (
          <span className="rounded-full bg-sand/70 px-2 py-1 text-ink/70">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
      {detail ? <p className="text-sm text-ink/60">{detail}</p> : null}
    </Card>
  );
}
