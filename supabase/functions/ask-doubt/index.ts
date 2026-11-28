import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand and watermark sanitization rules
function sanitizeText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\b(marrow[\s_-]*(ed\.?|edition)?[\s_-]*0?8?)\b/gi, "Elixir Study Notes")
    .replace(/\b(marrow[\s_-]*qbank|marrow[\s_-]*notes|marrow[\s_-]*app)\b/gi, "Elixir MBBS Library")
    .replace(/@\s*marrow\b/gi, "@elixir")
    .replace(/\b(marrow)\b/gi, "Elixir")
    .replace(/\[\s*marrow\s*\]/gi, "[Elixir Notes]")
    .trim();
}

// Compute SHA-256 hash in Deno
async function sha256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Fetch Gemini embedding (768-dimensional)
async function getGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const models = ["text-embedding-004", "gemini-embedding-001"];
  let lastErr = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
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
          // Free-tier rate limit: exponential backoff with jitter
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt) + Math.random() * 500));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Embedding API error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const values = data.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
      } catch (e) {
        lastErr = e;
        if (attempt === 2) break;
      }
    }
  }

  throw lastErr || new Error("Failed to generate embedding with Gemini API");
}

// Generate grounded response with Gemini Flash free-tier
async function generateGroundedAnswer(
  query: string,
  chunks: Array<{ subject: string; topic: string; content: string; document_title: string }>,
  apiKey: string
): Promise<string> {
  const models = ["gemini-1.5-flash", "gemini-2.0-flash"];

  const contextBlocks = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1} | Subject: ${c.subject} | Topic: ${c.topic} | Document: ${c.document_title}]\n${c.content}`
    )
    .join("\n\n---\n\n");

  const systemInstruction = `You are "Elixir AI", the internal MBBS doubt-solving mentor by Nirmaya Care.
Grounding Rules:
1. You must answer the student's medical query exclusively using the provided study note excerpts below.
2. If the excerpts do not contain sufficient clinical information to answer the question, clearly state: "This topic is not covered in our current Elixir study notes." Do not speculate, extrapolate, or draw upon outside medical databases.
3. Never use or cite third-party coaching brand names (such as "Marrow"). Refer to the sources exclusively as "Elixir Study Notes" or the respective Subject and Topic.
4. Structure your response with clinical clarity: Key Concept, Clinical Presentation/Pathophysiology, Diagnosis/Criteria, and Management/High-Yield points (only as supported by the excerpts).
5. Always cite the relevant Subject and Topic at the bottom of your answer.`;

  const prompt = `${systemInstruction}

STUDY NOTE EXCERPTS:
${contextBlocks}

STUDENT DOUBT:
${query}

Please provide a grounded, high-yield clinical explanation:`;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2, // low temperature for high grounding fidelity
                maxOutputTokens: 1200,
              },
            }),
          }
        );

        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, 1200 * Math.pow(2, attempt)));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini generateContent error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) {
          return sanitizeText(candidate);
        }
      } catch (err) {
        if (attempt === 2) break;
      }
    }
  }

  throw new Error("Gemini AI was unable to generate a response. Please try again shortly.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured in backend environment variables.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate user
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawQuery = (body?.query || "").trim();
    const subjectFilter = (body?.subject || "").trim() || null;

    if (!rawQuery) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanQuery = sanitizeText(rawQuery);
    const normalizedKey = `${cleanQuery.toLowerCase()}|${(subjectFilter || "all").toLowerCase()}`;
    const queryHash = await sha256(normalizedKey);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check doubt_cache
    const { data: cached } = await adminClient
      .from("doubt_cache")
      .select("answer, sources, expires_at")
      .eq("query_hash", queryHash)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      // Async update hit count
      adminClient
        .from("doubt_cache")
        .update({ hit_count: (cached as any).hit_count + 1 })
        .eq("query_hash", queryHash)
        .then();

      return new Response(
        JSON.stringify({
          answer: cached.answer,
          sources: cached.sources,
          covered: true,
          cached: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Generate 768-dim query embedding
    const queryEmbedding = await getGeminiEmbedding(cleanQuery, geminiApiKey);

    // 3. Vector Similarity Search via match_study_chunks RPC
    const { data: matchedChunks, error: rpcError } = await adminClient.rpc("match_study_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.65,
      match_count: 4,
      filter_subject: subjectFilter,
    });

    if (rpcError) {
      console.error("match_study_chunks error:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to query medical knowledge base" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Grounding Gate: If no relevant chunks match above 0.65, return out-of-scope fallback
    if (!matchedChunks || matchedChunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer:
            "This topic is not covered in our current Elixir MBBS study notes. To prevent inaccuracies, Elixir AI only answers doubts directly backed by our curated notes.",
          sources: [],
          covered: false,
          cached: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Generate Grounded LLM Response
    const answer = await generateGroundedAnswer(cleanQuery, matchedChunks, geminiApiKey);

    const sources = matchedChunks.map((c: any) => ({
      subject: c.subject,
      topic: c.topic,
      document_title: sanitizeText(c.document_title),
      similarity: Math.round(c.similarity * 100) / 100,
    }));

    // 6. Cache the result for 30 days
    await adminClient
      .from("doubt_cache")
      .insert({
        query_hash: queryHash,
        normalized_query: cleanQuery,
        subject_filter: subjectFilter,
        answer,
        sources,
        hit_count: 1,
      })
      .catch((e: any) => console.warn("Failed to write to doubt_cache:", e));

    return new Response(
      JSON.stringify({
        answer,
        sources,
        covered: true,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("ask-doubt edge function error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "An unexpected error occurred while solving your doubt",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
