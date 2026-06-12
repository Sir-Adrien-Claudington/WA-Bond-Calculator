// ---------------------------------------------------------------------------
// GeoScape — slim top nav shared by the geology views
// ---------------------------------------------------------------------------

interface GeoNavProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

const ITEMS: Array<[string, string]> = [
  ['/geology', 'Strata Journey'],
  ['/minerals', 'Mineral Lab'],
];

export function GeoNav({ pathname, onNavigate }: GeoNavProps) {
  return (
    <nav className="geo-nav" aria-label="GeoScape navigation">
      <a
        href="/geology"
        className="geo-wordmark"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('/geology');
        }}
      >
        Geo<span>Scape</span>
      </a>
      <div className="geo-nav-links">
        {ITEMS.map(([path, label]) => (
          <a
            key={path}
            href={path}
            className={pathname === path ? 'geo-link geo-link-active' : 'geo-link'}
            aria-current={pathname === path ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(path);
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
