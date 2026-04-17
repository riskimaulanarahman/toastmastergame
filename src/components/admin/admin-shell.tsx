import Link from "next/link";

import { AdminSignOutButton } from "@/components/admin/sign-out-button";

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Admin Panel</p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <Link href="/admin/game-sets" className="hover:text-primary">
              Game Sets
            </Link>
            <Link href="/admin/sessions" className="hover:text-primary">
              Sessions
            </Link>
            <AdminSignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
