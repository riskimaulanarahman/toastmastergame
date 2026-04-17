import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
