import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useIsMobile({ isTablet = false }: { isTablet?: boolean } = {}) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${isTablet ? TABLET_BREAKPOINT - 1 : MOBILE_BREAKPOINT - 1}px)`
    );
    const onChange = () => {
      setIsMobile(window.innerWidth < (isTablet ? TABLET_BREAKPOINT : MOBILE_BREAKPOINT));
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < (isTablet ? TABLET_BREAKPOINT : MOBILE_BREAKPOINT));
    return () => mql.removeEventListener('change', onChange);
  }, [isTablet]);

  return !!isMobile;
}

export default function useWindowResize() {
  const [windowWidth, setWindowWidth] = useState<null | number>(null);
  useEffect(() => {
    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
    };
    handleWindowResize();
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  });
  return { windowWidth };
}
