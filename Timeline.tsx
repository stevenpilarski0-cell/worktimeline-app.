'use client';

import React, { JSX, useRef } from 'react';

// Using the Supabase DB Schema definitions
export interface TimelineEntry {
  case_type: string;
  id: string;
  parent_id: string | null;
  mode: string;
  type: string;
  stamp: string;
  text: string;
  evidence_url?: string | null;
  extracted_date?: string | null;
  custom_attributes?: any;
}

export interface PatternInsight {
  log_id: string;
  term: string;
  latin: string;
  caseLaw: string;
  desc: string;
  status: 'PENDING' | 'ACCEPTED' | 'IGNORED';
}

interface TimelineProps {
  logs: TimelineEntry[];
  insights?: PatternInsight[];
  currentMode?: 'TIMELINE' | 'NOTES';
  onAmend?: (id: string) => void;
  onPreviewEvidence?: (urlOrPath: string, type: string, extractedDate?: string | null) => void;
  highlightedLogId?: string | null;
}

const PIN_SVG = (
  <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);

const ICONS: Record<string, JSX.Element> = {
  text: <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  photo: <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  video: <svg viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  audio: <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  document: <svg viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  receipt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg>,
  visit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19V5"/></svg>
};

export default function Timeline({ 
  logs = [], 
  insights = [], 
  currentMode = 'TIMELINE',
  onAmend,
  onPreviewEvidence,
  highlightedLogId
}: TimelineProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Google US English') ||
      v.name.includes('Zira') ||
      v.name.includes('Samantha') ||
      v.name.includes('Hazel') ||
      (v.name.toLowerCase().includes('female') && v.lang.startsWith('en'))
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // 1. Filter for base baseline entries (no parent)
  const baseEntries = logs.filter(log => (log.mode || 'TIMELINE') === currentMode && !log.parent_id);

  // 2. Long Press Handlers for "Hold to Supersede"
  const handlePressStart = (id: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (onAmend) onAmend(id);
    }, 700);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  return (
    <div className="workspace-layout-matrix">
      
      {/* LEFT: VISUAL SPINE TRACK */}
      <div id="visualSpineTrack" className="vertical-spine-track" style={{ display: currentMode === 'TIMELINE' ? 'flex' : 'none' }}>
        {currentMode === 'TIMELINE' && baseEntries.map(log => {
          const childAmendments = logs.filter(v => v.parent_id === log.id && v.type !== 'receipt' && v.type !== 'visit');
          const completeChain = [log, ...childAmendments];
          const topMostActiveVersion = completeChain[completeChain.length - 1];
          const associatedInsights = insights.filter(i => i.log_id === log.id && i.status === 'ACCEPTED');
          
          const hasAlerts = associatedInsights.length > 0;

          return (
            <div 
              key={`spine_${log.id}`}
              className={`timeline-squircle ${hasAlerts ? 'pattern-triggered' : ''}`}
              style={hasAlerts ? { border: '2px solid #008080' } : {}}
              onClick={() => alert(`Event Chain Base Reference ID: ${log.id}\nLayers Compiled: ${completeChain.length}\nLast State: ${topMostActiveVersion.stamp}`)}
              aria-label="View Log Details"
            >
              {ICONS[topMostActiveVersion.type || 'text']}
            </div>
          );
        })}
      </div>

      {/* RIGHT: TIMELINE MAIN BODY */}
      <div className="timeline-container" id="timelineBody">
        <div className="log-list" id="logList">
          {baseEntries.map(log => {
            // Build Chain of Custody (excluding sub-timeline types)
            const childAmendments = logs.filter(v => v.parent_id === log.id && v.type !== 'receipt' && v.type !== 'visit');
            const completeChain = [log, ...childAmendments];
            const topMostActiveVersion = completeChain[completeChain.length - 1];
            const previousVersions = completeChain.slice(0, -1);
            
            // Sub-timeline entries (receipts, doctor visits, social workers)
            const subEntries = logs.filter(v => v.parent_id === log.id && (v.type === 'receipt' || v.type === 'visit'));
            
            const associatedInsights = insights.filter(i => i.log_id === log.id && i.status === 'ACCEPTED');
            const isOverriddenByAI = currentMode === 'TIMELINE' && associatedInsights.length > 0;

            return (
              <div key={log.id} className="log-bubble-stack">
                
                {/* PATTERN RECOGNITION AI OVERLAY (TOP MOST IF APPLICABLE) */}
                {isOverriddenByAI && (
                  <div className="log-bubble ai-pulse-over">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="pattern-insight-title" style={{ color: '#008080', fontWeight: 900 }}>
                        [PATTERA INSIGHT OVERRIDE]
                      </span>
                      <button 
                        onClick={() => {
                          const speechString = associatedInsights.map(i => `Pattern detected: ${i.term}. Precedent: ${i.caseLaw}. ${i.desc || ''}`).join(' ');
                          speakText(`Hi, I'm Pattera. Here is what I found. ${speechString} This is not legal advice.`);
                        }}
                        style={{ 
                          background: 'rgba(28, 216, 210, 0.08)', 
                          border: '1px solid rgba(28, 216, 210, 0.2)', 
                          color: '#1cd8d2', 
                          cursor: 'pointer', 
                          fontSize: '0.72rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          padding: '3px 8px', 
                          borderRadius: '8px', 
                          fontWeight: 600,
                          transition: 'all 0.2s ease'
                        }}
                        title="Listen to Pattera Analysis"
                      >
                        🔊 Listen
                      </button>
                    </div>
                    {associatedInsights.map((insight, idx) => (
                      <div key={idx} style={{ marginBottom: '5px' }}>
                        <strong>⚠️ Pattern Detected: {insight.term}</strong><br/>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>
                          <i>{insight.latin}</i> | Ref: {insight.caseLaw}
                        </span>
                      </div>
                    ))}
                    <div style={{ fontSize: '11px', marginTop: '8px', color: '#008080', borderTop: '1px solid rgba(0,128,128,0.2)', paddingTop: '4px' }}>
                      Original evidence entry retained below.
                    </div>
                  </div>
                )}

                {/* HISTORICAL VERSIONS (SUPERSEDED / TRANSPARENT) */}
                {previousVersions.map((historyNode, idx) => {
                  const internalVersionLabel = idx === 0 ? 'ORIGINAL BASELINE' : `AMENDMENT #${idx}`;
                  return (
                    <div key={historyNode.id} className="log-bubble historical-version">
                      <span className="historical-version-label">[{internalVersionLabel}: {historyNode.stamp}]</span>
                      <br/>
                      <span dangerouslySetInnerHTML={{ __html: historyNode.text.replace(/\n/g, '<br>') }} />
                    </div>
                  );
                }).reverse() /* React reverse to match Vanilla JS decrementing loop */} 

                {/* MAIN ACTIVE LOG ENTRY */}
                <div 
                  id={`log_${log.id}`}
                  className={`log-entry ${highlightedLogId === log.id ? 'highlighted-log-pulse' : ''}`}
                  style={isOverriddenByAI ? { marginTop: '8px', opacity: 0.85, transform: 'scale(0.97)' } : {}}
                  onMouseDown={() => handlePressStart(topMostActiveVersion.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(topMostActiveVersion.id)}
                  onTouchEnd={handlePressEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="timestamp-stamp">
                    {PIN_SVG} {topMostActiveVersion.stamp}
                  </div>
                  <div className="log-bubble" title="Hold to Supersede entry parameters">
                    <span dangerouslySetInnerHTML={{ __html: topMostActiveVersion.text.replace(/\n/g, '<br>') }} />
                    
                    {/* EVIDENCE ATTACHMENT ICON */}
                    {topMostActiveVersion.evidence_url && (
                      <div 
                        className="evidence-icon"
                        onClick={() => onPreviewEvidence && onPreviewEvidence(topMostActiveVersion.evidence_url!, topMostActiveVersion.type, topMostActiveVersion.extracted_date)}
                      >
                        {ICONS[topMostActiveVersion.type] || ICONS['document']}
                      </div>
                    )}
                  </div>
                </div>

                {/* HIERARCHICAL SUB-TIMELINE (RECEIPTS / VISITS) */}
                {subEntries.length > 0 && (
                  <div className="sub-timeline-list" style={{ marginTop: '8px', paddingLeft: '24px', borderLeft: '2px dashed rgba(28, 216, 210, 0.25)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {subEntries.map(sub => {
                      const isSubHighlighted = highlightedLogId === sub.id;
                      const customAttrs = typeof sub.custom_attributes === 'string' 
                        ? JSON.parse(sub.custom_attributes) 
                        : (sub.custom_attributes || {});
                      return (
                        <div 
                          key={sub.id} 
                          id={`log_${sub.id}`}
                          className={`sub-timeline-item ${isSubHighlighted ? 'highlighted-log-pulse' : ''}`}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            padding: '10px 14px', 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid var(--mac-border-dark)', 
                            borderRadius: '12px',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(28, 216, 210, 0.08)', color: '#1cd8d2' }}>
                            {ICONS[sub.type] || '🧾'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#86868b', fontWeight: 600 }}>{sub.stamp}</span>
                              {customAttrs.amount && (
                                <span style={{ fontSize: '0.8rem', color: '#1cd8d2', fontWeight: 700 }}>
                                  ${parseFloat(customAttrs.amount).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#e5e5ea' }}>{sub.text}</div>
                            {/* Custom Metadata Details */}
                            {(customAttrs.merchant || customAttrs.provider || customAttrs.counselor) && (
                              <div style={{ fontSize: '0.72rem', color: '#86868b', marginTop: '3px' }}>
                                {customAttrs.merchant && `Merchant: ${customAttrs.merchant}`}
                                {customAttrs.provider && `Provider: ${customAttrs.provider}`}
                                {customAttrs.counselor && `Counselor: ${customAttrs.counselor}`}
                                {customAttrs.session_type && ` (${customAttrs.session_type})`}
                              </div>
                            )}
                          </div>
                          {sub.evidence_url && (
                            <button 
                              className="firm-btn" 
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                              onClick={() => onPreviewEvidence && onPreviewEvidence(sub.evidence_url!, sub.type)}
                            >
                              View
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}