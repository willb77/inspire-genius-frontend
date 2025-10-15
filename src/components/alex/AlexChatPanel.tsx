"use client"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Mic, Settings, FileUp, Download } from "lucide-react"
import OnboardingCallout from "@/components/onboarding/OnboardingCallout"
import { cn } from "@/lib/utils"
import { useTour } from "@/context/useTour"
import { useRef } from "react"

export type AlexChatPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export default function AlexChatPanel({ open, onOpenChange, className }: AlexChatPanelProps) {
  const { start } = useTour();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleUploadClick = () => fileInputRef.current?.click();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          // base sizing
          "p-0 mt-4 w-full h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-md [&>button]:hidden",
          // add spacing and rounded edge on >= sm screens
          "sm:right-4 sm:inset-y-4 sm:rounded-l-xl sm:shadow-xl sm:border",
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-base font-semibold">Chat with Alex</div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0" aria-label="Export">
              <Download className="size-4" />
            </Button>
            <Button variant="secondary" className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0" aria-label="Settings">
              <Settings className="size-4" />
            </Button>
            <Button variant="secondary" onClick={handleUploadClick} className="size-8 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground p-0" aria-label="Upload file">
              <FileUp className="size-4" />
            </Button>
            <button
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="grid place-items-center rounded-full bg-blue-primary/10 text-blue-primary size-8"
            >
              <X className="size-4" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" />
          </div>
        </div>

        <div className="px-4">
          <Card className="border-none shadow-none">
            <CardContent className="space-y-3 relative">
              <div className="relative flex items-center justify-center h-72">
                <img src="/images/user/home/help-alex.svg" alt="Ask Alex" className="h-64 object-cover" />
                <OnboardingCallout
                  title="How can i help you?"
                  positionClass="z-10 absolute top-[50%] md:top-36 right-[0%] md:right-[20%] lg:right-[0%]"
                  className="!rounded-b-xl !rounded-tr-xl"
                />
                <OnboardingCallout
                  title="Hey ,I’m Alex"
                  positionClass="z-10 absolute top-[5%] md:top-10 lg:top-10 right-[60%] md:right-[60%] lg:right-[60%]"
                  className="!rounded-b-xl !rounded-tr-xl !text-blue-primary"
                />
                <img src="/images/user/home/alex-stars.svg" alt="Alex" className="absolute top-0 right-0  md:right-[20%] lg:right-[10%]" />
              </div>

              <div className="absolute -bottom-12 left-0 w-full flex flex-col gap-2">
                <Button onClick={() => start()} className="w-full h-12 bg-blue-primary hover:bg-blue-primary/80 text-white" variant="secondary">
                  <img src="/images/user/home/tour.svg" alt="Tour" className="w-5 h-5" />
                  <span className="ml-2">Take a Tour</span>
                </Button>
                <Button className="w-full h-12 bg-brown-350 hover:bg-brown-350/80 text-white" variant="outline">
                  <img src="/images/user/home/how-to-use.svg" alt="How to use" className="w-5 h-5" />
                  <span className="ml-2">How to use</span>
                </Button>
                <Button className="w-full h-12 bg-brown-250 hover:bg-brown-250/80 text-white" variant="destructive">
                  <img src="/images/user/home/coaches.svg" alt="Coaches" className="w-5 h-5" />
                  <span className="ml-2">Coaches Introduction</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 border-t mt-auto">
          <div className="relative flex items-center justify-between gap-2">
          <Mic className="absolute left-2 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input placeholder="Ask Anything...." className="h-11 !pl-10" />
            <Button className="h-11 px-3 bg-blue-primary hover:bg-blue-primary/90">
              <Send className="size-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
