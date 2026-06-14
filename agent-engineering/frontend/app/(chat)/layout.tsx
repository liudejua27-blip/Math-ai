import Script from "next/script";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { MathAgentAssistant } from "@/components/assistant-ui/math-agent-assistant";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />
      <Toaster
        position="top-center"
        theme="system"
        toastOptions={{
          className:
            "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
        }}
      />
      <Suspense fallback={<div className="flex h-dvh bg-background" />}>
        <MathAgentAssistant />
      </Suspense>
      {children}
    </>
  );
}
