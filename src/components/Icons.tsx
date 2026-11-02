import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function svg(props: IconProps, path: ReactNode) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {path}
    </svg>
  );
}

export function IconMap(props: IconProps) {
  return svg(props, <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></>);
}

export function IconStar(props: IconProps) {
  return svg(props, <polygon points="12 3 14.5 8.8 21 9.3 16.2 13.5 17.6 20 12 16.8 6.4 20 7.8 13.5 3 9.3 9.5 8.8" />);
}

export function IconBell(props: IconProps) {
  return svg(props, <><path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
}

export function IconGear(props: IconProps) {
  return svg(props, <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>);
}

export function IconLocate(props: IconProps) {
  return svg(props, <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><line x1="12" y1="1" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="23" /><line x1="1" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="23" y2="12" /></>);
}

export function IconSearch(props: IconProps) {
  return svg(props, <><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></>);
}

export function IconWalk(props: IconProps) {
  return svg(props, <><circle cx="13" cy="4" r="1.4" fill="currentColor" stroke="none" /><path d="M13 6.5 10 10l2 3-2 6" /><path d="m10 10 5 2 3 6" /></>);
}

export function IconCar(props: IconProps) {
  return svg(props, <><path d="M4 13v4h2.2M18 17h2v-4M5 13 7 7h10l2 6z" /><circle cx="7.5" cy="17" r="1.6" /><circle cx="16.5" cy="17" r="1.6" /></>);
}

export function IconTransit(props: IconProps) {
  return svg(props, <><rect x="5" y="3" width="14" height="13" rx="3" /><path d="M8 16v3M16 16v3M5 10h14M8 6h.01M16 6h.01" /></>);
}

export function IconPin(props: IconProps) {
  return svg(props, <><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" /><circle cx="12" cy="10" r="2.2" /></>);
}

export function IconExternal(props: IconProps) {
  return svg(props, <><path d="M14 5h5v5" /><path d="M10 14 19 5" /><path d="M19 13v6H5V5h6" /></>);
}

export function IconClose(props: IconProps) {
  return svg(props, <><path d="M6 6l12 12M18 6 6 18" /></>);
}

export function IconMoon(props: IconProps) {
  return svg(props, <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z" />);
}

export function IconSun(props: IconProps) {
  return svg(props, <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M5 19l1.5-1.5" /></>);
}

export function IconInfo(props: IconProps) {
  return svg(props, <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>);
}

export function IconCheck(props: IconProps) {
  return svg(props, <path d="M5 12.5 10 17l9-10" />);
}

export function IconTrash(props: IconProps) {
  return svg(props, <><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" /></>);
}

export function IconRoundel(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
      <rect x="5" y="10.3" width="14" height="3.4" rx="0.4" fill="currentColor" />
    </svg>
  );
}
