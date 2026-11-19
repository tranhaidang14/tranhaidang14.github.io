---
title: "Reading Notes: Hilbert's Programme and Its Aftermath"
subtitle: "Three things I had wrong about formalism, and one I am still working on."
date: 2026-08-02
category: Reading Notes
tags: [Logic, Hilbert, Gödel]
summary: "Notes from a slow reread of the Hilbert–Gödel story, with the benefit of hindsight and the disadvantage of a short attention span."
---

Every few years I reread the story of Hilbert's programme, and every time I find that I had been carrying a cartoon version of it in my head. This is an attempt to write down the corrections while they are still fresh.

## What the programme actually wanted

The cartoon: Hilbert wanted to prove that mathematics is consistent, complete, and decidable, and then Gödel ruined it.

The correction: Hilbert's programme was a *research programme*, not a single conjecture. It asked for finitary consistency proofs of strong formal systems, and it was motivated by a genuine philosophical problem — the problem of what it means to justify classical mathematics to someone who only trusts finite constructions. The programme produced proof theory, and proof theory survived Gödel.

It is easy to forget that Hilbert was not naive. He knew that a consistency proof has to be given in a system weaker than the one being justified, or it proves nothing. The question was whether the required finitary standpoint could be made precise without giving up too much. That is a subtle question, and "Gödel ruined it" is not an answer to it.

## What Gödel actually showed

The first incompleteness theorem: any consistent, recursively axiomatised theory strong enough to represent arithmetic has a sentence $G$ such that neither $G$ nor $\neg G$ is provable. The sentence says, in effect, "I am not provable in this theory."

The second: such a theory cannot prove its own consistency.

The standard cartoon makes the second theorem sound like a refutation of Hilbert. But Hilbert's finitary proofs were never supposed to be carried out *inside* the theory. They were supposed to be carried out in a restricted fragment — and the second theorem says precisely that the fragment cannot be the whole theory. Whether a suitable fragment exists is a different question, and the answer turned out to be "yes, for many theories, but not in the way Hilbert hoped".

<div class="note">
<p class="note__title">A distinction worth keeping</p>
<p>"Cannot prove its own consistency" and "cannot be justified" are not the same claim. The first is a theorem. The second is a philosophical conclusion, and it needs an argument that Gödel's theorem does not supply by itself.</p>
</div>

## The part I am still working on

The part I keep circling is not technical. It is this: what exactly is the epistemic gain of a consistency proof?

Suppose Gentzen proves the consistency of arithmetic by transfinite induction up to $\varepsilon_0$. Have we learned something, or have we simply moved the trust from one place to another? The usual answer is that we have reduced our trust to a principle — induction up to $\varepsilon_0$ — that is in some sense more evident than the consistency of arithmetic. I find that answer persuasive on Tuesdays and question-begging on Fridays.

The honest position, I think, is that foundational results do not eliminate trust; they relocate it, and the relocation can be more or less illuminating. A good consistency proof is a map of where the assumptions live. That is worth having even if it does not give us the thing the original programme asked for.

## Three sentences to keep

1. Hilbert's programme was a programme, not a single wager, and proof theory is its legitimate child.
2. Gödel's theorems are limitative, but they limit *formal systems*, not the informal practice of mathematics.
3. A consistency proof is a geography of trust, not its elimination.

## Further reading

- Hilbert, "Die Grundlagen der Mathematik" (1928) and the Grundlagen der Mathematik with Bernays.
- Gödel, "Über formal unentscheidbare Sätze der Principia Mathematica und verwandter Systeme I" (1931).
- Gentzen, "Die Widerspruchsfreiheit der reinen Zahlentheorie" (1936).
- Wikipedia: [Hilbert's program](https://en.wikipedia.org/wiki/Hilbert%27s_program), [Gödel's incompleteness theorems](https://en.wikipedia.org/wiki/G%C3%B6del%27s_incompleteness_theorems).
