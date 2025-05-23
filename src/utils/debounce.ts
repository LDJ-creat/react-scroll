// Debounce function to limit the rate at which a function can fire.
// Using a more specific type for args instead of any[]
export const debounce = <TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  waitFor: number,
) => {
  let timeoutId: number | null = null;

  return (...args: TArgs): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => func(...args), waitFor);
  };
};
