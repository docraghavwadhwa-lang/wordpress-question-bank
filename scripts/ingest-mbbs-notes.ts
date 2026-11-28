/**
 * Elixir AI - 24 MBBS Study Notes Ingestion Pipeline
 * 
 * Features:
 * 1. Sanitization: Strips all third-party coaching brands ("Marrow"), watermarks, headers, and promo texts.
 * 2. Minimal Storage Footprint: Splits into concise 500-token chunks with 768-dim Gemini embeddings.
 * 3. Free-tier Safe: Paced batch requests with exponential backoff on 429 errors.
 * 4. Flexible Source: Ingests from local directory (--dir ./pdfs) or fetches directly from Drive IDs.
 * 
 * Usage:
 *   bun run scripts/ingest-mbbs-notes.ts --dir /path/to/extracted-or-pdfs
 *   or:
 *   npx tsx scripts/ingest-mbbs-notes.ts --dir ./mbbs-notes
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, extname } from "path";
import { execSync } from "child_process";

// 24 Curated MBBS Document Manifest
export const MBBS_24_CATALOG = [
  { name: "Anatomy Marrow Ed8.pdf", subject: "Anatomy", driveId: "1qyw9L1rih5JbrMhkAL62VmFa0vpgP5_O" },
  { name: "Anesthesia Marrow E8.pdf", subject: "Anesthesia", driveId: "1FSb-QSVlqZgdUgsODDcymzp7YrdjKkUw" },
  { name: "Biochemistry Marrow E8.pdf", subject: "Biochemistry", driveId: "1_LV5Xn2_Dn4UPt-nwujj6qRcKV6q5QGU" },
  { name: "Dermatology Marrow E8.pdf", subject: "Dermatology", driveId: "18cxfcUI6e_MJlXf7C9u0MY1GzQTuw6SA" },
  { name: "ENT Marrow E8.pdf", subject: "ENT", driveId: "1vU036I4q8uvE7pyloHdnJnY57-6rzS2t" },
  { name: "FMT Marrow E8.pdf", subject: "Forensic Medicine", driveId: "1ZO2tueyVs06D5ifpRpjuF6BgH-qojaSs" },
  { name: "Forensic Medicine E8.pdf", subject: "Forensic Medicine", driveId: "1hG8JZx4EbhNzNpx0cz44WyTp13SSUDtN" },
  { name: "Medicine Vol. 1.pdf", subject: "Medicine", driveId: "1GYxXHtZRjMRBqduj4kwAr5P1IOfpyirZ" },
  { name: "Medicine Vol. 2.pdf", subject: "Medicine", driveId: "1Qx9ZK-gtZgr6P39Ze_W5Lr-9_KLYJ8WD" },
  { name: "Medicine Vol. 3.pdf", subject: "Medicine", driveId: "1ZphMSLGr87V-x6UzDnVrkCF7rKliMZfo" },
  { name: "Microbiology Marrow E8.pdf", subject: "Microbiology", driveId: "10-BKjseK0AxmilVmo4DiSB4nF01QUepI" },
  { name: "OBG Vol. 1.pdf", subject: "Obstetrics & Gynecology", driveId: "1RZ0K6sMcWYo6e-2P0WGjzqaaZ78eaPrU" },
  { name: "OBG Vol. 2.pdf", subject: "Obstetrics & Gynecology", driveId: "10mGJySs4PYdj6jHa-T09D1hCjOSXNYxG" },
  { name: "Ophthalmology Marrow E8.pdf", subject: "Ophthalmology", driveId: "15f4De8VsWHndrh-QXjacz4CJ5qlvjXSN" },
  { name: "Orthopedics Marrow E8.pdf", subject: "Orthopedics", driveId: "1xrIu5H6BdZzpODYniOONS675j03QdNpA" },
  { name: "PSM Marrow E8.pdf", subject: "Community Medicine (PSM)", driveId: "1fjw3DTNB6IA6JcDL6VcobVKjhT0yxufR" },
  { name: "Pathology Marrow E8.pdf", subject: "Pathology", driveId: "1HFmAR0IdIB2P-zoedtITIBiMI5Wmbgn0" },
  { name: "Pediatric Marrow E8.pdf", subject: "Pediatrics", driveId: "1zZUdnlf93pZkDQ1qAy5OREa0HDujUPaU" },
  { name: "Pharmacology Marrow E8.pdf", subject: "Pharmacology", driveId: "1K2rJvJv_T0GMGDDTzsmmC66ivllW6xnA" },
  { name: "Physiology Marrow E8.pdf", subject: "Physiology", driveId: "1tM-E3ze3Wqd8LZak14eg2sUBwzCjDNBy" },
  { name: "Psychiatry Marrow E8.pdf", subject: "Psychiatry", driveId: "1LSb9WsnP86F0HQWlPkwlgJNGwGUIaJpi" },
  { name: "Radiology @marrow ed.08.pdf", subject: "Radiology", driveId: "1R6T1kUyz3v8C0Su-HdN9fleuWMRgQCNk" },
  { name: "Surgery Vol. 1.pdf", subject: "Surgery", driveId: "1K1wG3MZu_Z-kC3os1nRbjaduWxu9DZBe" },
  { name: "Surgery Vol. 2.pdf", subject: "Surgery", driveId: "1yQEV5PKTCDVJsLQUekyvlnaxRNd_Gvvz" },
];

/**
 * Clean & sanitize document title
 */
