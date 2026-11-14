import type { IntakeAnswers } from "@/lib/types";

export const QUESTIONS: { key: keyof IntakeAnswers; text: string; hint: string }[] = [
  {
    key: "problem",
    text: "What is a problem your team is stuck on right now?",
    hint: "Describe the problem, not the person. What is actually not working?",
  },
  {
    key: "firstWeek",
    text: "What would this person actually do in their first week?",
    hint: "Concrete tasks and situations, not a job title.",
  },
  {
    key: "hardPart",
    text: "What's the genuinely hard part?",
    hint: "Where have you or others already struggled? Honest is better than polished.",
  },
  {
    key: "bonus",
    text: "What would be a bonus but isn't required?",
    hint: "Describe things someone might be able to do, rather than degrees or years of experience.",
  },
  {
    key: "languages",
    text: "Which working languages are realistic in the team?",
    hint: "For example: English day to day, Finnish with some customers.",
  },
];
