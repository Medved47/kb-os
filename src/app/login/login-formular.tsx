"use client";

import { useActionState } from "react";
import { anmelden, type LoginState } from "./actions";
import { Feld, Knopf, Meldung } from "@/components/ui";

export function LoginFormular() {
  const [state, aktion, laeuft] = useActionState<LoginState, FormData>(anmelden, {});

  return (
    <form action={aktion} className="flex flex-col gap-3">
      <Feld name="email" type="email" autoComplete="email" placeholder="E-Mail" aria-label="E-Mail" required />
      <Feld
        name="passwort"
        type="password"
        autoComplete="current-password"
        placeholder="Passwort"
        aria-label="Passwort"
        required
      />
      {state.fehler && <Meldung>{state.fehler}</Meldung>}
      <Knopf type="submit" disabled={laeuft}>
        {laeuft ? "Anmelden …" : "Anmelden"}
      </Knopf>
    </form>
  );
}
