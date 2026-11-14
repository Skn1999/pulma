import { redirect } from "next/navigation";
import { getAccount, roleHome } from "@/lib/session";

export default async function Home() {
  const account = await getAccount();
  redirect(account ? roleHome(account.role) : "/signin");
}
