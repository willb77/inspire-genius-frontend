import React from "react";
import { X, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AlexChatPanel from "@/components/alex/AlexChatPanel";

export default function AlexFloating() {
  const [open, setOpen] = React.useState(true);
  const [chatOpen, setChatOpen] = React.useState(false);
  
  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="alex-pill"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.6 }}
            className="relative flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #55362A, #466BC4)",
            }}
            onClick={() => setChatOpen(true)}
          >
            <button
              type="button"
              aria-label="Close Alex"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="cursor-pointer absolute -top-2 -right-2 grid place-items-center rounded-full bg-blue-primary hover:bg-blue-primary text-white transition-colors size-6"
            >
              <X className="size-4" />
            </button>
            <img
              src="/floating-alex.svg"
              alt="Alex"
              className="h-10 w-10 rounded-full bg-white/20 p-1 shrink-0"
            />
            <span className="text-white font-medium text-lg pr-2">Alex</span>
          </motion.div>
        ) : (
          // Edge handle partially peeking from the right edge
          <motion.button
            key="alex-handle"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open Alex Assistant"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.6 }}
            className="cursor-pointer fixed bottom-6 right-4 translate-x-1/2 h-16 w-9 rounded-l-2xl shadow-lg grid place-items-center"
            style={{
              background: "linear-gradient(135deg, #55362A, #466BC4)",
            }}
          >
            <ChevronLeft className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>
      <AlexChatPanel open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
