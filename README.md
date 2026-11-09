# Brushup

How much paint do I buy? Measure the room, pick your coats, and Brushup works out the litres and the tins to buy — with the least paint left over.

Live: https://brushup.johanthegoat.xyz

## What it does

- **Measures the walls for you.** Enter length, width and height and Brushup takes the perimeter times the height, then subtracts the door and window openings, because you don't paint those with wall paint.
- **Turns area into litres.** Litres are area × coats ÷ spread rate — how far a litre goes in one coat, about 12 m² for emulsion, less for primer and exterior masonry, more for trim paint. A touch-up allowance goes on top.
- **Picks the tins.** It rounds up to whole tins (10 L, 5 L, 2.5 L, 1 L) and chooses the combination that leaves the least paint over, with the total bought, what's left, and the cost if you give a price per litre.
- **Ceiling and woodwork too.** Tick the ceiling (its area is the floor) and it gets its own tin; tick woodwork and it uses gloss or satinwood trim paint in its own tins, including 750 ml.
- **Flags the colour change.** Going dark to light? Brushup reminds you that often wants a third coat or a tinted primer first.
- **A share link** that reopens the same room. The whole form lives in the link's `#fragment`, which a browser never sends to a server, so nothing you enter is uploaded.

## The method

Wall area is `2 × (length + width) × height`, less the openings (a standard internal door is about 1.5 m², a window about 1.4 m²). For each job, `litres = area × coats ÷ spread rate`, then a touch-up allowance of about 10%, then round up to whole tins. The tin choice is the combination of stocked sizes that covers the litres with the least left over, breaking a tie by the fewest tins. The ceiling's area is `length × width`; woodwork is entered as an area because skirting, frames and doors don't follow the wall maths.

Spread rates are typical manufacturer figures rounded to honest round numbers; the exact figure is on the tin and depends on the surface, since bare plaster drinks the first coat. Two coats is the norm — one coat only covers over the same colour in good condition, and a strong colour change often wants three.

Sources:

- [Dulux — product coverage and number of coats](https://www.dulux.co.uk/)
- [Crown Paints — coverage guidance](https://www.crownpaints.co.uk/)
- Standard decorating practice for openings (door ~1.5 m², window ~1.4 m²) and coats.

## Dab

Dab is a little paintbrush in the corner. Tap for a tip that fits what you're measuring — starting out, adding a ceiling, doing woodwork, or a big colour change. Everything Dab says is announced to a screen reader, and it holds still if you've asked for reduced motion.

## Run it

```
npm test        # the engine's tests (node --test, no dependencies)
```

Open `index.html` in a browser; there's no build step. The maths lives in `src/core.js` with no DOM, so the same file runs in the page and under the tests.

## A buying guide, not a spec

Brushup gets you to the till with enough paint and not a shelf of spare tins. Awkward shapes, heavy texture, sprayers and strong colours all change the real figure, so keep the receipt and a spare tin for touch-ups.
