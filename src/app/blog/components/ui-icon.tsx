const paths = {
  search: <><circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5" /></>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6" /></>,
  back: <path d="M20 12H5m6-6-6 6 6 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="1" /><path d="M16 8V3H3v13h5" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  file: <><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6" /></>,
  tag: <><path d="M3 4h8l10 10-7 7L3 10z" /><circle cx="7" cy="8" r="1" /></>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
  external: <><path d="M8 5h11v11M19 5 5 19" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  more: <><circle cx="5" cy="12" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="19" cy="12" r=".8" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  edit: <><path d="m4 16 11-11 4 4L8 20H4zM13 7l4 4" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 3 3 2-2 6 5" /></>,
} as const;

export function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
