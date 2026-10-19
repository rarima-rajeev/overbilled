import { PhotoBand } from './PagePhoto.tsx';
import { ProjectLinks } from './ProjectLinks.tsx';
import { SpotTheMistakes } from './SpotTheMistakes.tsx';
// A learning page: when AI mistakes can cost lives, and how teams design for that.
// The scenario tables are general illustrations. The three real cases link to their sources.

interface Row {
  scenario: string;
  miss: string;
  falseAlarm: string;
  priority: string;
}

const HEALTHCARE: Row[] = [
  { scenario: 'Cancer screening (mammograms, skin spots)', miss: 'Cancer grows untreated', falseAlarm: 'An extra scan or biopsy, and worry', priority: 'Recall: never miss a cancer' },
  { scenario: 'Sepsis warning (a fast, deadly blood infection)', miss: 'A patient can die within hours', falseAlarm: 'So many alarms that staff start ignoring them', priority: 'Both, which is what makes it hard' },
  { scenario: 'Stroke detection on a brain scan', miss: 'The treatment window is lost; minutes mean brain damage', falseAlarm: 'An unneeded urgent call to a specialist', priority: 'Recall, and speed' },
  { scenario: 'Medication dosing (insulin, children\'s doses)', miss: '—', falseAlarm: 'A wrong number: mg read as mcg is a 1,000× dosing error', priority: 'Precision: every number must be exact' },
  { scenario: 'Drug-allergy check', miss: 'A penicillin-allergic patient gets penicillin', falseAlarm: 'A safe drug is blocked and treatment is delayed', priority: 'Recall: never miss an allergy' },
  { scenario: 'Symptom-checker chatbot', miss: 'Tells someone with heart-attack symptoms to rest at home', falseAlarm: 'Sends a healthy person to the ER', priority: 'Recall on emergencies' },
  { scenario: 'AI note-taker for doctors', miss: 'Leaves out an allergy the patient mentioned', falseAlarm: 'Writes a drug or dose the doctor never said', priority: 'Precision: notes become the medical record' },
];

const OTHER: Row[] = [
  { scenario: 'Self-driving cars', miss: 'Does not see a pedestrian', falseAlarm: 'Brakes hard for a plastic bag and gets hit from behind', priority: 'Both: either mistake can kill' },
  { scenario: 'Aircraft automation', miss: 'Does not react to a real danger', falseAlarm: 'Acts on a faulty sensor reading', priority: 'Never act on a single source of truth' },
  { scenario: 'Facial recognition in policing', miss: 'A suspect is not identified', falseAlarm: 'An innocent person is arrested', priority: 'Precision: a match is a lead, never proof' },
  { scenario: 'Food-allergy ordering systems', miss: 'A peanut allergy is not passed to the kitchen', falseAlarm: 'A safe dish is refused', priority: 'Recall on allergens' },
];

const CASES = [
  {
    tag: 'Healthcare · 2021',
    title: 'A widely used sepsis alert missed most sepsis cases',
    body:
      'Researchers at the University of Michigan tested a sepsis prediction model used in many US hospitals. It missed about two-thirds of the patients who had sepsis, while raising alerts on 18% of all hospitalized patients. It was a single-hospital study, but it showed how a model can look good on paper and fall short at the bedside.',
    lesson: 'Test a model on your own patients before trusting it, and watch both misses and alarm overload.',
    source: 'Wong et al., JAMA Internal Medicine (2021)',
    href: 'https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2781307',
  },
  {
    tag: 'Policing',
    title: 'A false face match led to a wrongful arrest',
    body:
      'Police arrested a man at his home after a facial recognition search wrongly matched him to a shoplifting suspect. He was held for 30 hours before the charges were dropped. A civil-liberties group called it the first known wrongful arrest in the US based on facial recognition.',
    lesson: 'An AI match should start an investigation, never end one.',
    source: 'NBC News (2020)',
    href: 'https://www.nbcnews.com/tech/security/facial-recognition-leads-first-wrongful-u-s-arrests-activists-say-n1231971',
  },
  {
    tag: 'Aviation · 2018–2019',
    title: 'Automation that trusted one faulty sensor',
    body:
      "The Boeing 737 MAX's MCAS system (automation, not AI) could push the plane's nose down based on a single angle-of-attack sensor. Faulty readings from that one sensor contributed to two fatal crashes. Boeing later changed the system to compare both sensors before acting.",
    lesson: 'Never let an automated system act alone on a single signal.',
    source: 'US House Transportation Committee final report (2020)',
    href: 'https://democrats-transportation.house.gov/imo/media/doc/final_boeing_737_max_report.pdf',
  },
];

