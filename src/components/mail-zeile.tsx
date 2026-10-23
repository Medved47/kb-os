import Link from "next/link";
import { betreff, type Kopf } from "@/lib/gmail";
import { absenderName } from "@/lib/mail-regeln";
import { mailDatum } from "@/lib/postfach";
import { Zeile } from "@/components/ui";

// Eine Mail in einer Liste (Postfach, Heute). Punkt = ungelesen.
export function MailZeile({ mail }: { mail: Kopf }) {
  return (
    <Zeile>
      <Link href={`/postfach/${mail.id}`} className="druck flex min-w-0 flex-1 gap-3">
        <span className={`mt-2 size-2 shrink-0 rounded-full ${mail.ungelesen ? "bg-akzent" : ""}`} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`truncate ${mail.ungelesen ? "font-semibold" : ""}`}>{absenderName(mail.k["from"])}</span>
            <span className="shrink-0 text-[13px] text-text-2">{mailDatum(mail.datum)}</span>
          </div>
          <span className="truncate text-[15px]">{betreff(mail.k)}</span>
          <span className="line-clamp-2 text-[13px] text-text-2">{mail.snippet}</span>
        </div>
      </Link>
    </Zeile>
  );
}
