import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

/**
 * Initializes GSAP-based block reveal animations on all elements
 * containing the '.reveal-block' class.
 * It dynamically injects the required overlay and inner wraps,
 * and sets up ScrollTrigger timelines to perform the reveal.
 */
export function initScrollReveals(): void {
  const revealElements = document.querySelectorAll('.reveal-block:not(.reveal-initialized)');

  revealElements.forEach((el) => {
    const element = el as HTMLElement;
    const revealColor = element.getAttribute('data-reveal-color') || '#F47C20';
    
    // Mark as initialized
    element.classList.add('reveal-initialized');

    // Store original content
    const originalContent = element.innerHTML;
    element.innerHTML = '';

    // Create inner wrapper
    const inner = document.createElement('span');
    inner.className = 'reveal-block-inner';
    inner.innerHTML = originalContent;

    // Create overlay block
    const overlay = document.createElement('span');
    overlay.className = 'reveal-overlay';
    overlay.style.backgroundColor = revealColor;

    // Append to container
    element.appendChild(inner);
    element.appendChild(overlay);

    // Create GSAP Timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        toggleActions: 'play none none none',
        once: true,
      },
    });

    tl.set(overlay, { transformOrigin: 'left center', scaleX: 0 })
      .to(overlay, {
        scaleX: 1,
        duration: 0.4,
        ease: 'power2.inOut',
      })
      .set(inner, { opacity: 1 })
      .set(overlay, { transformOrigin: 'right center' })
      .to(overlay, {
        scaleX: 0,
        duration: 0.4,
        ease: 'power2.inOut',
      });
  });
}
