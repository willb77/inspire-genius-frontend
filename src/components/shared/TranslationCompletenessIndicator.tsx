/**
 * TranslationCompletenessIndicator
 *
 * Shows the status of translations across all supported languages.
 * Can be embedded in admin/settings pages for visibility into translation progress.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LANGUAGES_METADATA,
  TRANSLATION_STATUS_COLORS,
  getCompletionStats,
} from '@/lib/translationCompleteness';

export function TranslationCompletenessIndicator() {
  const stats = getCompletionStats();
  const completionPercent = Math.round((stats.complete / stats.total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Translation Status</CardTitle>
        <CardDescription>
          Community-driven localization progress across {stats.total} languages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
            <div className="text-xs text-muted-foreground">Partial</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.incomplete}</div>
            <div className="text-xs text-muted-foreground">Incomplete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Completion</span>
            <span className="text-muted-foreground">{completionPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Language List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Languages</h4>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            {Object.entries(LANGUAGES_METADATA).map(([code, meta]) => (
              <div key={code} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{code}</span>
                  <span className="text-muted-foreground">{meta.native}</span>
                </div>
                <div className="flex items-center gap-2">
                  {meta.note && <span className="text-xs text-muted-foreground">{meta.note}</span>}
                  <Badge
                    variant="outline"
                    className={
                      TRANSLATION_STATUS_COLORS[meta.status] || TRANSLATION_STATUS_COLORS.incomplete
                    }
                  >
                    {meta.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contribute Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
          <p className="font-medium text-blue-900">Help Translate</p>
          <p className="mt-1 text-xs text-blue-800">
            Found a missing or incorrect translation? See{' '}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-mono">docs/TRANSLATING.md</code>{' '}
            to contribute.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
