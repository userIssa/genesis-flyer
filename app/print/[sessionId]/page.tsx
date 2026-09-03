import { connectToDatabase } from "@/lib/mongodb";
import { FlyerSession } from "@/lib/models";
import FlyerPages from "@/components/FlyerPages";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: { sessionId: string } }) {
  await connectToDatabase();
  const session = await FlyerSession.findById(params.sessionId).lean();

  if (!session) {
    return <div className="p-10 text-sm text-red-600">Session not found.</div>;
  }

  return (
    <FlyerPages
      title={session.title}
      monthTag={session.monthTag}
      message={session.message}
      celebrants={session.celebrants}
    />
  );
}