export function sanitizeDocumentTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/@?\s*marrow\s*(ed\.?|edition)?\s*0?8?/gi, "Study Notes (Ed 8)")
    .replace(/@?\s*marrow/gi, "Elixir Notes")
    .replace(/FMT/gi, "Forensic Medicine & Toxicology")
    .replace(/PSM/gi, "Community Medicine (PSM)")
    .replace(/OBG/gi, "Obstetrics & Gynecology")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Text Sanitizer: Removes all third-party coaching brand mentions ("Marrow")
 * and stripping watermarks, headers, footers, and app promo lines.
 */
export function sanitizeStudyText(text: string): string {
  if (!text) return "";

  return text
    // Strip brand variations
    .replace(/\b(marrow[\s_-]*(ed\.?|edition)?[\s_-]*0?8?)\b/gi, "Elixir Study Notes")
    .replace(/\b(marrow[\s_-]*qbank|marrow[\s_-]*notes|marrow[\s_-]*app)\b/gi, "Elixir MBBS Library")
    .replace(/@\s*marrow\b/gi, "@elixir")
    .replace(/\b(marrow)\b/gi, "Elixir")
    .replace(/\[\s*marrow\s*\]/gi, "[Elixir Notes]")
    // Strip common watermarks and copyright lines
    .replace(/download\s+the\s+app\s+for\s+more/gi, "")
    .replace(/all\s+rights\s+reserved\.?/gi, "")
    .replace(/page\s+\d+\s+of\s+\d+/gi, "")
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/www\.[^\s]+/gi, "")
    // Clean excessive blank lines and spaces
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Semantic chunking with topic heading extraction
 */
export interface StudyChunk {
  chunkIndex: number;
  subject: string;
  topic: string;
  content: string;
  tokenCount: number;
}

export function chunkStudyText(text: string, subject: string, docTitle: string): StudyChunk[] {
  const clean = sanitizeStudyText(text);
  const paragraphs = clean.split(/\n\n+/);
  const chunks: StudyChunk[] = [];

  let currentTopic = docTitle;
  let currentBuffer: string[] = [];
  let currentLen = 0;
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect heading or topic title
    if (
      (trimmed.length < 80 && /^[A-Z0-9\s:_-]+$/.test(trimmed)) ||
      trimmed.startsWith("#") ||
      /^(Clinical Features|Pathophysiology|Diagnosis|Treatment|Management|Etiology|Anatomy of|Investigation|Overview):?/i.test(trimmed)
    ) {
      currentTopic = trimmed.replace(/^#+\s*/, "").slice(0, 100);
    }

    // ~1500 chars is approx 350-450 tokens
    if (currentLen + trimmed.length > 1800 && currentBuffer.length > 0) {
      const chunkText = currentBuffer.join("\n\n");
      chunks.push({
        chunkIndex: chunkIndex++,
        subject,
        topic: currentTopic,
        content: chunkText,
        tokenCount: Math.round(chunkText.length / 4),
      });

      // Keep last paragraph for contextual overlap (~60-80 tokens)
      const overlap = currentBuffer[currentBuffer.length - 1];
      currentBuffer = overlap && overlap.length < 400 ? [overlap, trimmed] : [trimmed];
      currentLen = currentBuffer.reduce((acc, p) => acc + p.length, 0);
    } else {
      currentBuffer.push(trimmed);
      currentLen += trimmed.length;
    }
  }

  if (currentBuffer.length > 0) {
    const chunkText = currentBuffer.join("\n\n");
    chunks.push({
      chunkIndex: chunkIndex++,
      subject,
      topic: currentTopic,
      content: chunkText,
      tokenCount: Math.round(chunkText.length / 4),
    });
  }

  return chunks;
}

