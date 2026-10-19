// "More projects" card, matching the one on the WiseFlag site. Same links as WiseFlag.
// Icons are inline SVG versions of Lucide icons (ISC license).

const LINKS = {
  portfolio: 'https://rarima-rajeev.my.canva.site/',
  linkedin: 'https://www.linkedin.com/in/rarima-rajeev',
  github: 'https://github.com/rarima-rajeev',
};

const ICONS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  github: (
    <>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </>
  ),
  arrow: (
    <>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function ProjectLinks() {
  const items = [
    { label: 'Portfolio', href: LINKS.portfolio, icon: 'globe' as const },
    { label: 'LinkedIn', href: LINKS.linkedin, icon: 'linkedin' as const },
    { label: 'GitHub', href: LINKS.github, icon: 'github' as const },
  ];
  return (
    <section className="project-links">
      <h2>More projects and the full case study</h2>
      <p>The write-up, code and other AI product projects live here.</p>
      <div className="pl-grid">
        {items.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            <Icon name={l.icon} />
            {l.label}
            <span className="pl-arrow">
              <Icon name="arrow" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
