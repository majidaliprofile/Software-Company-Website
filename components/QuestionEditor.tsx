"use client";

import { Trash2 } from "lucide-react";

export type DraftQuestion = {
  prompt: string;
  type: "MCQ" | "THEORY";
  points: number;
  options: string[];
  correctOption: number | null;
  needsReview?: boolean;
};

export const blankQuestion = (): DraftQuestion => ({ prompt: "", type: "MCQ", points: 1, options: ["", "", "", ""], correctOption: 0 });

/** Normalizes a parsed question (from the document importer) into an editable draft. */
export function draftFromParsed(parsed: { prompt: string; type: "MCQ" | "THEORY"; points: number | null; options: string[]; needsReview: boolean }): DraftQuestion {
  const options = [...parsed.options.slice(0, 4)];
  while (options.length < 4) options.push("");
  return {
    prompt: parsed.prompt,
    type: parsed.type,
    points: parsed.points ?? 1,
    options,
    correctOption: parsed.type === "MCQ" ? 0 : null,
    needsReview: parsed.needsReview,
  };
}

export function QuestionCard({ question, index, removable, onChange, onRemove }: {
  question: DraftQuestion;
  index: number;
  removable: boolean;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
}) {
  function updateOption(optionIndex: number, value: string) {
    onChange({ options: question.options.map((option, itemIndex) => (itemIndex === optionIndex ? value : option)) });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Question {index + 1}</span>
        <div className="flex items-center gap-3">
          {question.needsReview && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Needs review</span>}
          {removable && (
            <button type="button" onClick={onRemove} className="text-red-700" aria-label={`Delete question ${index + 1}`}>
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </div>
      <textarea
        value={question.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        rows={2}
        placeholder="Question text"
        className="w-full rounded-lg border border-slate-300 p-3"
        required
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-600">Question type:</span>
        <button
          type="button"
          onClick={() => onChange({ type: "MCQ", options: question.options.length ? question.options : ["", "", "", ""], correctOption: 0 })}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${question.type === "MCQ" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-slate-700"}`}
        >
          Multiple choice
        </button>
        <button
          type="button"
          onClick={() => onChange({ type: "THEORY", options: [], correctOption: null })}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${question.type === "THEORY" ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 text-slate-700"}`}
        >
          Theory question
        </button>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={question.points}
          onChange={(e) => onChange({ points: Number(e.target.value) })}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2.5"
          aria-label={`Points for question ${index + 1}`}
        />
      </div>
      {question.type === "MCQ" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <label key={optionIndex} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={question.correctOption === optionIndex}
                onChange={() => onChange({ correctOption: optionIndex })}
              />
              <input
                value={option}
                onChange={(e) => updateOption(optionIndex, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          ))}
        </div>
      )}
      {question.type === "THEORY" && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Theory answers are written by the student and reviewed manually after submission.</p>
      )}
    </div>
  );
}