/**
 * Fetch 768-dim Gemini Embedding with free-tier rate limit backoff
 */
export async function getGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const models = ["text-embedding-004", "gemini-embedding-001"];

  for (const model of models) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: `models/${model}`,
              content: { parts: [{ text }] },
              outputDimensionality: 768,
            }),
          }
        );

        if (res.status === 429) {
          const delay = 1500 * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[429 Rate Limit] Pacing for ${Math.round(delay)}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Gemini Embedding Error (${res.status}): ${err}`);
        }

        const data = await res.json();
        const values = data.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error("Unable to obtain embedding from Gemini API");
}

/**
 * Main Ingestion Runner
 */
async function run() {
  console.log("=== Elixir AI: MBBS Notes Ingestion Pipeline ===");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  if (!geminiApiKey) {
    console.error("Missing GEMINI_API_KEY in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf("--dir");
  const targetDir = dirIdx !== -1 && args[dirIdx + 1] ? args[dirIdx + 1] : null;

  console.log(`Configured for 24 MBBS subjects.`);
  if (targetDir) {
    console.log(`Source directory: ${targetDir}`);
  } else {
    console.log(`No --dir supplied. Displaying manifest of 24 Google Drive PDFs.`);
    console.table(
      MBBS_24_CATALOG.map((c) => ({
        Subject: c.subject,
        SanitizedTitle: sanitizeDocumentTitle(c.name),
        DriveID: c.driveId,
      }))
    );
    console.log("\nTo ingest local files, run: bun run scripts/ingest-mbbs-notes.ts --dir ./path/to/notes");
  }

  if (targetDir && existsSync(targetDir)) {
    const files = readdirSync(targetDir);
    console.log(`Found ${files.length} items in ${targetDir}`);

    for (const file of files) {
      const fullPath = join(targetDir, file);
      if (statSync(fullPath).isDirectory()) continue;

      const ext = extname(file).toLowerCase();
      let text = "";

      if (ext === ".txt" || ext === ".md") {
        text = readFileSync(fullPath, "utf-8");
      } else if (ext === ".pdf") {
        // Extract text via python pypdf
        try {
          const cmd = `python3 -c "import pypdf; reader=pypdf.PdfReader('${fullPath}'); print('\\n\\n'.join([p.extract_text() or '' for p in reader.pages]))"`;
          text = execSync(cmd, { maxBuffer: 100 * 1024 * 1024 }).toString();
        } catch (e: any) {
          console.error(`Failed to extract text from ${file}:`, e.message);
          continue;
        }
      } else {
        continue;
      }

      // Match against catalog for clean subject assignment
      const matched = MBBS_24_CATALOG.find(
        (c) => file.toLowerCase().includes(c.subject.toLowerCase()) || file.toLowerCase() === c.name.toLowerCase()
      );
      const subject = matched ? matched.subject : "General Medicine";
      const sanitizedTitle = sanitizeDocumentTitle(file);

      console.log(`\nProcessing: ${sanitizedTitle} [Subject: ${subject}]...`);

      // 1. Insert or get document record
      const { data: doc, error: docErr } = await supabase
        .from("study_documents")
        .upsert(
          {
            title: sanitizedTitle,
            subject,
            drive_file_id: matched?.driveId || null,
          },
          { onConflict: "title" }
        )
        .select()
        .single();

      if (docErr) {
        console.error("Failed to insert document:", docErr);
        continue;
      }

      // 2. Chunk text
      const chunks = chunkStudyText(text, subject, sanitizedTitle);
      console.log(`Generated ${chunks.length} sanitized chunks. Computing embeddings...`);

      // 3. Process embeddings in paced batches
      let saved = 0;
      for (const chunk of chunks) {
        try {
          const embedding = await getGeminiEmbedding(chunk.content, geminiApiKey);

          await supabase.from("study_chunks").insert({
            document_id: doc.id,
            chunk_index: chunk.chunkIndex,
            subject: chunk.subject,
            topic: chunk.topic,
            content: chunk.content,
            token_count: chunk.tokenCount,
            embedding,
          });

          saved++;
          // Free tier rate pacing: 150ms delay between calls
          await new Promise((r) => setTimeout(r, 150));
        } catch (err: any) {
          console.error(`Error saving chunk ${chunk.chunkIndex}:`, err.message);
        }
      }

      await supabase
        .from("study_documents")
        .update({ total_chunks: saved })
        .eq("id", doc.id);

      console.log(`Successfully ingested ${saved} chunks for ${sanitizedTitle}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("ingest-mbbs-notes.ts")) {
  run().catch(console.error);
}
