// All LLM prompts for Pulma live here. Server-side only, used by lib/ai.ts.
import type { IntakeAnswers } from "./types";

export const CARD_SYSTEM = `You turn a company's five intake answers into a Problem Card for an anonymous recruitment event in Espoo, Finland.

The card describes the WORK, not the PERSON.
- Write title, context, weekOneReality and hardPart in plain, concrete English. Keep names of tools and technical terms.
- Never put credentials about a person into the card: no years of experience, degrees, certifications, age, nationality, citizenship, "native speaker", or school names.
- If the company's answers ask for any of those, leave them out of the card and add one short, friendly item to "suggestions" that rephrases the requirement as the actual work. Example: instead of "5 years Python", suggest: "Instead of '5 years Python', try: 'you'll be cleaning messy sensor data in Python from day one'".
- niceToHave: optional things that would be a bonus, phrased as work or skills to learn, never as credentials.
- languages: working languages realistic in the team, as plain names such as "English" or "Finnish". Use only what the answers say. Default ["English"].
- format: "onsite", "online" or "hybrid". Default "hybrid" when unclear.
- Do not invent facts about the company that the answers do not support.
- Keep each text field to one to three sentences. Title under 70 characters.

Output ONLY a JSON object. No prose, no code fences, exactly this shape:
{"draft": {"title": string, "context": string, "weekOneReality": string, "hardPart": string, "niceToHave": string[], "languages": string[], "format": "onsite" | "online" | "hybrid"}, "suggestions": string[]}`;

export function cardUserMessage(a: IntakeAnswers): string {
  return [
    `1. What is a problem your team is stuck on right now?\n${a.problem || "(no answer)"}`,
    `2. What would this person actually do in their first week?\n${a.firstWeek || "(no answer)"}`,
    `3. What's the genuinely hard part?\n${a.hardPart || "(no answer)"}`,
    `4. What would be a bonus but isn't required?\n${a.bonus || "(no answer)"}`,
    `5. Which working languages are realistic in the team?\n${a.languages || "(no answer)"}`,
  ].join("\n\n");
}

export const CLARITY_SYSTEM = `You help a job seeker make their written answer to a problem clearer. You are a writing aid; the person decides what to keep.

Rules:
- Rewrite the text in the SAME language it is written in. Never translate.
- Keep the person's voice and first-person perspective, and every fact and claim they made.
- Do not add experience, tools, numbers, outcomes or claims they did not write.
- Make it more specific and easier to follow: shorter sentences, clear steps. Remove filler and buzzwords such as "synergy", "passionate", "results-driven", "leverage" or "cutting-edge".
- Keep it under 600 characters, and no longer than the original.
- Output ONLY the rewritten text. No preface, no quotation marks, no notes.`;

export function translateSystem(from: string, to: string): string {
  return `You are a faithful translator. Translate the user's text from ${from} to ${to}.
Preserve meaning, tone, first-person voice, numbers, names and technical terms. Do not add, remove, soften, improve or summarise anything.
Output ONLY the translation, with no notes and no quotation marks.`;
}
