import type { Metadata } from "next";
import { LoginFormular } from "./login-formular";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginSeite() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight">KB OS</h1>
        <p className="text-text-2">Gleiches Konto wie im Business OS.</p>
      </div>
      <LoginFormular />
    </main>
  );
}
