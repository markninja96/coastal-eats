import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { cn } from '../lib/cn';

type ConflictSuggestion = {
  name: string;
  detail?: string;
};

type ConflictBannerProps = {
  title: string;
  description: string;
  rule: string;
  suggestions?: ConflictSuggestion[];
  onReview?: () => void;
} & React.HTMLAttributes<HTMLDivElement>;

export function ConflictBanner({
  title,
  description,
  rule,
  suggestions = [],
  onReview,
  className,
  ...props
}: ConflictBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-3xl border border-white/20 bg-sand/70 p-5 text-sm text-ink/80',
        className,
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-coral/20 p-2 text-coral">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{title}</h3>
            <Badge variant="accent">{rule}</Badge>
          </div>
          <p className="text-ink/60">{description}</p>
        </div>
      </div>
      {suggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Badge key={suggestion.name} variant="muted">
              {suggestion.name}
              {suggestion.detail ? ` · ${suggestion.detail}` : ''}
            </Badge>
          ))}
        </div>
      ) : null}
      {onReview ? (
        <div>
          <Button variant="outline" size="sm" onClick={onReview}>
            Review alternatives
          </Button>
        </div>
      ) : null}
    </div>
  );
}
