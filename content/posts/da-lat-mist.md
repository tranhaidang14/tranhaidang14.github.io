---
title: "A Night in Đà Lạt, and the Arithmetic of Fog"
subtitle: "Rain, coffee, and a proof that refused to close."
date: 2026-09-19
category: Days
tags: [Travel, Memory, "Đà Lạt"]
summary: "A remembered evening in the highlands, filed under days worth keeping — with a small detour into contour lines."
---

The rain began somewhere above the valley and arrived all at once, the way a proof sometimes does: first as a suspicion, then as weather.

We were sitting in a café on a slope, three of us and a notebook that had already given up on being useful. The town below was doing what Đà Lạt does in September — disappearing and reappearing, one roof at a time, behind sheets of mist. Someone had ordered cà phê sữa đá, someone else trà nóng, and I was staring at a line in my notebook that had been wrong for two days.

![Mist over the hills, drawn from memory the following morning.](content/library/photos/da-lat-mist.svg)

The line was this:

$$
\int_0^1 \frac{\log(1+x)}{x}\,dx = \frac{\pi^2}{12}.
$$

It is a true line. I knew it was true. I had checked it numerically, twice, and the numbers had agreed with the kind of enthusiasm that usually means I am about to discover I have made the same mistake in both computations. What I did not have was a proof I could stand behind at a blackboard.

## The arithmetic of fog

There is a particular texture to thinking in bad weather. The mind keeps trying to resolve the view, and the view keeps declining to be resolved. Every few minutes the fog would thin and a red roof would appear, perfectly sharp, and then the next gust would take it away again.

I have heard mathematicians describe this as "letting the problem breathe". I have never liked the phrase, because it sounds like a technique. It is not a technique. It is what happens when you stop pushing and the problem continues without you.

Minh, who teaches at the university and has no patience for mysticism, said: "You are trying to integrate a logarithm over a singularity that isn't there. Of course it is a dilogarithm. Stop looking for a trick."

He was right, and he was also not helping. The dilogarithm is exactly the kind of object that turns a two-line idea into a page of identities. What I wanted was the two-line idea.

## A red roof

The rain let up around nine. The town came back in pieces: a roof, a lamppost, two people sharing an umbrella and walking too slowly for the weather. The air smelled of wet pine and gasoline. Somewhere below us a motorbike started and failed and started again.

I remember thinking that the fog was a bad drawing of a contour map. A contour line joins points of equal height; a fog bank joins points of equal visibility, and the two families of curves cross each other at angles that no one has ever bothered to name.

And then, because the mind is a strange machine, I thought: *differentiate under the integral sign.* Not the dilogarithm. The parameter.

Consider

$$
F(a) = \int_0^1 \frac{\log(1+ax)}{x}\,dx, \qquad a > -1.
$$

Then $F(0)=0$, and differentiating gives

$$
F'(a) = \int_0^1 \frac{1}{1+ax}\,dx = \frac{\log(1+a)}{a}.
$$

So the integral in question is $F(1)$, which is

$$
F(1) = \int_0^1 \frac{\log(1+a)}{a}\,da.
$$

Which is, of course, the same integral. I had walked in a perfect circle, in the rain, and arrived at the door I had left by.

Minh laughed at me for a full ten seconds. The waitress brought another coffee. The fog came back.

## The proof that closed

The actual proof arrived the next morning, on the bus, when I was not thinking about it at all. The circle was not a mistake; it was the hint. If $F(a) = F(1)$ when $a=1$, then maybe the right move was to differentiate a *different* parameter — to write the logarithm as an integral:

$$
\log(1+x) = \int_0^x \frac{dt}{1+t}.
$$

Then

$$
\int_0^1 \frac{\log(1+x)}{x}\,dx
= \int_0^1 \int_0^x \frac{dt}{x(1+t)}\,dt\,dx.
$$

Swap the order, integrate in $x$ first, and the sum appears:

$$
\int_0^1 \frac{\log(1+t)}{t(1+t)}\,dt
= \int_0^1 \frac{\log(1+t)}{t}\,dt - \int_0^1 \frac{\log(1+t)}{1+t}\,dt.
$$

The second integral is $\tfrac12\log^2 2$. The first is the same stubborn object. Still a circle — a smaller one, but a circle.

I will spare you the rest. It closes, eventually, with a substitution that turns the remaining integral into $\sum (-1)^{n-1}/n^2$ and a standard identity for the dilogarithm at $-1$. The answer is $\pi^2/12$, as the numbers had said all along.

What stays with me is not the proof. It is the red roof appearing and disappearing, and Minh saying *stop looking for a trick*, and the fact that the solution came on a bus, in daylight, when the fog had lifted.

## Filed under

I keep a small library on this site. The photographs are not illustrations of the essays; they are the other half of the same record. This one is a drawing made the next morning, from memory, because the camera on my phone had run out of battery somewhere between the second coffee and the rain.

The proof is in the notebook. The evening is here.
