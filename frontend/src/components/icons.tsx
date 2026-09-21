import type { SVGProps } from "react";

export function DumbbellIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M6 12h12" />
      <rect x="4" y="6" width="2.5" height="12" rx="1" />
      <rect x="17.5" y="6" width="2.5" height="12" rx="1" />
      <rect x="1.5" y="8.5" width="2.5" height="7" rx="0.75" />
      <rect x="20" y="8.5" width="2.5" height="7" rx="0.75" />
    </svg>
  );
}
