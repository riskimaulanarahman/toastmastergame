"use client";

import { useEffect, useMemo, useState } from "react";

export function CountdownTimer({
  endAt,
  serverNow,
  onExpire
}: {
  endAt: string | null;
  serverNow: string;
  onExpire?: () => void;
}): JSX.Element {
  const offset = useMemo(() => Date.now() - new Date(serverNow).getTime(), [serverNow]);
  const [remaining, setRemaining] = useState<number>(() => {
    if (!endAt) {
      return 0;
    }

    return Math.max(0, Math.floor((new Date(endAt).getTime() - (Date.now() - offset)) / 1000));
  });

  useEffect(() => {
    if (!endAt) {
      setRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(endAt).getTime() - (Date.now() - offset)) / 1000));
      setRemaining(left);
      if (left === 0) {
        onExpire?.();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [endAt, offset, onExpire]);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");

  return (
    <p className="rounded-md bg-slate-900 px-3 py-2 text-center text-lg font-semibold tracking-wide text-white">
      {minutes}:{seconds}
    </p>
  );
}
