import { useState, useRef } from "react"
import { useParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useSimulateMessage, useRunAllTests, useAccuracy, useEvaluationTests, useGenerateAdversarial } from "@/hooks/trainer/useTrainer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Send, FlaskConical, Shield, Zap } from "lucide-react"
import type { SimulatorMessage } from "@/types/trainer"

export default function ConversationSimulator() {
  const { agentId } = useParams<{ agentId: string }>()
  const [messages, setMessages] = useState<SimulatorMessage[]>([])
  const [input, setInput] = useState("")
  const [persona, setPersona] = useState("user")
  const inputRef = useRef<HTMLInputElement>(null)

  const simulate = useSimulateMessage()
  const runTests = useRunAllTests()
  const generateAdversarial = useGenerateAdversarial()
  const { data: accuracyResp } = useAccuracy(agentId || "")
  const { data: testsResp } = useEvaluationTests(agentId || "")

  const accuracy = (accuracyResp as any)?.data
  const tests = (testsResp as any)?.data ?? []

  const handleSend = async () => {
    if (!input.trim() || !agentId) return
    const userMsg: SimulatorMessage = { role: "user", text: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput("")

    simulate.mutate({ agentId, message: input }, {
      onSuccess: (resp: any) => {
        const data = resp?.data
        const agentMsg: SimulatorMessage = {
          role: "agent", text: data?.text || "[No response]",
          tokens_input: data?.tokens_input, tokens_output: data?.tokens_output,
          cost_usd: data?.cost_usd, latency_ms: data?.latency_ms,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, agentMsg])
      },
    })
    inputRef.current?.focus()
  }

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left: Config */}
        <div className="w-64 border-r flex flex-col p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Simulator Config</h3>
          <div>
            <label className="text-xs font-medium">Test as Role</label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {accuracy && (
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-medium">Accuracy Score</p>
                <p className="text-2xl font-bold">{(accuracy.composite_score * 100).toFixed(0)}%</p>
                <div className="space-y-1 mt-2 text-xs">
                  <div className="flex justify-between"><span>Tests</span><span>{(accuracy.test_pass_rate * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span>RLHF</span><span>{(accuracy.rlhf_rating_normalized * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span>Guardrails</span><span>{(accuracy.guardrail_compliance_rate * 100).toFixed(0)}%</span></div>
                </div>
              </CardContent>
            </Card>
          )}
          <Button size="sm" variant="outline" className="w-full" onClick={() => agentId && generateAdversarial.mutate(agentId)}>
            <Zap className="h-4 w-4 mr-1" /> Generate Adversarial
          </Button>
        </div>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="chat"><MessageSquare className="h-4 w-4 mr-1" /> Chat</TabsTrigger>
              <TabsTrigger value="tests"><Shield className="h-4 w-4 mr-1" /> Tests ({tests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && <p className="text-center text-muted-foreground mt-20">Send a message to test the agent</p>}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                      {m.role === "agent" && (
                        <div className="flex gap-2 mt-1 text-xs opacity-60">
                          {m.latency_ms && <span>{m.latency_ms}ms</span>}
                          {m.tokens_output && <span>{m.tokens_output} tokens</span>}
                          {m.cost_usd != null && <span>${m.cost_usd.toFixed(4)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {simulate.isPending && <div className="flex justify-start"><div className="bg-muted rounded-lg p-3 animate-pulse">Thinking...</div></div>}
              </div>
              <div className="p-4 border-t flex gap-2">
                <Input ref={inputRef} placeholder="Type a test message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} />
                <Button onClick={handleSend} disabled={simulate.isPending}><Send className="h-4 w-4" /></Button>
              </div>
            </TabsContent>

            <TabsContent value="tests" className="flex-1 overflow-y-auto p-4">
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold">Evaluation Tests</h3>
                <Button size="sm" onClick={() => agentId && runTests.mutate(agentId)} disabled={runTests.isPending}>
                  Run All Tests
                </Button>
              </div>
              {runTests.data && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Badge variant="default">{(runTests.data as any)?.data?.passed || 0} passed</Badge>
                      <Badge variant="destructive">{(runTests.data as any)?.data?.failed || 0} failed</Badge>
                      <Badge variant="outline">{(runTests.data as any)?.data?.accuracy_pct?.toFixed(0)}% accuracy</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                {tests.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.title}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">{t.category}</Badge>
                          <Badge variant={t.priority === "critical" ? "destructive" : "secondary"} className="text-xs">{t.priority}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{t.input_prompt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SuperAdminLayout>
  )
}
