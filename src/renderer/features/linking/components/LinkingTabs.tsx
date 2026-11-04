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
    <nav className="linking-tabs" role="tablist" aria-label="Linking page navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`linking-tab ${activeTab === tab.id ? 'linking-tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          id={`${tab.id}-tab`}
        >
          <i className={`fa-solid ${tab.icon} linking-tab__icon`} />
          <span className="linking-tab__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}