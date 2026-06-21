
// Hello Antigravity!
'use client';

import React, { useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function VerificationForm() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [aiConsentChecked, setAiConsentChecked] = useState(false);
    const [dataConsentChecked, setDataConsentChecked] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const triggerFileInput = () => {
        if (!previewUrl) {
            fileInputRef.current?.click();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !disclaimerChecked || !aiConsentChecked || !dataConsentChecked) return;

        setStatus('loading');
        setErrorMessage('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("You must be logged in to verify your identity.");

            const userId = session.user.id;
            const fileExt = selectedFile.name.split('.').pop() || 'jpg';
            const filePath = `${userId}/id_document_${Date.now()}.${fileExt}`;

            // Save consents explicitly to localStorage
            localStorage.setItem('consent_disclaimer', 'true');
            localStorage.setItem('consent_ai', 'true');
            localStorage.setItem('consent_data', 'true');
            localStorage.setItem('consent_clio', 'true');
            localStorage.setItem('consent_improvement', 'true');

            // 1. Upload ID file to secure storage bucket
            const { error: uploadError } = await supabase.storage
                .from('id-verification')
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get Public Url
            const { data: { publicUrl } } = supabase.storage
                .from('id-verification')
                .getPublicUrl(filePath);

            // 3. Update profiles table via supabase database
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    is_verified: true,
                    id_document_url: publicUrl
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            // 4. Save verification status locally
            localStorage.setItem('isVerified', 'true');
            setStatus('success');

            alert("IDENTITY VERIFIED\n\nYour evidence vault has been successfully unlocked.");
            router.push('/');
        } catch (error: any) {
            console.error("Verification failed:", error);
            setStatus('error');
            setErrorMessage(error.message || 'An error occurred during verification.');
        }
    };

    return (
        <div className="w-full max-w-[580px] bg-[rgba(15,23,42,0.55)] border border-[rgba(255,255,255,0.08)] rounded-[28px] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-left">
            <div className="text-center mb-[30px]">
                <h2 className="font-sans font-extrabold text-[2rem] text-[#ebf2f7] tracking-tight leading-none">
                    Secure Identification
                </h2>
                <p className="font-sans font-normal text-[0.9rem] text-[#94a3b8] mt-2 tracking-widest uppercase">
                    Evidence Vault Setup
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload Zone */}
                <div
                    onClick={triggerFileInput}
                    className="border border-dashed border-[rgba(255,255,255,0.08)] rounded-[20px] p-[30px_20px] text-center bg-[rgba(0,0,0,0.15)] cursor-pointer hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.02)] hover:-translate-y-0.5 transition-all duration-300 relative"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        title="Identity Document Upload"
                        aria-label="Identity Document Upload"
                    />

                    {!previewUrl ? (
                        <div className="flex flex-col items-center">
                            <svg className="w-11 h-11 stroke-[#94a3b8] stroke-[1.2] fill-none mb-3" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L12 15l-4-4-5 5" />
                            </svg>
                            <p className="text-[#ebf2f7] text-[0.9rem] font-semibold">
                                Upload Canadian Photo ID or Driver's License
                            </p>
                            <p className="text-[#94a3b8] text-[0.75rem] mt-1">
                                Drag & drop or tap to select image
                            </p>
                        </div>
                    ) : (
                        <div className="w-full max-h-[180px] rounded-xl overflow-hidden bg-black flex justify-center items-center">
                            <img src={previewUrl} className="w-full h-[180px] object-contain" alt="ID Document Preview" />
                        </div>
                    )}
                </div>

                {/* Terms and Conditions Scroll box */}
                <div className="border border-[rgba(255,255,255,0.08)] rounded-2xl bg-[rgba(0,0,0,0.25)] p-5 max-h-[220px] overflow-y-auto text-[0.82rem] leading-relaxed text-[#94a3b8] text-left scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.08)]">
                    <h3 className="font-sans font-semibold text-[0.95rem] text-[#ebf2f7] uppercase tracking-wide mb-3">
                        Disclaimers, Terms & Admissibility Framework
                    </h3>

                    <p className="mb-3">
                        <strong>1. MANDATORY LEGAL DISCLAIMERS</strong><br />
                        • We are not a lawyer.<br />
                        • We do not give legal advice.<br />
                        • We do not create a lawyer-client relationship.<br />
                        • We do not interpret laws or legal tests.<br />
                        • We do not predict legal outcomes.<br />
                        • All information may be incomplete or inaccurate.<br />
                        • All decisions must be made by the user, not the AI.<br />
                        • All AI outputs must be reviewed by a qualified lawyer before use.<br />
                        • The App is for journaling, documentation, and organization only.<br />
                        • The App is not a law firm and does not replace legal counsel.
                    </p>

                    <p className="mb-3">
                        <strong>2. USER CONSENT & RIGHTS</strong><br />
                        By using this App, you grant explicit consent for:<br />
                        • AI analysis of entries.<br />
                        • Storing personal and sensitive legal information.<br />
                        • Sharing data with lawyers.<br />
                        • Sharing data with third-party services (e.g., Clio).<br />
                        • Using data to improve App features.<br />
                        You can revoke your consent at any time via the Settings, which will disable the corresponding features. You have the right to access, export, correct, and delete your data at any time.
                    </p>

                    <p className="mb-3">
                        <strong>3. PRIVACY & DATA PROTECTION (CANADA)</strong><br />
                        • Complies with federal PIPEDA and BC PIPA privacy laws.<br />
                        • Data minimization: We only collect what is necessary to run the App.<br />
                        • No selling or transferring user data.<br />
                        • No training of AI models on user data without explicit consent.<br />
                        • Data is encrypted at rest (AES-256) and in transit (TLS 1.2+).<br />
                        • Immutable audit logs are maintained for all data access and AI actions.
                    </p>

                    <p className="mb-3">
                        <strong>4. SECURITY REQUIREMENTS</strong><br />
                        • AES-256 encryption at rest; TLS 1.2+ encryption in transit.<br />
                        • Role-based access control (user vs lawyer).<br />
                        • Audit logs for AI suggestions, data edits, logins, and lawyer access.<br />
                        • Secure OAuth (Google, Apple, Clio) and secure password hashing (bcrypt/argon2).
                    </p>

                    <p className="mb-3">
                        <strong>5. TERMS OF USE & JURISDICTION</strong><br />
                        • Purpose: For digital journaling, organization, and documentation only.<br />
                        • Limitations: Provided "as is" with no guarantee of accuracy and no liability for user decisions.<br />
                        • Jurisdiction: Governing law and dispute resolution shall be located in British Columbia (Canada).
                    </p>

                    <p className="mb-3">
                        <strong>6. LAWYER-FACING RULES (IF APPLICABLE)</strong><br />
                        • Lawyers must verify client identity and obtain consent before accessing timelines.<br />
                        • Lawyers must comply with Law Society of BC rules, not rely solely on AI, and review all AI summaries before use.
                    </p>

                    <p className="mb-3">
                        <strong>7. EVIDENCE & DOCUMENTATION</strong><br />
                        • All timeline entries are timestamped.<br />
                        • Version history is preserved with immutable logs; AI annotations will never modify original entries.
                    </p>
                </div>

                {/* Agreement Checkbox 1 */}
                <label className="flex items-start gap-3 cursor-pointer text-left select-none">
                    <div className="relative w-[18px] h-[18px] flex-shrink-0 mt-0.5">
                        <input
                            type="checkbox"
                            checked={disclaimerChecked}
                            onChange={(e) => setDisclaimerChecked(e.target.checked)}
                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                        />
                        <div className={`absolute inset-0 rounded border border-[rgba(255,255,255,0.08)] flex items-center justify-center transition-all ${disclaimerChecked ? 'bg-white border-white' : 'bg-[rgba(255,255,255,0.02)]'}`}>
                            {disclaimerChecked && (
                                <svg className="w-3 h-3 stroke-black stroke-[3] fill-none" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <span className="text-[#94a3b8] text-[0.85rem] leading-snug">
                        I acknowledge all <strong>Mandatory Legal Disclaimers</strong> and agree to the <strong>Pattera Terms of Use</strong> (BC, Canada Jurisdiction).
                    </span>
                </label>

                {/* Agreement Checkbox 2 */}
                <label className="flex items-start gap-3 cursor-pointer text-left select-none">
                    <div className="relative w-[18px] h-[18px] flex-shrink-0 mt-0.5">
                        <input
                            type="checkbox"
                            checked={aiConsentChecked}
                            onChange={(e) => setAiConsentChecked(e.target.checked)}
                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                        />
                        <div className={`absolute inset-0 rounded border border-[rgba(255,255,255,0.08)] flex items-center justify-center transition-all ${aiConsentChecked ? 'bg-white border-white' : 'bg-[rgba(255,255,255,0.02)]'}`}>
                            {aiConsentChecked && (
                                <svg className="w-3 h-3 stroke-black stroke-[3] fill-none" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <span className="text-[#94a3b8] text-[0.85rem] leading-snug">
                        I give explicit consent for <strong>AI analysis of entries</strong> and using data to improve features.
                    </span>
                </label>

                {/* Agreement Checkbox 3 */}
                <label className="flex items-start gap-3 cursor-pointer text-left select-none">
                    <div className="relative w-[18px] h-[18px] flex-shrink-0 mt-0.5">
                        <input
                            type="checkbox"
                            checked={dataConsentChecked}
                            onChange={(e) => setDataConsentChecked(e.target.checked)}
                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                        />
                        <div className={`absolute inset-0 rounded border border-[rgba(255,255,255,0.08)] flex items-center justify-center transition-all ${dataConsentChecked ? 'bg-white border-white' : 'bg-[rgba(255,255,255,0.02)]'}`}>
                            {dataConsentChecked && (
                                <svg className="w-3 h-3 stroke-black stroke-[3] fill-none" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <span className="text-[#94a3b8] text-[0.85rem] leading-snug">
                        I give explicit consent for <strong>storing sensitive legal info</strong> and sharing with lawyers and Clio.
                    </span>
                </label>

                {status === 'error' && (
                    <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                        {errorMessage}
                    </div>
                )}

                {/* Complete Button */}
                <button
                    type="submit"
                    disabled={!selectedFile || !disclaimerChecked || !aiConsentChecked || !dataConsentChecked || status === 'loading'}
                    className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-[0.95rem] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(255,255,255,0.15)] disabled:bg-[rgba(255,255,255,0.15)] disabled:text-[rgba(255,255,255,0.3)] disabled:cursor-not-allowed transition-all duration-300"
                >
                    {status === 'loading' ? 'Processing Vault Link...' : 'Complete Verification'}
                </button>
            </form>
        </div>
    );
}