// Canned AI outputs for the scripted demo, used only when the live model is unavailable
// (no API key or network failure). Keep the texts in sync with DEMO.md.

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export const OLENA_DEMO_ANSWER_UK =
  "Я б почала з того, що тиждень стояла б поруч з операторами і записувала, коли їхнє відчуття не збігається з датчиком. На попередній роботі я налагоджувала дані з трьох поколінь лабораторного обладнання, і половина проблем були кабелі. Я б склала таблицю: датчик, кабель, скрипт, і перевіряла кожен шар окремо.";

const CANNED_TRANSLATIONS: { source: string; en: string }[] = [
  {
    source: OLENA_DEMO_ANSWER_UK,
    en: "I would start by spending a week next to the operators, noting every time their feel disagrees with the sensor. In my previous job I untangled data from three generations of lab equipment, and half the problems turned out to be cables. I would build a table — sensor, cable, script — and check each layer separately.",
  },
];

/** Returns a canned translation if the text is (close to) a scripted demo answer. */
export function cannedTranslation(text: string): string | null {
  const t = norm(text);
  const hit = CANNED_TRANSLATIONS.find((c) => {
    const s = norm(c.source);
    return t === s || (t.length > 40 && (s.startsWith(t.slice(0, 60)) || t.startsWith(s.slice(0, 60))));
  });
  return hit?.en ?? null;
}
