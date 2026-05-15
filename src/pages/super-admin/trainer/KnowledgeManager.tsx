import { useState } from "react"
import { useParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useKnowledgeSources, useCreateKnowledgeSource, useUploadKnowledgeDoc, useSearchKnowledge, useKnowledgeCoverage } from "@/hooks/trainer/useTrainer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FolderPlus, Upload, Search, BookOpen } from "lucide-react"


export default function KnowledgeManager() {
  const { agentId } = useParams<{ agentId: string }>()
  const [selectedSource, setSelectedSource] = useState<string>("")
  const [newSourceName, setNewSourceName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const { data: sourcesResp } = useKnowledgeSources(agentId || "")
  const createSource = useCreateKnowledgeSource()
  const uploadDoc = useUploadKnowledgeDoc()
  const searchKnowledge = useSearchKnowledge()
  const { data: coverageResp } = useKnowledgeCoverage(agentId || "")

  const sources = (sourcesResp as any)?.data ?? []
  const coverage = (coverageResp as any)?.data

  const handleCreateSource = () => {
    if (!agentId || !newSourceName) return
    createSource.mutate({ agentId, payload: { name: newSourceName } })
    setNewSourceName("")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !agentId || !selectedSource) return
    uploadDoc.mutate({ agentId, sourceId: selectedSource, file })
  }

  const handleSearch = () => {
    if (!agentId || !searchQuery) return
    searchKnowledge.mutate({ agentId, query: searchQuery })
  }

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Sources */}
        <div className="w-72 border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Knowledge Sources</h2>
          </div>
          <div className="p-3">
            <div className="flex gap-2">
              <Input placeholder="New source..." value={newSourceName} onChange={e => setNewSourceName(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={handleCreateSource}><FolderPlus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sources.map((s: any) => (
              <div key={s.id} className={`px-4 py-3 cursor-pointer hover:bg-muted/50 border-b ${selectedSource === s.id ? "bg-muted" : ""}`} onClick={() => setSelectedSource(s.id)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Badge variant="secondary" className="text-xs">{s.document_count}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{s.source_type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Documents */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">{selectedSource ? "Documents" : "Select a source"}</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Test relevance..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} className="pl-8 w-64 text-sm" />
              </div>
              <label className="cursor-pointer">
                <Button size="sm" asChild><span><Upload className="h-4 w-4 mr-1" /> Upload</span></Button>
                <input type="file" className="hidden" accept=".pdf,.docx,.csv,.pptx,.txt,.md" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
          <div className="flex-1 p-4">
            {!selectedSource ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a knowledge source from the left panel to view documents</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coverage && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Coverage</span>
                        <span className="text-sm">{coverage.total_documents} docs / {coverage.total_chunks} chunks</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {searchKnowledge.data && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Search Results</CardTitle></CardHeader>
                    <CardContent>
                      {((searchKnowledge.data as any)?.data ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No results found</p>
                      ) : (
                        ((searchKnowledge.data as any)?.data ?? []).map((r: any, i: number) => (
                          <div key={i} className="py-2 border-b last:border-0">
                            <div className="flex justify-between text-sm"><span className="font-medium">{r.filename}</span><Badge variant="outline">{(r.similarity_score * 100).toFixed(0)}%</Badge></div>
                            <p className="text-xs text-muted-foreground mt-1">{r.chunk_text?.slice(0, 200)}...</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
                <p className="text-sm text-muted-foreground text-center">Upload documents to build this agent's knowledge base</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
