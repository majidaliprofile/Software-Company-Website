import { describe, expect, it } from "vitest";
import { parsePlainText } from "@/lib/question-parser";

describe("question parser", () => {
  it("detects numbered MCQ blocks", () => {
    const [q] = parsePlainText("1. What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6");
    expect(q.type).toBe("MCQ");
    expect(q.options).toHaveLength(4);
    expect(q.needsReview).toBe(false);
  });

  it("splits PDF-style Question headings without blank lines", () => {
    const questions = parsePlainText(`AS Code Assess
Question 1 — Multiple Choice (2 points)
Which technology stores application data?
A. Supabase PostgreSQL
B. A spreadsheet
C. A browser
D. An image editor
Question 2 — Theory (4 points)
Explain why RLS protects student data.
Question 3 — Theory (4 points)
Explain server-authoritative timers.`);
    expect(questions).toHaveLength(3);
    expect(questions[0].type).toBe("MCQ");
    expect(questions[0].points).toBe(2);
    expect(questions[0].options).toHaveLength(4);
    expect(questions[1].type).toBe("THEORY");
    expect(questions[2].type).toBe("THEORY");
  });

  it("flags unnumbered theory for review", () => {
    const [q] = parsePlainText("Explain polymorphism.");
    expect(q.type).toBe("THEORY");
    expect(q.needsReview).toBe(true);
  });
});