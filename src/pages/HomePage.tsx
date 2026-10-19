import { useState } from 'react';
import { ProjectLinks } from './ProjectLinks.tsx';

/** Landing page: what Overbilled does, in a few sentences. Everything else lives on the other pages. */
export function HomePage() {
  const [hasImage, setHasImage] = useState(true);

  return (
    <>
    <section className={hasImage ? 'landing' : 'landing no-image'}>
      <div className="landing-text">
        <p className="wordmark">
          <span className="logo big-logo">⚑</span> Overbilled
        </p>
        <p className="eyebrow">Hospital bill checker</p>
        <h1>Find out how much extra you were charged on your hospital bill.</h1>
        <p className="lead">
          Overbilled reads your itemized hospital bill line by line and compares each charge with the hospital's own
          published prices and standard billing rules. It shows how much you may have been overcharged, and drafts a
          letter to dispute it.
        </p>
        <p className="note">
          US hospitals are required by law to publish their prices. In this demo, the hospital and its price list are
          fictional, and so are the bills.
        </p>
        <p className="powered">
          <span className="powered-dot" aria-hidden="true" />
          AI by <b>Claude Sonnet 5.5</b> (Anthropic), which writes the summaries and dispute letters. The billing checks
          themselves are plain code.
        </p>
        <div className="landing-actions">
          <a className="btn primary big" href="#/audit">
            See it on a sample bill →
          </a>
          <a className="btn big" href="#/try">
            Try your own bill
          </a>
        </div>
      </div>
      {hasImage && (
        <figure className="landing-figure">
          <img
            src="/landing-hero.jpg"
            alt="A person studying a hospital bill through a large magnifying glass"
            onError={() => setHasImage(false)}
          />
          <figcaption>AI-generated illustration</figcaption>
        </figure>
      )}
    </section>
    <ProjectLinks />
    </>
  );
}
