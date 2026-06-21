'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

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

export default function Login() {
    const [showIntro, setShowIntro] = useState(true);
    const [showClioChoices, setShowClioChoices] = useState(false);
    const [showPasscodeForm, setShowPasscodeForm] = useState(false);
    const [firmPasscode, setFirmPasscode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Email/Password Auth States
    const [loginTab, setLoginTab] = useState<'clio' | 'email'>('clio');
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const router = useRouter();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE1OTg4ODMwMDAsImV4cCI6MTkwNDQ0NjAwMH0.placeholder';
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    // 1. Manage Intro Slogan Fadeout
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 4200);
        return () => clearTimeout(timer);
    }, []);

    // 1b. Manage Add to Clio flow detection
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('add_to_clio_flow') === '1') {
                sessionStorage.setItem('add_to_clio_flow', 'true');
            }
        }
    }, []);

    // 2. Clio OAuth Sign In as Firm
    const handleClioFirm = () => {
        const client_id = process.env.NEXT_PUBLIC_CLIO_CLIENT_ID || 'btscu9WmPHYelIZtZA9sIQfynBAQudwjaR7pEDdq';
        
        // Choose dynamic redirect uri based on environment
        const redirect_uri = window.location.origin.includes('localhost') 
            ? 'http://localhost:3000/api/sync' 
            : 'https://worktimeline-app.vercel.app/api/sync';

        const isAddToClio = sessionStorage.getItem('add_to_clio_flow') === 'true';
        const state = 'firm_vault_' + Date.now() + (isAddToClio ? '_addtoclio' : '');
        window.location.href = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
    };

    // 3. Clio Sign In as Client (via passcode number)
    const handleClioClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firmPasscode.trim()) {
            alert("Please enter a valid Firm Code / Number to proceed.");
            return;
        }

        setIsProcessing(true);
        localStorage.setItem('clientFirmNumber', firmPasscode);
        localStorage.setItem('isEngineSealed', 'false');

        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            
            // Link profile to this client session if profiles exists
            await supabase
                .from('profiles')
                .upsert({ 
                    id: data.user?.id, 
                    email: `client_${firmPasscode}@worktimeline.local`, 
                    is_verified: true 
                });
            
            router.push('/');
        } catch (e: any) {
            console.warn("Supabase anonymous sign in failed, using local offline fallback session:", e);
            router.push('/');
        } finally {
            setIsProcessing(false);
        }
    };

    // 4. OAuth Google Sign In
    const handleGoogleSignIn = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/'
                }
            });
            if (error) throw error;
        } catch (e: any) {
            alert("Google Authentication failed: " + e.message);
        }
    };

    // 5. OAuth Apple Sign In
    const handleAppleSignIn = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo: window.location.origin + '/'
                }
            });
            if (error) throw error;
        } catch (e: any) {
            alert("Apple Authentication failed: " + e.message);
        }
    };

    // 3b. Email & Password Sign In / Sign Up handler
    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        if (!email.trim() || !password.trim()) {
            setAuthError("Email and password fields are required.");
            return;
        }

        setIsProcessing(true);
        try {
            if (authMode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                router.push('/');
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;

                if (data.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: data.user.id,
                            email: data.user.email,
                            is_verified: true
                        });
                    if (profileError) console.error("Profile creation failed:", profileError);
                }

                alert("Registration successful! Logging you in...");
                
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (loginError) throw loginError;
                router.push('/');
            }
        } catch (err: any) {
            setAuthError(err.message || "Authentication process failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (showIntro) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0e12] p-6 text-center animate-fade-out">
                <h1 className="font-sans font-light text-[2.8rem] text-[#ebf2f7] leading-tight tracking-tight animate-fade-in-up">
                    "justice should feel effortless"
                </h1>
                <p className="font-sans font-normal text-[1.5rem] text-[#94a3b8] mt-4 animate-fade-in-up-delay">
                    ...it can if telling the truth takes no effort.
                </p>
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-up {
                        animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .animate-fade-in-up-delay {
                        opacity: 0;
                        animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        animation-delay: 1.3s;
                    }
                `}} />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0e12] p-6 bg-[radial-gradient(circle_at_center,_#161e27_0%,_#06090c_100%)]">
            <div className="w-full max-w-[420px] flex flex-col items-center animate-fade-in">
                {/* Briefcase logo container */}
                <div className="w-[110px] height-[110px] mb-6 relative flex justify-center items-center animate-briefcase-float">
                    <svg className="w-20 h-20 fill-none stroke-[#ebf2f7] stroke-[1.2] stroke-linecap-round stroke-linejoin-round filter drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]" viewBox="0 0 24 24">
                        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zM10 4h4v2h-4V4zm10 15H4V8h16v11z"/>
                        <line x1="2" y1="13.5" x2="22" y2="13.5" strokeDasharray="2,2"/>
                        <circle cx="6" cy="13.5" r="1" fill="currentColor"/>
                        <circle cx="12" cy="13.5" r="1" fill="currentColor"/>
                        <circle cx="18" cy="13.5" r="1" fill="currentColor"/>
                    </svg>
                </div>

                {/* Glassmorphic card */}
                <div className="w-full bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-[35px_30px] shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl hover:border-[rgba(255,255,255,0.14)] transition-all duration-300">
                    <div className="text-center mb-[30px]">
                        <h2 className="font-sans font-extrabold text-[2.2rem] text-[#ebf2f7] tracking-tight leading-none">
                            WorkTimeline
                        </h2>
                        <p className="font-sans font-normal text-[0.95rem] text-[#94a3b8] mt-2 tracking-widest uppercase">
                            taking out intake
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="login-tabs-container">
                        <button
                            type="button"
                            onClick={() => { playSound('click'); setLoginTab('clio'); }}
                            className={`login-tab-btn ${loginTab === 'clio' ? 'login-tab-btn-active' : 'login-tab-btn-inactive'}`}
                        >
                            Clio & Passcode
                        </button>
                        <button
                            type="button"
                            onClick={() => { playSound('click'); setLoginTab('email'); }}
                            className={`login-tab-btn ${loginTab === 'email' ? 'login-tab-btn-active' : 'login-tab-btn-inactive'}`}
                        >
                            Email Portal
                        </button>
                    </div>

                    {loginTab === 'clio' ? (
                        <div className="grid gap-[14px]">
                            {/* Clio Auth Trigger */}
                            <button 
                                onClick={() => {
                                    setShowClioChoices(!showClioChoices);
                                    if (showClioChoices) setShowPasscodeForm(false);
                                }}
                                className="w-full py-3.5 px-4.5 rounded-2xl bg-white text-black font-semibold text-[0.95rem] flex items-center justify-center gap-3 hover:bg-[rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(255,255,255,0.15)] active:translate-y-0 transition-all duration-200"
                            >
                                <svg className="w-4.5 h-4.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                                    <circle cx="9" cy="12" r="6"/>
                                    <circle cx="15" cy="12" r="6"/>
                                </svg>
                                Sign in via Clio
                            </button>

                            {/* Clio sub-choices */}
                            {showClioChoices && (
                                <div className="grid grid-columns-2 gap-2.5 mt-1 animate-slide-down">
                                    <button onClick={handleClioFirm} className="w-full py-3 px-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[#ebf2f7] text-[0.85rem] font-medium hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] transition-all">
                                        As Firm
                                    </button>
                                    <button onClick={() => setShowPasscodeForm(!showPasscodeForm)} className="w-full py-3 px-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[#ebf2f7] text-[0.85rem] font-medium hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] transition-all">
                                        As Client
                                    </button>
                                </div>
                            )}

                            {/* Client passcode form */}
                            {showPasscodeForm && showClioChoices && (
                                <form onSubmit={handleClioClient} className="mt-4.5 animate-slide-down">
                                    <input 
                                        type="text"
                                        value={firmPasscode}
                                        onChange={(e) => setFirmPasscode(e.target.value)}
                                        placeholder="Enter Firm Code / Number"
                                        className="w-full p-3.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)] text-[#ebf2f7] text-[0.95rem] text-center outline-none focus:border-[rgba(255,255,255,0.2)] focus:bg-[rgba(0,0,0,0.4)] transition-all"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={isProcessing}
                                        className="w-full py-3.5 mt-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-[#ebf2f7] hover:bg-[rgba(255,255,255,0.12)] transition-all"
                                    >
                                        {isProcessing ? 'Verifying...' : 'Access Chronology'}
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleEmailAuth} className="grid gap-[14px]">
                            {authError && (
                                <div className="login-error-banner">
                                    {authError}
                                </div>
                            )}
                            <div>
                                <input 
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    required
                                    className="w-full p-3.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)] text-[#ebf2f7] text-[0.9rem] outline-none focus:border-[rgba(28,216,210,0.5)] focus:bg-[rgba(0,0,0,0.4)] transition-all"
                                />
                            </div>
                            <div>
                                <input 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    className="w-full p-3.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)] text-[#ebf2f7] text-[0.9rem] outline-none focus:border-[rgba(28,216,210,0.5)] focus:bg-[rgba(0,0,0,0.4)] transition-all"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isProcessing}
                                className="login-submit-gradient-btn"
                            >
                                {isProcessing ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                            </button>

                            <div className="login-switch-mode-container">
                                <button
                                    type="button"
                                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                                    className="login-switch-mode-btn"
                                >
                                    {authMode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="flex items-center text-center text-[#94a3b8] text-[0.75rem] font-semibold tracking-wider uppercase my-5 before:content-[''] before:flex-1 before:border-b before:border-[rgba(255,255,255,0.08)] before:mr-3.5 after:content-[''] after:flex-1 after:border-b after:border-[rgba(255,255,255,0.08)] after:ml-3.5">
                        or
                    </div>

                    <div className="grid gap-[14px]">
                        {/* Google Sign In */}
                        <button 
                            onClick={handleGoogleSignIn}
                            className="w-full py-3.5 px-4.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#ebf2f7] text-[0.95rem] flex items-center justify-center gap-3 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-250"
                        >
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                            </svg>
                            Sign in with Google
                        </button>

                        {/* Apple Sign In */}
                        <button 
                            onClick={handleAppleSignIn}
                            className="w-full py-3.5 px-4.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#ebf2f7] text-[0.95rem] flex items-center justify-center gap-3 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-250"
                        >
                            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.62.71-1.16 1.85-1.02 2.96 1.12.09 2.27-.57 2.97-1.4z"/>
                            </svg>
                            Sign in with Apple
                        </button>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(1deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .animate-briefcase-float {
                    animation: float 4s ease-in-out infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-down {
                    animation: slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .grid-columns-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            `}} />
        </div>
    );
}