export interface LegalPattern {
  term: string;
  latin?: string;
  caseLaw?: string;
  log_id?: string;
  desc: string;
}

export interface AIAnalysisResponse {
  analysis: {
    patterns: LegalPattern[];
  };
}

export async function analyzeTimeline(timelineText: string): Promise<AIAnalysisResponse> {
  const response = await fetch('http://localhost:8000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include auth headers here later if you add authentication to the Deno server
    },
    body: JSON.stringify({ timelineText }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Server Error (${response.status}): ${errorText}`);
  }

  return response.json();
}