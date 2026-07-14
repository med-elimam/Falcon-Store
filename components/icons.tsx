import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function FalconMark({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 96 72" aria-hidden="true" className={className} {...props}>
      <path
        d="M48 7 37 20 7 12l17 17L4 30l26 13-10 9 22 2 6 11 6-11 22-2-10-9 26-13-20-1 17-17-30 8L48 7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <path d="m39 29 9 7 9-7-3 14H42l-3-14Z" fill="currentColor" />
    </svg>
  );
}

export function CartIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.2 8H6" />
      <circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" />
    </svg>
  );
}

export function MenuIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <path d="M4 7h16M4 12h16M4 17h11" />
    </svg>
  );
}

export function CloseIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

export function ArrowLeft({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <path d="M19 12H5m6-6-6 6 6 6" />
    </svg>
  );
}

export function WhatsAppIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} {...props}>
      <path d="M20.5 11.7a8.3 8.3 0 0 1-12.3 7.2L3.5 20l1.2-4.6A8.3 8.3 0 1 1 20.5 11.7Z" />
      <path d="M8.2 7.8c.2-.5.5-.5.8-.5h.4c.2 0 .4.1.5.4l.8 2c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.5 0 .7.5 1 1.4 1.8 2.4 2.4.3.2.5.2.7 0l.8-1c.2-.2.4-.3.7-.2l1.9.9c.3.1.4.3.4.5 0 .7-.3 1.5-.9 1.9-.5.4-1.3.7-2.2.4-1.1-.3-2.7-1-4.4-2.5-1.3-1.2-2.2-2.7-2.5-3.7-.3-1-.1-1.8.3-2.3.3-.2.7-.4 1.1-.4Z" />
    </svg>
  );
}
