import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LikertScale } from './LikertScale'
import { BMLProgressBar } from './BMLProgressBar'
import type { BMLQuestion, BMLResponse, DimensionScore } from '@/types/job-blueprint'
import { normalizeBMLResponses } from '@/lib/job-blueprint/scoring'
import { ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react'

type BMLSurveyProps = {
  questions: BMLQuestion[]
  onSubmit: (responses: BMLResponse[], scores: DimensionScore[], confidence: number) => void
  isSubmitting?: boolean
}

export function BMLSurvey({ questions, onSubmit, isSubmitting }: BMLSurveyProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Map<string, number>>(new Map())
  const [startTime] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTime])

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentIndex]
  const answeredCount = responses.size
  const allAnswered = answeredCount === questions.length

  const handleAnswer = useCallback((value: number) => {
    setResponses(prev => {
      const next = new Map(prev)
      next.set(currentQuestion.id, value)
      return next
    })
    // Auto-advance after a brief moment
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(i => Math.min(i + 1, questions.length - 1)), 300)
    }
  }, [currentIndex, currentQuestion, questions.length])

  const handleSubmit = () => {
    const bmlResponses: BMLResponse[] = Array.from(responses.entries()).map(([questionId, value]) => ({
      questionId,
      value,
    }))
    const { scores, confidence } = normalizeBMLResponses(bmlResponses, questions)
    onSubmit(bmlResponses, scores, confidence)
  }

  if (!currentQuestion) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header with timer */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Brain Mapping Light Assessment</h3>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Progress */}
      <BMLProgressBar current={answeredCount} total={questions.length} />

      {/* Current question */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="uppercase font-semibold">{currentQuestion.category.replace('-', ' ')}</span>
            <span>-</span>
            <span>{currentQuestion.dimensionName}</span>
          </div>
          <CardTitle className="text-base leading-relaxed">{currentQuestion.text}</CardTitle>
        </CardHeader>
        <CardContent>
          <LikertScale
            questionId={currentQuestion.id}
            value={responses.get(currentQuestion.id) ?? null}
            onChange={handleAnswer}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>

        <span className="text-sm text-slate-500">
          {currentIndex + 1} / {questions.length}
        </span>

        {currentIndex < questions.length - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            <Send className="w-4 h-4 mr-1" />
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        )}
      </div>

      {/* Question dots for quick navigation */}
      <div className="flex flex-wrap gap-1 justify-center">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === currentIndex
                ? 'bg-slate-800'
                : responses.has(q.id)
                ? 'bg-green-400'
                : 'bg-slate-200'
            }`}
            aria-label={`Go to question ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
