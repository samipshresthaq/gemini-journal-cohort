import React, { useState } from "react";
import { AttachedNote } from "../types";
import { X, FileText, Copy, Check, Sparkles, Plus, Edit3 } from "lucide-react";

interface NotePreviewModalProps {
  note: AttachedNote;
  onClose: () => void;
  onUpdateText: (newText: string) => void;
  onInsertIntoDraft: (text: string) => void;
  onReflectDirectly: (text: string) => void;
}

export const NotePreviewModal: React.FC<NotePreviewModalProps> = ({
  note,
  onClose,
  onUpdateText,
  onInsertIntoDraft,
  onReflectDirectly,
}) => {
  const [editedText, setEditedText] = useState(note.extractedText);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const wordCount = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;
  const charCount = editedText.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    onUpdateText(editedText);
    setIsEditing(false);
  };

  const formattedSize = (note.fileSize / 1024).toFixed(1) + " KB";
  const isPdf = note.fileName.toLowerCase().endsWith(".pdf");

  return (
    <div
      id="note-preview-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="note-preview-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 max-w-[280px] sm:max-w-md truncate">
                  {note.fileName}
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                  {isPdf ? "PDF Document" : "Text Note"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formattedSize} • {wordCount} words • {charCount} characters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-note-text"
              onClick={handleCopy}
              title="Copy extracted text"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              id="btn-close-note-preview"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isEditing ? "Edit Extracted Note Content" : "Extracted Note Content"}
            </span>
            <button
              type="button"
              id="btn-toggle-edit-note"
              onClick={() => {
                if (isEditing) {
                  handleSaveEdit();
                } else {
                  setIsEditing(true);
                }
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Save Edits" : "Edit Text"}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              id="textarea-edit-extracted-note"
              rows={12}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
              {editedText || <span className="text-slate-400 italic">No text extracted from document.</span>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            id="btn-insert-note-draft"
            onClick={() => {
              onInsertIntoDraft(editedText);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert Text into Input Draft</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-note-cancel"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              id="btn-note-reflect-directly"
              onClick={() => {
                onReflectDirectly(editedText);
                onClose();
              }}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 dark:text-indigo-200" />
              <span>Reflect on Note with Gemini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
