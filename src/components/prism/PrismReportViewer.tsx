import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePrismReport } from '@/hooks/prism/usePrismReport'
import PrismQuadrantChart from './PrismQuadrantChart'
import PrismBehaviourChart from './PrismBehaviourChart'
import PrismWorkAptitude from './PrismWorkAptitude'
import PrismWorkEnvironment from './PrismWorkEnvironment'
import PrismBigFiveChart from './PrismBigFiveChart'
import PrismEQChart from './PrismEQChart'
import PrismMentalToughness from './PrismMentalToughness'

type PrismReportViewerProps = {
  assessmentId: string
}

export default function PrismReportViewer({
  assessmentId,
}: PrismReportViewerProps) {
  const { data, isLoading } = usePrismReport(assessmentId)
  const report = data?.data?.data

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Report data is not available yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PRISM Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="behaviours">Behaviours</TabsTrigger>
            <TabsTrigger value="work">Work Profile</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
            {report.reportPdfUrl && (
              <TabsTrigger value="pdf">Report PDF</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* PRISM Map Image */}
            {report.mapImageUrl && (
              <div className="flex justify-center">
                <img
                  src={report.mapImageUrl}
                  alt="PRISM Brain Map"
                  className="max-w-md rounded-lg"
                />
              </div>
            )}

            {/* 4D Quadrants */}
            {report.quadrants && report.quadrants.length > 0 && (
              <PrismQuadrantChart quadrants={report.quadrants} />
            )}

            {/* 4D Narrative */}
            {report.reportData?.fourDText && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Analysis
                </h3>
                <p className="text-sm leading-relaxed">
                  {report.reportData.fourDText}
                </p>
              </div>
            )}

            {/* Keywords */}
            {report.reportData?.kwdsMost &&
              report.reportData.kwdsMost.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-700">
                      Strengths
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {report.reportData.kwdsMost.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  {report.reportData.kwdsleast.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-amber-700">
                        Areas to Develop
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {report.reportData.kwdsleast.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </TabsContent>

          <TabsContent value="behaviours" className="space-y-6">
            {report.behaviours && report.behaviours.length > 0 && (
              <PrismBehaviourChart behaviours={report.behaviours} />
            )}

            {/* Top Behaviours */}
            {report.reportData?.dtTopBehData && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Top Behaviours
                </h3>
                <div className="space-y-1">
                  {Object.entries(report.reportData.dtTopBehData).map(
                    ([score, desc]) => (
                      <div
                        key={score}
                        className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm"
                      >
                        <span>{desc}</span>
                        <span className="font-medium">{score}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="work" className="space-y-6">
            {report.reportData?.dtWAData &&
              report.reportData.dtWAData.length > 0 && (
                <PrismWorkAptitude data={report.reportData.dtWAData} />
              )}

            {report.reportData?.dtWEData && (
              <PrismWorkEnvironment data={report.reportData.dtWEData} />
            )}
          </TabsContent>

          <TabsContent value="personality" className="space-y-6">
            {report.reportEIData?.BigFiveItems &&
              report.reportEIData.BigFiveItems.length > 0 && (
                <PrismBigFiveChart
                  data={report.reportEIData.BigFiveItems}
                />
              )}

            {report.reportEIData?.EQItems &&
              report.reportEIData.EQItems.length > 0 && (
                <PrismEQChart data={report.reportEIData.EQItems} />
              )}

            {report.reportEIData?.MTItems &&
              report.reportEIData.MTItems.length > 0 && (
                <PrismMentalToughness
                  data={report.reportEIData.MTItems}
                />
              )}
          </TabsContent>

          {report.reportPdfUrl && (
            <TabsContent value="pdf">
              <iframe
                src={report.reportPdfUrl}
                title="PRISM Report PDF"
                className="h-[600px] w-full rounded-lg border"
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
