import type React from 'react';

// Page photos. All from Unsplash under the free Unsplash License (checked on each photo's page; none are
// Unsplash+). The license does not require credit, so none is shown on the site; sources are kept here.

export const PHOTOS = {
  audit: { alt: 'A man reading a document at his kitchen table', by: 'Vitaly Gariev', id: '8BuTwOlhLr0' },
  tryit: { alt: 'A calculator and a pen on a sheet of paper', by: 'Aaron Lefler', id: 'Vs6ip7fsld8' },
  autonomy: { alt: 'A man signing a document with a pen', by: 'Jakub Żerdzicki', id: 'QI6NLgN5XnM' },
  evals: { alt: 'A pencil on a multiple-choice answer sheet', by: 'Nguyen Dang Hoang Nhu', id: 'cbEvoHbJnIE' },
  mistakes: { alt: 'Two pencils and a sharpener on a light surface', by: 'Edz Norton', id: 'PT1rxWZ3lP0' },
  costs: { alt: 'A calculator, coins and banknotes on a table', by: 'Sasun Bughdaryan', id: 'X4VwfPzy_2o' },
  economics: { alt: 'A person working with a calculator and a notebook', by: 'Jakub Żerdzicki', id: 'LNnmSumlwO4' },
  how: { alt: 'A notepad on top of a laptop', by: 'Fiona Murray-deGraaff', id: '91fyuCdgtsM' },
} as const;

export type PhotoName = keyof typeof PHOTOS;

/** Header photo. The layout (left, right or banner) comes from the parent's class. */
export function PagePhoto({ name, overlay }: { name: PhotoName; overlay?: React.ReactNode }) {
  return (
    <figure className="page-photo">
      <img src={`/photos/${name}.jpg`} alt={PHOTOS[name].alt} loading="lazy" />
      {overlay && <div className="photo-overlay">{overlay}</div>}
    </figure>
  );
}

// Mid-page photos, also free under the Unsplash License (sources kept here, not shown on the site).
export const BAND_PHOTOS = {
  audit2: { alt: 'A hospital reception desk', by: 'Malcolm Choong', id: '27zLImvxwV0' },
  tryit2: { alt: 'Hands typing on a laptop', by: 'Burst', id: 'kUqqaRjJuw0' },
  autonomy2: { alt: 'A paper envelope with a red stamp', by: 'Valeria Reverdo', id: 'rKluCY7dPN4' },
  evals2: { alt: 'A hand ticking boxes on a checklist', by: 'Jakub Żerdzicki', id: 'yKnIbJV0RbY' },
  mistakes2: { alt: 'Red crosses arranged around a tick mark', by: 'Yumu', id: 'MYwtNqVjC7o' },
  costs2: { alt: 'Coins dropping into a piggy bank', by: 'Sasun Bughdaryan', id: 'eE4uRsnNCsI' },
  economics2: { alt: 'Stacks of coins', by: 'Ibrahim Rifath', id: 'OApHds2yEGQ' },
  how2: { alt: 'A hand-drawn workflow diagram', by: 'Kelly Sikkema', id: 'wdnpaTNwOEQ' },
  learn2: { alt: 'A nurse wheeling a baby incubator down a hospital corridor', by: 'Hush Naidoo Jade Photography', id: 'ZCO_5Y29s8k' },
} as const;

/**
 * A photo with one short line of text, placed between sections.
 * "wide" puts the text over a full-width photo; "left"/"right" put the photo beside the text.
 */
export function PhotoBand({ name, layout, children }: { name: keyof typeof BAND_PHOTOS; layout: 'wide' | 'left' | 'right'; children: React.ReactNode }) {
  return (
    <section className={`photo-band ${layout}`}>
      <img src={`/photos/${name}.jpg`} alt={BAND_PHOTOS[name].alt} loading="lazy" />
      <p>{children}</p>
    </section>
  );
}

/** A bold headline (the site's own words, not a quotation) with a supporting line, beside a header photo. */
export function HeadQuote({ quote, children }: { quote: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="head-quote">
      <p className="hq-main">{quote}</p>
      {children && <div className="hq-sub">{children}</div>}
    </div>
  );
}
