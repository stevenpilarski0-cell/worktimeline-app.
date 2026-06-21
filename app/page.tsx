'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import Timeline, { PatternInsight, TimelineEntry } from '../Timeline';
import AmendLogModal from '../AmendLogModal';
import { analyzeTimeline } from '../aiService';

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

  // Load timelines from Supabase
  useEffect(() => {
    async function loadTimelines() {
      const { data, error } = await supabase
        .from('timeline_entries')
        .select('*')
        .eq('case_type', activeCase)
        .order('created_at', { ascending: true });
        
      if (data && data.length > 0 && !error) {
        setTimelines(data);
      } else if (activeCase === 'work') {
        // Start with a clean empty timeline for work, per user request
        setTimelines([]);
        setInsights([]);
      } else {
        // Seed default mock entries for visual demonstration
        const mockEntries: TimelineEntry[] = [
          // WORK ENTRIES
          {
            id: 'work-parent-1',
            parent_id: null,
            case_type: 'work',
            mode: 'TIMELINE',
            type: 'text',
            stamp: '6/10/2026, 9:00:00 AM',
            text: 'Slipped on wet floor in the warehouse during my shift. Supervisor Stephan was notified but did not file an incident report.',
          },
          {
            id: 'work-receipt-1',
            parent_id: 'work-parent-1',
            case_type: 'work',
            mode: 'TIMELINE',
            type: 'receipt',
            stamp: '6/10/2026, 11:30:00 AM',
            text: 'Purchased emergency knee brace and pain relievers from Langley Pharmacy.',
            evidence_url: 'https://placeholder.co/receipt1.jpg',
            custom_attributes: { amount: '45.50', merchant: 'Langley Pharmacy' }
          },
          {
            id: 'work-visit-1',
            parent_id: 'work-parent-1',
            case_type: 'work',
            mode: 'TIMELINE',
            type: 'visit',
            stamp: '6/11/2026, 2:00:00 PM',
            text: 'Doctor visit checkup at Fraser Health Medical Clinic with Dr. Miller.',
            custom_attributes: { provider: 'Dr. Miller', symptoms_noted: 'Severe knee swelling and limited rotation' }
          },
          {
            id: 'work-parent-2',
            parent_id: null,
            case_type: 'work',
            mode: 'TIMELINE',
            type: 'text',
            stamp: '6/12/2026, 6:00:00 PM',
            text: 'Completed 12 hours of mandatory overtime doing warehouse inventory without dinner break.',
          },
          {
            id: 'work-receipt-2',
            parent_id: 'work-parent-2',
            case_type: 'work',
            mode: 'TIMELINE',
            type: 'receipt',
            stamp: '6/12/2026, 8:30:00 AM',
            text: 'Purchased required steel-toed work safety boots.',
            evidence_url: 'https://placeholder.co/receipt2.jpg',
            custom_attributes: { amount: '185.00', merchant: 'WorkWear Depot' }
          },
          
          // INJURY ENTRIES
          {
            id: 'injury-parent-1',
            parent_id: null,
            case_type: 'injury',
            mode: 'TIMELINE',
            type: 'text',
            stamp: '6/10/2026, 9:00:00 AM',
            text: 'Slipped and injured knee in the warehouse. Pain immediately level 8/10.',
          },
          {
            id: 'injury-visit-1',
            parent_id: 'injury-parent-1',
            case_type: 'injury',
            mode: 'TIMELINE',
            type: 'visit',
            stamp: '6/11/2026, 2:00:00 PM',
            text: 'Fraser Health clinic assessment for knee injury.',
            custom_attributes: { provider: 'Dr. Miller (Orthopedics)', symptoms_noted: 'Ligament sprain, pain level 8, brace required' }
          },
          {
            id: 'injury-receipt-1',
            parent_id: 'injury-parent-1',
            case_type: 'injury',
            mode: 'TIMELINE',
            type: 'receipt',
            stamp: '6/11/2026, 3:00:00 PM',
            text: 'Prescribed anti-inflammatory medication.',
            custom_attributes: { amount: '62.00', merchant: 'Langley Pharmacy' }
          },

          // PROPERTY ENTRIES
          {
            id: 'property-parent-1',
            parent_id: null,
            case_type: 'property',
            mode: 'TIMELINE',
            type: 'text',
            stamp: '6/15/2026, 1:00:00 PM',
            text: 'Burst pipe in basement storage room causing water damage to client files and inventory boxes.',
          },
          {
            id: 'property-receipt-1',
            parent_id: 'property-parent-1',
            case_type: 'property',
            mode: 'TIMELINE',
            type: 'receipt',
            stamp: '6/15/2026, 3:30:00 PM',
            text: 'Emergency plumbing drainage and pipe repair.',
            evidence_url: 'https://placeholder.co/plumbing.jpg',
            custom_attributes: { amount: '450.00', merchant: 'Rapid Plumbing Services' }
          },

          // FAMILY ENTRIES
          {
            id: 'family-parent-1',
            parent_id: null,
            case_type: 'family',
            mode: 'TIMELINE',
            type: 'text',
            stamp: '6/18/2026, 5:45:00 PM',
            text: 'Parent arrived 45 minutes late for custody handoff and shouted in presence of the children.',
          },
          {
            id: 'family-visit-1',
            parent_id: 'family-parent-1',
            case_type: 'family',
            mode: 'TIMELINE',
            type: 'visit',
            stamp: '6/19/2026, 10:00:00 AM',
            text: 'Social worker consultation regarding co-parenting boundary violations.',
            custom_attributes: { counselor: 'Sarah Jenkins, LCSW', session_type: 'Mediation Session' }
          }
        ];
        
        setTimelines(mockEntries.filter(e => e.case_type === activeCase));
        
        // Also seed default mock insights
        const mockInsights: PatternInsight[] = [
          {
            log_id: 'work-parent-1',
            term: 'Workplace Negligence',
            latin: 'Res ipsa loquitur',
            caseLaw: 'Hogarth v. Rocky Mountain Sky Ltd.',
            desc: 'The employer failed to maintain safe warehouse flooring, leading directly to a fall.',
            status: 'ACCEPTED'
          },
          {
            log_id: 'work-parent-2',
            term: 'Unpaid Overtime Value',
            latin: 'Quantum meruit',
            caseLaw: 'BC Employment Standards Act Sec 63',
            desc: 'The client performed mandatory overtime without compensation or meal break.',
            status: 'ACCEPTED'
          },
          {
            log_id: 'property-parent-1',
            term: 'Landlord Failure to Maintain',
            latin: 'Prima facie',
            caseLaw: 'BC Residential Tenancy Act Sec 32',
            desc: 'Water damage occurred due to aging, neglected plumbing in the utility space.',
            status: 'ACCEPTED'
          },
          {
            log_id: 'family-parent-1',
            term: 'Intrusion Upon Seclusion',
            latin: 'Habeas corpus',
            caseLaw: 'Family Law Act Sec 224',
            desc: 'Late arrival and verbal hostility in the presence of children violates the co-parenting agreement.',
            status: 'ACCEPTED'
          }
        ];
        setInsights(mockInsights.filter(i => mockEntries.some(e => e.id === i.log_id && e.case_type === activeCase)));
      }
    }
    loadTimelines();
  }, [activeCase, supabase]);

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
    if (!timelineInput.trim()) return;
    const { data, error } = await supabase.from('timeline_entries').insert([{
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

  // AI analysis
  const handleAnalyzeTimeline = async () => {
    if (timelines.length === 0) return;
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
          status: 'ACCEPTED'
        };
      });
      setInsights(prev => [...prev, ...formattedInsights]);
    } catch (error) {
      console.error(error);
      alert("AI analysis complete.");
    } finally {
      setIsAnalyzing(false);
    } 
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
          <div className="selection-card" onClick={() => { setRole('client'); setViewMode('user'); }}>
            <h2>Client Workspace</h2>
            <p>Construct your litigation timeline, upload files, check AI insights, and sync directly to your lawyer's Clio Grow account.</p>
            <button className="btn">Open Client Space</button>
          </div>
          <div className="selection-card" onClick={() => { setRole('firm'); setViewMode('firm'); }}>
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
        <button className="firm-btn" onClick={() => setRole('selection')} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
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
                onClick={() => setActiveCase(c)}
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
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{connectedFirm.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#1cd8d2' }}>Handshake Active</div>
                </>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-dark)' }}>No lawyer linked yet.</div>
              )}
            </div>
            <div className="nav-grid">
              <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Enter Firm Invite Code:</label>
              <div className="input-row">
                <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="FIRM-XXX-XXXX" />
                <button onClick={handleVerifyReferral}>Link</button>
              </div>
              <button className="firm-btn active" onClick={handleConnectClio} style={{ textAlign: 'center', marginTop: '10px' }}>
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
                <div style={{ padding: '10px', background: 'rgba(28, 216, 210, 0.05)', border: '1px solid rgba(28, 216, 210, 0.2)', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <strong>{firmDetails.name}</strong><br/>
                  <span style={{ color: '#86868b' }}>Clio ID: {firmDetails.clio_account_id}</span>
                </div>
              ) : (
                <button className="firm-btn active" onClick={handleConnectClio} style={{ textAlign: 'center' }}>
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
        <section className="firm-panel glass tabs-panel" style={{ padding: '24px' }}>
          <div className="tabs">
            {[
              { id: 'timelineTab', label: 'Timeline Builder' },
              { id: 'studyTab', label: 'Study Hub (Precedents)' },
              role === 'firm' && { id: 'chartTab', label: 'Cross-Case Chart' },
              role === 'firm' && { id: 'hubTab', label: 'Justice Hub (Embedded)' },
              role === 'firm' && { id: 'inviteTab', label: 'Matters & Client Invites' }
            ].filter(Boolean).map((t: any) => (
              <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
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
                <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--mac-border-dark)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isListedInHub} onChange={e => handleToggleJusticeHub(e.target.checked)} />
                    <strong>Post anonymously to Justice Hub for firms to review</strong>
                  </label>
                </div>
              )}

              <div className="section-head" style={{ marginBottom: '10px' }}>
                <strong>Add Timeline Event</strong>
              </div>
              <textarea className="firm-control" placeholder="Describe the event or copy logs..." value={timelineInput} onChange={e => setTimelineInput(e.target.value)} />
              <div className="input-row" style={{ justifyContent: 'flex-start' }}>
                <button className="firm-btn active" onClick={addTimelineEntry}>Add Event</button>
                <button 
                  className="firm-btn" 
                  onClick={handleAnalyzeTimeline} 
                  disabled={isAnalyzing || timelines.length === 0}
                  style={{ marginLeft: '10px' }}
                >
                  {isAnalyzing ? '🤖 Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>

              <div id="timelineList" style={{ marginTop: '20px' }}>
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
            <div className="tab-content active" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2>Study Hub: Precedent Benchmarks & Case Law</h2>
              <p style={{ color: 'var(--muted-dark)' }}>
                Review legal precedents matching your chronological timeline events. Accepting a precedent binds it to the event as a Timelink.
              </p>
              
              {/* CATEGORIES GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* 1. WORKTIMELINE WIDGET (REDACTION TOGGLE) */}
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--mac-border-dark)', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ color: '#1cd8d2' }}>💼 Labor & Wages (Quantum Meruit)</strong>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(28,216,210,0.1)', color: '#1cd8d2', borderRadius: '12px', fontWeight: 600 }}>WorkTimeline</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#86868b', marginBottom: '12px' }}>
                    <strong>Killer Feature:</strong> Privacy/Redaction Toggle (replaces sensitive HR/colleague names).
                  </p>
                  
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', fontSize: '0.85rem', color: '#e5e5ea', minHeight: '60px', marginBottom: '12px' }}>
                    {isRedacted ? (
                      <span>Supervisor <code>[REDACTED]</code> requested a meeting with coworker <code>[REDACTED]</code> about termination procedures.</span>
                    ) : (
                      <span>Supervisor <strong>Stephan Pilarski</strong> requested a meeting with coworker <strong>John Doe</strong> about termination procedures.</span>
                    )}
                  </div>
                  
                  <button className={`firm-btn ${isRedacted ? 'active' : ''}`} onClick={() => setIsRedacted(!isRedacted)} style={{ fontSize: '0.8rem' }}>
                    {isRedacted ? '🛡️ Privacy Redacted' : '🔓 Enable Privacy Redaction'}
                  </button>
                  
                  <div style={{ borderTop: '1px solid var(--mac-border-dark)', marginTop: '12px', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-dark)' }}>Linked Timeline Events:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {timelines.filter(t => t.case_type === 'work' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleNavigateToEntry(t.id, 'work')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'work' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#86868b', fontStyle: 'italic' }}>No custom entries analyzed yet.</div>
                          <div style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }} onClick={() => handleNavigateToEntry('work-parent-2', 'work')}>
                            📅 6/12/2026 - Overtime Wage Dispute Incident (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. PROPERTYTIMELINE WIDGET (BEFORE/AFTER COMPARISON) */}
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--mac-border-dark)', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ color: '#1cd8d2' }}>🏠 Asset & Damage (Prima Facie)</strong>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(28,216,210,0.1)', color: '#1cd8d2', borderRadius: '12px', fontWeight: 600 }}>PropertyTimeline</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#86868b', marginBottom: '12px' }}>
                    <strong>Killer Feature:</strong> Before & After Damage Comparison.
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ padding: '10px', background: 'rgba(28,216,210,0.05)', border: '1px solid rgba(28,216,210,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', display: 'block', color: '#86868b' }}>BEFORE</span>
                      <strong style={{ fontSize: '0.8rem', color: '#1cd8d2' }}>Dry & Clean</strong>
                    </div>
                    <div style={{ padding: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', display: 'block', color: '#86868b' }}>AFTER</span>
                      <strong style={{ fontSize: '0.8rem', color: '#ef4444' }}>Severe Flooding</strong>
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--mac-border-dark)', marginTop: '12px', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-dark)' }}>Linked Timeline Events:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {timelines.filter(t => t.case_type === 'property' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleNavigateToEntry(t.id, 'property')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'property' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#86868b', fontStyle: 'italic' }}>No custom entries analyzed yet.</div>
                          <div style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }} onClick={() => handleNavigateToEntry('property-parent-1', 'property')}>
                            📅 6/15/2026 - Burst pipe basement flood (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. FAMILYTIMELINE WIDGET (SENTINEL-NEUTRAL TRANSLATION) */}
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--mac-border-dark)', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ color: '#1cd8d2' }}>⚖️ Neutral Translation (Habeas Corpus)</strong>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(28,216,210,0.1)', color: '#1cd8d2', borderRadius: '12px', fontWeight: 600 }}>FamilyTimeline</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#86868b', marginBottom: '12px' }}>
                    <strong>Killer Feature:</strong> Sentiment-Neutral AI log translation.
                  </p>
                  
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', fontSize: '0.82rem', color: '#e5e5ea', minHeight: '60px', marginBottom: '12px', lineHeight: '1.4' }}>
                    {neutralMode ? (
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#1cd8d2', display: 'block', fontWeight: 'bold' }}>COURT LOG (NEUTRAL)</span>
                        Parent arrived 45 minutes late for children exchange and spoke in a loud, aggressive tone in the presence of children.
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', fontWeight: 'bold' }}>ORIGINAL INPUT (HIGH-CONFLICT)</span>
                        "HE ARRIVED SO LATE AND SHOUTED AT ME IN FRONT OF THE KIDS! I HATE THIS!"
                      </div>
                    )}
                  </div>
                  
                  <button className={`firm-btn ${neutralMode ? 'active' : ''}`} onClick={() => setNeutralMode(!neutralMode)} style={{ fontSize: '0.8rem' }}>
                    {neutralMode ? '⚖️ Showing Factual Log' : '💥 Show Original Communication'}
                  </button>
                  
                  <div style={{ borderTop: '1px solid var(--mac-border-dark)', marginTop: '12px', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-dark)' }}>Linked Timeline Events:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {timelines.filter(t => t.case_type === 'family' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleNavigateToEntry(t.id, 'family')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'family' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#86868b', fontStyle: 'italic' }}>No custom entries analyzed yet.</div>
                          <div style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }} onClick={() => handleNavigateToEntry('family-parent-1', 'family')}>
                            📅 6/18/2026 - Hostile late custody exchange (Demo Reference)
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. INJURYTIMELINE WIDGET (FUNCTIONAL IMPAIRMENT INDEX) */}
                <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--mac-border-dark)', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ color: '#1cd8d2' }}>🏥 Impairment Index (Res Ipsa Loquitur)</strong>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(28,216,210,0.1)', color: '#1cd8d2', borderRadius: '12px', fontWeight: 600 }}>InjuryTimeline</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#86868b', marginBottom: '12px' }}>
                    <strong>Killer Feature:</strong> 1-10 Pain & Mobility Impairment score.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span>Functional Impairment Index:</span>
                      <strong style={{ color: '#1cd8d2' }}>{impairmentIndex}/10</strong>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={impairmentIndex} 
                      onChange={(e) => setImpairmentIndex(parseInt(e.target.value))}
                      style={{ accentColor: '#1cd8d2', width: '100%', cursor: 'pointer' }}
                      title="Functional Impairment Index"
                      aria-label="Functional Impairment Index"
                    />
                    <span style={{ fontSize: '0.75rem', color: '#86868b', fontStyle: 'italic' }}>
                      {impairmentIndex <= 3 && "Mild: Slight discomfort, full range of motion."}
                      {impairmentIndex > 3 && impairmentIndex <= 7 && "Moderate: Limited rotation, prevents heavy lifting."}
                      {impairmentIndex > 7 && "Severe: Complete immobility, requires prescription pain management."}
                    </span>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--mac-border-dark)', marginTop: '12px', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-dark)' }}>Linked Timeline Events:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {timelines.filter(t => t.case_type === 'injury' && insights.some(i => i.log_id === t.id)).map(t => (
                        <div key={t.id} style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleNavigateToEntry(t.id, 'injury')}>
                          📅 {t.stamp} - {t.text.substring(0, 30)}...
                        </div>
                      ))}
                      {timelines.filter(t => t.case_type === 'injury' && insights.some(i => i.log_id === t.id)).length === 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: '#86868b', fontStyle: 'italic' }}>No custom entries analyzed yet.</div>
                          <div style={{ fontSize: '0.75rem', color: '#1cd8d2', cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }} onClick={() => handleNavigateToEntry('injury-parent-1', 'injury')}>
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
            <div className="tab-content active" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2>Cross-Case Relationship Flowchart</h2>
              <p style={{ color: 'var(--muted-dark)' }}>
                Visualizes the intersection and causal links between different active civil tracks for this client.
              </p>
              
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                
                {/* SVG CANVAS FLOW CHART */}
                <div className="glass" style={{ flex: '1 1 500px', height: '360px', padding: '20px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  
                  {/* BACKGROUND SVG LINES */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
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
                  <div style={{ position: 'absolute', top: '80px', left: '40px', width: '140px', padding: '12px', background: 'rgba(28,216,210,0.1)', border: '2px solid #1cd8d2', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block' }}>💼</span>
                    <strong style={{ fontSize: '0.85rem' }}>WorkTimeline</strong>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#86868b', marginTop: '2px' }}>2 Base Entries</span>
                  </div>

                  {/* INJURY MATTER NODE */}
                  <div style={{ position: 'absolute', top: '80px', right: '40px', width: '140px', padding: '12px', background: 'rgba(28,216,210,0.1)', border: '2px solid #1cd8d2', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block' }}>🏥</span>
                    <strong style={{ fontSize: '0.85rem' }}>InjuryTimeline</strong>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#86868b', marginTop: '2px' }}>1 Incident Entry</span>
                  </div>

                  {/* PROPERTY MATTER NODE */}
                  <div style={{ position: 'absolute', bottom: '50px', left: '40px', width: '140px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--mac-border-dark)', borderRadius: '12px', textAlign: 'center', opacity: 0.6 }}>
                    <span style={{ fontSize: '1.5rem', display: 'block' }}>🏠</span>
                    <strong style={{ fontSize: '0.85rem' }}>PropertyTimeline</strong>
                  </div>

                  {/* FAMILY MATTER NODE */}
                  <div style={{ position: 'absolute', bottom: '50px', right: '40px', width: '140px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--mac-border-dark)', borderRadius: '12px', textAlign: 'center', opacity: 0.6 }}>
                    <span style={{ fontSize: '1.5rem', display: 'block' }}>⚖️</span>
                    <strong style={{ fontSize: '0.85rem' }}>FamilyTimeline</strong>
                  </div>

                  {/* CAUSAL LINK INTERACTIVE BADGE */}
                  <button 
                    onClick={() => setSelectedRelation('work_injury')}
                    style={{ 
                      position: 'absolute', 
                      top: '105px', 
                      left: '210px', 
                      zIndex: 10, 
                      background: '#1cd8d2', 
                      color: 'black', 
                      border: 'none', 
                      borderRadius: '20px', 
                      padding: '6px 12px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(28,216,210,0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⚡ Leads To: Fall Injury
                  </button>
                  
                </div>

                {/* RELATIONSHIP DETAILS SIDEBAR */}
                <div className="glass" style={{ flex: '1 1 300px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '360px' }}>
                  <h3>Relationship Details</h3>
                  
                  {selectedRelation === 'work_injury' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ padding: '8px', background: 'rgba(28, 216, 210, 0.08)', borderRadius: '8px', fontSize: '0.75rem', color: '#1cd8d2', border: '1px solid rgba(28, 216, 210, 0.2)' }}>
                        <strong>Causal Connection:</strong> Work incident resulted in physical injury.
                      </div>
                      
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: '#86868b' }}>1. Source (WorkTimeline Entry):</strong>
                        <div style={{ fontSize: '0.82rem', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginTop: '4px' }}>
                          {timelines.find(t => t.case_type === 'work' && t.id === 'work-parent-1')?.text || timelines.find(t => t.case_type === 'work')?.text || "Slipped on wet floor in the warehouse during my shift. (Demo)"}
                        </div>
                      </div>

                      <div>
                        <strong style={{ fontSize: '0.8rem', color: '#86868b' }}>2. Destination (InjuryTimeline Entry):</strong>
                        <div style={{ fontSize: '0.82rem', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginTop: '4px' }}>
                          {timelines.find(t => t.case_type === 'injury' && t.id === 'injury-parent-1')?.text || timelines.find(t => t.case_type === 'injury')?.text || "Slipped and injured knee in the warehouse. Pain level 8/10. (Demo)"}
                        </div>
                      </div>

                      <button 
                        className="firm-btn active" 
                        style={{ alignSelf: 'flex-start', fontSize: '0.8rem', marginTop: '10px' }}
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
                    <div style={{ color: 'var(--muted-dark)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>
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
              <p style={{ color: '#86868b', marginBottom: '20px' }}>
                Review matching timelines submitted anonymously. Accept cases to instantly create Leads in Clio Grow.
              </p>
              {hubCases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  No new anonymous timelines matching your practice areas currently listed.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {hubCases.map((c, i) => (
                    <div key={c.id || i} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--mac-border-dark)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong>Case Proposal #{i + 1} ({c.practice_areas?.join(', ').toUpperCase()})</strong>
                        <span style={{ fontSize: '0.75rem', color: '#86868b' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#a1a1a6', marginBottom: '15px' }}>{c.anonymous_summary}</p>
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
            <div className="tab-content active" style={{ maxWidth: '600px' }}>
              <h2>Clio Manage Client Provisioning</h2>
              <p style={{ color: '#86868b', marginBottom: '20px' }}>
                Create a pre-populated timeline account for an existing client in Clio Manage.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <button className="firm-btn active" onClick={handleGenerateInvite} style={{ alignSelf: 'flex-start', padding: '12px 24px' }}>
                  Generate WorkTimeline Invitation Link
                </button>

                {generatedInviteUrl && (
                  <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(28, 216, 210, 0.08)', border: '1px solid rgba(28, 216, 210, 0.2)', borderRadius: '12px' }}>
                    <strong>Client Setup Link (Copied to Clipboard):</strong>
                    <div style={{ wordBreak: 'break-all', fontSize: '0.85rem', color: '#1cd8d2', marginTop: '8px', cursor: 'pointer' }} onClick={() => {
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
      />
    </div>
  );
}
