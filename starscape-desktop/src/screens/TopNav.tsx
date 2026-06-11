// ---------------------------------------------------------------------------
// StarScape — top navigation bar (Cosmos Explorer views)
// ---------------------------------------------------------------------------

const ITEMS: Array<[path: string, label: string, key: string]> = [
  ['/explorer', 'Explorer', 'E'],
  ['/dashboard', 'Dashboard', 'D'],
  ['/journey', 'Journey', 'J'],
];

interface TopNavProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function TopNav({ pathname, onNavigate }: TopNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '0 1.5rem',
        background: 'rgba(5, 7, 20, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 191, 165, 0.15)',
      }}
    >
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('/');
        }}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: '0.8125rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#FFF8E7',
          textDecoration: 'none',
        }}
      >
        StarScape
      </a>

      <div style={{ display: 'flex', gap: '1.25rem', marginLeft: 'auto' }}>
        {ITEMS.map(([path, label, key]) => {
          const active = pathname === path;
          return (
            <a
              key={path}
              href={path}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(path);
              }}
              aria-current={active ? 'page' : undefined}
              title={`Shortcut: ${key}`}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6875rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: active ? '#00BFA5' : 'rgba(255,248,231,0.55)',
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
