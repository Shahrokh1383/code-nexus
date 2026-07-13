import { JSX } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface LinkingTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function LinkingTabs({ tabs, activeTab, onTabChange }: LinkingTabsProps): JSX.Element {
  return (
    <div className="linking-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`linking-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={`fa-solid ${tab.icon} me-2`}></i> {tab.label}
        </button>
      ))}
    </div>
  );
}