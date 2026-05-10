import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import DistributorLayout from "@/layouts/DistributorLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PractitionersBody } from "./network/PractitionersBody"
import { TerritoryBody } from "./network/TerritoryBody"

type NetworkTab = "practitioners" | "territory"

function isNetworkTab(value: string | null): value is NetworkTab {
  return value === "practitioners" || value === "territory"
}

type NetworkHubProps = {
  defaultTab?: NetworkTab
}

export default function NetworkHub({ defaultTab = "practitioners" }: NetworkHubProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryTab = searchParams.get("tab")
  const [tab, setTab] = useState<NetworkTab>(isNetworkTab(queryTab) ? queryTab : defaultTab)

  const handleChange = (value: string) => {
    if (!isNetworkTab(value)) return
    setTab(value)
    const params = new URLSearchParams(searchParams)
    params.set("tab", value)
    setSearchParams(params, { replace: true })
  }

  return (
    <DistributorLayout>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#111827]">Network</h1>
        <p className="text-[13px] text-[#6b7280]">Practitioner roster and territory coverage in one place.</p>
      </div>

      <Tabs value={tab} onValueChange={handleChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
          <TabsTrigger value="territory">Territory</TabsTrigger>
        </TabsList>

        <TabsContent value="practitioners">
          <PractitionersBody />
        </TabsContent>

        <TabsContent value="territory">
          <TerritoryBody />
        </TabsContent>
      </Tabs>
    </DistributorLayout>
  )
}
