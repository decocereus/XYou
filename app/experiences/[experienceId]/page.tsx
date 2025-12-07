import Ingest from "@/components/ingest";
import UserAvatar from "@/components/user-avatar";
import { getWhopUser } from "@/lib/get-whop-user";
import { Text } from "@whop/react/components";

export default async function ExperiencePage() {
  const user = await getWhopUser();
  return (
    <div className="flex flex-col p-8 gap-4">
      <div className="flex items-center gap-x-2">
        <Text size="9" as="p">
          Welcome
        </Text>
        <div className="flex items-center gap-x-2">
          <UserAvatar
            color="red"
            imageUrl={user?.profile_picture?.url ?? undefined}
            fallback={user.name ?? ""}
            highContrast
            size="1"
          />
          <Text size="6" as="p">
            {user.name}
          </Text>
        </div>
      </div>

      <Text size="5" color="gray">
        Paste a Youtube url, wait for the magic, generate viral content
      </Text>

      <Ingest />
    </div>
  );
}
