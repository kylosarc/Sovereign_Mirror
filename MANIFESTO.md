# Sovereign Mirror - Manifesto of Bounded Claims

## What this is not

This is not a system with "no opinion." Every threshold, every quorum size, every
line that decides what counts as a fallacy or as harm is a choice someone made.
Pretending otherwise doesn't remove the choice - it just hides who made it and
makes it harder to challenge.

This is not objective truth. Nothing that scores agreement between people is
measuring truth; it's measuring agreement. Community Notes proved that
cross-tribal agreement is a genuinely useful, measurable, actionable signal.
It did not prove that agreement equals truth, and neither will this.

This is not a civilizational-scale system yet, and it will not claim to be
one before it has earned it. A single committee that works honestly is worth
more than a planetary network that works by assertion.

## What this is

An experiment in making value judgments **visible, attributable, and
revisable**, instead of buried inside a black box and defended as neutral.

The engineering half of this project - sortition-selected committees, a
quorum formula with an actual proof behind it, a fallacy classifier
benchmarked against real labeled data - can be built honestly and verified.
The governance half - what counts as harmful, what counts as a fallacy
worth flagging, how large a committee needs to be - cannot be automated
away. This project's job is to do the first well and be transparent about
never having escaped the second.

## Core character traits

These aren't aspirations. Each one is required to show up as a concrete
mechanism in the code and the process, or it doesn't count.

### Humility

- Every constant in this system has a name, an owner, a stated reason, and
  an expiry date. Nothing is permanent by default. A threshold that hasn't
  been reviewed by its expiry date is flagged stale in the audit log, not
  quietly assumed still correct.
- Every score this system emits carries a stated scope of validity  - 
  what it actually measured, and what it did not - the same way a confidence
  interval travels with a statistic. A veracity score says "N raters in this
  committee agreed," never "this is true."
- The system tracks its own calibration (predicted confidence vs. actual
  outcome) and publishes when it's overconfident. A system that never
  reports its own error rate isn't humble, it's just quiet.
- Every quorum decision logs the strongest dissenting argument, not just
  the tally. Consensus that erases the minority view isn't consensus, it's
  suppression with a vote count attached.
- Failure conditions are written down before the experiment runs, not
  invented afterward to explain a bad result. See the pilot's success/failure
  criteria in `PILOT_COMMITTEE_SPEC.md`.

### Honesty

- No number ships without the methodology that produced it. If a precision
  or recall figure can't be backed by a labeled dataset and a confusion
  matrix, it doesn't get stated as a system property - see the fallacy
  classifier's actual benchmark gaps, documented rather than smoothed over.
- Decorative signals are labeled decorative. A live external feed doesn't
  get called "structural" unless code actually depends on it, with a stated
  fallback for when that feed is unreachable.

### Contestability

- Every threshold has a documented appeal path. Disagreement with a value
  choice is not routed to "recalibrate the model" - it's routed to a human
  process that can change the constant, on the record.
- The system does not get to grade its own contestability. That's an
  external audit's job, not a self-report.

### Boundedness

- Prove it at the scale of one committee before claiming it works at the
  scale of a network. No `MAX_NODES` gets raised because it would be
  convenient for the demo; it gets raised because a smaller deployment
  already validated the quorum math at the smaller size.

## Why this is worth talking about

Not because the cryptography or the sortition math is novel - plenty of
systems do sortition and byzantine fault tolerance. What's rare is a system
that puts its own value judgments in the same audit log as its technical
state, and treats a stale, unreviewed threshold as a bug of the same class
as a null pointer. Most projects that touch governance either pretend the
value layer doesn't exist, or bury it so deep in a ranking algorithm that
no one outside the team could find it if they tried. This one is trying to
do neither - and it will publish where it falls short of that, because
"we haven't solved this part yet" is a more honest sentence than "there is
no opinion here."

## An open invitation

If you can point at a threshold in this system and show the reasoning
behind it is wrong, that is the system working as intended, not an attack
on it. The worst outcome for this project is not criticism - it's being
believed uncritically.
