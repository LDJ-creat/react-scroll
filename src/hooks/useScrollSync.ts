import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from '../utils/debounce'; // 导入防抖函数
import { UseScrollSyncProps, UseScrollSyncReturn, ScrollSyncOptions } from '../types'; // 导入类型定义

// 默认的防抖延迟时间（毫秒）
const DEFAULT_DEBOUNCE_DELAY = 150;
// 默认的粘性因子，用于判断是否切换激活的标签，新标签的可见高度需要大于当前激活标签可见高度 * 粘性因子才切换
const DEFAULT_STICKINESS_FACTOR = 1.05; // 从 1.2 修改为 1.05
// IntersectionObserver 的默认阈值，表示目标元素与根元素交叉区域的比例
const DEFAULT_OBSERVER_THRESHOLD = [0.1, 0.25, 0.5, 0.75, 1.0];
// 激活区域的默认高度（像素），用于 IntersectionObserver 的 rootMargin 计算
const DEFAULT_ACTIVE_ZONE_HEIGHT = 200;
// 默认的滚动行为，'smooth' 表示平滑滚动
const DEFAULT_SCROLL_BEHAVIOR = 'smooth';

/**
 * useScrollSync Hook 用于同步滚动容器中内容区域与导航标签的状态。
 * @param scrollContainerRef - 对滚动容器元素的引用。
 * @param navTabsRef - （可选）对导航标签容器元素的引用，用于计算偏移量。
 * @param sections - 一个对象，键是标签ID，值是对相应内容区域元素的引用。
 * @param initialActiveTab - （可选）初始激活的标签ID。
 * @param onActiveTabChange - （可选）当激活的标签发生变化时的回调函数。
 * @param userOptions - （可选）用户自定义的配置选项。
 * @returns 返回一个对象，包含当前激活的标签 (activeTab) 和处理标签点击的函数 (handleTabClick)。
 */
