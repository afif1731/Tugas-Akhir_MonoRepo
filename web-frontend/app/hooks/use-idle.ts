import { useEffect, useState } from 'react';

export function useIdle(delay = 5000) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        setIsIdle(true);
      }, delay);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('keydown', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [delay]);

  return isIdle;
}
