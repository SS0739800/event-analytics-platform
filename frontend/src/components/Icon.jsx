// Single icon set for the whole app, replacing the emoji we used to inline.
//
// All 24-grid, 1.5 stroke, no fills — so they inherit colour from the text
// beside them and stay the same weight everywhere. Emoji couldn't do either:
// they render differently per OS and drag their own colour in.

const PATHS = {
  grid:      <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  layers:    <><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" /><path d="M3 12.5 12 17l9-4.5" /><path d="M3 17 12 21.5 21 17" /></>,
  clock:     <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  trend:     <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  list:      <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>,
  calendar:  <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  tag:       <><path d="M3 11.5V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l8.5 8.5a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 12.2a1 1 0 0 1-.3-.7Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  sparkle:   <><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9L12 3Z" /><path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></>,
  search:    <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  chat:      <><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" /></>,
  edit:      <><path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="M14.5 5.5l4 4" /></>,
  trash:     <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
  close:     <><path d="M6 6l12 12M18 6L6 18" /></>,
  check:     <><path d="M4 12.5l5 5L20 6.5" /></>,
  warning:   <><path d="M12 3.5 1.5 21h21L12 3.5Z" /><path d="M12 9.5v5" /><path d="M12 18h.01" /></>,
  download:  <><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
  settings:  <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" /></>,
  arrowLeft: <><path d="M20 12H4" /><path d="M10 6l-6 6 6 6" /></>,
  link:      <><path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.7 1.7" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.7-1.7" /></>,
}

export default function Icon({ name, size = 16, className = '', style }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      className={`icon ${className}`.trim()}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  )
}
