import type { Metadata } from "next";
import { abmelden } from "@/app/login/actions";
import { Knopf } from "@/components/ui";

export const metadata: Metadata = { title: "Kein Zugang" };

export default async function GesperrtSeite({ searchParams }: PageProps<"/gesperrt">) {
  const { grund } = await searchParams;
  const text =
    grund === "zwei-faktor"
      ? "Für dieses Konto ist keine Zwei-Faktor-Anmeldung eingerichtet. Richte sie im Business OS ein."
      : "Dieses Konto hat keinen Zugang zu KB OS.";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight">Kein Zugang</h1>
        <p className="text-text-2">{text}</p>
      </div>
      <form action={abmelden}>
        <Knopf type="submit" art="leise" className="w-full">
          Abmelden
        </Knopf>
      </form>
    </main>
  );
}
