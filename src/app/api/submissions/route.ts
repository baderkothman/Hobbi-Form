import { handleSubmission } from "@/server/submit";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleSubmission(request);
}
