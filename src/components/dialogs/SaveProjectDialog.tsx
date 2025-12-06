import { useState } from 'react';
import { useProjectStore } from '../../store';

interface SaveProjectDialogProps {
  onClose: () => void;
  onSave: (name: string, saveAsFile: boolean) => void;
  currentName?: string;
}

export default function SaveProjectDialog({
  onClose,
  onSave,
  currentName,
}: SaveProjectDialogProps) {
  const [name, setName] = useState(currentName || '');
  const [saveAsFile, setSaveAsFile] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), saveAsFile);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">שמירת פרויקט</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם הפרויקט</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="הזן שם פרויקט"
              autoFocus
              required
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveAsFile"
              checked={saveAsFile}
              onChange={(e) => setSaveAsFile(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="saveAsFile" className="text-sm">
              שמור כקובץ JSON (להורדה)
            </label>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              שמור
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


