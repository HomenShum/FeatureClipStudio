# Reference videos

Craft references the judge can WATCH. `judge-video.mjs` reads a YouTube URL
directly — verified, `modality: VIDEO`, no download, no hosting, no licence
problem. Found with `yt-dlp "ytsearch4:<query>"`, which beats web search for
this because it returns duration and channel.

    REFERENCE_VIDEOS="$(sed -n '2p;3p' REFERENCES.md.urls | paste -sd,)" \
      node judge-video.mjs out/feature.mp4

## The shortlist, and why these three

Each note is ONE fact with a TIMESTAMP, because that is the only form that can
become a rule or score a cut. "Their pacing is good" cannot.

| Video | Len | Cost | Hook before product | Peak at |
|---|---|---|---|---|
| [Raycast — New Raycast. Coming 2026](https://youtu.be/Mi173xGb0ZA) | 0:39 | 4.3k tok | **1 second** | 0:20–0:25 |
| [Arcade — What is Arcade?](https://youtu.be/xPK3nBLbpxc) | 2:37 | 15k tok | 5s | 0:42 |
| [Linear — Project planning](https://youtu.be/JLpDL7x50hA) | 2:55 | 16k tok | 18s | 0:56 |

**Raycast is the primary reference.** A 39-second launch film, closest in length
to a feature walkthrough, and it puts the product on screen at **0:01**. Its peak
— an AI prompt executing a multi-step workflow across Linear, GitHub and Notes —
runs 0:20–0:25, about half way. Cheapest to attach at 4.3k tokens.

**Arcade is the craft control.** A company that sells demo software, demoing
itself, so its production floor is the market's floor. Peak at 0:42: live HTML
editing on the page.

**Linear is the density reference,** and the cautionary one: an 18-second hook
before the product appears is long, and its peak at 0:56 arrives after most
viewers of a 48s cut would have gone.

## What these measured, applied to TrialScope

The judge, given a reference, dropped `signature_moment` to **0/2**: our peak
"lands at 00:27 rather than creating an immediate hook in the first 15s".
Raycast reaches its peak at 0:20 of 39s.

More useful than the score: the judge named the **network graph at 0:27** as our
signature moment. The film was BUILT around the trace disclosure at ~0:15. If a
viewer with the reference in hand picks a different moment than the one the
storyboard designed, the designed moment is not reading as the peak. That is a
structural note no amount of polish fixes, and it is the next thing to change.

## Not downloaded, on purpose

`yt-dlp` is used to SEARCH, not to fetch. The judge reads the URL, so a local
copy adds storage and a licence question and buys nothing. Download only to pull
exact frames for a note — and then the note, not the file, is what to keep.

## The judge's reliability envelope, measured

It is a useful gate and it is not an oracle. Three limits, each observed rather
than assumed, so its output is read with the right weight:

**It emitted a defect that measurement disproves.** After the tail hold was
extended 150 -> 210 frames it still reported *"Video ends instantly after final
step without hold time"*. `ffprobe` puts the runtime at 44.5s, exactly the +2s
expected, and a scene-change filter over the final 3 seconds returns ZERO
changes: the hold is real and static. Verify a defect before acting on it.

**Its score has roughly +/-1 of run-to-run noise.** A change that only lengthened
a static tail moved the total 13 -> 12. Treat single-point movements as noise;
only act on a dimension that moves 2 or on a defect you can reproduce.

**It defaults to uniform scoring without pressure.** Two materially different
cuts both scored exactly 1/2 on all ten dimensions until the rubric forced it to
name a weakest and a strongest. If a future run comes back uniform again, the
anti-uniformity clause has stopped biting -- that is a judge bug, not a verdict.

What it is genuinely good at, and why it stays in the loop: naming WHICH moment
reads as the peak. It picked the network graph over the trace disclosure on
three separate cuts, including after the trace was moved earlier, zoomed to
1.85x and given the longest hold in the film. That is a consistent signal about
the viewer, not a scoring artefact, and it is the most useful thing the tool has
produced.
