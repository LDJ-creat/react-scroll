export interface ScrollSyncOptions {
  debounceDelay?: number; // 滚动事件的防抖延迟时间（毫秒），默认为 150
  stickinessFactor?: number; // 标签粘性因子，默认为 1.2
  observerThreshold?: number | number[]; // IntersectionObserver 的阈值，默认为 [0.1, 0.25, 0.5, 0.75, 1.0]
  // 从滚动容器顶部开始的偏移量，用于定义确定活动区域的“激活线”
  // 如果提供了 navTabsRef，则默认为 navTabsRef.current.offsetHeight + 5
  activeLineOffset?: number; 
  // 激活线下方用于考虑激活某个区域的高度
  activeZoneHeight?: number; // 默认为 200
  // 点击标签时的默认滚动行为
  defaultScrollBehavior?: ScrollBehavior; // 默认为 'smooth'
}

export interface UseScrollSyncProps {
  // 指向可滚动容器元素的 Ref
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  // 指向导航标签容器的 Ref（可选，用于计算默认的 activeLineOffset）
  navTabsRef?: React.RefObject<HTMLElement | null>;
  // 一个记录，其中键是唯一的区域 ID（必须与元素 ID 匹配），值是指向区域 HTMLElement 的 Ref
  sections: Record<string, React.RefObject<HTMLElement | null>>;
  // 初始应激活的标签/区域的 ID
  initialActiveTab?: string;
  // 当由于滚动或点击导致活动标签更改时触发的回调函数
  onActiveTabChange?: (tabId: string) => void;
  // Hook 的配置选项
  options?: ScrollSyncOptions;
}

export interface UseScrollSyncReturn {
  // 当前活动的标签/区域的 ID
  activeTab: string;
  // 处理导航标签点击的函数，滚动到相应的区域
  handleTabClick: (tabId: string, behavior?: ScrollBehavior) => void;
  // 由 Hook 附加到滚动容器的 Ref（内部使用，但如果需要则公开）
  // internalScrollContainerRef: React.RefObject<HTMLElement | null>;
  // 由 Hook 附加到导航标签的 Ref（内部使用）
  // internalNavTabsRef: React.RefObject<HTMLElement | null>;
}
