Suppose you're looking for a lost scientific instrument. You search the same patch of ground, using the same sensor, five times. Nothing appears.

How confident should you be that the instrument isn't there?

The answer depends not just on how good the sensor is, but on **how it fails**.

## A deliberately small model

Let <var>H</var> mean that the instrument is present. We begin with <var>P</var>(<var>H</var>) = 1/2. When the sensor works, it detects the instrument with probability <var>d</var>. But there's a probability <var>f</var> that a persistent condition makes it ineffective for *every* pass.

For simplicity, assume there are no false positives. The sensor's latent working state is fixed over the sequence. Detection attempts are independent **conditional** on that state.

If we incorrectly average over the sensor's working state anew on every pass, the likelihood of <var>n</var> misses given presence is:

<div class="math-block"><var>L</var><sub>independent</sub>(<var>n</var>) = (1 − (1 − <var>f</var>)<var>d</var>)<sup><var>n</var></sup></div>

If instead the failure state persists across all passes:

<div class="math-block"><var>L</var><sub>shared</sub>(<var>n</var>) = <var>f</var> + (1 − <var>f</var>)(1 − <var>d</var>)<sup><var>n</var></sup></div>

Since a missing instrument yields a miss with probability one, Bayes' rule gives:

<div class="math-block"><var>P</var>(<var>H</var> | <var>n</var> misses) = <var>L</var>(<var>n</var>) / (1 + <var>L</var>(<var>n</var>))</div>

Both models agree before any searches and after the first one. After repeated misses, they can disagree sharply.

## Try it

Change the three inputs below. The calculation is analytic, not simulated; the numbers describe this toy model and **not measured sensor performance**.

<div class="panel" aria-label="Interactive probability experiment"><h3>How much does another miss mean?</h3><div class="controls"><label class="control"><span>Consecutive misses <strong id="misses-value">5</strong></span><input id="misses" type="range" min="0" max="12" value="5" step="1"></label><label class="control"><span>Persistent failure probability <strong id="failure-value">20%</strong></span><input id="failure" type="range" min="0" max="60" value="20" step="5"></label><label class="control"><span>Detection if working <strong id="detection-value">80%</strong></span><input id="detection" type="range" min="20" max="100" value="80" step="5"></label></div><div class="results"><div><small>Independent-pass posterior</small><strong id="independent">—</strong></div><div><small>Shared-failure posterior</small><strong id="persistent">—</strong></div><div><small>Next detection: repeat sensor</small><strong id="retry">—</strong></div><div><small>Next detection: independent new sensor</small><strong id="switch">—</strong></div></div><p class="explain">The new sensor is assumed to have the same prior-average detection probability but an independent failure condition. All results condition on the previous misses. At certain extreme settings, posterior probabilities can be at the boundary.</p></div>

## The fifth miss is not like the first

A run of misses can mean the instrument is absent. It can also mean the method isn't effective under these conditions.

Once those alternatives are represented jointly, another failed attempt doesn't necessarily eliminate much probability. The history has itself become evidence about the sensor.

The immediate practical question is no longer just where to search. It is whether the next observation should come from the same source at all.

## A direction for further research

The example above assumes we already know <var>f</var> and <var>d</var>. In a real system, they're often uncertain too. How much data would distinguish persistent unreliability from absence? What observation would best resolve the ambiguity? How badly do decisions suffer when we pretend the measurements are independent?

Those questions lead from a toy Bayesian calculation toward experimental design, calibrated inference and the evaluation of intelligent agents.

---

*This is a working explanatory note, not a novel research result. The underlying phenomenon is well known in Bayesian modelling of imperfect detection. Future notes will examine model misspecification and decision-making.*
