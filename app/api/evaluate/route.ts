import Anthropic from "@anthropic-ai/sdk";
import type { EvaluateFeedback } from "../../lib/types";

export const runtime = "nodejs";

type EvaluateRequestBody = {
  questionId: string;
  mode: "mcq" | "flashcard" | "theory";
  prompt: string;
  expectedKeyPoints?: string[];
  choices?: string[];
  selectedChoiceIndex?: number;
  correctChoiceIndex?: number;
  flashcardBack?: string;
  answerText: string;
  framework: "predictive" | "agile" | "hybrid";
  domain: "people" | "process" | "business";
  textbookReference?: string;
  formalDefinition?: string;
};

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function cleanString(x: unknown) {
  return typeof x === "string" ? x.trim() : "";
}

function extractFirstText(content: Array<{ type: string; text?: string }>): string {
  for (const block of content) {
    if (block.type === "text" && typeof block.text === "string") return block.text;
  }
  return "";
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((item) => typeof item === "string");
}

function parseFeedback(data: unknown): EvaluateFeedback | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const examiner = root.examinerRationale as Record<string, unknown> | undefined;
  const reference = root.textbookReference as Record<string, unknown> | undefined;

  const nigerianAnalogy = typeof root.nigerianAnalogy === "string" ? root.nigerianAnalogy : "Keep pushing, Mummy Chi!";

  if (!isStringArray(root.whatSheDidWell) || !isStringArray(root.whatSheMissed) || typeof root.score !== "number" || !examiner) {
    return null;
  }

  return {
    whatSheDidWell: root.whatSheDidWell as string[],
    whatSheMissed: root.whatSheMissed as string[],
    suggestedImprovement: typeof root.suggestedImprovement === "string" ? root.suggestedImprovement : "Keep practicing.",
    score: root.score as number,
    nigerianAnalogy,
    examinerRationale: {
      overallJudgement: typeof examiner.overallJudgement === "string" ? examiner.overallJudgement : "Review your approach.",
      rationalePoints: isStringArray(examiner.rationalePoints) ? examiner.rationalePoints : [],
      distractorAnalysis: isStringArray(examiner.distractorAnalysis) ? examiner.distractorAnalysis : []
    },
    textbookReference: {
      source: (reference?.source === "PMBOK 7th" || reference?.source === "PMI Agile Practice Guide") ? (reference.source as "PMBOK 7th" | "PMI Agile Practice Guide") : "PMBOK 7th",
      section: typeof reference?.section === "string" ? reference.section : "General",
      quote: typeof reference?.quote === "string" ? reference.quote : "No quote provided.",
      quoteType: (reference?.quoteType === "exact" || reference?.quoteType === "paraphrase") ? (reference.quoteType as "exact" | "paraphrase") : "paraphrase",
      relevance: typeof reference?.relevance === "string" ? reference.relevance : "See PMBOK guide."
    }
  } as EvaluateFeedback;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing API Key" }, { status: 500 });

    let body: EvaluateRequestBody;
    try { body = (await req.json()) as EvaluateRequestBody; } catch { return badRequest("Invalid JSON"); }

    const anthropic = new Anthropic({ apiKey });
    // ... (Your existing prompt and API call logic here) ...
    // Note: ensure the system prompt and userContent variables are exactly as you had them before
    
    // ... (The rest of your existing POST function logic) ...
    return Response.json({ success: true }); // Temporary placeholder to test build
  } catch (e) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
