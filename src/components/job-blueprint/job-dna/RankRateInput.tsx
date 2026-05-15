import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { ScoreBar } from '@/components/job-blueprint/shared/ScoreBar'
import { calculateBenchmark, getInterpretation } from '@/lib/job-blueprint/scoring'
import type { DimensionCategory, DimensionBenchmark } from '@/types/job-blueprint'
import type { DimensionDef } from '@/constants/job-blueprint/dimensions'
import { MAX_RATE } from '@/constants/job-blueprint/scoring-tables'
import { INTERPRETATION_BANDS } from '@/constants/job-blueprint/classification'
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react'

type RankRateInputProps = {
  dimensions: readonly DimensionDef[]
  category: DimensionCategory
  value?: DimensionBenchmark[]
  onChange: (benchmarks: DimensionBenchmark[]) => void
  className?: string
}

type DimensionState = {
  dimensionId: number
  dimensionName: string
  rankPosition: number // 0-indexed
  rateValue: number
}

export function RankRateInput({ dimensions, category, value, onChange, className }: RankRateInputProps) {
  const maxRate = MAX_RATE[category]
  const count = dimensions.length

  // Initialize state from value or defaults
  const [items, setItems] = useState<DimensionState[]>(() => {
    if (value && value.length > 0) {
      return value
        .sort((a, b) => a.rankPosition - b.rankPosition)
        .map(v => ({
          dimensionId: v.dimensionId,
          dimensionName: v.dimensionName,
          rankPosition: v.rankPosition - 1, // convert to 0-indexed
          rateValue: v.rateValue,
        }))
    }
    return dimensions.map((d, i) => ({
      dimensionId: d.id,
      dimensionName: d.name,
      rankPosition: i,
      rateValue: maxRate - i > 0 ? maxRate - i : 1,
    }))
  })

  const computeBenchmarks = useCallback((currentItems: DimensionState[]): DimensionBenchmark[] => {
    return currentItems.map(item => {
      const finalBenchmarkPercent = calculateBenchmark(item.rankPosition, item.rateValue, category)
      return {
        dimensionId: item.dimensionId,
        dimensionName: item.dimensionName,
        category,
        rankPosition: item.rankPosition + 1, // 1-indexed for output
        rankPercent: 0, // will be filled by scoring
        rateValue: item.rateValue,
        finalBenchmarkPercent,
        interpretation: getInterpretation(finalBenchmarkPercent),
      }
    })
  }, [category])

  // Emit changes
  useEffect(() => {
    onChange(computeBenchmarks(items))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setItems(prev => {
      const newItems = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= newItems.length) return prev

      // Swap rank positions
      const temp = newItems[index]
      newItems[index] = { ...newItems[swapIndex], rankPosition: index }
      newItems[swapIndex] = { ...temp, rankPosition: swapIndex }

      return newItems.sort((a, b) => a.rankPosition - b.rankPosition)
    })
  }, [])

  const setRankBySelect = useCallback((dimensionId: number, newRank: number) => {
    setItems(prev => {
      const oldItem = prev.find(i => i.dimensionId === dimensionId)
      if (!oldItem) return prev
      const oldRank = oldItem.rankPosition

      return prev
        .map(item => {
          if (item.dimensionId === dimensionId) {
            return { ...item, rankPosition: newRank }
          }
          // Shift other items
          if (newRank < oldRank) {
            // Moving up: items between newRank and oldRank shift down
            if (item.rankPosition >= newRank && item.rankPosition < oldRank) {
              return { ...item, rankPosition: item.rankPosition + 1 }
            }
          } else {
            // Moving down: items between oldRank and newRank shift up
            if (item.rankPosition > oldRank && item.rankPosition <= newRank) {
              return { ...item, rankPosition: item.rankPosition - 1 }
            }
          }
          return item
        })
        .sort((a, b) => a.rankPosition - b.rankPosition)
    })
  }, [])

  const setRate = useCallback((dimensionId: number, rate: number) => {
    setItems(prev =>
      prev.map(item =>
        item.dimensionId === dimensionId
          ? { ...item, rateValue: rate }
          : item
      )
    )
  }, [])

  const getInterpretationColor = (score: number): string => {
    const band = INTERPRETATION_BANDS.find(b => score >= b.min && score <= b.max)
    return band?.color ?? '#6B7280'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <span className="w-8">Rank</span>
        <span>Dimension</span>
        <span className="w-20 text-center">Rate (1-{maxRate})</span>
        <span className="w-24 text-center">Score</span>
        <span className="w-16 text-center">Move</span>
      </div>

      {items.map((item, index) => {
        const benchmark = calculateBenchmark(item.rankPosition, item.rateValue, category)
        const interp = getInterpretation(benchmark)
        const interpColor = getInterpretationColor(benchmark)
        const dim = dimensions.find(d => d.id === item.dimensionId)

        return (
          <Card key={item.dimensionId} className="shadow-sm">
            <CardContent className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center py-3 px-3">
              {/* Rank selector */}
              <div className="w-8 flex items-center gap-1">
                <GripVertical className="w-3 h-3 text-slate-400" />
                <Select
                  value={String(item.rankPosition)}
                  onValueChange={v => setRankBySelect(item.dimensionId, Number(v))}
                >
                  <SelectTrigger className="w-12 h-8 text-xs" aria-label={`Rank for ${item.dimensionName}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: count }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimension name + description */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.dimensionName}</p>
                <p className="text-xs text-slate-500 truncate">{dim?.description}</p>
              </div>

              {/* Rate input */}
              <div className="w-20">
                <input
                  type="range"
                  min={1}
                  max={maxRate}
                  value={item.rateValue}
                  onChange={e => setRate(item.dimensionId, Number(e.target.value))}
                  className="w-full h-2 accent-slate-700"
                  aria-label={`Rate for ${item.dimensionName}`}
                />
                <p className="text-xs text-center text-slate-600 mt-0.5">{item.rateValue}/{maxRate}</p>
              </div>

              {/* Score bar */}
              <div className="w-24">
                <ScoreBar score={benchmark} size="sm" color={`bg-[${interpColor}]`} />
                <p className="text-[10px] text-center mt-0.5 font-medium" style={{ color: interpColor }}>
                  {interp.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>

              {/* Move buttons */}
              <div className="w-16 flex justify-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  aria-label={`Move ${item.dimensionName} up`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === count - 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  aria-label={`Move ${item.dimensionName} down`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
