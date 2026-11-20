/** The Columnist mark: a table's header bar over two column rows, the key row in green. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
      <rect x="1" y="1" width="22" height="7" rx="3" fill="var(--ink)" />
      <rect x="5" y="11.5" width="3" height="3" fill="var(--green)" />
      <rect x="10" y="12" width="9" height="2" fill="var(--ink)" />
      <rect x="10" y="17" width="7" height="2" fill="var(--rule)" />
    </svg>
  );
}
