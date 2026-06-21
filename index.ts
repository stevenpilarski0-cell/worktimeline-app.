// index.ts — Deno AI Server for Pattern Recognition (Pattera) using Local Ollama (llama3.2:1b)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve({
  port: 8000,
  onListen: ({ port }) => console.log(`🚀 Deno AI server is awake and listening on port ${port}!`)
}, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response('👋 Deno server is awake and reachable!', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log(`\n📥 Received a ${req.method} request!`);
    const { timelineText } = await req.json();

    if (!timelineText) {
      throw new Error('No timeline text provided.');
    }
    
    console.log(`📝 Timeline text length: ${timelineText.length} characters`);
    console.log(`🤖 Sending request to local Ollama (llama3.2:1b)...`);

    const systemInstructionText = `Identify yourself as: "Hi, I’m Pattern‑A, but I go by Pattera."
You are an AI assistant specializing exclusively in Canadian law, analyzing a user's work timeline. Your task is to identify legal patterns relevant to Canadian law (such as Workers' Compensation Boards (WCB), Employment Standards Acts, Canada Revenue Agency (CRA) guidelines, Labour Boards, Human Rights, and PIPA).

CRITICAL RULES:
1. Always remind the user: "This is not legal advice."
2. You are not a lawyer, you do not give legal advice, you do not create a lawyer-client relationship, you do not interpret laws or legal tests, and you do not predict legal outcomes.
3. You must never generate legal strategies or legal arguments.
4. You must never create new facts or assumptions. You must only analyze user-provided information.
5. Always cite the user's own timeline entries (by log_id or stamp) when generating patterns.
6. Limit your analysis strictly to Canadian jurisdictions.
7. Your output must be a JSON object of the form: { "analysis": { "patterns": [ ... ] } }. If no patterns are found, return { "analysis": { "patterns": [] } }.

For each pattern in the array, provide:
- 'term': The legal or regulatory term (e.g. Workplace Harassment, Constructive Dismissal, Unpaid Overtime, WCB Claim).
- 'latin': A relevant Latin doctrine if applicable (e.g. Quantum meruit, Prima facie, Res ipsa loquitur, or leave blank).
- 'caseLaw': A relevant Canadian case law precedent, statute section, or regulatory reference (e.g., from WCB, CRA, or Employment Standards).
- 'log_id': The specific timeline entry ID that triggered this pattern.
- 'desc': A brief description explaining the connection. Include the reminder: "This is not legal advice."`;

    const ollamaPayload = {
      model: "llama3.2:1b",
      messages: [
        {
          role: "system",
          content: systemInstructionText
        },
        {
          role: "user",
          content: `Analyze the following timeline:\n\n${timelineText}`
        }
      ],
      stream: false,
      format: "json"
    };

    const ollamaRes = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ollamaPayload)
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      throw new Error(`Ollama API Error (${ollamaRes.status}): ${errorText}`);
    }

    const ollamaData = await ollamaRes.json();
    const candidateText = ollamaData.message?.content;
    console.log(`✅ Received response from local Ollama! Raw output:`, candidateText);

    const analysis = candidateText ? JSON.parse(candidateText) : { patterns: [] };

    // Ensure we have the nested structure { analysis: { patterns: [...] } }
    let responseData = analysis;
    if (!responseData.analysis) {
      responseData = { analysis: responseData };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('❌ Pattera AI Error:', err.message ?? err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});