'use client';

import { useState, useEffect, useCallback } from 'react';

interface BoldToolbarProps {
  enabled: boolean;
}

export function BoldToolbar({ enabled }: BoldToolbarProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  const handleBold = useCallback(() => {
    document.execCommand('bold', false);
    setShowToolbar(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ctrl+B or Cmd+B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
    }
  }, [enabled]);

  const handleSelectionChange = useCallback(() => {
    if (!enabled) {
      setShowToolbar(false);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setShowToolbar(false);
      return;
    }

    // Check if selection is within printable-resume
    const resumeElement = document.getElementById('printable-resume');
    if (!resumeElement) {
      setShowToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!resumeElement.contains(range.commonAncestorContainer)) {
      setShowToolbar(false);
      return;
    }

    // Get position for toolbar
    const rect = range.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 45
    });
    setShowToolbar(true);
  }, [enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleKeyDown, handleSelectionChange]);

  if (!showToolbar || !position || !enabled) return null;

  return (
    <div
      className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-lg px-2 py-1 flex items-center gap-1"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)'
      }}
    >
      <button
        onClick={handleBold}
        className="px-3 py-1 hover:bg-gray-700 rounded font-bold text-sm"
        title="Bold (Ctrl+B)"
      >
        B
      </button>
      <span className="text-gray-400 text-xs px-2">Ctrl+B</span>
    </div>
  );
}
