import { z } from "zod";

import { requireAdminApi } from "@/lib/auth/admin";
import { exportLeaderboardCsv } from "@/lib/services/leaderboard-service";
import { handleApiError } from "@/lib/utils/http";

const paramSchema = z.object({ id: z.string().uuid() });

export async function GET(_: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdminApi();
    const params = paramSchema.parse(await context.params);
    const csv = await exportLeaderboardCsv(params.id);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leaderboard-${params.id}.csv"`
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Invalid session id" }), { status: 422 });
    }

    return handleApiError(error);
  }
}
