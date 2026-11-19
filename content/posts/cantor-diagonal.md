---
title: "Cantor's Diagonal Argument, Slowly"
subtitle: "A walk through the proof at the pace of a careful conversation."
date: 2026-10-28
category: Foundations
tags: [Cantor, Infinity, "Set theory"]
summary: "The diagonal argument is short, but its sentences are easy to say and hard to mean. This is the version I wish someone had shown me first."
---

Most proofs in mathematics are difficult because the ideas are difficult. Cantor's diagonal argument is different. It is four sentences long, it uses nothing more advanced than a decimal expansion, and yet it produces a conclusion that still feels like a magic trick: the real numbers cannot be listed.

I have explained this proof perhaps thirty times, and the same three questions come up almost every time. This is an attempt to answer them in advance.

## The claim

> **Theorem (Cantor, 1891).** There is no bijection between the natural numbers $\mathbb{N}$ and the real interval $(0,1)$. Equivalently, the real numbers are uncountable.

The proof is by contradiction. Suppose someone hands us a complete list of every real number in $(0,1)$, one per natural number:

$$
\begin{aligned}
r_1 &= 0.\,a_{11}\,a_{12}\,a_{13}\,a_{14}\cdots\\
r_2 &= 0.\,a_{21}\,a_{22}\,a_{23}\,a_{24}\cdots\\
r_3 &= 0.\,a_{31}\,a_{32}\,a_{33}\,a_{34}\cdots\\
r_4 &= 0.\,a_{41}\,a_{42}\,a_{43}\,a_{44}\cdots\\
&\;\;\vdots
\end{aligned}
$$

Each $a_{ij}$ is a digit from $0$ to $9$. The list is supposed to contain everything, so every real in $(0,1)$ should appear somewhere, in some row.

Now build a new number $s = 0.b_1 b_2 b_3 \cdots$ by walking down the diagonal. At position $n$, look at the $n$-th digit of the $n$-th row, and choose a digit that is different:

$$
b_n =
\begin{cases}
1, & a_{nn} \neq 1,\\
2, & a_{nn} = 1.
\end{cases}
$$

There are many ways to make this choice; the only requirement is that $b_n \neq a_{nn}$ for every $n$.

![The diagonal of a hypothetical enumeration. The constructed number disagrees with row n at position n, for every n.](content/posts/figures/cantor-diagonal.svg)

Then $s$ is a real number in $(0,1)$. If the list was complete, $s$ must be row $k$ for some $k$. But at position $k$, the number $s$ has digit $b_k$, while row $k$ has digit $a_{kk}$, and we chose $b_k \neq a_{kk}$. So $s$ is not row $k$. Since $k$ was arbitrary, $s$ is not any row. Contradiction.

## The first question: which diagonal?

The diagonal is not a metaphorical diagonal. It is the sequence of digits at positions $(1,1), (2,2), (3,3), \dots$ — one digit from each row, each from a different column. The construction only needs to disagree *once* with each row, and the diagonal gives it a convenient place to do so.

This is why the argument is robust. We could also walk down a staircase, use the first digit of row $n$ that has not been used before, or apply any rule that guarantees a fresh disagreement for every row. The diagonal is a bookkeeping device, not the idea itself.

## The second question: what about $0.4999\ldots = 0.5$?

Decimal expansions are not unique. The number $0.5$ can also be written $0.4999\ldots$, and if the list uses one convention while the constructed number uses another, the "different digit" may not actually mean a different number.

There are two standard repairs. The first is to use a representation with no ambiguity: write every real in base $2$ and forbid expansions ending in an infinite string of ones. The second is to avoid $0$ and $9$ in the construction, which is what the rule above does by choosing only $1$ or $2$. Since $b_n$ is never $0$ or $9$, the expansion of $s$ is unique, and a disagreement in digits really is a disagreement in value.

This is the point where a careless proof becomes a correct one, and it is worth pausing on. The diagonal argument is not fragile, but the notation is.

## The third question: why doesn't this prove that everything is uncountable?

Because the argument needs a place to stand. To construct $s$, we need to inspect the $n$-th digit of the $n$-th row for every $n$. That is possible when the objects in the list are things with digits — real numbers, infinite binary sequences, subsets of $\mathbb{N}$. It is not a general-purpose machine for producing new objects out of old ones.

The argument does generalize, but in a specific direction. It shows that no set $X$ surjects onto its power set $\mathcal{P}(X)$: given a function $f : X \to \mathcal{P}(X)$, define

$$
D = \{\, x \in X : x \notin f(x) \,\}.
$$

Then $D$ cannot equal $f(x)$ for any $x$, since $x \in D$ exactly when $x \notin f(x)$. This is the diagonal argument with the digits stripped away, and it is the version I would teach first if I were in charge of the curriculum.

<div class="note">
<p class="note__title">What the proof does not say</p>
<p>Cantor's theorem does not say that "infinity" is a number, or that some infinities are "bigger" in the sense of containing the others. It says that there is no bijection between $\mathbb{N}$ and $\mathbb{R}$. The language of sizes is a useful metaphor, but it is a metaphor. The theorem is about functions.</p>
</div>

## Why I keep coming back to it

The diagonal argument is the cleanest example I know of a proof that changes what you think a proof is. Before it, one might imagine that showing two collections have the same size means matching them up one by one, and that failure to find a matching is a failure of imagination. After it, we know that failure can be a theorem.

There is also a lesson about notation. The proof is four lines; the confusion is in the decimals. Most of the work of writing mathematics is not in finding the idea but in choosing a language in which the idea cannot be misread.

## Further reading

- Georg Cantor, "Über eine elementare Frage der Mannigfaltigkeitslehre" (1891).
- Wikipedia: [Cantor's diagonal argument](https://en.wikipedia.org/wiki/Cantor%27s_diagonal_argument).
- Any introductory set theory text, for the power-set version and its consequences.
