'use client';

import { useState } from 'react';
import { analyzeTimeline, AIAnalysisResponse } from './aiService';

export default function TimelineAnalyzer() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await analyzeTimeline(text);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred connecting to the AI backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-4">
      <textarea
        className="w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={6}
        placeholder="Enter work timeline text for Pattera AI to analyze..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      <button
        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow disabled:opacity-50 hover:bg-blue-700 transition-colors"
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
      >
        {loading ? 'Analyzing Timeline...' : 'Analyze with Pattera'}
      </button>

      {error && <div className="text-red-600 font-medium p-3 bg-red-50 rounded">{error}</div>}

      {result && (
        <div className="mt-6">
          <h3 className="text-xl font-bold mb-4">Legal Patterns Identified:</h3>
          {result.analysis.patterns.length === 0 ? (
            <p className="text-gray-600 italic">No specific legal patterns identified in this text.</p>
          ) : (
            <ul className="space-y-4">
              {result.analysis.patterns.map((pattern, idx) => (
                <li key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-lg font-semibold text-gray-800">{pattern.term}</p>
                  {pattern.latin && <p className="text-sm text-gray-600"><strong>Latin Doctrine:</strong> {pattern.latin}</p>}
                  {pattern.caseLaw && <p className="text-sm text-gray-600"><strong>Precedent:</strong> {pattern.caseLaw}</p>}
                  <p className="mt-2 text-gray-700">{pattern.desc}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}