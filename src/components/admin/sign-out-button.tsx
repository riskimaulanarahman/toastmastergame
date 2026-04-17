import { logoutAction } from "@/app/admin/actions";

import { Button } from "@/components/ui/button";

export function AdminSignOutButton(): JSX.Element {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
