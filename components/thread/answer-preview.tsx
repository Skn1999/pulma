"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiLabel } from "@/components/ai-label";

export interface PreviewAnswer {
  code?: string;
  text: string;
  translatedText?: string | null;
  originalLanguage: string;
  aiAssisted: boolean;
}

/** Replica of the company reading pane: exactly what the company sees. */
export function AnswerPreview({ a }: { a: PreviewAnswer }) {
  const [showOriginal, setShowOriginal] = useState(false);
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl font-semibold">Response #{a.code ?? "—"}</h3>
        {a.aiAssisted && <AiLabel />}
      </div>
      {a.translatedText ? (
        <>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Translated from {a.originalLanguage}
            <button type="button" aria-expanded={showOriginal} onClick={() => setShowOriginal((v) => !v)} className="rounded text-xs normal-case underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {showOriginal ? "Hide original" : "Show original"}
            </button>
          </p>
          <p className="mt-2 whitespace-pre-line leading-7">{a.translatedText}</p>
          {showOriginal && (
            <p className="mt-3 whitespace-pre-line border-l-2 pl-3 leading-7 text-muted-foreground">
              <span className="sr-only">Original text in {a.originalLanguage}: </span>
              {a.text}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 whitespace-pre-line leading-7">{a.text || "Your answer will appear here."}</p>
      )}
      <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Not shown: your name, email, language background, other answers</p>
    </div>
  );
}

export function PreviewButton({ companyName, answer, disabled }: { companyName: string; answer: PreviewAnswer; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 shrink-0 gap-1.5 px-4 text-sm" disabled={disabled} onClick={() => setOpen(true)}>
        <Eye className="size-4" aria-hidden="true" /> Preview what {companyName} will see
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What {companyName} will see</DialogTitle>
            <DialogDescription>This is the whole picture. The code is assigned when you send.</DialogDescription>
          </DialogHeader>
          <AnswerPreview a={answer} />
        </DialogContent>
      </Dialog>
    </>
  );
}
