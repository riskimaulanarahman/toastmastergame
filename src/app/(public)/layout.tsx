import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-orange-50">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            Guess the Object in English
          </Link>
          <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-primary">
            Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
