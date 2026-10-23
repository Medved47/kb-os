// Wetter Stuttgart über Open-Meteo (ohne Schlüssel). Klein auf "Heute",
// ein Hinweis nur, wenn es zählt (Regen, Schnee, Gewitter, Frost, Hitze).

const ORT = { breite: 48.7758, laenge: 9.1829 };

export type Wetter = {
  jetzt: number;
  min: number;
  max: number;
  text: string;
  hinweis: string | null;
};

type Antwort = {
  current?: { temperature_2m: number; weather_code: number };
  hourly?: { time: string[]; precipitation_probability: number[]; weather_code: number[] };
  daily?: { temperature_2m_min: number[]; temperature_2m_max: number[] };
};

// WMO-Wettercodes
export function wetterText(code: number): string {
  if (code === 0) return "klar";
  if (code <= 2) return "heiter";
  if (code === 3) return "bedeckt";
  if (code === 45 || code === 48) return "Nebel";
  if (code >= 51 && code <= 57) return "Niesel";
  if (code >= 61 && code <= 67) return "Regen";
  if (code >= 71 && code <= 77) return "Schnee";
  if (code >= 80 && code <= 82) return "Schauer";
  if (code === 85 || code === 86) return "Schneeschauer";
  if (code >= 95) return "Gewitter";
  return "wechselhaft";
}

const NASS = (code: number) => (code >= 51 && code <= 67) || code >= 80;

// Erster Hinweis ab der aktuellen Stunde: Niederschlag ab 60 % Wahrscheinlichkeit
// oder Gewitter; sonst Frost/Hitze aus Tiefst-/Höchstwert
export function wetterHinweis(
  stunden: { stunde: number; regen: number; code: number }[],
  jetztStunde: number,
  min: number,
  max: number,
): string | null {
  const nass = stunden.find((s) => s.stunde >= jetztStunde && (s.code >= 95 || (NASS(s.code) && s.regen >= 60)));
  if (nass) {
    const was = wetterText(nass.code);
    return nass.stunde <= jetztStunde ? `jetzt ${was}` : `ab ${nass.stunde} Uhr ${was}`;
  }
  if (min <= 0) return `Frost bis ${Math.round(min)}°`;
  if (max >= 30) return `heiß bis ${Math.round(max)}°`;
  return null;
}

export async function wetterHeute(jetztStunde: number): Promise<Wetter> {
  const p = new URLSearchParams({
    latitude: String(ORT.breite),
    longitude: String(ORT.laenge),
    current: "temperature_2m,weather_code",
    hourly: "precipitation_probability,weather_code",
    daily: "temperature_2m_min,temperature_2m_max",
    timezone: "Europe/Berlin",
    forecast_days: "1",
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`Wetter HTTP ${r.status}`);
  const d = (await r.json()) as Antwort;
  if (!d.current || !d.hourly || !d.daily) throw new Error("Wetterdaten unvollständig");
  const min = d.daily.temperature_2m_min[0] ?? d.current.temperature_2m;
  const max = d.daily.temperature_2m_max[0] ?? d.current.temperature_2m;
  const stunden = d.hourly.time.map((t, i) => ({
    stunde: Number(t.slice(11, 13)),
    regen: d.hourly?.precipitation_probability[i] ?? 0,
    code: d.hourly?.weather_code[i] ?? 0,
  }));
  return {
    jetzt: d.current.temperature_2m,
    min,
    max,
    text: wetterText(d.current.weather_code),
    hinweis: wetterHinweis(stunden, jetztStunde, min, max),
  };
}
