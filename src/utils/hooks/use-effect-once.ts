import { useEffect, useRef, useState } from 'react';

/**
 * 👀 只能用在挂载时只执行一次的场景，后续state变化参数里的effect逻辑也不会执行;
 * - https://dev.to/ag-grid/react-18-avoiding-use-effect-getting-called-twice-4i9e
 */
export const useEffectOnce = (effect: () => void | (() => void)) => {
  const destroyFn = useRef<void | (() => void)>();
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [, setVal] = useState<number>(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    // only execute the effect first time around
    if (!effectCalled.current) {
      destroyFn.current = effect();
      effectCalled.current = true;
    }

    // this forces one render after the effect is run
    // 执行完effect后，触发修改 renderAfterCalled
    setVal((val) => val + 1);

    return () => {
      // if the comp didn't render since the useEffect was called,
      // we know it's the dummy React cycle
      if (!renderAfterCalled.current) {
        return;
      }
      if (destroyFn.current) {
        destroyFn.current();
      }
    };
  }, []);
};
