// 防抖函数，用于限制函数的触发频率
export const debounce = <TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  waitFor: number,// 防抖延迟时间（毫秒）
) => {
  let timeoutId: number | null = null;

  return (...args: TArgs): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => func(...args), waitFor);
  };
};
