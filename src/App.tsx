import { useEffect, useState } from 'react';
import { AuditPage } from './pages/AuditPage.tsx';
import { AutonomyPage } from './pages/AutonomyPage.tsx';
import { EconomicsPage } from './pages/EconomicsPage.tsx';
import { EvalsPage } from './pages/EvalsPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { HowPage } from './pages/HowPage.tsx';
import { LearnPage } from './pages/LearnPage.tsx';
import { MistakesPage } from './pages/MistakesPage.tsx';
import { TryPage } from './pages/TryPage.tsx';
import { useAppState } from './state.ts';

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'audit', label: 'Audit' },
  { id: 'try', label: 'Try it' },
  { id: 'autonomy', label: 'Autonomy' },
  { id: 'evals', label: 'Evals' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'costs', label: 'Costs' },
  { id: 'economics', label: 'Economics' },
  { id: 'how', label: 'How it works' },
  { id: 'learn', label: 'Learn' },
] as const;
type PageId = (typeof PAGES)[number]['id'];

const readRoute = (): PageId => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return PAGES.find((p) => p.id === id)?.id ?? 'home';
};

/** Hash routing (#/evals): works on any static host, no server rewrites needed. */
function useRoute() {
  const [route, setRoute] = useState<PageId>(readRoute);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

function PageNav({ route }: { route: PageId }) {
  const i = PAGES.findIndex((p) => p.id === route);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  return (
    <div className="page-nav">
      {prev ? <a href={prev.id === 'home' ? '#/' : `#/${prev.id}`}>← {prev.label}</a> : <span />}
      {next && (
        <a className="next" href={`#/${next.id}`}>
          {next.label} →
        </a>
      )}
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const s = useAppState();

  return (
    <>
      <div className="demo-banner">Educational demo · synthetic bills · fictional hospital · not medical, legal or billing advice</div>

      <header className="wrap top">
        <a className="brand" href="#/">
          <span className="logo">⚑</span> Overbilled
        </a>
        <nav>
          {PAGES.map((p) => (
            <a key={p.id} href={p.id === 'home' ? '#/' : `#/${p.id}`} className={route === p.id ? 'active' : ''} aria-current={route === p.id ? 'page' : undefined}>
              {p.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="wrap">
        {route === 'home' && <HomePage />}
        {route === 'audit' && <AuditPage s={s} />}
        {route === 'try' && <TryPage s={s} />}
        {route === 'autonomy' && <AutonomyPage s={s} />}
        {route === 'evals' && <EvalsPage s={s} />}
        {route === 'mistakes' && <MistakesPage s={s} part="stories" />}
        {route === 'costs' && <MistakesPage s={s} part="costs" />}
        {route === 'economics' && <EconomicsPage s={s} />}
        {route === 'how' && <HowPage />}
        {route === 'learn' && <LearnPage />}
        {route !== 'home' && <PageNav route={route} />}
      </main>

      <footer className="wrap foot muted">Overbilled · an AI product portfolio project · educational demo only</footer>
    </>
  );
}
