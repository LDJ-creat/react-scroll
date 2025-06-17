# 📦 @dsmlll/react-scroll

一个用于同步导航组件与内容区滚动位置的 React 库。它提供了自定义 Hook `useScrollSync`，可监听滚动、根据可见区域自动高亮导航标签，并支持点击导航标签平滑滚动到对应内容区。

> [English](./README.md) | 简体中文

## ✨ 特性

- 点击导航标签可平滑滚动到对应内容区
- 滚动时自动高亮当前可见内容区对应的导航标签
- 滚动事件防抖处理，性能更优
- 支持自定义参数（如防抖延迟、偏移量等）
- 支持动态内容和基于 ref 的区块定位

## 🚀 安装

```bash
npm install @dsmlll/react-scroll
# 或
yarn add @dsmlll/react-scroll
```

## 💡 使用示例

```tsx
import React, { useRef, useMemo } from 'react';
import { useScrollSync } from '@dsmlll/react-scroll';

const MyPageComponent = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navTabsRef = useRef<HTMLDivElement>(null);

  // 定义区块及其 refs
  const sectionIds = ['section1', 'section2', 'section3'];
  const sectionRefObjects = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {};
    sectionIds.forEach(id => {
      refs[id] = React.createRef<HTMLDivElement>();
    });
    return refs;
  }, [sectionIds]);

  const { activeTab, handleTabClick } = useScrollSync({
    scrollContainerRef, // 滚动容器的 ref
    navTabsRef,         // 导航栏的 ref
    sections: sectionRefObjects, // 区块 id 到 ref 的映射
    initialActiveTab: sectionIds[0], // 可选，初始高亮的区块 id
    options: {
      debounceDelay: 100, // 可选，滚动事件防抖延迟
      // 还可设置 offsetTop、offsetBottom 等参数
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
            {/* 区块内容 */}
            <p style={{height: "500px"}}>滚动内容 {id}</p>
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

- `scrollContainerRef`: `React.RefObject<HTMLElement | null>` - 滚动容器的 ref。
- `navTabsRef`: `React.RefObject<HTMLElement | null>` - 导航栏容器的 ref。
- `sections`: `Record<string, React.RefObject<HTMLElement | null>>` - 区块 id 到 ref 的映射。
- `initialActiveTab?`: `string` - 初始高亮的区块 id。
- `onActiveTabChange?`: `(tabId: string) => void` - 高亮区块变化时的回调。
- `options?`: `ScrollSyncOptions`
  - `debounceDelay?`: `number` (默认: `100`) - 滚动事件防抖延迟（毫秒）。
  - `offsetTop?`: `number` (默认: `0`) - 距顶部偏移量。
  - `offsetBottom?`: `number` (默认: `0`) - 距底部偏移量。
  - `behavior?`: `'auto' | 'smooth'` (默认: `'smooth'`) - 点击导航时的滚动行为。

#### `UseScrollSyncReturn`

- `activeTab`: `string` - 当前高亮的区块 id。
- `handleTabClick`: `(tabId: string) => void` - 点击导航标签时调用，自动滚动到对应区块。


## 🤝 贡献

欢迎提交 PR 或 issue 参与贡献！

## 📄 许可证

本项目基于 MIT 协议开源，详见 [LICENSE](LICENSE)。
