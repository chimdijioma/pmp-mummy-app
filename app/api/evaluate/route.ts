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
    if (!apiKey) {
      return Response.json(
        { error: "Missing ANTHROPIC_API_KEY on server." },
        { status: 500 }
      );
    }

    let body: EvaluateRequestBody;
    try {
      body = (await req.json()) as EvaluateRequestBody;
    } catch {
      return badRequest("Invalid JSON body.");
    }

    const questionId = cleanString(body.questionId);
    const mode = body.mode;
    const prompt = cleanString(body.prompt);
    const answerText = cleanString(body.answerText);
    const expectedKeyPoints = Array.isArray(body.expectedKeyPoints)
      ? body.expectedKeyPoints.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)
      : [];

    if (!questionId) return badRequest("questionId is required.");
    if (mode !== "mcq" && mode !== "flashcard" && mode !== "theory") {
      return badRequest("mode must be mcq, flashcard, or theory.");
    }
    if (!prompt) return badRequest("prompt is required.");
    if (!answerText) return badRequest("answerText is required.");
    if (answerText.length > 5000) return badRequest("answerText is too long.");

    const anthropic = new Anthropic({ apiKey });

    const system = [
      "You are a strict PMP examiner coaching a learner named Mummy Chi.",
      "Evaluate the learner response with examiner-level precision using PMI decision logic.",
      "Explain why the best answer is correct and why alternatives are distractors.",
      "Be concise, direct, and technically rigorous.",
      "Always include a dedicated textbookReference section grounded in PMBOK 7th or the PMI Agile Practice Guide.",
      "NIGERIAN ANALOGY: Write at least 4 sentences. Use a vivid, specific Nigerian cultural scenario — for example: organising an Owambe in Lagos, haggling in Balogun market, a family meeting to share inheritance, cooking jollof rice for a crowd, or planning a burial ceremony.",
      "DO NOT write a one-liner. The analogy must walk through the scenario step by step:",
      "Step 1 — Set the scene: describe the specific Nigerian situation in concrete detail.",
      "Step 2 — Map the correct PMP concept: explain what the right answer looks like inside that scenario.",
      "Step 3 — Map each wrong option: explain exactly why each distractor would be a disaster in that same scenario (wrong move, wrong timing, wrong person, bad outcome).",
      "Step 4 — Land the lesson: one closing sentence that ties the analogy back to the PMP principle.",
      "If you cannot provide an exact quote with confidence, set quoteType to paraphrase.",
      "Return ONLY valid JSON. No markdown, no backticks, no extra keys.",
      "",
      "JSON schema:",
      "{",
      '  "whatSheDidWell": string[],',
      '  "whatSheMissed": string[],',
      '  "suggestedImprovement": string,',
      '  "score": number,',
      '  "nigerianAnalogy": string,',
      '  "examinerRationale": {',
      '    "overallJudgement": string,',
      '    "rationalePoints": string[],',
      '    "distractorAnalysis": string[]',
      "  },",
      '  "textbookReference": {',
      '    "source": "PMBOK 7th" | "PMI Agile Practice Guide",',
      '    "section": string,',
      '    "quote": string,',
      '    "quoteType": "exact" | "paraphrase",',
      '    "relevance": string',
      "  }",
      "}",
      "",
      "Scoring guidance:",
      "- 90-100: excellent, covers most key points and shows PMI thinking",
      "- 70-89: good, covers some key points but misses others",
      "- 40-69: partial, vague, or missing PMI logic",
      "- 0-39: incorrect or off-topic",
    ].join("\n");

    const userContent = [
      `QuestionId: ${questionId}`,
      `Mode: ${mode}`,
      `Framework: ${body.framework}`,
      `Domain: ${body.domain}`,
      "",
      "Question prompt:",
      prompt,
      "",
      "Expected key points (rubric):",
      expectedKeyPoints.length ? expectedKeyPoints.map((x) => `- ${x}`).join("\n") : "- (none provided)",
      "",
      "Choices (if MCQ):",
      Array.isArray(body.choices) ? body.choices.map((x, i) => `${i}. ${x}`).join("\n") : "- (not provided)",
      `Selected choice index: ${typeof body.selectedChoiceIndex === "number" ? body.selectedChoiceIndex : "(none provided)"}`,
      `Correct choice index: ${typeof body.correctChoiceIndex === "number" ? body.correctChoiceIndex : "(none provided)"}`,
      `Flashcard expected answer: ${cleanString(body.flashcardBack) || "(none provided)"}`,
      `Question textbook reference: ${cleanString(body.textbookReference) || "(none provided)"}`,
      `Question formal definition: ${cleanString(body.formalDefinition) || "(none provided)"}`,
      "",
      "Learner answer:",
      answerText,
    ].join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20251001",
      max_tokens: 1200,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const text = extractFirstText(msg.content as Array<{ type: string; text?: string }>);
    if (!text) {
      return Response.json({ error: "Empty model response." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Model did not return valid JSON.");
      }
    }

    const validated = parseFeedback(parsed);
    if (!validated) {
      return Response.json({ error: "Model returned invalid schema." }, { status: 502 });
    }
    return Response.json(validated);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Evaluation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
