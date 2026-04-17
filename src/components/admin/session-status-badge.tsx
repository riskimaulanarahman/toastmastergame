import { Badge } from "@/components/ui/badge";

export function SessionStatusBadge({ status }: { status: "draft" | "scheduled" | "live" | "finished" }): JSX.Element {
  if (status === "live") {
    return <Badge className="bg-green-600 text-white">LIVE</Badge>;
  }

  if (status === "finished") {
    return <Badge variant="secondary">Finished</Badge>;
  }

  if (status === "scheduled") {
    return <Badge variant="outline">Waiting Room</Badge>;
  }

  return <Badge variant="outline">Draft</Badge>;
}
