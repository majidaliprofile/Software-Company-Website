export type ParsedQuestion = {
  number: number | null;
  prompt: string;
  type: "MCQ" | "THEORY";
  options: string[];
  points: number | null;
  confidence: number;
  needsReview: boolean;
};

const optionPattern = /^\s*([A-D])[).:-]\s*(.+)$/i;
const questionHeadingPattern = /^\s*question\s+(\d+)\s*(?:[-—–:.)]\s*)?(.*)$/i;
const numberedHeadingPattern = /^\s*(\d+)[).:-]\s*(.*)$/;
const pointsPattern = /\((\d+(?:\.\d+)?)\s*points?\)/i;

function parseBlock(block: string, fallbackNumber: number): ParsedQuestion | null {
  const lines = block.split(/\r?\n/).map((line) => line.replace(/\u00a0/g, " ").trim()).filter(Boolean);
  if (!lines.length) return null;

  const heading = lines[0].match(questionHeadingPattern) ?? lines[0].match(numberedHeadingPattern);
  const number = heading ? Number(heading[1]) : fallbackNumber;
  const headingText = heading?.[2] ?? "";
  const headingType = /multiple\s+choice|mcq/i.test(headingText) ? "MCQ" : /theory|written/i.test(headingText) ? "THEORY" : null;
  const pointsMatch = lines[0].match(pointsPattern);
  const points = pointsMatch ? Number(pointsMatch[1]) : null;
  const options = lines.map((line) => line.match(optionPattern)?.[2]).filter((value): value is string => Boolean(value));
  const optionLines = new Set(lines.filter((line) => optionPattern.test(line)));
  const isQuestionHeading = questionHeadingPattern.test(lines[0]);
  const headingPrompt = heading && (!isQuestionHeading || !headingType)
    ? headingText.replace(pointsPattern, "").trim()
    : "";
  const promptLines = [headingPrompt, ...lines.slice(heading ? 1 : 0)]
    .filter(Boolean)
    .filter((line) => !optionLines.has(line))
    .filter((line) => !/^developed by as code tech/i.test(line));
  const prompt = promptLines.join(" ").replace(/\s+/g, " ").trim();
  if (!prompt) return null;
  const type = headingType ?? (options.length >= 2 ? "MCQ" : "THEORY");
  const confidence = heading && (type === "THEORY" || options.length >= 2) ? 0.95 : options.length >= 2 ? 0.9 : 0.7;
  return {
    number: Number.isFinite(number) ? number : null,
    prompt,
    type,
    options,
    points,
    confidence,
    needsReview: confidence < 0.8 || (type === "MCQ" && options.length < 2),
  };
}

export function parsePlainText(input: string): ParsedQuestion[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
  if (!normalized) return [];
  const headingParts = normalized.split(/(?=^\s*Question\s+\d+\b)/im).map((part) => part.trim()).filter(Boolean);
  const blocks = headingParts.length > 1
    ? headingParts.filter((part) => /^\s*Question\s+\d+\b/i.test(part))
    : normalized.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const result: ParsedQuestion[] = [];
  for (const [index, block] of blocks.entries()) {
    const parsed = parseBlock(block, index + 1);
    if (parsed && (parsed.number !== null || parsed.prompt)) result.push(parsed);
  }
  const firstQuestionIndex = result.findIndex((question) => question.number === 1);
  return firstQuestionIndex > 0 ? result.slice(firstQuestionIndex) : result;
}