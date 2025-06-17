> English | [简体中文](./README.zh-CN.md)

# 📦 @dsmlll/react-scroll

A React library for synchronizing scroll position between a navigation component and different content sections. It provides a custom hook `useScrollSync` that handles scroll listening, updates the active navigation tab based on the visible section, and allows users to click on navigation tabs to smoothly scroll to the corresponding section.

## ✨ Features

- Smooth scrolling to sections when navigation tabs are clicked.
- Automatic highlighting of the active navigation tab based on the currently visible section during scrolling.
- Debounced scroll event handling for performance.
- Customizable via options (e.g., debounce delay, offset).
- Supports dynamic content and ref-based section targeting.

## 🚀 Installation

```bash
npm install @dsmlll/react-scroll
# or
yarn add @dsmlll/react-scroll
```

## 💡 Usage

Here's a basic example of how to use the `useScrollSync` hook:

```tsx
import React, { useRef, useMemo } from 'react';
import { useScrollSync } from '@dsmlll/react-scroll';

const MyPageComponent = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navTabsRef = useRef<HTMLDivElement>(null);

  // Define your sections and their refs
  const sectionIds = ['section1', 'section2', 'section3'];
  const sectionRefObjects = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {};
    sectionIds.forEach(id => {
      refs[id] = React.createRef<HTMLDivElement>();
    });
    return refs;
  }, [sectionIds]);

  const { activeTab, handleTabClick } = useScrollSync({
    scrollContainerRef, // Ref to the scrollable container
    navTabsRef,         // Ref to the navigation tabs container
    sections: sectionRefObjects, // A record of section IDs to their refs
    initialActiveTab: sectionIds[0], // Optional: ID of the initially active tab
    options: {
      debounceDelay: 100, // Optional: Debounce delay for scroll events
      // Add other options like offsetTop, offsetBottom if needed
    }
  });

  return (
    <div>
      <div ref={navTabsRef} className="navigation-tabs">
        {sectionIds.map(id => (
          <div
            key={id}
            className={`tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => handleTabClick(id)}
          >
            {id.toUpperCase()}
          </div>
        ))}
      </div>

      <div ref={scrollContainerRef} className="scrollable-content">
        {sectionIds.map(id => (
          <div key={id} id={id} ref={sectionRefObjects[id]} className="content-section">
            <h2>{id.toUpperCase()}</h2>
            {/* Add your section content here */}
            <p style={{height: "500px"}}>Scrollable content for {id}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPageComponent;
```

## 📖 API

### `useScrollSync(props: UseScrollSyncProps): UseScrollSyncReturn`

#### `UseScrollSyncProps`

- `scrollContainerRef`: `React.RefObject<HTMLElement | null>` - Ref to the main scrollable container element.
- `navTabsRef`: `React.RefObject<HTMLElement | null>` - Ref to the container of your navigation tabs. Used for calculating offsets if tabs are sticky or have height.
- `sections`: `Record<string, React.RefObject<HTMLElement | null>>` - An object where keys are section IDs (strings) and values are React refs to the corresponding section elements.
- `initialActiveTab?`: `string` - The ID of the section that should be considered active initially.
- `onActiveTabChange?`: `(tabId: string) => void` - Callback function that is called when the active tab changes.
- `options?`: `ScrollSyncOptions`
  - `debounceDelay?`: `number` (default: `100`) - Debounce delay in milliseconds for scroll event processing.
  - `offsetTop?`: `number` (default: `0`) - Offset from the top of the scroll container to consider a section active.
  - `offsetBottom?`: `number` (default: `0`) - Offset from the bottom of the scroll container.
  - `behavior?`: `'auto' | 'smooth'` (default: `'smooth'`) - Scroll behavior for tab clicks.

#### `UseScrollSyncReturn`

- `activeTab`: `string` - The ID of the currently active section/tab.
- `handleTabClick`: `(tabId: string) => void` - Function to call when a navigation tab is clicked. It will scroll to the corresponding section.


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
