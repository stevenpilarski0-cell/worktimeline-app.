'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import Timeline, { PatternInsight, TimelineEntry } from '../Timeline';
import AmendLogModal from '../AmendLogModal';
import { analyzeTimeline } from '../aiService';

export default function FirmDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [viewMode, setViewMode] = useState<'user' | 'firm'>('user');
  const [privacyOn, setPrivacyOn] = useState(false);
  const [notesMode, setNotesMode] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [activeCase, setActiveCase] = useState('work');
  const [activeTab, setActiveTab] = useState('timelineTab');

  const [timelines, setTimelines] = useState<TimelineEntry[]>([]);
  const [timelineInput, setTimelineInput] = useState('');
  const [insights, setInsights] = useState<PatternInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [amendingLogId, setAmendingLogId] = useState<string | null>(null);
  

  // Apply night mode to body class (preserves your UI logic)
  useEffect(() => {
    if (nightMode) {
      document.body.classList.add('night');
    } else {
      document.body.classList.remove('night');
    }
  }, [nightMode]);

  // Load firm timelines from Supabase
  useEffect(() => {
    async function loadTimelines() {
      const { data, error } = await supabase
        .from('timeline_entries')
        .select('*')
        .eq('case_type', activeCase)
        .order('created_at', { ascending: true });
        
      if (data && !error) setTimelines(data);
    }
    loadTimelines();
  }, [activeCase, supabase]);

  const addTimelineEntry = async () => {
    if (!timelineInput.trim()) return;
    
    // Instead of local state array pushing, we insert securely to the database
    const { data, error } = await supabase.from('timeline_entries').insert([{
      case_type: activeCase,
      text: timelineInput,
      mode: notesMode ? 'NOTES' : 'TIMELINE',
      stamp: new Date().toLocaleString(),
    }]).select();

    if (error) {
      console.error("Error inserting timeline entry:", error);
      alert(`Failed to add entry: ${error.message}`);
      return;
    }

    if (data) {
      setTimelines(prev => [...prev, ...data]);
      setTimelineInput('');
    }
  };

  const handleAnalyzeTimeline = async () => {
    if (timelines.length === 0) return;
    setIsAnalyzing(true);
  
    const timelineText = timelines
      .map(log => `[ID: ${log.id}] [${log.stamp}] ${log.text}`)
      .join('\n');
  
    try {
      const data = await analyzeTimeline(timelineText);
      const patterns = data.analysis?.patterns || [];
      const validLogIds = new Set(timelines.map(log => String(log.id)));
      const latestLogId = timelines[timelines.length - 1].id;
  
      const formattedInsights: PatternInsight[] = patterns.map((p) => {
        let safeLogId = String(p.log_id);
        if (!validLogIds.has(safeLogId)) safeLogId = latestLogId; 
  
        return {
          log_id: safeLogId, 
          term: p.term || 'Unknown Pattern',
          latin: p.latin || '',
          caseLaw: p.caseLaw || 'Pending Review',
          desc: p.desc || '',
          status: 'ACCEPTED'
        };
      });
  
      setInsights(prev => [...prev, ...formattedInsights]);
    } catch (error) {
      console.error("Failed to connect to local AI server:", error);
      alert("Failed to connect to local AI server. Make sure your Deno script is running!");
    } finally {
      setIsAnalyzing(false);
    } 
  };

  const handleAmendLog = (id: string) => {
    setAmendingLogId(id);
    setIsAmendModalOpen(true);
  };

  const handlePreviewEvidence = (url: string, type: string) => {
    // In a real app, you might open a modal or a new tab
    alert(`Opening ${type} evidence: ${url}`);
  };

  const handleSaveAmendment = (newLog: TimelineEntry) => {
    // Add the new version to the timeline to trigger a re-render
    setTimelines(prev => [...prev, newLog]);
  };

  return (
    <div className="app-shell">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --mac-bg-light: #f5f5f7;
          --mac-bg-dark: #121212;
          --mac-glass-light: rgba(255, 255, 255, 0.65);
          --mac-glass-dark: rgba(30, 30, 30, 0.65);
          --mac-border-light: rgba(255, 255, 255, 0.6);
          --mac-border-dark: rgba(255, 255, 255, 0.08);
          --mac-shadow-light: 0 8px 32px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0,0,0,0.02);
          --mac-shadow-dark: 0 8px 32px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0,0,0,0.2);
          --text-light: #1d1d1f;
          --text-dark: #f5f5f7;
          --muted-light: #86868b;
          --muted-dark: #a1a1a6;
        }

        body {
          background-color: var(--mac-bg-light);
          color: var(--text-light);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          transition: background-color 0.4s ease, color 0.4s ease;
        }

        body.night {
          background-color: var(--mac-bg-dark);
          color: var(--text-dark);
        }

        /* Background Animation Keyframes */
        @keyframes orbDrift {
          0% { background-position: 0% 0%; }
          33% { background-position: 100% 0%; }
          66% { background-position: 100% 100%; }
          100% { background-position: 0% 100%; }
        }

        /* Smooth frosted textured blend background */
        .app-shell {
          background: radial-gradient(circle at 0% 0%, rgba(200, 240, 255, 0.6), transparent 50%), radial-gradient(circle at 100% 100%, rgba(255, 235, 240, 0.6), transparent 50%), var(--mac-bg-light);
          background-size: 200% 200%;
          animation: orbDrift 20s ease-in-out infinite alternate;
          min-height: 100vh;
        }

        body.night .app-shell {
          background: radial-gradient(circle at 0% 0%, rgba(0, 128, 128, 0.2), transparent 50%), radial-gradient(circle at 100% 100%, rgba(120, 50, 180, 0.15), transparent 50%), var(--mac-bg-dark);
          background-size: 200% 200%;
        }

        /* Logo Orb */
        .app-shell .orb {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Chromish Frosted Glass Panels */
        .app-shell .glass {
          background: var(--mac-glass-light);
          backdrop-filter: saturate(180%) blur(24px);
          -webkit-backdrop-filter: saturate(180%) blur(24px);
          border: 1px solid var(--mac-border-light);
          box-shadow: var(--mac-shadow-light);
          border-radius: 14px;
        }

        body.night .app-shell .glass {
          background: var(--mac-glass-dark);
          border-color: var(--mac-border-dark);
          box-shadow: var(--mac-shadow-dark);
        }

        /* Mac-like Smooth Buttons */
        .app-shell .firm-btn {
          background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%);
          border: 0.5px solid #d1d1d1;
          color: #1d1d1f;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        body.night .app-shell .firm-btn {
          background: linear-gradient(180deg, #444 0%, #2a2a2a 100%);
          border-color: #555;
          color: #f5f5f7;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .app-shell .firm-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 3px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
        }

        body.night .app-shell .firm-btn:hover:not(:disabled) {
          box-shadow: 0 3px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .app-shell .firm-btn:active:not(:disabled), .app-shell .firm-btn.active {
          background: #e8e8ed;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
          transform: scale(0.98);
        }

        body.night .app-shell .firm-btn:active:not(:disabled), body.night .app-shell .firm-btn.active {
          background: #222;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
        }

        .app-shell .firm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Pop Accent Button */
        .app-shell .firm-btn.teal {
          background: linear-gradient(180deg, #1cd8d2 0%, #008080 100%);
          color: #ffffff;
          border: 0.5px solid #005959;
          box-shadow: 0 2px 5px rgba(0,128,128,0.3), inset 0 1px 0 rgba(255,255,255,0.3);
          text-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }

        .app-shell .firm-btn.teal:hover:not(:disabled) {
          background: linear-gradient(180deg, #1fe8e2 0%, #009090 100%);
          box-shadow: 0 4px 8px rgba(0,128,128,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .app-shell .firm-btn.teal:active:not(:disabled) {
          background: linear-gradient(180deg, #008080 0%, #006666 100%);
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.4);
        }

        /* Segmented Tabs */
        .app-shell .tabs {
          display: inline-flex;
          background: rgba(0,0,0,0.06);
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        body.night .app-shell .tabs { background: rgba(255,255,255,0.08); }

        .app-shell .tab {
          background: transparent;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--muted-light);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        body.night .app-shell .tab { color: var(--muted-dark); }

        .app-shell .tab.active {
          background: #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04);
          color: var(--text-light);
        }
        body.night .app-shell .tab.active {
          background: #333333;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 1px 1px rgba(0,0,0,0.2);
          color: var(--text-dark);
        }

        /* Depth Inputs */
        .app-shell .firm-control {
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 10px;
          padding: 14px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
          transition: all 0.3s ease;
        }
        body.night .app-shell .firm-control {
          background: rgba(0,0,0,0.3);
          border-color: rgba(255,255,255,0.1);
          color: var(--text-dark);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
        }
        .app-shell .firm-control:focus {
          outline: none;
          border-color: #008080;
          box-shadow: 0 0 0 4px rgba(0,128,128,0.15), inset 0 1px 2px rgba(0,0,0,0.03);
          background: #ffffff;
        }
        body.night .firm-control:focus {
          box-shadow: 0 0 0 4px rgba(0,128,128,0.3), inset 0 1px 2px rgba(0,0,0,0.2) !important;
          background: #1e1e1e !important;
        }

        .app-shell h1, .app-shell h2, .app-shell .section-title, .app-shell .eyebrow { font-weight: 600; letter-spacing: -0.02em; }

        .logo-svg {
          margin: 2px;
        }
        .regulatory-notice {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          font-size: 12px;
          line-height: 1.5;
          color: #ef4444;
          text-align: left;
        }
        .regulatory-notice-list {
          margin: 8px 0 0 0;
          padding-left: 16px;
          list-style-type: disc;
        }
        .row-gap-mt-14 {
          margin-top: 14px;
        }
        .timeline-list-mt-20 {
          margin-top: 20px;
        }
      `}} />
      <aside className="firm-sidebar glass">
        <div className="brand">
          <div className="brand-left">
            <div className="orb" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="url(#paint0_linear_logo)"/>
                <path d="M11.5 8.5H14.5C15.8807 8.5 17 9.61929 17 11C17 12.3807 15.8807 13.5 14.5 13.5H11.5V16H9.5V8.5H11.5ZM11.5 11.5H14.5C14.7761 11.5 15 11.2761 15 11C15 10.7239 14.7761 10.5 14.5 10.5H11.5V11.5Z" fill="white"/>
                <defs>
                  <linearGradient id="paint0_linear_logo" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#1cd8d2"/><stop offset="1" stop-color="#008080"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1>WorkTimeline</h1>
              <small>Pattera workspace</small>
            </div>
          </div>
        </div>

        <div className="sidebar-group">
          <div className="section-title">Case track</div>
          <div className="nav-grid">
            {['work', 'injury', 'family', 'property'].map(c => (
              <button 
                key={c} 
                className={`firm-btn ${activeCase === c ? 'active' : ''}`} 
                onClick={() => setActiveCase(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-group">
          <div className="section-title">View</div>
          <div className="nav-grid">
            <button className={`firm-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => setViewMode('user')}>User View</button>
            <button className={`firm-btn ${viewMode === 'firm' ? 'active' : ''}`} onClick={() => setViewMode('firm')}>Firm View</button>
          </div>
        </div>

        <div className="sidebar-group">
          <div className="section-title">Switches</div>
          <div className="nav-grid">
            <button className="firm-btn" onClick={() => setPrivacyOn(!privacyOn)}>{privacyOn ? "Privacy On" : "Privacy Off"}</button>
            <button className="firm-btn" onClick={() => setNotesMode(!notesMode)}>{notesMode ? "Notes Mode" : "Timeline Mode"}</button>
            <button className="firm-btn" onClick={() => setNightMode(!nightMode)}>{nightMode ? "Day Mode" : "Night Mode"}</button>
          </div>
        </div>

        <div className="sidebar-group">
          <div className="section-title">Clio</div>
          <div className="nav-grid">
            <button className="firm-btn clio" onClick={() => alert('Verify Clio Hook')}>Verify Clio</button>
            <button className="firm-btn clio" onClick={() => alert('Create Matter Hook')}>Create Matter</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <section className="topbar glass">
          <div className="topbar-left">
            <span className="pill">Active: {activeCase.charAt(0).toUpperCase() + activeCase.slice(1)}</span>
            <span className="pill">View: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</span>
            <span className="pill">Mode: {notesMode ? 'Notes' : 'Timeline'}</span>
          </div>
          <div className="topbar-right">
            <button className="firm-btn ghost">Open Timeline Window</button>
            <button className="firm-btn ghost">Open Graph Window</button>
          </div>
        </section>

        <section className="firm-panel glass pattera-panel">
          <div className="pattera-intro">
            <div className="assistant-orb" aria-hidden="true"></div>
            <div>
              <div className="eyebrow">Pattera</div>
              <h2>Hello — I keep originals, duplicates, working copies, anonymous firm summaries, and investigation links aligned.</h2>
              <p className="muted">Use tabs to switch between Timeline, Working Notes, Study Hub, Investigation, Evidence, and Firm Summaries.</p>
            </div>
          </div>
        </section>

        <section className="firm-panel glass tabs-panel">
          <div className="tabs">
            {[
              { id: 'timelineTab', label: 'Timeline' },
              { id: 'notesTab', label: 'Working Notes' },
              { id: 'studyTab', label: 'Study Hub' },
              { id: 'investigationTab', label: 'Investigation' },
              { id: 'evidenceTab', label: 'Evidence' },
            ].map(t => (
              <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'timelineTab' && viewMode === 'firm' && (
            <div className="tab-content active" id="firmTimelineView">
              <div className="regulatory-notice">
                <strong>⚠️ LAWYER REGULATORY COMPLIANCE NOTICE:</strong>
                <ul className="regulatory-notice-list">
                  <li>You must independently verify the client's identity.</li>
                  <li>You must obtain client consent before accessing this timeline record.</li>
                  <li>You must comply with all Law Society of BC rules.</li>
                  <li>Your access has been logged in the App's immutable audit trail.</li>
                  <li>Do not rely solely on AI analysis or pattern recognition.</li>
                  <li>You must manually review all AI-generated summaries and timelines before use.</li>
                </ul>
              </div>
              <div className="section-head">
                <strong>Timeline entry</strong>
                <span className="muted">Chronological record with preserved originals.</span>
              </div>
              <textarea className="firm-control" placeholder="Add a timeline event..." value={timelineInput} onChange={e => setTimelineInput(e.target.value)} />
              <div className="row gap row-gap-mt-14">
                <button className="firm-btn teal" onClick={addTimelineEntry}>Add Timeline Entry</button>
                <button 
                  className="firm-btn teal" 
                  onClick={handleAnalyzeTimeline} 
                  disabled={isAnalyzing || timelines.length === 0}
                >
                  {isAnalyzing ? '🤖 Analyzing timeline...' : 'Run AI Pattern Analysis'}
                </button>
              </div>
              <div id="timelineList" className="timeline-list-mt-20">
        <Timeline 
          logs={timelines} 
          insights={insights} 
          currentMode={notesMode ? 'NOTES' : 'TIMELINE'} 
          onAmend={handleAmendLog}
          onPreviewEvidence={handlePreviewEvidence}
        />
              </div>
            </div>
          )}
        </section>
      </main>
      <AmendLogModal
        isOpen={isAmendModalOpen}
        onClose={() => setIsAmendModalOpen(false)}
        logId={amendingLogId}
        onSave={handleSaveAmendment}
      />
    </div>
  );
}
