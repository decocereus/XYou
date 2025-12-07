import { headers } from "next/headers";
import { whopsdk } from "./whop-sdk";
import { UserRetrieveResponse } from "@whop/sdk/resources";

export async function getWhopUser(): Promise<UserRetrieveResponse> {
  const { userId } = await whopsdk.verifyUserToken(await headers());
  const user = await whopsdk.users.retrieve(userId);
  return user;
}
