import { connection } from "next/server";
import { requireZugang } from "@/lib/auth";
import { standText } from "@/lib/zeit";
import { TabLeiste } from "@/components/tab-leiste";
import { Offline } from "@/components/offline";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection();
  await requireZugang();
  return (
    <>
      <Offline stand={standText(new Date())} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-[calc(var(--unten)+24px)]">
        {children}
      </main>
      <TabLeiste />
    </>
  );
}
