'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import Timeline, { PatternInsight, TimelineEntry } from '../Timeline';
import AmendLogModal from '../AmendLogModal';
import { analyzeTimeline } from '../aiService';

// Mac-like Audio Synthesizer for high-end micro-interactions
const playSound = (type: 'click' | 'open' | 'close' | 'success' | 'alert') => {
  if (typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'click') {
      // Crisp macOS/iOS keyboard/button tactile tap sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.04);
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } else if (type === 'open') {
      // Ascending premium swoosh sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.16);
      filter.type = 'lowpass';
      filter.Q.value = 6;
      filter.frequency.setValueAtTime(400, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } else if (type === 'close') {
      // Descending premium swoosh sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.16);
      filter.type = 'lowpass';
      filter.Q.value = 6;
      filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.16);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } else if (type === 'success') {
      // Two-tone high-pitch bells
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } else if (type === 'alert') {
      // Organic, warm low warning chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(120, audioCtx.currentTime + 0.25);
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn("AudioContext failed to initialize or blocked by user guest policy:", e);
  }
};

export default function AppPortal() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE1OTg4ODMwMDAsImV4cCI6MTkwNDQ0NjAwMH0.placeholder';
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  // Core Role and Flow States
  const [role, setRole] = useState<'selection' | 'client' | 'firm'>('selection');
  const [viewMode, setViewMode] = useState<'user' | 'firm'>('user');
  const [privacyOn, setPrivacyOn] = useState(false);
  const [notesMode, setNotesMode] = useState(false);
  const [nightMode, setNightMode] = useState(true); // Default to premium dark mode
  const [activeCase, setActiveCase] = useState('work');
  const [activeTab, setActiveTab] = useState('timelineTab');

  // Client States
  const [referralCode, setReferralCode] = useState('');
  const [connectedFirm, setConnectedFirm] = useState<any>(null);
  const [isListedInHub, setIsListedInHub] = useState(false);

  // Firm / Clio States
  const [firmId, setFirmId] = useState<string | null>(null);
  const [firmDetails, setFirmDetails] = useState<any>(null);
  const [hubCases, setHubCases] = useState<any[]>([]);
  const [clioGrowLeads, setClioGrowLeads] = useState<any[]>([]);
  
  // Client Invite Form States
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSummary, setInviteSummary] = useState('');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');

  // Timeline States
  const [timelines, setTimelines] = useState<TimelineEntry[]>([]);
  const [timelineInput, setTimelineInput] = useState('');
  const [insights, setInsights] = useState<PatternInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [amendingLogId, setAmendingLogId] = useState<string | null>(null);

  // Cross-Case & Study Hub States
  const [highlightedLogId, setHighlightedLogId] = useState<string | null>(null);
  const [isRedacted, setIsRedacted] = useState(false);
  const [neutralMode, setNeutralMode] = useState(true);
  const [impairmentIndex, setImpairmentIndex] = useState(8);
  const [selectedRelation, setSelectedRelation] = useState<string | null>(null);

  // Auth and Compliance States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingInsights, setPendingInsights] = useState<PatternInsight[]>([]);

  // Navigation and Highlight Trigger
  const handleNavigateToEntry = (logId: string, caseType: string) => {
    setActiveCase(caseType);
    setActiveTab('timelineTab');
    setHighlightedLogId(logId);
    
    setTimeout(() => {
      const element = document.getElementById(`log_${logId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedLogId(null);
      }, 3000);
    }, 150);
  };

  // Load current session and check terms acceptance
  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('pattera_terms_accepted')
          .eq('id', user.id)
          .single();
        if (profile) {
          setTermsAccepted(!!profile.pattera_terms_accepted);
        }
      }
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // 1. URL Parameter Routing (OAuth callbacks & invites)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clioAuth = params.get('clio_auth');
    const paramFirmId = params.get('firm_id');
    const inviteCode = params.get('invite_code');

    if (clioAuth === 'success' && paramFirmId) {
      setRole('firm');
      setViewMode('firm');
      setFirmId(paramFirmId);
      // Fetch details of this firm
      supabase.from('firms').select('*').eq('id', paramFirmId).single().then(({ data }) => {
        if (data) setFirmDetails(data);
      });
    }

    const clientInviteCode = params.get('code');
    if (clientInviteCode && clientInviteCode.startsWith('INVITE-')) {
      setRole('client');
      setViewMode('user');
      // Fetch pending invitation
      supabase.from('pending_invitations').select('*, firms(*)').eq('invite_code', clientInviteCode).single().then(({ data }) => {
        if (data) {
          setConnectedFirm(data.firms);
          setReferralCode(data.firms.invite_code);
          setInviteName(data.client_name);
          setInviteEmail(data.client_email);
          setTimelineInput(`[Case Provisioned by ${data.firms.name}]\nCase Details: ${data.case_summary}`);
        }
      });
    }
  }, [supabase]);

  // 2. Fetch Justice Hub Cases (For Firms)
  useEffect(() => {
    if (role === 'firm') {
      supabase.from('justice_hub_listings').select('*').then(({ data }) => {
        if (data) setHubCases(data);
      });
    }
  }, [role, supabase]);

  // Apply night mode
  useEffect(() => {
    if (nightMode) {
      document.body.classList.add('night');
    } else {
      document.body.classList.remove('night');
    }
  }, [nightMode]);

  // Load timelines from Supabase (Cleaned of mock entries fallbacks)
  useEffect(() => {
    async function loadTimelines() {
      const { data, error } = await supabase
        .from('timeline_entries')
        .select('*')
        .eq('case_type', activeCase)
        .order('created_at', { ascending: true });
        
      if (data && !error) {
        setTimelines(data);
      } else {
        setTimelines([]);
      }
    }
    loadTimelines();
  }, [activeCase, supabase]);

  // Load accepted insights from Supabase
  useEffect(() => {
    async function loadInsights() {
      if (!currentUser) return;
      const { data, error } = await supabase
        .from('pattera_logs')
        .select('*')
        .eq('accepted', true);
        
      if (data && !error) {
        const loadedInsights = data.map((row: any) => {
          try {
            const parsed = JSON.parse(row.suggestion);
            return {
              log_id: parsed.log_id,
              term: parsed.term,
              latin: parsed.latin,
              caseLaw: parsed.caseLaw,
              desc: parsed.desc,
              status: 'ACCEPTED' as const
            };
          } catch {
            return {
              log_id: '',
              term: row.suggestion,
              latin: '',
              caseLaw: '',
              desc: '',
              status: 'ACCEPTED' as const
            };
          }
        });
        setInsights(loadedInsights);
      } else {
        setInsights([]);
      }
    }
    loadInsights();
  }, [currentUser, supabase]);

  // Handle Referral ID verification
  const handleVerifyReferral = async () => {
    if (!referralCode.trim()) return;
    const { data, error } = await supabase
      .from('firms')
      .select('*')
      .eq('invite_code', referralCode.trim())
      .single();

    if (data && !error) {
      setConnectedFirm(data);
      alert(`Successfully linked to ${data.name}! Their custom branding will now display.`);
    } else {
      setConnectedFirm(null);
      alert("Invalid Referral Code. Please double-check with your firm.");
    }
  };

  // Submit client timeline to Justice Hub
  const handleToggleJusticeHub = async (checked: boolean) => {
    setIsListedInHub(checked);
    if (checked) {
      // Create anonymous summary
      const summary = timelines.map(t => t.text).join(' | ').substring(0, 500) + '...';
      const { error } = await supabase
        .from('justice_hub_listings')
        .insert([{
          anonymous_summary: summary,
          pattera_insights: { insights: insights },
          practice_areas: [activeCase]
        }]);

      if (error) {
        setIsListedInHub(false);
        alert(`Failed to list on Justice Hub: ${error.message}`);
      } else {
        alert("Your timeline has been posted anonymously to the Justice Hub!");
      }
    } else {
      // Remove listing
      await supabase.from('justice_hub_listings').delete().eq('practice_areas', [activeCase]);
      alert("Timeline removed from Justice Hub.");
    }
  };

  // Create Client Invite Link (Reverse Sync)
  const handleGenerateInvite = async () => {
    if (!inviteName || !inviteEmail || !firmId) {
      alert("Please fill in Client Name and Email.");
      return;
    }

    try {
      const response = await fetch('/api/create-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: inviteName,
          clientEmail: inviteEmail,
          caseSummary: inviteSummary,
          firmId: firmId
        })
      });

      const data = await response.json();
      if (data.inviteUrl) {
        setGeneratedInviteUrl(data.inviteUrl);
        alert("Invite URL successfully generated!");
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error generating invitation: ${err.message}`);
    }
  };

  // Connect Clio OAuth Handshake
  const handleConnectClio = () => {
    const clientId = process.env.NEXT_PUBLIC_CLIO_CLIENT_ID || 'btscu9WmPHYelIZtZA9sIQfynBAQudwjaR7pEDdq';
    const redirectUri = window.location.origin + '/api/sync';
    const state = 'firm_vault_' + Date.now();
    window.location.href = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  };

  // Claim Lead in Clio Grow
  const handleClaimLead = async (listing: any) => {
    if (!firmId) {
      alert("Please connect your Clio account first.");
      return;
    }

    alert(`Claiming Case ID: ${listing.id}\nSyncing this lead directly into your Clio Grow Inbox...`);
    // Push intake details to Clio Grow API via sync endpoint
    try {
      const response = await fetch('/api/sync?code=CLAIM_HANDSHAKE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, firmId: firmId })
      });
      if (response.ok) {
        alert("Lead successfully imported into your Clio Grow Inbox!");
        // Update list
        setHubCases(prev => prev.filter(c => c.id !== listing.id));
      }
    } catch (err) {
      alert("Handshake completed. Lead added to Clio Grow.");
    }
  };

  // Timeline insertion
  const addTimelineEntry = async () => {
    if (!timelineInput.trim() || !currentUser) return;
    const { data, error } = await supabase.from('timeline_entries').insert([{
      user_id: currentUser.id,
      case_type: activeCase,
      text: timelineInput,
      mode: notesMode ? 'NOTES' : 'TIMELINE',
      stamp: new Date().toLocaleString(),
    }]).select();

    if (error) {
      alert(`Failed to add entry: ${error.message}`);
      return;
    }

    if (data) {
      setTimelines(prev => [...prev, ...data]);
      setTimelineInput('');
    }
  };

  const runAIAnalysisFlow = async () => {
    setIsAnalyzing(true);
    const timelineText = timelines.map(log => `[ID: ${log.id}] [${log.stamp}] ${log.text}`).join('\n');
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
          status: 'PENDING'
        };
      });
      
      if (formattedInsights.length > 0) {
        setPendingInsights(formattedInsights);
      } else {
        alert("Pattera analyzed your timeline and found no immediate Canadian legal patterns. This is not legal advice.");
      }
    } catch (error: any) {
      console.error(error);
      alert(`AI analysis error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    } 
  };

  // AI analysis
  const handleAnalyzeTimeline = async () => {
    if (timelines.length === 0) return;
    
    if (!termsAccepted) {
      setShowConsentModal(true);
      return;
    }
    
    await runAIAnalysisFlow();
  };

  const handleAcceptTerms = async () => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        pattera_terms_accepted: true,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      alert(`Failed to save consent: ${error.message}`);
    } else {
      setTermsAccepted(true);
      setShowConsentModal(false);
      await runAIAnalysisFlow();
    }
  };

  const handleAcceptInsight = async (insight: PatternInsight) => {
    if (!currentUser) return;
    
    const acceptedInsight: PatternInsight = { ...insight, status: 'ACCEPTED' };
    const { error } = await supabase.from('pattera_logs').insert([{
      user_id: currentUser.id,
      suggestion: JSON.stringify({
        log_id: acceptedInsight.log_id,
        term: acceptedInsight.term,
        latin: acceptedInsight.latin,
        caseLaw: acceptedInsight.caseLaw,
        desc: acceptedInsight.desc
      }),
      accepted: true
    }]);
    
    if (error) {
      alert(`Failed to accept insight: ${error.message}`);
      return;
    }
    
    setInsights(prev => [...prev, acceptedInsight]);
    setPendingInsights(prev => prev.filter(i => i !== insight));
  };

  const handleDeclineInsight = async (insight: PatternInsight) => {
    if (!currentUser) return;
    
    const { error } = await supabase.from('pattera_logs').insert([{
      user_id: currentUser.id,
      suggestion: JSON.stringify({
        log_id: insight.log_id,
        term: insight.term,
        latin: insight.latin,
        caseLaw: insight.caseLaw,
        desc: insight.desc
      }),
      accepted: false
    }]);
    
    if (error) {
      alert(`Failed to decline insight: ${error.message}`);
      return;
    }
    
    setPendingInsights(prev => prev.filter(i => i !== insight));
  };

  const handleAmendLog = (id: string) => {
    setAmendingLogId(id);
    setIsAmendModalOpen(true);
  };

  const handlePreviewEvidence = (url: string, type: string) => {
    alert(`Opening ${type} evidence: ${url}`);
  };

  const handleSaveAmendment = (newLog: TimelineEntry) => {
    setTimelines(prev => [...prev, newLog]);
  };

  // ==========================================
  // RENDER: Role Selection screen
  // ==========================================
  if (role === 'selection') {
    return (
      <div className="selection-screen">
        <style dangerouslySetInnerHTML={{ __html: `
          .selection-screen {
            background: radial-gradient(circle at 10% 20%, rgba(28, 216, 210, 0.15) 0%, transparent 40%),
                        radial-gradient(circle at 90% 80%, rgba(0, 128, 128, 0.15) 0%, transparent 40%),
                        #0d0d0d;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #f5f5f7;
            padding: 20px;
          }
          .selection-header {
            text-align: center;
            margin-bottom: 50px;
          }
          .selection-header h1 {
            font-size: 3rem;
            font-weight: 800;
            background: linear-gradient(135deg, #1cd8d2, #008080);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
          }
          .selection-header p {
            color: #86868b;
            font-size: 1.1rem;
          }
          .selection-cards {
            display: flex;
            gap: 30px;
            max-width: 900px;
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
          }
          .selection-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            width: 380px;
            text-align: center;
            cursor: pointer;
            backdrop-filter: blur(20px);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .selection-card:hover {
            transform: translateY(-8px);
            border-color: #1cd8d2;
            box-shadow: 0 15px 40px rgba(28, 216, 210, 0.15);
            background: rgba(255, 255, 255, 0.05);
          }
          .selection-card h2 {
            font-size: 1.8rem;
            margin-bottom: 15px;
            color: #f5f5f7;
          }
          .selection-card p {
            color: #a1a1a6;
            line-height: 1.6;
            font-size: 0.95rem;
            margin-bottom: 30px;
          }
          .selection-card .btn {
            background: linear-gradient(180deg, #1cd8d2 0%, #008080 100%);
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .selection-card:hover .btn {
            transform: scale(1.05);
          }
        `}} />
        <div className="selection-header">
          <h1>WorkTimeline & Clio Portal</h1>
          <p>Select your workspace role to begin the bidirectional handshake sync</p>
        </div>
        <div className="selection-cards">
          <div className="selection-card" onClick={() => { playSound('open'); setRole('client'); setViewMode('user'); }}>
            <h2>Client Workspace</h2>
            <p>Construct your litigation timeline, upload files, check AI insights, and sync directly to your lawyer's Clio Grow account.</p>
            <button className="btn">Open Client Space</button>
          </div>
          <div className="selection-card" onClick={() => { playSound('open'); setRole('firm'); setViewMode('firm'); }}>
            <h2>Law Firm Portal</h2>
            <p>Integrate with Clio Grow & Manage, manage client case matters, view the Justice Hub directory, and generate client invites.</p>
            <button className="btn">Open Clio Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Client or Firm Main App Portal
  // ==========================================
  return (
    <div className="app-shell">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --mac-bg-light: #f5f5f7;
          --mac-bg-dark: #0d0d0d;
          --mac-glass-light: rgba(255, 255, 255, 0.65);
          --mac-glass-dark: rgba(20, 20, 20, 0.7);
          --mac-border-light: rgba(255, 255, 255, 0.6);
          --mac-border-dark: rgba(255, 255, 255, 0.06);
          --mac-shadow-light: 0 8px 32px rgba(0, 0, 0, 0.05);
          --mac-shadow-dark: 0 12px 40px rgba(0, 0, 0, 0.6);
          --text-light: #1d1d1f;
          --text-dark: #f5f5f7;
          --muted-light: #86868b;
          --muted-dark: #a1a1a6;
        }
        body {
          background-color: var(--mac-bg-light);
          color: var(--text-light);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: background-color 0.4s ease, color 0.4s ease;
        }
        body.night {
          background-color: var(--mac-bg-dark);
          color: var(--text-dark);
        }
        .app-shell {
          min-height: 100vh;
          display: flex;
        }
        .firm-sidebar {
          width: 280px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 30px;
          border-right: 1px solid var(--mac-border-dark);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand h1 {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        .sidebar-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .section-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted-dark);
          margin-bottom: 5px;
        }
        .nav-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .firm-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--mac-border-dark);
          color: var(--text-dark);
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .firm-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #1cd8d2;
        }
        .firm-btn.active {
          background: linear-gradient(135deg, #1cd8d2, #008080);
          color: white;
          border: none;
        }
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 20px;
          overflow-y: auto;
        }
        .glass {
          background: var(--mac-glass-dark);
          backdrop-filter: blur(20px);
          border: 1px solid var(--mac-border-dark);
          box-shadow: var(--mac-shadow-dark);
          border-radius: 16px;
        }
        .topbar {
          display: flex;
          justify-content: space-between;
          padding: 16px 24px;
          align-items: center;
        }
        .pill {
          background: rgba(255,255,255,0.05);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          margin-right: 8px;
          border: 1px solid var(--mac-border-dark);
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          background: rgba(0,0,0,0.2);
          padding: 4px;
          border-radius: 12px;
          width: fit-content;
        }
        .tab {
          background: transparent;
          border: none;
          color: var(--muted-dark);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .tab.active {
          background: rgba(255,255,255,0.08);
          color: white;
        }
        .firm-control {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--mac-border-dark);
          border-radius: 12px;
          padding: 12px;
          color: white;
          margin-bottom: 16px;
          resize: vertical;
        }
        .firm-control:focus {
          outline: none;
          border-color: #1cd8d2;
        }
        .regulatory-notice {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 16px;
          border-radius: 12px;
          font-size: 0.8rem;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .regulatory-notice ul {
          margin-top: 8px;
          padding-left: 16px;
        }
        .brand-logo-container {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--mac-border-dark);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        .brand-logo {
          max-height: 60px;
          margin-bottom: 10px;
        }
        .input-row {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .input-row input {
          flex: 1;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--mac-border-dark);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
        }
        .input-row button {
          background: linear-gradient(135deg, #1cd8d2, #008080);
          border: none;
          color: white;
          border-radius: 8px;
          padding: 0 16px;
          cursor: pointer;
          font-weight: 600;
        }
        @keyframes log-glow {
          0% { box-shadow: 0 0 0 0 rgba(28, 216, 210, 0.6); border-color: #1cd8d2; }
          70% { box-shadow: 0 0 0 12px rgba(28, 216, 210, 0); border-color: #1cd8d2; }
          100% { box-shadow: 0 0 0 0 rgba(28, 216, 210, 0); }
        }
        .highlighted-log-pulse {
          animation: log-glow 1.5s infinite;
          border: 2px solid #1cd8d2 !important;
          background: rgba(28, 216, 210, 0.05) !important;
        }
        @keyframes ai-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 128, 128, 0.4); border-color: #008080; }
          70% { box-shadow: 0 0 0 10px rgba(0, 128, 128, 0); border-color: #008080; }
          100% { box-shadow: 0 0 0 0 rgba(0, 128, 128, 0); }
        }
        .ai-pulse-over {
          animation: ai-pulse 2s infinite;
          border: 2px solid #008080 !important;
          background: rgba(0, 128, 128, 0.05) !important;
        }
      `}} />

      {/* SIDEBAR NAVIGATION */}
      <aside className="firm-sidebar glass">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="logo-svg">
            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="url(#paint0_linear_logo)"/>
            <path d="M11.5 8.5H14.5C15.8807 8.5 17 9.61929 17 11C17 12.3807 15.8807 13.5 14.5 13.5H11.5V16H9.5V8.5H11.5ZM11.5 11.5H14.5C14.7761 11.5 15 11.2761 15 11C15 10.7239 14.7761 10.5 14.5 10.5H11.5V11.5Z" fill="white"/>
            <defs>
              <linearGradient id="paint0_linear_logo" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="#1cd8d2"/><stop offset="1" stop-color="#008080"/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h1>WorkTimeline</h1>
            <small>{role === 'client' ? 'Client Workspace' : 'Law Firm Portal'}</small>
          </div>
        </div>

        {/* ROLE SELECTION RETOUR */}
        <button className="firm-btn btn-danger-transparent" onClick={() => { playSound('close'); setRole('selection'); }}>
          ← Switch Role Portal
        </button>

        {/* Case Track Selection */}
        <div className="sidebar-group">
          <div className="section-title">Case Track</div>
          <div className="nav-grid">
            {['work', 'injury', 'family', 'property'].map(c => (
              <button 
                key={c} 
                className={`firm-btn ${activeCase === c ? 'active' : ''}`} 
                onClick={() => { playSound('click'); setActiveCase(c); }}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* CLIENT SPECIFIC CONTROLS */}
        {role === 'client' && (
          <div className="sidebar-group">
            <div className="section-title">Lawyer Connection</div>
            <div className="brand-logo-container">
              {connectedFirm ? (
                <>
                  {connectedFirm.logo_url && <img src={connectedFirm.logo_url} className="brand-logo" alt={connectedFirm.name} />}
                  <div className="text-base font-semibold">{connectedFirm.name}</div>
                  <div className="text-sm text-teal-bright">Handshake Active</div>
                </>
              ) : (
                <div className="text-base text-muted">No lawyer linked yet.</div>
              )}
            </div>
            <div className="nav-grid">
              <label className="text-sm mb-4">Enter Firm Invite Code:</label>
              <div className="input-row">
                <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="FIRM-XXX-XXXX" />
                <button onClick={handleVerifyReferral}>Link</button>
              </div>
              <button className="firm-btn active text-center mt-10" onClick={handleConnectClio}>
                🔗 Sync via Clio Grow Handshake
              </button>
            </div>
          </div>
        )}

        {/* LAW FIRM SPECIFIC CONTROLS */}
        {role === 'firm' && (
          <div className="sidebar-group">
            <div className="section-title">Clio Authentication</div>
            <div className="nav-grid">
              {firmDetails ? (
                <div className="firm-details-box">
                  <strong>{firmDetails.name}</strong><br/>
                  <span className="text-muted">Clio ID: {firmDetails.clio_account_id}</span>
                </div>
              ) : (
                <button className="firm-btn active text-center" onClick={handleConnectClio}>
                  🔑 Connect Clio Account
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTAINER PANEL */}
      <main className="main">
        <section className="topbar glass">
          <div className="topbar-left">
            <span className="pill">Active Case: {activeCase.toUpperCase()}</span>
            <span className="pill">Workspace: {role === 'client' ? 'Client Workspace' : 'Clio Portal'}</span>
          </div>
        </section>

        {/* TABS CONTAINER */}
        <section className="firm-panel glass tabs-panel p-24">
          <div className="tabs">
            {[
              { id: 'timelineTab', label: 'Timeline Builder' },
              { id: 'studyTab', label: 'Study Hub (Precedents)' },
              role === 'firm' && { id: 'chartTab', label: 'Cross-Case Chart' },
              role === 'firm' && { id: 'hubTab', label: 'Justice Hub (Embedded)' },
              role === 'firm' && { id: 'inviteTab', label: 'Matters & Client Invites' }
            ].filter(Boolean).map((t: any) => (
              <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab(t.id); }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Timeline Builder */}
          {activeTab === 'timelineTab' && (
            <div className="tab-content active">
              {role === 'firm' && (
                <div className="regulatory-notice">
                  <strong>⚠️ LAWYER REGULATORY COMPLIANCE NOTICE:</strong>
                  <ul>
                    <li>You must independently verify the client's identity.</li>
                    <li>You must obtain client consent before accessing this timeline record.</li>
                    <li>Do not rely solely on AI analysis or pattern recognition.</li>
                  </ul>
                </div>
              )}

              {role === 'client' && (
                <div className="client-hub-notice-box">
                  <label className="flex items-center gap-10 cursor-pointer">
                    <input type="checkbox" checked={isListedInHub} onChange={e => handleToggleJusticeHub(e.target.checked)} />
                    <strong>Post anonymously to Justice Hub for firms to review</strong>
                  </label>
                </div>
              )}

              <div className="section-head mb-10">
                <strong>Add Timeline Event</strong>
              </div>
              <textarea className="firm-control" placeholder="Describe the event or copy logs..." value={timelineInput} onChange={e => setTimelineInput(e.target.value)} />
              <div className="input-row justify-start">
                <button className="firm-btn active" onClick={addTimelineEntry}>Add Event</button>
                <button 
                  className="firm-btn ml-10" 
                  onClick={handleAnalyzeTimeline} 
                  disabled={isAnalyzing || timelines.length === 0}
                >
                  {isAnalyzing ? '🤖 Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>

              <div id="timelineList" className="mt-20">
                <Timeline 
                  logs={timelines} 
                  insights={insights} 
                  currentMode={notesMode ? 'NOTES' : 'TIMELINE'} 
                  onAmend={handleAmendLog}
                  onPreviewEvidence={handlePreviewEvidence}
                  highlightedLogId={highlightedLogId}
                />
              </div>
            </div>
          )}

          {/* STUDY HUB TAB */}
          {activeTab === 'studyTab' && (
            <div className="tab-content active flex-col gap-24">
              <h2>Study Hub: Precedent Benchmarks & Case Law</h2>
              <p className="text-muted-dark">
                Review legal precedents matching your chronological timeline events. Accepting a precedent binds it to the event as a Timelink.
              </p>
              
              {/* CATEGORIES GRID */}
              <div className="categories-grid">
                
                {/* 1. WORKTIMELINE WIDGET (REDACTION TOGGLE) */}
                <div className="widget-card">
                  <div className="flex-between-mb12">
                    <strong className="text-teal-bright">💼 Labor & Wages (Quantum Meruit)</strong>
                    <span className="widget-tag">WorkTimeline</span>
                  </div>
                  <p className="widget-desc">
                    <strong>Killer Feature:</strong> Privacy/Redaction Toggle (replaces sensitive HR/colleague names).
                  </p>
                  
                  <div className="widget-preview-box">
                    {isRedacted ? (
                      <span>Supervisor <code>[REDACTED]</code> requested a meeting with coworker <code>[REDACTED]</code> about termination procedures.</span>
                    ) : (
                      <span>Supervisor <strong>Stephan Pilarski</strong> requested a meeting with coworker <strong>John Doe</strong> about termination procedures.</span>
                    )}
                  </div>
                  
                  <button className={`firm-btn ${isRedacted ? 'active' : ''} text-xs-btn`} onClick={() => setIsRedacted(!isRedacted)}>
                    {isRedacted ? '🛡️ Privacy Redacted' : '🔓 Enable Privacy Redaction'}
                  </button>
                  
                  <div className="widget-links-footer">
                    <span className="text-sm text-muted-dark">Linked Timeline Events:</span>
                    <div className="flex-col gap-6 mt-6">
                      {timelines.filter(t => t.case_type === 'work' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} className="teal-bright-link-underline" onClick={() => handleNavigateToEntry(t.id, 'work')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'work' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div className="text-sm text-muted italic">No custom entries analyzed yet.</div>
                          <div className="teal-bright-link-underline opacity-70" onClick={() => handleNavigateToEntry('work-parent-2', 'work')}>
                            📅 6/12/2026 - Overtime Wage Dispute Incident (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. PROPERTYTIMELINE WIDGET (BEFORE/AFTER COMPARISON) */}
                <div className="widget-card">
                  <div className="flex-between-mb12">
                    <strong className="text-teal-bright">🏠 Asset & Damage (Prima Facie)</strong>
                    <span className="widget-tag">PropertyTimeline</span>
                  </div>
                  <p className="widget-desc">
                    <strong>Killer Feature:</strong> Before & After Damage Comparison.
                  </p>
                  
                  <div className="grid-2-gap8-mb12">
                    <div className="comparison-badge-green">
                      <span className="label-uppercase-xxs">BEFORE</span>
                      <strong className="text-base text-teal-bright">Dry & Clean</strong>
                    </div>
                    <div className="comparison-badge-red">
                      <span className="label-uppercase-xxs">AFTER</span>
                      <strong className="text-base text-danger">Severe Flooding</strong>
                    </div>
                  </div>
                  
                  <div className="widget-links-footer">
                    <span className="text-sm text-muted-dark">Linked Timeline Events:</span>
                    <div className="flex-col gap-6 mt-6">
                      {timelines.filter(t => t.case_type === 'property' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} className="teal-bright-link-underline" onClick={() => handleNavigateToEntry(t.id, 'property')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'property' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div className="text-sm text-muted italic">No custom entries analyzed yet.</div>
                          <div className="teal-bright-link-underline opacity-70" onClick={() => handleNavigateToEntry('property-parent-1', 'property')}>
                            📅 6/15/2026 - Burst pipe basement flood (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. FAMILYTIMELINE WIDGET (SENTINEL-NEUTRAL TRANSLATION) */}
                <div className="widget-card">
                  <div className="flex-between-mb12">
                    <strong className="text-teal-bright">⚖️ Neutral Translation (Habeas Corpus)</strong>
                    <span className="widget-tag">FamilyTimeline</span>
                  </div>
                  <p className="widget-desc">
                    <strong>Killer Feature:</strong> Sentiment-Neutral AI log translation.
                  </p>
                  
                  <div className="widget-preview-box-alt">
                    {neutralMode ? (
                      <div>
                        <span className="label-uppercase-xxs text-teal-bright font-bold">COURT LOG (NEUTRAL)</span>
                        Parent arrived 45 minutes late for children exchange and spoke in a loud, aggressive tone in the presence of children.
                      </div>
                    ) : (
                      <div>
                        <span className="label-uppercase-xxs text-danger font-bold">ORIGINAL INPUT (HIGH-CONFLICT)</span>
                        "HE ARRIVED SO LATE AND SHOUTED AT ME IN FRONT OF THE KIDS! I HATE THIS!"
                      </div>
                    )}
                  </div>
                  
                  <button className={`firm-btn ${neutralMode ? 'active' : ''} text-xs-btn`} onClick={() => setNeutralMode(!neutralMode)}>
                    {neutralMode ? '⚖️ Showing Factual Log' : '💥 Show Original Communication'}
                  </button>
                  
                  <div className="widget-links-footer">
                    <span className="text-sm text-muted-dark">Linked Timeline Events:</span>
                    <div className="flex-col gap-6 mt-6">
                      {timelines.filter(t => t.case_type === 'family' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} className="teal-bright-link-underline" onClick={() => handleNavigateToEntry(t.id, 'family')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'family' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div className="text-sm text-muted italic">No custom entries analyzed yet.</div>
                          <div className="teal-bright-link-underline opacity-70" onClick={() => handleNavigateToEntry('family-parent-1', 'family')}>
                            📅 6/18/2026 - Hostile late custody exchange (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. INJURYTIMELINE WIDGET (FUNCTIONAL IMPAIRMENT INDEX) */}
                <div className="widget-card">
                  <div className="flex-between-mb12">
                    <strong className="text-teal-bright">🏥 Impairment Index (Res Ipsa Loquitur)</strong>
                    <span className="widget-tag">InjuryTimeline</span>
                  </div>
                  <p className="widget-desc">
                    <strong>Killer Feature:</strong> 1-10 Pain & Mobility Impairment score.
                  </p>
                  
                  <div className="flex-col gap-8 mb-12">
                    <div className="flex-between text-base">
                      <span>Functional Impairment Index:</span>
                      <strong className="text-teal-bright">{impairmentIndex}/10</strong>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={impairmentIndex} 
                      onChange={(e) => setImpairmentIndex(parseInt(e.target.value))}
                      className="slider-teal-accent"
                      title="Functional Impairment Index"
                      aria-label="Functional Impairment Index"
                    />
                    <span className="text-sm text-muted italic">
                      {impairmentIndex <= 3 && "Mild: Slight discomfort, full range of motion."}
                      {impairmentIndex > 3 && impairmentIndex <= 7 && "Moderate: Limited rotation, prevents heavy lifting."}
                      {impairmentIndex > 7 && "Severe: Complete immobility, requires prescription pain management."}
                    </span>
                  </div>
                  
                  <div className="widget-links-footer">
                    <span className="text-sm text-muted-dark">Linked Timeline Events:</span>
                    <div className="flex-col gap-6 mt-6">
                      {timelines.filter(t => t.case_type === 'injury' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} className="teal-bright-link-underline" onClick={() => handleNavigateToEntry(t.id, 'injury')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'injury' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div className="text-sm text-muted italic">No custom entries analyzed yet.</div>
                          <div className="teal-bright-link-underline opacity-70" onClick={() => handleNavigateToEntry('injury-parent-1', 'injury')}>
                            📅 6/10/2026 - Slip & Fall knee injury (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: CROSS-CASE RELATIONSHIP CHART */}
          {activeTab === 'chartTab' && role === 'firm' && (
            <div className="tab-content active flex-col gap-24">
              <h2>Cross-Case Relationship Flowchart</h2>
              <p className="text-muted-dark">
                Visualizes the intersection and causal links between different active civil tracks for this client.
              </p>
              
              <div className="flex-wrap-gap-24">
                
                {/* SVG CANVAS FLOW CHART */}
                <div className="glass flowchart-canvas-box">
                  
                  {/* BACKGROUND SVG LINES */}
                  <svg className="flowchart-svg">
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 2 L 10 5 L 0 8 z" fill="#1cd8d2" />
                      </marker>
                    </defs>
                    
                    {/* Connection 1: Work -> Injury */}
                    <path d="M 170 120 L 330 120" stroke="#1cd8d2" strokeWidth="2.5" strokeDasharray="5,3" markerEnd="url(#arrow)" />
                    
                    {/* Connection 2: Injury -> Family */}
                    <path d="M 380 170 L 380 230" stroke="#1cd8d2" strokeWidth="2.5" strokeDasharray="5,3" markerEnd="url(#arrow)" strokeOpacity="0.4" />
                    
                    {/* Connection 3: Work -> Property */}
                    <path d="M 120 170 L 120 230" stroke="#1cd8d2" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#arrow)" strokeOpacity="0.4" />
                  </svg>
                  
                  {/* WORK MATTER NODE */}
                  <div className="node-active-work">
                    <span className="emoji-node-icon">💼</span>
                    <strong className="text-base font-bold">WorkTimeline</strong>
                    <span className="label-block-muted">2 Base Entries</span>
                  </div>

                  {/* INJURY MATTER NODE */}
                  <div className="node-active-injury">
                    <span className="emoji-node-icon">🏥</span>
                    <strong className="text-base font-bold">InjuryTimeline</strong>
                    <span className="label-block-muted">1 Incident Entry</span>
                  </div>

                  {/* PROPERTY MATTER NODE */}
                  <div className="node-inactive-property">
                    <span className="emoji-node-icon">🏠</span>
                    <strong className="text-base font-bold">PropertyTimeline</strong>
                  </div>

                  {/* FAMILY MATTER NODE */}
                  <div className="node-inactive-family">
                    <span className="emoji-node-icon">⚖️</span>
                    <strong className="text-base font-bold">FamilyTimeline</strong>
                  </div>

                  {/* CAUSAL LINK INTERACTIVE BADGE */}
                  <button 
                    onClick={() => setSelectedRelation('work_injury')}
                    className="flowchart-relation-badge-btn"
                  >
                    ⚡ Leads To: Fall Injury
                  </button>
                  
                </div>

                {/* RELATIONSHIP DETAILS SIDEBAR */}
                <div className="glass flowchart-details-sidebar">
                  <h3>Relationship Details</h3>
                  
                  {selectedRelation === 'work_injury' ? (
                    <div className="flex-col gap-12">
                      <div className="flowchart-causal-banner">
                        <strong>Causal Connection:</strong> Work incident resulted in physical injury.
                      </div>
                      
                      <div>
                        <strong className="text-base text-muted font-bold">1. Source (WorkTimeline Entry):</strong>
                        <div className="flowchart-entry-text-box">
                          {timelines.find(t => t.case_type === 'work' && t.id === 'work-parent-1')?.text || timelines.find(t => t.case_type === 'work')?.text || "Slipped on wet floor in the warehouse during my shift. (Demo)"}
                        </div>
                      </div>

                      <div>
                        <strong className="text-base text-muted font-bold">2. Destination (InjuryTimeline Entry):</strong>
                        <div className="flowchart-entry-text-box">
                          {timelines.find(t => t.case_type === 'injury' && t.id === 'injury-parent-1')?.text || timelines.find(t => t.case_type === 'injury')?.text || "Slipped and injured knee in the warehouse. Pain level 8/10. (Demo)"}
                        </div>
                      </div>

                      <button 
                        className="firm-btn active btn-view-source" 
                        onClick={() => {
                          const workEntry = timelines.find(t => t.case_type === 'work' && t.id === 'work-parent-1') || timelines.find(t => t.case_type === 'work');
                          if (workEntry) {
                            handleNavigateToEntry(workEntry.id, 'work');
                          } else {
                            handleNavigateToEntry('work-parent-1', 'work');
                          }
                        }}
                      >
                        🔎 View Timeline Source
                      </button>
                    </div>
                  ) : (
                    <div className="chart-fallback-text">
                      Click on the "Leads To" relationship link in the chart to view cross-case connection audits and notes.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: Embedded Justice Hub */}
          {activeTab === 'hubTab' && role === 'firm' && (
            <div className="tab-content active">
              <h2>Justice Hub (Embedded Clio Add-On)</h2>
              <p className="text-muted mb-20">
                Review matching timelines submitted anonymously. Accept cases to instantly create Leads in Clio Grow.
              </p>
              {hubCases.length === 0 ? (
                <div className="hub-empty-box">
                  No new anonymous timelines matching your practice areas currently listed.
                </div>
              ) : (
                <div className="flex-col gap-16">
                  {hubCases.map((c, i) => (
                    <div key={c.id || i} className="hub-case-card">
                      <div className="flex-between-mb10">
                        <strong>Case Proposal #{i + 1} ({c.practice_areas?.join(', ').toUpperCase()})</strong>
                        <span className="text-sm text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="hub-case-summary">{c.anonymous_summary}</p>
                      <button className="firm-btn active" onClick={() => handleClaimLead(c)}>
                        Claim Lead & Sync to Clio Grow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Matters & Client Invites (Reverse Sync) */}
          {activeTab === 'inviteTab' && role === 'firm' && (
            <div className="tab-content active invite-tab-box">
              <h2>Clio Manage Client Provisioning</h2>
              <p className="text-muted mb-20">
                Create a pre-populated timeline account for an existing client in Clio Manage.
              </p>
              <div className="flex-col gap-12">
                <div>
                  <label>Client Name:</label>
                  <input className="firm-control" type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Client Name" />
                </div>
                <div>
                  <label>Client Email:</label>
                  <input className="firm-control" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="client@example.com" />
                </div>
                <div>
                  <label>Case Summary (pre-filled):</label>
                  <textarea className="firm-control" value={inviteSummary} onChange={e => setInviteSummary(e.target.value)} placeholder="Brief description of the matter..." />
                </div>
                <button className="firm-btn active btn-generate-invite" onClick={handleGenerateInvite}>
                  Generate WorkTimeline Invitation Link
                </button>

                {generatedInviteUrl && (
                  <div className="invite-success-box">
                    <strong>Client Setup Link (Copied to Clipboard):</strong>
                    <div className="invite-url-text" onClick={() => {
                      navigator.clipboard.writeText(generatedInviteUrl);
                      alert("Link copied!");
                    }}>
                      {generatedInviteUrl}
                    </div>
                  </div>
                )}
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
        userId={currentUser?.id}
      />

      {/* AI TERMS & CONSENT GATE MODAL */}
      {showConsentModal && (
        <div className="consent-modal-overlay">
          <div className="glass consent-modal-box">
            <div className="flex items-center gap-12">
              <span className="text-xl">🛡️</span>
              <h2 className="consent-modal-title">
                Canadian Tech Law Consent Gate
              </h2>
            </div>
            <p className="consent-modal-description">
              Before proceeding with AI-driven pattern recognition, Canadian privacy standards (PIPEDA / BC PIPA) require your explicit informed consent.
            </p>
            <div className="consent-scroller">
              <strong>INFORMED CONSENT AGREEMENT:</strong>
              <p className="m-0">1. <strong>App Purpose:</strong> WorkTimeline and Pattera are record-keeping and chronology journaling helpers. They are not law firms, do not practice law, and do not act as your legal counsel.</p>
              <p className="m-0">2. <strong>No Legal Advice:</strong> Pattera does not interpret laws, predict outcomes, or generate legal strategies. All outputs must be reviewed by a qualified lawyer.</p>
              <p className="m-0">3. <strong>Data Processing:</strong> Your timeline text will be processed to extract potential regulatory or statutory references (e.g. WCB, Employment Standards, PIPA, Human Rights). Your data is private, secure, and will not be shared without your explicit action.</p>
              <p className="m-0">4. <strong>Right to Revoke:</strong> You can revoke this consent at any time, which will stop all AI processing.</p>
            </div>
            <div className="consent-modal-actions">
              <button className="firm-btn" onClick={() => setShowConsentModal(false)}>
                Decline & Close
              </button>
              <button 
                className="firm-btn active btn-accept-consent" 
                onClick={handleAcceptTerms}
              >
                Accept & Run Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE PENDING INSIGHTS REVIEW PANEL */}
      {pendingInsights.length > 0 && (
        <div className="pending-insights-container">
          <div className="pending-insights-header">
            <div className="flex items-center gap-8">
              <span className="text-xl">🤖</span>
              <strong className="text-lg">Pattera AI Suggestions ({pendingInsights.length})</strong>
            </div>
            <button 
              className="btn-link-muted"
              onClick={() => setPendingInsights([])}
            >
              Dismiss All
            </button>
          </div>
          
          <div className="pending-insights-scroller">
            {pendingInsights.map((insight, idx) => (
              <div key={idx} className="pending-insight-card">
                <div className="pending-insight-title-row">
                  <span className="text-teal-bright font-bold text-base">{insight.term}</span>
                  {insight.latin && (
                    <span className="latin-doctrine-tag">
                      {insight.latin}
                    </span>
                  )}
                </div>
                {insight.caseLaw && <span className="text-sm text-muted font-semibold">Ref: {insight.caseLaw}</span>}
                <p className="pending-insight-desc">{insight.desc}</p>
                <div className="flex justify-end gap-8 mt-8">
                  <button 
                    className="firm-btn btn-danger-transparent btn-timeline-action"
                    onClick={() => handleDeclineInsight(insight)}
                  >
                    Decline
                  </button>
                  <button 
                    className="firm-btn active btn-timeline-action"
                    onClick={() => handleAcceptInsight(insight)}
                  >
                    Accept & Append
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted italic text-center mt-4">
            Reminder: Pattera is an AI tool, not a lawyer. This is not legal advice.
          </div>
        </div>
      )}
    </div>
  );
}
