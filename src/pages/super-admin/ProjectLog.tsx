import { useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProjectLogMoved from "@/components/super-admin/ProjectLogMoved"
import { FileText, Map } from "lucide-react"

const SITEMAP_MERMAID = `graph TD
  A["/login"] --> B["/home"]
  A --> C["/signup"]
  A --> D["/forgot"]
  A --> E["/social-login"]

  B --> F["/dashboard"]
  B --> G["/documents"]
  B --> H["/settings"]
  B --> I["/help"]
  B --> J["/coaches"]
  B --> K["/feedback"]
  B --> L["/analytics"]

  M["/manager"] --> M1["/manager/dashboard"]
  M --> M2["/manager/team"]
  M --> M3["/manager/bulk-import"]
  M --> M4["/manager/analytics"]

  N["/company-admin"] --> N1["/company-admin/dashboard"]
  N --> N2["/company-admin/users"]
  N --> N3["/company-admin/organization"]
  N --> N4["/company-admin/bulk-import"]

  O["/practitioner"] --> O1["/practitioner/dashboard"]
  O --> O2["/practitioner/clients"]

  P["/distributor"] --> P1["/distributor/dashboard"]
  P --> P2["/distributor/practitioners"]
  P --> P3["/distributor/territory"]

  Q["/super-admin"] --> Q1["/super-admin/dashboard"]
  Q --> Q2["/super-admin/users"]
  Q --> Q3["/super-admin/mentor-management"]
  Q --> Q4["/super-admin/rlhf-training"]
  Q --> Q5["/super-admin/prompt-builder"]
  Q --> Q6["/super-admin/analytics"]
  Q --> Q7["/super-admin/voice-settings"]
  Q --> Q8["/super-admin/agent-trainer"]
  Q --> Q9["/super-admin/process-builder"]
  Q --> Q10["/super-admin/bulk-import"]
  Q --> Q11["/super-admin/settings"]
  Q --> Q12["/super-admin/project-log"]

  style A fill:#ef4444,color:#fff
  style B fill:#3b82f6,color:#fff
  style M fill:#10b981,color:#fff
  style N fill:#8b5cf6,color:#fff
  style O fill:#f59e0b,color:#fff
  style P fill:#ec4899,color:#fff
  style Q fill:#6366f1,color:#fff`

export default function ProjectLog() {
  const [activeTab, setActiveTab] = useState("log")

  return (
    <SuperAdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Log</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Documentation, change log, database schema, and development rules
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="log" className="gap-2">
              <FileText className="h-3.5 w-3.5" />
              Project Log
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="gap-2">
              <Map className="h-3.5 w-3.5" />
              Site Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="flex-1 flex flex-col mt-4">
            <ProjectLogMoved />
          </TabsContent>

          <TabsContent value="sitemap" className="flex-1 mt-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Application Route Map</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-50 p-6 rounded-lg text-xs overflow-auto max-h-[calc(100vh-18rem)] font-mono whitespace-pre leading-relaxed">
                  {SITEMAP_MERMAID}
                </pre>
                <p className="text-xs text-muted-foreground mt-3">
                  Copy the above Mermaid syntax to{" "}
                  <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    mermaid.live
                  </a>{" "}
                  to view the interactive diagram.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}
