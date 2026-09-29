import mammoth from "mammoth";

async function extractPdfText(bytes: Buffer): Promise<string> {
  // pdfjs-dist (unlike the legacy engine pdf-parse bundles) auto-recovers from
  // malformed/updated cross-reference tables instead of throwing "bad XRef entry".
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true }).promise;
  } catch {
    throw new Error("This PDF could not be read — it may be corrupted, password-protected, or a scanned image. Try re-exporting it, or upload a DOCX/TXT instead.");
  }
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  const text = pages.join("\n").trim();
  if (!text) throw new Error("No readable text was found in this PDF. It may be a scanned image — try a DOCX or TXT file instead.");
  return text;
}

export async function extractQuestionPaper(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return new TextDecoder().decode(bytes);
  if (name.endsWith(".pdf")) return extractPdfText(bytes);
  if (name.endsWith(".docx")) return (await mammoth.extractRawText({ buffer: bytes })).value;
  throw new Error("Only PDF, DOCX, and TXT question papers are supported.");
}
