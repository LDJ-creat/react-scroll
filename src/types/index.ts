export interface ScrollSyncOptions {
  debounceDelay?: number; // Milliseconds for debouncing scroll events, default 150
  stickinessFactor?: number; // Factor for tab stickiness, default 1.2
  observerThreshold?: number | number[]; // IntersectionObserver threshold, default [0.1, 0.25, 0.5, 0.75, 1.0]
  // Offset from the top of the scroll container to define the "active line" for determining active section
  // Defaults to navTabsRef.current.offsetHeight + 5 if navTabsRef is provided
  activeLineOffset?: number; 
  // Height of the zone below the active line to consider a section for activation
  activeZoneHeight?: number; // Default 200
  // Default scroll behavior for tab clicks
  defaultScrollBehavior?: ScrollBehavior; // Default 'smooth'
}

export interface UseScrollSyncProps {
  // Ref to the scrollable container element
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  // Ref to the navigation tabs container (optional, used for calculating default activeLineOffset)
  navTabsRef?: React.RefObject<HTMLElement | null>;
  // A record where keys are unique section IDs (must match element IDs) and values are refs to the section HTMLElements
  sections: Record<string, React.RefObject<HTMLElement | null>>;
  // The ID of the tab/section that should be initially active
  initialActiveTab?: string;
  // Callback function triggered when the active tab changes due to scrolling or clicking
  onActiveTabChange?: (tabId: string) => void;
  // Configuration options for the hook
  options?: ScrollSyncOptions;
}

export interface UseScrollSyncReturn {
  // The ID of the currently active tab/section
  activeTab: string;
  // Function to handle a click on a navigation tab, scrolling to the corresponding section
  handleTabClick: (tabId: string, behavior?: ScrollBehavior) => void;
  // Ref to be attached to the scroll container by the hook (internal use, but exposed if needed)
  // internalScrollContainerRef: React.RefObject<HTMLElement | null>;
  // Ref to be attached to the nav tabs by the hook (internal use)
  // internalNavTabsRef: React.RefObject<HTMLElement | null>;
}
