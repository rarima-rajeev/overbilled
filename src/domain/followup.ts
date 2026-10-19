import { usd } from './checks.ts';
import { HOSPITAL } from './reference.ts';
import { LETTER_DISCLAIMER } from './letter.ts';
import type { Bill, ErrorType, Finding } from './types.ts';

// Level 4: what the agent may chase on its own, and when it must stop and hand back to the patient.

export const L4_RULES = {
  ruleBasedTypes: ['duplicate', 'unbundling', 'units'] as ErrorType[],
  maxAmountPerItem: 500,
  daysBetweenFollowUps: 14,
  maxFollowUps: 2,
};

export function l4Eligibility(f: Finding): { eligible: boolean; reason: string } {
  if (!L4_RULES.ruleBasedTypes.includes(f.type)) {
    return { eligible: false, reason: 'Price disputes need human judgment' };
  }
  if (f.overcharge >= L4_RULES.maxAmountPerItem) {
    return { eligible: false, reason: `${usd(f.overcharge)} is over the ${usd(L4_RULES.maxAmountPerItem)} auto limit` };
  }
  return { eligible: true, reason: 'Rule-based and under the limit' };
}

export type Scenario = 'no_reply' | 'corrected' | 'denied';

export interface TimelineEvent {
  day: number;
  actor: 'agent' | 'hospital' | 'you';
  title: string;
  detail: string;
  /** What the UI can attach to this event. */
  attach?: 'calendar' | 'followup1' | 'followup2' | 'handoff';
}

export function buildTimeline(scenario: Scenario, eligible: Finding[], handled: Finding[]): TimelineEvent[] {
  const sumOf = (fs: Finding[]) => usd(fs.reduce((s, f) => s + f.overcharge, 0));
  const gap = L4_RULES.daysBetweenFollowUps;
  const start: TimelineEvent[] = [
    { day: 0, actor: 'you', title: 'You approved and sent the dispute (Level 3)', detail: `Disputing ${sumOf([...eligible, ...handled])} in total.` },
    { day: 0, actor: 'agent', title: `Reminder set for day ${gap}`, detail: 'The agent adds a calendar check-in to look for a reply.', attach: 'calendar' },
  ];
  if (eligible.length === 0) {
    return [...start, { day: gap, actor: 'agent', title: 'Nothing to chase on its own', detail: 'No item meets the Level 4 rules, so every follow-up stays with you.', attach: 'handoff' }];
  }
  if (scenario === 'corrected') {
    return [
      ...start,
      { day: 9, actor: 'hospital', title: 'Hospital sends a corrected bill', detail: 'A reply arrived, so the agent stops sending anything.' },
      { day: 9, actor: 'agent', title: 'Re-audits the corrected bill', detail: `Checks that the ${eligible.length + handled.length} disputed items were removed: ${sumOf([...eligible, ...handled])} adjusted.` },
      { day: 9, actor: 'agent', title: 'Closes the dispute and notifies you', detail: 'Calendar reminder cancelled. Nothing left to do.' },
    ];
  }
  if (scenario === 'denied') {
    return [
      ...start,
      { day: 11, actor: 'hospital', title: 'Hospital rejects the dispute', detail: 'A reply arrived, so the agent stops. It never argues with a human on its own.' },
      { day: 11, actor: 'agent', title: 'Hands back to you with a draft response', detail: 'Drafts a reply asking for the written basis of each charge. Back to Level 2: you decide whether to send it.', attach: 'handoff' },
    ];
  }
  return [
    ...start,
    { day: gap, actor: 'agent', title: 'No reply. Sends follow-up #1 on its own', detail: `Covers only the ${eligible.length} item${eligible.length > 1 ? 's' : ''} that meet the Level 4 rules (${sumOf(eligible)}).`, attach: 'followup1' },
    { day: gap, actor: 'agent', title: `Reminder set for day ${gap * 2}`, detail: 'Next calendar check-in added.', attach: 'calendar' },
    { day: gap * 2, actor: 'agent', title: 'Still no reply. Sends follow-up #2 (final)', detail: `Asks for an account hold and a named contact. That's the limit of ${L4_RULES.maxFollowUps} automatic follow-ups.`, attach: 'followup2' },
    { day: gap * 2 + 7, actor: 'agent', title: 'Stops and hands back to you', detail: 'Suggested next step: call the billing office, or ask a patient advocate. The agent does not escalate on its own.', attach: 'handoff' },
  ];
}

export function followUpLetter(bill: Bill, items: Finding[], n: 1 | 2, sentOn: string): string {
  const total = usd(items.reduce((s, f) => s + f.overcharge, 0));
  const list = items.map((f) => `- Line ${f.line} (${f.code}): ${usd(f.overcharge)}. ${f.citation}`).join('\n');
  const ask =
    n === 1
      ? 'Could you confirm you received my dispute and tell me when I can expect a corrected bill?'
      : 'Please place my account on hold from collections while this is reviewed, and give me the name of a person I can contact about it.';
  return `${LETTER_DISCLAIMER}

To: ${HOSPITAL.billingEmail}
Subject: Follow-up ${n}: billing dispute sent ${sentOn}

Hello,

I am following up on my dispute of ${sentOn} and have not yet received a reply. These items are still open (${total}):

${list}

${ask}

Thank you,
${bill.patient}`;
}

/** A downloadable calendar reminder (.ics). Created in the browser; nothing is sent anywhere. */
export function reminderIcs(daysFromNow: number, billTitle: string): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Overbilled demo//EN',
    'BEGIN:VEVENT',
    `UID:overbilled-${ymd}-${daysFromNow}@demo`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd}`,
    `SUMMARY:Overbilled demo: check for a reply on the ${billTitle} dispute`,
    'DESCRIPTION:Simulated reminder from an educational demo.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
