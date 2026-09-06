import { useEffect, useState, useCallback } from "react";

/**
 * Centralized responsive layout system for Shinobi Clash.
 *
 * These hooks are the single source of truth for viewport-aware composition.
 * Pages/components consume them instead of scattering ad-hoc media-query
 * logic. All values update live on resize/orientation change.
 *
 * Device classes (baseline):
 *   mobile  < 768
 *   tablet  768–1199
 *   desktop 1200+
 *
 * Additional signals exposed: orientation, aspect ratio, compact-height
 * detection, safe-area insets, and a derived "layout mode" (compact vs
 * comfortable) that screens use to tune spacing/typography.
 */

const MOBILE_MAX = 767;
const TABLET_MAX = 1199;

function readVw() {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.width ?? window.innerWidth;
}
function readVh() {
  if (typeof window === "undefined") return 0;
  // visualViewport.height excludes browser chrome / keyboard — the real
  // usable area on mobile. Fall back to innerHeight.
  return window.visualViewport?.height ?? window.innerHeight;
}

/**
 * useViewport — live viewport dimensions + derived signals.
 */
export function useViewport() {
  const [vp, setVp] = useState(() => ({ width: readVw(), height: readVh() }));

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setVp({ width: readVw(), height: readVh() });
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (vv) vv.removeEventListener("resize", update);
    };
  }, []);

  const { width, height } = vp;
  const aspect = width && height ? width / height : 1;
  const orientation = width >= height ? "landscape" : "portrait";
  // A viewport is "short" when its usable height is low relative to width —
  // common in landscape phones and short laptops. We flag it so screens can
  // compress secondary chrome while keeping primary content visible.
  const isShort = height > 0 && height < 520;
  const isVeryShort = height > 0 && height < 420;

  return { width, height, aspect, orientation, isShort, isVeryShort };
}

/**
 * useDeviceClass — returns the current device class string.
 */
export function useDeviceClass() {
  const { width } = useViewport();
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * useOrientation — returns "portrait" | "landscape".
 */
export function useOrientation() {
  return useViewport().orientation;
}

/**
 * useSafeArea — reads the device safe-area insets (notches, home indicator).
 * Returns px numbers (0 when not supported / unavailable).
 */
export function useSafeArea() {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    const read = () => {
      const el = document.documentElement;
      const s = getComputedStyle(el);
      const px = (v) => {
        const m = String(v).match(/(\d+(?:\.\d+)?)px/);
        return m ? parseFloat(m[1]) : 0;
      };
      setInsets({
        top: px(s.getPropertyValue("--sat")),
        right: px(s.getPropertyValue("--sar")),
        bottom: px(s.getPropertyValue("--sab")),
        left: px(s.getPropertyValue("--sal")),
      });
    };
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);

  return insets;
}

/**
 * useResponsiveLayout — the combined "best view" engine. One hook gives a
 * screen everything it needs to compose itself for the current form factor.
 */
export function useResponsiveLayout() {
  const vp = useViewport();
  const device = vp.width <= MOBILE_MAX ? "mobile" : vp.width <= TABLET_MAX ? "tablet" : "desktop";
  const isMobile = device === "mobile";
  const isTablet = device === "tablet";
  const isDesktop = device === "desktop";
  // "compact" = mobile OR any short-height viewport (landscape phone, short
  // laptop). Screens use this to collapse secondary panels / compress gaps.
  const compact = isMobile || vp.isShort;
  // Touch input is assumed below desktop width OR on a short/portrait device.
  const touch = !isDesktop || vp.isShort;

  // Adaptive grid column hints for hero/card grids.
  const gridCols = isDesktop ? 5 : isTablet ? 4 : 2;

  // Whether the viewport has room for a side-by-side (two-column) composition.
  const twoCol = vp.width >= 768;

  return {
    ...vp,
    device,
    isMobile,
    isTablet,
    isDesktop,
    compact,
    touch,
    gridCols,
    twoCol,
  };
}

/** Convenience: stable callback returning the current device class. */
export function useIsDesktop() {
  return useDeviceClass() === "desktop";
}
