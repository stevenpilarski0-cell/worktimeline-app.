'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { TimelineEntry } from './Timeline';

interface AmendLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logId: string | null;
  onSave: (newLog: TimelineEntry) => void;
}

export default function AmendLogModal({ isOpen, onClose, logId, onSave }: AmendLogModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [originalLog, setOriginalLog] = useState<TimelineEntry | null>(null);
  const [newText, setNewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && logId) {
      const fetchLog = async () => {
        const { data, error } = await supabase
          .from('timeline_entries')
          .select('*')
          .eq('id', logId)
          .single();
        
        if (data && !error) {
          setOriginalLog(data);
          setNewText(data.text);
        } else {
          console.error('Failed to fetch log for amending:', error);
          alert('Could not load the log entry to amend.');
          onClose();
        }
      };
      fetchLog();
    } else {
      // Reset state when modal is closed or has no logId
      setOriginalLog(null);
      setNewText('');
    }
  }, [isOpen, logId, supabase, onClose]);

  const handleSave = async () => {
    if (!originalLog || !newText.trim()) return;
    setIsSaving(true);

    const { data, error } = await supabase
      .from('timeline_entries')
      .insert([{
        parent_id: originalLog.id, // This creates the link to the original
        case_type: originalLog.case_type || 'work', // Carry over original properties
        mode: originalLog.mode,
        type: originalLog.type,
        text: newText,
        stamp: new Date().toLocaleString(), // Create a new timestamp for the amendment
        evidence_url: originalLog.evidence_url,
        extracted_date: originalLog.extracted_date,
      }])
      .select()
      .single();

    setIsSaving(false);
    if (data && !error) {
      onSave(data); // Pass the new log back to the parent to update the UI
      onClose();
    } else {
      console.error('Failed to save amended log:', error);
      alert(`Failed to save amendment: ${error?.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onContextMenu={(e) => e.preventDefault()}>
      <div className="glass w-full max-w-2xl p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Supersede Log Entry</h2>
        
        {originalLog && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Original Entry</label>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm opacity-70 max-h-24 overflow-y-auto">
              <p className="font-mono text-xs mb-2">{originalLog.stamp}</p>
              <p>{originalLog.text}</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="amendText" className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
            New Version Text
          </label>
          <textarea
            id="amendText"
            className="firm-control w-full"
            rows={5}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter the updated text for this log entry..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className="firm-btn" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="firm-btn teal" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Amendment'}
          </button>
        </div>
      </div>
    </div>
  );
}