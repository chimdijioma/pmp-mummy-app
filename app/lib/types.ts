export type QuestionMode = "mcq" | "flashcard" | "theory";
export type Domain = "people" | "process" | "business";
export type Framework = "predictive" | "agile" | "hybrid";

interface BaseQuestion {
  id: string;
  mode: QuestionMode;
  domain: Domain;
  framework: Framework;
  difficulty: 1 | 2 | 3 | 4 | 5;
  formalDefinition: string;
  textbookReference: string;
  nigerianAnalogy: string;
}

export interface MCQQuestion extends BaseQuestion {
  mode: "mcq";
  prompt: string;
  choices: string[];
  correctChoiceIndex: number;
}

export interface FlashcardQuestion extends BaseQuestion {
  mode: "flashcard";
  front: string;
  back: string;
}

export interface TheoryQuestion extends BaseQuestion {
  mode: "theory";
  prompt: string;
  expectedKeyPoints: string[];
}

export type Question = MCQQuestion | FlashcardQuestion | TheoryQuestion;

export interface ItemSchedule {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: number;
  consecutiveCorrect: number;
  flagged: boolean;
  lastResult: "correct" | "incorrect" | "skipped" | null;
  mastered: boolean;
}

export interface SchedulerState {
  version: 1;
  lastStudiedAt: number | null;
  items: Record<string, ItemSchedule>;
}

export interface EvaluateFeedback {
  whatSheDidWell: string[];
  whatSheMissed: string[];
  suggestedImprovement: string;
  score: number;
}
