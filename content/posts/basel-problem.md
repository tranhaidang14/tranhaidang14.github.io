---
title: "The Basel Problem, and Why Euler's Proof Still Feels Like Magic"
subtitle: "A stubborn sum, a product for the sine, and a guess that turned out to be true."
date: 2026-11-12
category: Analysis
tags: [Euler, Series, "Zeta function"]
summary: "How a sum over the squares turned out to hide π, and what Euler's 1735 argument still teaches us about guessing beautifully."
featured: true
---

There is a sum that has annoyed people for nearly three centuries. It asks for the total of the reciprocals of the squares:

$$
\sum_{n=1}^{\infty}\frac{1}{n^2}
= 1 + \frac14 + \frac19 + \frac1{16} + \cdots
$$

Each term is small. The tail is smaller still. So the sum converges, and a patient person can compute it to as many decimal places as they like. What a patient person cannot do, at least not by adding, is guess what the answer *is*. The number is

$$
\frac{\pi^2}{6} \approx 1.6449340668\ldots
$$

A circle has no business in a sum over the integers. That is the whole scandal of the Basel problem, and the reason it remains the best advertisement for guessing in all of mathematics.

## A sum without an obvious answer

The problem gets its name from Basel, where the Bernoulli brothers worked on it. Jakob Bernoulli proved that the series converges, which is already something: the naive comparison with the harmonic series fails, since $\sum 1/n$ diverges while $\sum 1/n^2$ does not. But convergence is not evaluation. For decades the best available answer was a decimal expansion and a shrug.

It helps to see how slowly the sum settles. The table below compares the partial sum after $N$ terms with the limit.

| $N$ | $S_N = \sum_{n=1}^{N} n^{-2}$ | $S_N - \pi^2/6$ |
|---:|---:|---:|
| $10$ | $1.549767731$ | $0.095166335$ |
| $100$ | $1.634983900$ | $0.009950166$ |
| $1{,}000$ | $1.643934567$ | $0.000999500$ |
| $10{,}000$ | $1.644834072$ | $0.000099995$ |

The error shrinks like $1/N$, which is to say: politely, but not generously. To earn six decimal places by brute force you need about a million terms. The exact value, meanwhile, is available in a single line to anyone who can factor the sine.

## Euler's audacity

Euler's 1735 argument begins with a fact about polynomials. If a polynomial $p(x)$ has roots $r_1,\dots,r_n$, then it factors as

$$
p(x) = p(0)\prod_{k=1}^{n}\left(1 - \frac{x}{r_k}\right).
$$

Now treat $\sin x$ as though it were a polynomial of infinite degree. Its roots are $0, \pm\pi, \pm2\pi,\dots$, and near zero we have $\sin x \sim x$. Dividing by $x$ removes the root at zero, leaving

$$
\frac{\sin x}{x}
= \prod_{n=1}^{\infty}\left(1 - \frac{x^2}{n^2\pi^2}\right).
$$

This is the step that made Euler famous and, for a while, made him suspect. An infinite product is not a polynomial. The algebra of roots needs hypotheses, and in 1735 nobody had them.

But suppose the product is true. Expand the right-hand side and collect the coefficient of $x^2$. Every factor contributes either a $1$ or its own $x^2$ term, so the coefficient is

$$
-\frac{1}{\pi^2}\sum_{n=1}^{\infty}\frac{1}{n^2}.
$$

On the left, the Taylor series of $\sin x / x$ gives $1 - x^2/6 + x^4/120 - \cdots$, so the coefficient of $x^2$ is $-1/6$. Equating the two:

$$
-\frac{1}{6} = -\frac{1}{\pi^2}\sum_{n=1}^{\infty}\frac{1}{n^2}
\qquad\Longrightarrow\qquad
\sum_{n=1}^{\infty}\frac{1}{n^2} = \frac{\pi^2}{6}.
$$

That is the entire trick. It is short enough to fit on a postcard, which is part of why it feels like magic rather than work.

![Partial sums of the reciprocal squares, approaching π²/6 from below. The dashed line is the limit, not a numerical accident.](content/posts/figures/basel-partial-sums.svg)

## Making the guess into a proof

The gap is real. Weierstrass closed it in the nineteenth century with the factorization theory for entire functions. The theorem says, roughly, that an entire function can be written as a product over its zeros, provided the zeros are not too dense and a growth condition holds. For $\sin x / x$ the zeros are exactly the integers times $\pi$, and the growth is mild, so the product converges and equals the function.

The modern proof is not harder so much as *cautious*. One shows that the product and the sine share the same zeros, that their quotient is an entire function with no zeros, and that the quotient has the right growth to be constant. The constant is fixed at $x=0$. Nothing is swept under the rug; the rug is simply made large enough.

<div class="note">
<p class="note__title">A note on rigour</p>
<p>Euler's argument is a heuristic, but it is a <em>good</em> heuristic: every step is either true or repairable. This is worth saying plainly, because the popular story sometimes swings too far in the other direction and treats the proof as a lucky accident. It was not luck. It was a guess with structure.</p>
</div>

## What the identity is really saying

The Basel identity is the first value of the Riemann zeta function at an even integer:

$$
\zeta(2) = \frac{\pi^2}{6}, \qquad
\zeta(4) = \frac{\pi^4}{90}, \qquad
\zeta(6) = \frac{\pi^6}{945}.
$$

The pattern continues for every even argument, with the coefficients given by Bernoulli numbers. The odd values are another matter entirely; $\zeta(3)$ is irrational, as Apéry proved in 1978, but no one knows a closed form in terms of the classical constants, and the question has a way of humiliating optimistic notation.

What stays with me is not the decimal but the shape of the argument. A local fact — the behaviour of $\sin x$ near zero — determines a global sum over all the integers. The roots of the sine are spread across the whole line, yet their reciprocal squares add up to something the function already knew at the origin. That is the kind of sentence I keep a website for.

## Further reading

- Euler, *De summis serierum reciprocarum* (1735). The original announcement, translated in several places.
- Raymond Ayoub, "Euler and the zeta function", *Amer. Math. Monthly* 81 (1974).
- Wikipedia: [Basel problem](https://en.wikipedia.org/wiki/Basel_problem) and [Weierstrass factorization theorem](https://en.wikipedia.org/wiki/Weierstrass_factorization_theorem).
