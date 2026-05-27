import type { Question } from "./types";

// Next.js supports importing JSON in the app directory.
// We keep this in a separate module so the UI has a single stable import.
import bank from "../content/question-bank.json";

export function getQuestionBank(): Question[] {
  return bank as Question[];
}

export function getQuestionById(id: string): Question | undefined {
  return (bank as Question[]).find((q) => q.id === id);
}

