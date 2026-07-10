// src/presentation/components/documentation/FolderRegistrationPrompt.tsx
import type { JSX } from 'react';

interface FolderRegistrationPromptProps {
  isLoading: boolean;
  onRegister: () => void;
}

export function FolderRegistrationPrompt({ isLoading, onRegister }: FolderRegistrationPromptProps): JSX.Element {
  return (
    <div className="registration-prompt">
      <div className="registration-prompt__icon"><i className="fa-solid fa-folder-plus" /></div>
      <h2>No Documentation Folder Registered</h2>
      <p>Register the folder where your markdown/text files are stored to start tracking.</p>
      <button className="btn-primary btn-lg" onClick={onRegister} disabled={isLoading}>
        <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-folder-open'}`} />
        {isLoading ? 'Scanning...' : 'Register Documentation Folder'}
      </button>
    </div>
  );
}