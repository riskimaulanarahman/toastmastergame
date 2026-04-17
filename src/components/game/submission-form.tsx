"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const itemNumbers = Array.from({ length: 10 }, (_, idx) => idx + 1);

export function SubmissionForm({
  sessionId,
  disabled,
  initialSubmitted,
  endAt
}: {
  sessionId: string;
  disabled: boolean;
  initialSubmitted: boolean;
  endAt: string | null;
}): JSX.Element {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    Object.fromEntries(itemNumbers.map((number) => [number, ""])) as Record<number, string>
  );
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [expired, setExpired] = useState(() => (endAt ? new Date(endAt).getTime() <= Date.now() : false));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!endAt) {
      setExpired(true);
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() >= new Date(endAt).getTime()) {
        setExpired(true);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [endAt]);

  const effectiveDisabled = disabled || submitted || expired;

  const payload = useMemo(
    () => ({
      answers: itemNumbers.map((item) => ({
        item_number: item,
        answer_text: answers[item] ?? ""
      }))
    }),
    [answers]
  );

  async function submitAnswers(): Promise<void> {
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : ({ error: await response.text() } as { error?: string });

      if (!response.ok) {
        throw new Error(body.error ?? "Submission failed");
      }

      setSubmitted(true);
      toast.success("Your answers were submitted");
      router.replace(`/play/${sessionId}/result`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {itemNumbers.map((itemNumber) => (
          <div key={itemNumber} className="space-y-2">
            <Label htmlFor={`item-${itemNumber}`}>Item {itemNumber}</Label>
            <Input
              id={`item-${itemNumber}`}
              value={answers[itemNumber]}
              disabled={effectiveDisabled}
              onChange={(event) => {
                setAnswers((prev) => ({ ...prev, [itemNumber]: event.target.value }));
              }}
              placeholder={`Answer for #${itemNumber}`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {submitted
            ? "Submission recorded. You cannot submit again."
            : expired
              ? "Time is up. Submissions are closed."
              : "You can submit once only."}
        </p>
        <Button onClick={() => void submitAnswers()} disabled={effectiveDisabled || loading}>
          {loading ? "Submitting..." : submitted ? "Submitted" : "Submit answers"}
        </Button>
      </div>
    </div>
  );
}
