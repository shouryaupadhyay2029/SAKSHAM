import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger with GSAP
gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollContextType {
  lenis: Lenis | null;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({ lenis: null });

export const useLenis = () => useContext(SmoothScrollContext);

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export const SmoothScrollProvider: React.FC<SmoothScrollProviderProps> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if prefers-reduced-motion is active
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Configure Lenis Options
    const lenisOptions = {
      duration: mediaQuery.matches ? 0 : 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard expo ease
      direction: 'vertical' as const,
      gestureDirection: 'vertical' as const,
      smooth: !mediaQuery.matches,
      mouseMultiplier: 1,
      smoothTouch: false, // native-feeling touch behaviors on mobile
      touchMultiplier: 2,
      infinite: false,
    };

    const lenis = new Lenis(lenisOptions);
    setLenisInstance(lenis);

    // Sync ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);

    // Connect Lenis updates to the GSAP ticker
    const tickerUpdate = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerUpdate);

    // Initial ScrollTrigger config to use Lenis scroll
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value as number, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
    });

    // Refresh triggers on resize
    const resizeListener = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', resizeListener);

    return () => {
      gsap.ticker.remove(tickerUpdate);
      lenis.destroy();
      window.removeEventListener('resize', resizeListener);
      setLenisInstance(null);
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisInstance }}>
      <div ref={containerRef} style={{ width: '100%' }}>
        {children}
      </div>
    </SmoothScrollContext.Provider>
  );
};
