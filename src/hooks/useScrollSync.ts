import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from '../utils/debounce';
import { UseScrollSyncProps, UseScrollSyncReturn, ScrollSyncOptions } from '../types';

const DEFAULT_DEBOUNCE_DELAY = 150;
const DEFAULT_STICKINESS_FACTOR = 1.2;
const DEFAULT_OBSERVER_THRESHOLD = [0.1, 0.25, 0.5, 0.75, 1.0];
const DEFAULT_ACTIVE_ZONE_HEIGHT = 200;
const DEFAULT_SCROLL_BEHAVIOR = 'smooth';

export const useScrollSync = ({
  scrollContainerRef,
  navTabsRef,
  sections,
  initialActiveTab,
  onActiveTabChange,
  options: userOptions, // Renamed to avoid conflict with destructured options
}: UseScrollSyncProps): UseScrollSyncReturn => {
  // Explicitly type userOptions and provide default value for options object itself
  const options: ScrollSyncOptions = { ...userOptions };

  const {
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    stickinessFactor = DEFAULT_STICKINESS_FACTOR, 
    observerThreshold = DEFAULT_OBSERVER_THRESHOLD,
    activeLineOffset,
    activeZoneHeight = DEFAULT_ACTIVE_ZONE_HEIGHT,
    defaultScrollBehavior = DEFAULT_SCROLL_BEHAVIOR,
  } = options; // Destructure from the typed options

  const getInitialActiveTab = useCallback(() => {
    if (initialActiveTab) return initialActiveTab;
    const sectionKeys = Object.keys(sections);
    return sectionKeys.length > 0 ? sectionKeys[0] : '';
  }, [initialActiveTab, sections]);

  const [activeTab, setActiveTab] = useState<string>(getInitialActiveTab());
  const activeTabRef = useRef(activeTab);

  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (onActiveTabChange) {
      onActiveTabChange(activeTab);
    }
  }, [activeTab, onActiveTabChange]);

  useEffect(() => {
    // Reset active tab if initialActiveTab or sections change
    setActiveTab(getInitialActiveTab());
  }, [getInitialActiveTab]);

  const handleTabClick = useCallback((tabId: string, behavior?: ScrollBehavior) => {
    const sectionRef = sections[tabId];
    const element = sectionRef?.current;
    const scrollContainer = scrollContainerRef.current;

    if (element && scrollContainer) {
      let navTabsHeight = navTabsRef?.current?.offsetHeight ?? 0;
      if (navTabsHeight === 0 && activeLineOffset === undefined) {
        // Fallback if navTabsRef not ready or not provided, and no explicit offset
        console.warn(
          '[useScrollSync] navTabsHeight is 0 or navTabsRef not provided, and no activeLineOffset set. Defaulting to 60px for scroll calculation. This might lead to inaccurate scrolling.'
        );
        navTabsHeight = 60; 
      }

      const effectiveNavHeight = activeLineOffset !== undefined ? activeLineOffset : navTabsHeight;
      const elementTopInScrollContainer = element.offsetTop;
      const scrollToPosition = elementTopInScrollContainer - effectiveNavHeight;

      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }

      isProgrammaticScrollRef.current = true;
      setActiveTab(tabId); // Immediately update active tab on click

      scrollContainer.scrollTo({
        top: scrollToPosition,
        behavior: behavior || defaultScrollBehavior,
      });

      programmaticScrollTimeoutRef.current = window.setTimeout(() => { // Used window.setTimeout
        isProgrammaticScrollRef.current = false;
      }, 800); // Corresponds to smooth scroll duration
    }
  }, [
    sections, 
    scrollContainerRef, 
    navTabsRef, 
    activeLineOffset, 
    defaultScrollBehavior,
    setActiveTab // Added setActiveTab as a dependency for useCallback as it's used inside
  ]);

  const debouncedUpdateActiveTab = useRef(
    debounce((tabId: string) => {
      if (tabId && tabId !== activeTabRef.current) {
        setActiveTab(tabId);
      }
    }, debounceDelay)
  ).current;

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const currentNavTabsRef = navTabsRef?.current;

    if (!scrollContainer || Object.keys(sections).length === 0) {
      return;
    }

    let calculatedNavTabsHeight = currentNavTabsRef?.offsetHeight ?? 0;
    if (calculatedNavTabsHeight === 0 && activeLineOffset === undefined) {
      console.warn(
        '[useScrollSync Observer] navTabsHeight is 0 or navTabsRef not provided, and no activeLineOffset set. Defaulting to 60px for observer rootMargin. This might affect active section detection.'
      );
      calculatedNavTabsHeight = 60; // Fallback
    }
    
    const effectiveActiveLineOffset = activeLineOffset !== undefined ? activeLineOffset : (calculatedNavTabsHeight + 5);
    const scrollContainerClientHeight = scrollContainer.clientHeight;

    if (scrollContainerClientHeight === 0) {
      console.warn(
        '[useScrollSync Observer] scrollContainer.clientHeight is 0. Observer might not function correctly until layout is stable.'
      );
    }

    const bottomOffsetForRootMargin = Math.max(
      0,
      scrollContainerClientHeight - effectiveActiveLineOffset - activeZoneHeight
    );

    const observerOptions: IntersectionObserverInit = {
      root: scrollContainer,
      rootMargin: `-${effectiveActiveLineOffset}px 0px -${bottomOffsetForRootMargin}px 0px`,
      threshold: observerThreshold,
    };    

    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      const currentActualActiveTabId = activeTabRef.current;

      const processedEntries = entries.map((entry) => ({
        id: entry.target.id,
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
        boundingClientRectTop: entry.boundingClientRect.top,
        visibleHeightBelowActiveLine: Math.max(
          0,
          (entry.intersectionRect?.bottom ?? 0) - effectiveActiveLineOffset
        ),
      }));
      
      const visibleCandidates = processedEntries.filter(
        (item) =>
          item.isIntersecting &&
          item.visibleHeightBelowActiveLine > 0 &&
          item.intersectionRatio > 0.05 // Ensure a minimum visibility
      );

      if (visibleCandidates.length === 0) {
        // Handle cases where no candidate is strongly visible, perhaps stick to current if slightly visible
        const currentSectionEntry = processedEntries.find(e => e.id === currentActualActiveTabId);
        if (currentSectionEntry?.isIntersecting && currentSectionEntry.intersectionRatio > 0.01) {
            // If current is still a bit visible, do nothing or re-affirm
            // debouncedUpdateActiveTab(currentActualActiveTabId); // Optional: re-affirm if needed
            return;
        }
        // If nothing is visible, don't change the tab, or decide a fallback strategy
        return;
      }

      visibleCandidates.sort((a, b) => {
        // Prioritize by how much visible height is below the active line
        if (b.visibleHeightBelowActiveLine !== a.visibleHeightBelowActiveLine) {
          return b.visibleHeightBelowActiveLine - a.visibleHeightBelowActiveLine;
        }
        // Corrected tie-breaker: ensure it's a single expression
        return (
          Math.abs(a.boundingClientRectTop - effectiveActiveLineOffset) - 
          Math.abs(b.boundingClientRectTop - effectiveActiveLineOffset)
        );
      });

      let newPotentialActiveId = visibleCandidates[0].id;
      const topSortedCandidate = visibleCandidates[0];

      const currentActiveCandidateInList = visibleCandidates.find(
        (vc) => vc.id === currentActualActiveTabId
      );

      if (
        currentActiveCandidateInList &&
        topSortedCandidate.id !== currentActualActiveTabId
      ) {
        const scoreNew = topSortedCandidate.visibleHeightBelowActiveLine;
        const scoreCurrent = currentActiveCandidateInList.visibleHeightBelowActiveLine;
        
        // Use stickinessFactor here
        if (scoreNew < scoreCurrent * stickinessFactor) { 
          newPotentialActiveId = currentActualActiveTabId; 
        }
      }
      debouncedUpdateActiveTab(newPotentialActiveId);
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions); // observerOptions is used here
    const elementsToObserve: HTMLElement[] = [];

    Object.keys(sections).forEach((key) => {
      const sectionRef = sections[key];
      if (sectionRef?.current) {
        elementsToObserve.push(sectionRef.current);
        observer.observe(sectionRef.current);
      } else {
        console.warn(`[useScrollSync Observer] Section element for key ${key} not found.`);
      }
    });

    return () => {
      elementsToObserve.forEach((el) => observer.unobserve(el));
      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, [
    scrollContainerRef,
    navTabsRef, 
    sections,
    debouncedUpdateActiveTab, // debouncedUpdateActiveTab is used here
    observerThreshold,
    activeLineOffset,
    activeZoneHeight,
    stickinessFactor, // stickinessFactor is used in effect dependencies
    // getInitialActiveTab, // Not directly used in this effect, but influences activeTab which is used via activeTabRef
  ]);

  // Ensure the hook returns the defined UseScrollSyncReturn structure
  return { activeTab, handleTabClick }; // handleTabClick is returned here
};
