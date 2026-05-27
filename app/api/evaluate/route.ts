import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, Message } from "@anthropic-ai/sdk/resources/messages/messages";
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

function extractFirstText(content: Message["content"]): string {
  for (const block of content) {
    if (isTextBlock(block)) return block.text;
  }
  return "";
}

function isTextBlock(block: ContentBlock): block is Extract<ContentBlock, { type: "text" }> {
  return block.type === "text";
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((item) => typeof item === "string");
}

function parseFeedback(data: unknown): EvaluateFeedback | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const examiner = root.examinerRationale as Record<string, unknown> | undefined;
  const reference = root.textbookReference as Record<string, unknown> | undefined;
  const source = reference?.source;
  const quoteType = reference?.quoteType;
  const nigerianAnalogy = typeof root.nigerianAnalogy === "string" ? root.nigerianAnalogy : undefined;
  if (
    !isStringArray(root.whatSheDidWell) ||
    !isStringArray(root.whatSheMissed) ||
    typeof root.suggestedImprovement !== "string" ||
    typeof root.score !== "number" ||
    !examiner ||
    typeof examiner.overallJudgement !== "string" ||
    !isStringArray(examiner.rationalePoints) ||
    !isStringArray(examiner.distractorAnalysis) ||
    !reference ||
    (source !== "PMBOK 7th" && source !== "PMI Agile Practice Guide") ||
    typeof reference.section !== "string" ||
    typeof reference.quote !== "string" ||
    (quoteType !== "exact" && quoteType !== "paraphrase") ||
    typeof reference.relevance !== "string"
  ) {
    return null;
  }

  return {
    whatSheDidWell: root.whatSheDidWell,
    whatSheMissed: root.whatSheMissed,
    suggestedImprovement: root.suggestedImprovement,
    score: root.score,
    nigerianAnalogy,
    examinerRationale: {
      overallJudgement: examiner.overallJudgement,
      rationalePoints: examiner.rationalePoints,
      distractorAnalysis: examiner.distractorAnalysis,
    },
    textbookReference: {
      source,
      section: reference.section,
      quote: reference.quote,
      quoteType,
      relevance: reference.relevance,
    },
  };
}

export async function POST(req: Request) {
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
    "NIGERIAN ANALOGY: Provide a vivid, multi-sentence breakdown using familiar cultural scenarios (for example: Lagos wedding/Owambe planning, navigating Balogun market, family settings, or cooking details).",
    "The analogy must be practical and descriptive, not a one-liner.",
    "It must clearly map:",
    "1) What the core PMP concept represents in everyday terms.",
    "2) Why the incorrect options are bad moves in that same cultural scenario (for example, wrong ingredient, wrong timing, wrong negotiation step, or wrong family decision path).",
    "Structure this as a short sequence of clear steps so the learner can see cause-and-effect.",
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

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 700,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const text = extractFirstText((msg as Message).content);
    if (!text) {
      return Response.json({ error: "Empty model response." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // best-effort recovery: attempt to find first JSON object
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
    return Response.json(
      { error: e instanceof Error ? e.message : "Evaluation failed." },
      { status: 500 }
    );
  }
}