export const useScrollSync = ({
  scrollContainerRef, // 滚动容器的引用
  navTabsRef, // 导航栏的引用
  sections, // 内容区域元素的引用集合
  initialActiveTab, // 初始激活的标签ID
  onActiveTabChange, // 激活标签变化时的回调
  options: userOptions, // 用户自定义选项，重命名以避免与解构的 options 冲突
}: UseScrollSyncProps): UseScrollSyncReturn => {
  // 显式声明 userOptions 类型并为 options 对象本身提供默认值
  const options: ScrollSyncOptions = { ...userOptions };

  // 从类型化的 options 中解构配置项，并提供默认值
  const {
    debounceDelay = DEFAULT_DEBOUNCE_DELAY, // 防抖延迟时间
    stickinessFactor = DEFAULT_STICKINESS_FACTOR, // 粘性因子
    observerThreshold = DEFAULT_OBSERVER_THRESHOLD, // IntersectionObserver 阈值
    activeLineOffset, // 激活线的偏移量，如果提供，则优先于 navTabsRef 计算的高度
    activeZoneHeight = DEFAULT_ACTIVE_ZONE_HEIGHT, // 激活区域高度
    defaultScrollBehavior = DEFAULT_SCROLL_BEHAVIOR, // 默认滚动行为
  } = options;

  // useCallback 用于获取初始激活的标签ID，依赖于 initialActiveTab 和 sections
  const getInitialActiveTab = useCallback(() => {
    if (initialActiveTab) return initialActiveTab; // 如果提供了 initialActiveTab，则使用它
    const sectionKeys = Object.keys(sections); // 获取所有内容区域的键
    return sectionKeys.length > 0 ? sectionKeys[0] : ''; // 返回第一个区域的键或空字符串
  }, [initialActiveTab, sections]);

  // useState 用于管理当前激活的标签ID
  const [activeTab, setActiveTab] = useState<string>(getInitialActiveTab());
  // useRef 用于存储当前激活标签的引用，以便在回调中访问最新值而无需将其作为依赖项
  const activeTabRef = useRef(activeTab);

  // useRef 用于标记当前滚动是否由程序触发（例如，点击标签）
  const isProgrammaticScrollRef = useRef(false);
  // useRef 用于存储编程式滚动后的超时计时器ID
  const programmaticScrollTimeoutRef = useRef<number | null>(null); // 将 NodeJS.Timeout 改为 number

  // useEffect 用于在 activeTab 变化时更新 activeTabRef 并调用 onActiveTabChange 回调
  useEffect(() => {
    activeTabRef.current = activeTab; // 更新 ref 中的当前激活标签
    if (onActiveTabChange) {
      onActiveTabChange(activeTab); // 调用外部回调
    }
  }, [activeTab, onActiveTabChange]);

  // useEffect 用于在 initialActiveTab 或 sections 变化时重置激活的标签
  useEffect(() => {
    setActiveTab(getInitialActiveTab());
  }, [getInitialActiveTab]);

  // useCallback 用于处理导航标签的点击事件
  const handleTabClick = useCallback((tabId: string, behavior?: ScrollBehavior) => {
    const sectionRef = sections[tabId]; // 获取对应内容区域的引用
    const element = sectionRef?.current; // 获取内容区域的 DOM 元素
    const scrollContainer = scrollContainerRef.current; // 获取滚动容器的 DOM 元素

    if (element && scrollContainer) {
      // 获取导航栏的高度，如果 navTabsRef 未提供或高度为0，并且没有设置 activeLineOffset，则使用默认值
      let navTabsHeight = navTabsRef?.current?.offsetHeight ?? 0;
      if (navTabsHeight === 0 && activeLineOffset === undefined) {
        console.warn(
          '[useScrollSync] navTabsHeight is 0 or navTabsRef not provided, and no activeLineOffset set. Defaulting to 60px for scroll calculation. This might lead to inaccurate scrolling.'
        );
        navTabsHeight = 60; // 默认导航栏高度
      }

      // 计算有效的导航栏高度/激活线偏移量
      const effectiveNavHeight = activeLineOffset !== undefined ? activeLineOffset : navTabsHeight;
      // 计算目标元素相对于滚动容器顶部的偏移量
      const elementTopInScrollContainer = element.offsetTop;
      // 计算最终的滚动位置，使其位于导航栏下方(保证导航栏始终显示)
      const scrollToPosition = elementTopInScrollContainer - effectiveNavHeight;

      // 如果存在进行中的编程式滚动超时，则清除它
      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }

      isProgrammaticScrollRef.current = true; // 标记为编程式滚动
      setActiveTab(tabId); // 立即更新激活的标签

      // 执行滚动操作
      scrollContainer.scrollTo({
        top: scrollToPosition,
        behavior: behavior || defaultScrollBehavior, // 使用传入的 behavior 或默认滚动行为
      });

      // 设置一个超时，在滚动动画结束后将 isProgrammaticScrollRef 设置回 false
      // 800ms 是一个估计的平滑滚动持续时间
      programmaticScrollTimeoutRef.current = window.setTimeout(() => { // 使用 window.setTimeout
        isProgrammaticScrollRef.current = false;
      }, 800);
    }
  }, [
    sections,
    scrollContainerRef,
    navTabsRef,
    activeLineOffset,
    defaultScrollBehavior,
    setActiveTab // 将 setActiveTab 添加为 useCallback 的依赖项，因为它在内部被使用
  ]);

  // useRef 和 debounce 用于创建一个防抖函数，以避免在滚动过程中频繁更新激活的标签
  const debouncedUpdateActiveTab = useRef(
    debounce((tabId: string) => {
      // 只有当新的 tabId 有效且与当前激活的标签不同时才更新
      if (tabId && tabId !== activeTabRef.current) {
        setActiveTab(tabId);
      }
    }, debounceDelay)
  ).current;

  // useEffect 用于设置和管理 IntersectionObserver，以在用户滚动时自动更新激活的标签
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current; // 获取滚动容器元素
    const currentNavTabsRef = navTabsRef?.current; // 获取导航栏元素

    // 如果滚动容器不存在或没有内容区域，则不执行任何操作
    if (!scrollContainer || Object.keys(sections).length === 0) {
      return;
    }

    // 计算导航栏高度，用于 IntersectionObserver 的 rootMargin
    let calculatedNavTabsHeight = currentNavTabsRef?.offsetHeight ?? 0;
    if (calculatedNavTabsHeight === 0 && activeLineOffset === undefined) {
      // 如果导航栏高度为0或未提供，并且没有设置 activeLineOffset，则使用默认值并发出警告
      console.warn(
        '[useScrollSync Observer] navTabsHeight is 0 or navTabsRef not provided, and no activeLineOffset set. Defaulting to 60px for observer rootMargin. This might affect active section detection.'
      );
      calculatedNavTabsHeight = 60; // 默认导航栏高度
    }
    
    // 计算有效的激活线偏移量，优先使用 activeLineOffset，否则使用计算出的导航栏高度 + 5px 的额外间距
    const effectiveActiveLineOffset = activeLineOffset !== undefined ? activeLineOffset : (calculatedNavTabsHeight + 5);
    // 获取滚动容器的客户端高度
    const scrollContainerClientHeight = scrollContainer.clientHeight;

    if (scrollContainerClientHeight === 0) {
      // 如果滚动容器高度为0（可能在布局未稳定时发生），发出警告
      console.warn(
        '[useScrollSync Observer] scrollContainer.clientHeight is 0. Observer might not function correctly until layout is stable.'
      );
    }

    // 计算 IntersectionObserver rootMargin 的底部偏移量
    // 确保底部偏移量不为负数
    const bottomOffsetForRootMargin = Math.max(
      0,
      scrollContainerClientHeight - effectiveActiveLineOffset - activeZoneHeight // 滚动容器高度 - 顶部偏移 - 激活区域高度
    );

    // IntersectionObserver 的配置选项
    const observerOptions: IntersectionObserverInit = {
      root: scrollContainer, // 根元素，即滚动容器
      // rootMargin 定义了根元素的边界框在计算交叉区域时的偏移量
      // 格式: "top right bottom left"
      // 顶部偏移: -effectiveActiveLineOffset px (将观察区域的顶部向下移动，使得元素顶部接触到激活线时触发)
      // 底部偏移: -bottomOffsetForRootMargin px (将观察区域的底部向上移动，使得元素在激活区域内时被视为可见)
      rootMargin: `-${effectiveActiveLineOffset}px 0px -${bottomOffsetForRootMargin}px 0px`,
      threshold: observerThreshold, // 触发回调的交叉比例阈值
    };    

    // IntersectionObserver 的回调函数，当观察的元素与根元素的交叉状态发生变化时调用
    const observerCallback: IntersectionObserverCallback = (entries) => {
      // 如果是编程式滚动(即用户点击导航栏标签触发的滚动)，则忽略 IntersectionObserver 的回调
      if (isProgrammaticScrollRef.current) {
        return;
      }

      const currentActualActiveTabId = activeTabRef.current; // 获取当前实际激活的标签ID

      // 处理 IntersectionObserver 的条目
      const processedEntries = entries.map((entry) => ({
        id: entry.target.id, // 目标元素的ID
        isIntersecting: entry.isIntersecting, // 是否与根元素交叉
        intersectionRatio: entry.intersectionRatio, // 交叉区域的比例
        boundingClientRectTop: entry.boundingClientRect.top, // 目标元素相对于视口的顶部位置
        // 计算在激活线下方可见的高度
        visibleHeightBelowActiveLine: Math.max(
          0,
          (entry.intersectionRect?.bottom ?? 0) - effectiveActiveLineOffset
        ),
      }));
      
      // 筛选出当前可见的候选内容区域
      const visibleCandidates = processedEntries.filter(
        (item) =>
          item.isIntersecting && // 必须与根元素交叉
          item.visibleHeightBelowActiveLine > 0 && // 在激活线下方必须有可见高度
          item.intersectionRatio > 0.05 // 确保至少有5%的交叉比例，以避免微小的交叉触发更新
      );

      // 如果没有强可见的候选区域
      if (visibleCandidates.length === 0) {
        // 检查当前激活的区域是否仍然稍微可见
        const currentSectionEntry = processedEntries.find(e => e.id === currentActualActiveTabId);
        if (currentSectionEntry?.isIntersecting && currentSectionEntry.intersectionRatio > 0.01) {
            // 如果当前激活的区域仍然有一点可见，则不改变激活标签
            // debouncedUpdateActiveTab(currentActualActiveTabId); // 可选：如果需要，可以重新确认当前标签
            return;
        }
        // 如果没有任何区域可见，则不改变标签，或根据需要决定回退策略
        return;
      }

      // 对可见的候选区域进行排序
      visibleCandidates.sort((a, b) => {
        // 主要排序：intersectionRatio (降序)
        if (b.intersectionRatio !== a.intersectionRatio) {
          return b.intersectionRatio - a.intersectionRatio;
        }
        // 次要排序：visibleHeightBelowActiveLine (降序)
        // 如果 intersectionRatio 相同，优先选择在激活线下方可见高度更大的
        if (b.visibleHeightBelowActiveLine !== a.visibleHeightBelowActiveLine) {
          return b.visibleHeightBelowActiveLine - a.visibleHeightBelowActiveLine;
        }
        // 三级排序：元素顶部与激活线的接近程度 (升序)
        // 如果以上都相同，优先选择顶部更接近激活线的
        return (
          Math.abs(a.boundingClientRectTop - effectiveActiveLineOffset) - 
          Math.abs(b.boundingClientRectTop - effectiveActiveLineOffset)
        );
      });

      let newPotentialActiveId = visibleCandidates[0].id; // 将排序后的第一个候选区域作为潜在的新激活标签
      const topSortedCandidate = visibleCandidates[0]; // 获取排序最高的候选者

      // 查找当前激活的标签是否在可见候选列表中
      const currentActiveCandidateInList = visibleCandidates.find(
        (vc) => vc.id === currentActualActiveTabId
      );

      // 如果当前激活的标签在可见列表中，并且排序最高的候选者不是当前激活的标签
      if (
        currentActiveCandidateInList &&
        topSortedCandidate.id !== currentActualActiveTabId
      ) {
        // 使用 intersectionRatio 进行粘性比较，因为它是主要的排序指标
        const scoreNew = topSortedCandidate.intersectionRatio;
        const scoreCurrent = currentActiveCandidateInList.intersectionRatio;
        
        // 应用粘性因子：只有当新候选者的得分显著高于当前激活候选者的得分时，才切换激活标签
        if (scoreNew < scoreCurrent * stickinessFactor) { 
          newPotentialActiveId = currentActualActiveTabId; // 保持当前激活的标签
        }
      }
      // 使用防抖函数更新激活的标签
      debouncedUpdateActiveTab(newPotentialActiveId);
    };

    // 创建 IntersectionObserver 实例
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elementsToObserve: HTMLElement[] = []; // 存储需要观察的元素

    // 遍历所有内容区域，并开始观察它们
    Object.keys(sections).forEach((key) => {
      const sectionRef = sections[key];
      if (sectionRef?.current) {
        elementsToObserve.push(sectionRef.current); // 将元素添加到待观察列表
        observer.observe(sectionRef.current); // 开始观察元素
      } else {
        // 如果某个内容区域的元素未找到，发出警告
        console.warn(`[useScrollSync Observer] Section element for key ${key} not found.`);
      }
    });

    // 清理函数：在组件卸载或依赖项变化时停止观察并清除超时
    return () => {
      elementsToObserve.forEach((el) => observer.unobserve(el)); // 停止观察所有元素
      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current); // 清除编程式滚动的超时
      }
    };
  }, [
    scrollContainerRef,
    navTabsRef, 
    sections,
    debouncedUpdateActiveTab, // debouncedUpdateActiveTab 在此 effect 中使用
    observerThreshold,
    activeLineOffset,
    activeZoneHeight,
    stickinessFactor, // stickinessFactor 在此 effect 的依赖项中使用
    // getInitialActiveTab, // 此 effect 不直接使用，但它影响 activeTab，而 activeTab 通过 activeTabRef 使用
  ]);

  // 确保 hook 返回定义的 UseScrollSyncReturn 结构
  return { activeTab, handleTabClick }; // 返回 activeTab 和 handleTabClick
};