const PRINCIPLES = [
  { title: 'AI assists, a human decides', body: 'In clinical care the AI flags and the clinician decides. On the Overbilled ladder that is L1 or L2, never L4.' },
  { title: 'Know which mistake is deadly', body: 'For cancer, missing is worst. For dosing, a wrong number is worst. Tune for that mistake, not for "accuracy".' },
  { title: 'Never trust a single signal', body: 'Use a second, independent check: two sensors, two readers, a pharmacist review.' },
  { title: 'Fail safe', body: 'When the AI is unsure, it hands over to a person instead of guessing.' },
  { title: 'Avoid alarm overload', body: 'Too many false alarms train people to ignore the real one.' },
  { title: 'Keep watching after launch', body: 'Real-world performance often drops. Monitor it and pull autonomy back when it does.' },
];

function ScenarioTable({ rows }: { rows: Row[] }) {
  return (
    <div className="table-scroll">
      <table className="gates rules learn-table">
        <thead>
          <tr>
            <th>Where AI is used</th>
            <th>If the AI misses something</th>
            <th>If the AI raises a false alarm</th>
            <th>What matters most</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.scenario}>
              <td>
                <b>{r.scenario}</b>
              </td>
              <td>{r.miss}</td>
              <td>{r.falseAlarm}</td>
              <td>{r.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LearnPage() {
  return (
    <>
      <section className="page-head">
        <h1>When AI mistakes cost lives</h1>
        <p className="sub">
          A learning page. In some fields an AI mistake costs money; in others it can cost a life. Here is why high-stakes AI
          needs more than high accuracy, and how teams design for the mistakes that will still happen.
        </p>
      </section>

      <SpotTheMistakes />

      <section className="card">
        <h2>In healthcare</h2>
        <p className="muted">General examples of what each kind of mistake would mean.</p>
        <ScenarioTable rows={HEALTHCARE} />
      </section>

      <section className="card">
        <h2>Outside healthcare</h2>
        <p className="muted">The same pattern: know which mistake is dangerous, and design around it.</p>
        <ScenarioTable rows={OTHER} />
      </section>

      <PhotoBand name="learn2" layout="left">In healthcare, an AI mistake can cost far more than money.</PhotoBand>
      <section className="card">

        <h2>Three real cases</h2>
        <div className="cases">
          {CASES.map((c) => (
            <article key={c.title} className="case">
              <span className="case-tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <p className="story-lesson">👉 {c.lesson}</p>
              <a className="small" href={c.href} target="_blank" rel="noopener noreferrer">
                Source: {c.source} ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>How teams design for it</h2>
        <p className="muted">No AI is 100% accurate, so life-critical systems are built so a single mistake cannot do harm alone.</p>
        <div className="principles">
          {PRINCIPLES.map((p, i) => (
            <div key={p.title}>
              <span className="flow-n">{i + 1}</span>
              <b>{p.title}</b>
              <span className="muted small">{p.body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card fits">
        <h2>Where Overbilled fits</h2>
        <p>
          Overbilled's mistakes cost money, not lives, so the agent may send a dispute after one approval click (L3). In a
          clinical tool, such as dosing or a sepsis alert, I would keep the AI at L1 or L2 permanently: it flags and a
          clinician decides, with an independent second check.
        </p>
        <p className="big-line">How much autonomy you give an AI should depend on what its mistakes cost.</p>
      </section>

      <ProjectLinks />
    </>
  );
}
