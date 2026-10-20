// Small line icons for the feature tabs (24x24, drawn with simple SVG shapes).
// stroke="currentColor" = the icon takes the text colour, so CSS decides its colour.

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function SearchIcon() {
  return <Icon><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></Icon>;
}

export function PercentIcon() {
  return <Icon><path d="M19 5L5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></Icon>;
}

export function FileIcon() {
  return (
    <Icon>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  );
}

export function BuildingIcon() {
  return (
    <Icon>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2" />
    </Icon>
  );
}

export function ChatIcon() {
  return <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" /></Icon>;
}

export function CalendarIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
    </Icon>
  );
}
