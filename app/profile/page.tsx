import { requireAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile · Pulma" };

export default async function ProfilePage() {
  const acc = await requireAccount();
  const db = getDB();
  const talent = acc.talentId ? db.talents.find((t) => t.id === acc.talentId) : undefined;
  const company = acc.companyId ? db.companies.find((c) => c.id === acc.companyId) : undefined;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">Profile</h1>
      <ProfileForm
        email={acc.email}
        role={acc.role}
        initial={{
          displayName: acc.displayName,
          preferredLanguage: talent?.preferredLanguage ?? "",
          companyName: company?.name ?? "",
          sector: company?.sector ?? "",
          size: company?.size ?? "",
          about: company?.about ?? "",
        }}
      />
    </div>
  );
}
