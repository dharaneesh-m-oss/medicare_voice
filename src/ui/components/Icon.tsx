/** Simple, high-contrast line icons. No icon library, no external requests. */

import type { ReactElement } from 'react';

export type IconName =
  | 'camera'
  | 'pills'
  | 'clock'
  | 'mic'
  | 'settings'
  | 'history'
  | 'play'
  | 'check'
  | 'close'
  | 'back'
  | 'speaker'
  | 'alert'
  | 'shield'
  | 'plus'
  | 'clipboard'
  | 'calendar'
  | 'stethoscope'
  | 'user'
  | 'users'
  | 'hospital'
  | 'heart'
  | 'activity'
  | 'smile'
  | 'chart'
  | 'search'
  | 'logout'
  | 'edit'
  | 'phone'
  | 'lock'
  | 'chevron'
  | 'google'
  | 'droplet'
  | 'moon'
  | 'steps'
  | 'note';

const PATHS: Record<IconName, ReactElement> = {
  camera: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2L9 4h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  pills: (
    <>
      <g transform="rotate(-35 9.4 10.6)">
        <rect x="2.4" y="7" width="14" height="7.2" rx="3.6" />
        <path d="M9.4 7v7.2" />
      </g>
      <circle cx="16.8" cy="16.8" r="4.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 5v4h4" />
      <path d="M12 8v4.4l3 1.8" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M14.5 5 7.5 12l7 7" />,
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4.2M12 16.8v.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 20 6.5v5.2c0 4.6-3.2 7.9-8 9.3-4.8-1.4-8-4.7-8-9.3V6.5z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 4.5h6v3H9zM8.5 12h7M8.5 16h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 3.5v5a4.5 4.5 0 0 0 9 0v-5" />
      <path d="M4.4 3.5h3.2M13.4 3.5h3.2" />
      <path d="M10.5 13v2.5a4.5 4.5 0 0 0 9 0V13" />
      <circle cx="19.5" cy="11.5" r="1.8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20.2a6 6 0 0 1 12 0" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 14.4a6 6 0 0 1 3.5 5.4" />
    </>
  ),
  hospital: (
    <>
      <path d="M4 20.5V8.2l8-4.7 8 4.7v12.3z" />
      <path d="M12 9.5v5M9.5 12h5M9.5 20.5v-3.5h5v3.5" />
    </>
  ),
  heart: (
    <path d="M12 20.2S3.8 15.4 3.8 9.9A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.2 2.5c0 5.5-8.2 10.3-8.2 10.3z" />
  ),
  activity: <path d="M3 12.5h4l2.5-7 4.5 14 2.5-7H21" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.6 14.2a4.4 4.4 0 0 0 6.8 0M9.5 9.6v.2M14.5 9.6v.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20.5V4" />
      <path d="M4 20.5h16" />
      <path d="M8 17V11M12.5 17V7.5M17 17v-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="M15.8 15.8 20.5 20.5" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4.5h-8a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8" />
      <path d="M17 8.5 20.5 12 17 15.5M20 12h-9" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.2l9.4-9.4a2.4 2.4 0 0 0-3.4-3.4L4.8 16.6z" />
      <path d="M13.6 6.4l4 4" />
    </>
  ),
  phone: (
    <path d="M7.2 3.8 9 8l-2 1.6a11.5 11.5 0 0 0 5.4 5.4L14 13l4.2 1.8v3.4a2 2 0 0 1-2.2 2C9.6 19.6 4.4 14.4 3.8 6.2a2 2 0 0 1 2-2.4z" />
  ),
  lock: (
    <>
      <rect x="4.6" y="10.5" width="14.8" height="9.8" rx="2.4" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  chevron: <path d="M9 5.5 15.5 12 9 18.5" />,
  google: (
    <path d="M20.5 12.2c0-.6-.05-1.2-.16-1.8H12v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6zM12 21c2.4 0 4.4-.8 5.9-2.2l-2.9-2.2c-.8.55-1.85.87-3 .87-2.3 0-4.25-1.55-4.95-3.65H4.05v2.3A9 9 0 0 0 12 21zM7.05 13.8a5.4 5.4 0 0 1 0-3.45v-2.3H4.05a9 9 0 0 0 0 8.05zM12 6.6c1.3 0 2.47.45 3.4 1.33l2.55-2.55A9 9 0 0 0 4.05 8.05l3 2.3C7.75 8.25 9.7 6.6 12 6.6z" />
  ),
  droplet: <path d="M12 3.4 6.9 9.9a6.6 6.6 0 1 0 10.2 0z" />,
  moon: <path d="M20 14.6A8.4 8.4 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z" />,
  steps: (
    <>
      <rect x="4" y="4" width="6" height="9.5" rx="3" />
      <path d="M4 13.5h6v3a3 3 0 0 1-6 0z" />
      <rect x="14" y="8.5" width="6" height="9.5" rx="3" />
      <path d="M14 18h6v2a3 3 0 0 1-6 0z" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.5h9.5L19 9v10.5H5z" />
      <path d="M14 4.5V9h5M8.5 12.5h7M8.5 16h4.5" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 28, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
