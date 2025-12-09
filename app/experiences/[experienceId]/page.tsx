import Ingest from "@/components/ingest";
import { getWhopUser } from "@/lib/get-whop-user";

export default async function ExperiencePage() {
  await getWhopUser();

  return <Ingest />;
}
