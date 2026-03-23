import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { InterviewGuide } from '@/types/job-blueprint'
import { MessageSquare, AlertTriangle, HelpCircle } from 'lucide-react'

type InterviewGuideViewProps = {
  guide: InterviewGuide
}

export function InterviewGuideView({ guide }: InterviewGuideViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Interview Guide</h3>
        <p className="text-sm text-slate-500">
          Role: {guide.roleTitle} | Generated {new Date(guide.generatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Focus dimensions */}
      {guide.focusDimensions.map(fd => (
        <Card key={fd.dimensionId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {fd.dimensionName}
              <Badge variant="outline" className="text-xs capitalize">{fd.category}</Badge>
              <span className="text-xs text-slate-400 ml-auto">
                Benchmark: {fd.benchmarkScore}% | Candidate: {fd.candidateScore}% | Gap: {fd.gap > 0 ? '+' : ''}{fd.gap}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fd.questions.map((q, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Counter-productive behavior questions */}
      {guide.counterProductiveQuestions.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Counter-Productive Behavior Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {guide.counterProductiveQuestions.map((cpq, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-red-700 mb-1">{cpq.dimensionName}</p>
                <ul className="space-y-1.5">
                  {cpq.questions.map((q, j) => (
                    <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* General questions */}
      {guide.generalQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">General Interview Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {guide.generalQuestions.map((q, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
