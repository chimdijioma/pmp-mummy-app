import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, Message } from "@anthropic-ai/sdk/resources/messages/messages";

export const runtime = "nodejs";

type EvaluateRequestBody = {
  questionId: string;
  prompt: string;
  expectedKeyPoints: string[];
  answerText: string;
  framework: "predictive" | "agile" | "hybrid";
  domain: "people" | "process" | "business";
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
  const prompt = cleanString(body.prompt);
  const answerText = cleanString(body.answerText);
  const expectedKeyPoints = Array.isArray(body.expectedKeyPoints)
    ? body.expectedKeyPoints.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean)
    : [];

  if (!questionId) return badRequest("questionId is required.");
  if (!prompt) return badRequest("prompt is required.");
  if (!answerText) return badRequest("answerText is required.");
  if (answerText.length > 5000) return badRequest("answerText is too long.");

  const anthropic = new Anthropic({ apiKey });

  const system = [
    "You are a supportive PMP exam tutor for a learner named Mummy Chi.",
    "Evaluate the learner's short-answer response against PMI/PMP principles.",
    "Be warm and encouraging, but technically precise.",
    "Think like a project manager: assess impacts before acting, tailor approach, prioritize value, manage stakeholders, manage risk, and follow appropriate governance.",
    "Return ONLY valid JSON. No markdown, no backticks, no extra keys.",
    "",
    "JSON schema:",
    "{",
    '  "whatSheDidWell": string[],',
    '  "whatSheMissed": string[],',
    '  "suggestedImprovement": string,',
    '  "score": number',
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
    `Framework: ${body.framework}`,
    `Domain: ${body.domain}`,
    "",
    "Question prompt:",
    prompt,
    "",
    "Expected key points (rubric):",
    expectedKeyPoints.length ? expectedKeyPoints.map((x) => `- ${x}`).join("\n") : "- (none provided)",
    "",
    "Learner answer:",
    answerText,
  ].join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
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

    return Response.json(parsed);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Evaluation failed." },
      { status: 500 }
    );
  }
}

