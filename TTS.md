# Local narration — measured, not recommended from a search

Every number here came from running it on this machine. Where something failed, the failure is
recorded rather than the alternative quietly substituted.

## Piper — works, and is the one to use

```bash
pip install piper-tts
cd out/tts && python -m piper.download_voices en_US-lessac-medium
python -m piper -m en_US-lessac-medium -f line.wav -i line.txt
```

| | measured |
|---|---|
| model | `en_US-lessac-medium.onnx`, **60.3 MB** |
| load | 8.1s, once per process |
| synthesis | RTF **0.280** — **3.6x realtime** on CPU, no GPU |
| output | 22.05 kHz mono 16-bit, mean −15.5 dB, no silence gaps |
| licence | MIT |

Three lines totalling 11.68s of speech synthesised in 3.26s. A 40-second walkthrough narrates in
about eleven seconds, so this is comfortably fast enough to regenerate narration on every recut —
which matters, because narration that is expensive to redo quietly stops being redone.

Load it ONCE and reuse the voice. The 8.1s is process startup and model load; measuring a single
`python -m piper` invocation gives 13s wall for 3.6s of audio and reads as 3.6x SLOWER than
realtime, which is the opposite of true.

```python
from piper import PiperVoice
voice = PiperVoice.load("en_US-lessac-medium.onnx")   # once
with wave.open(out, "wb") as w: voice.synthesize_wav(text, w)
```

## Kokoro — does not run here

`import kokoro` segfaults. Exit 139, three runs out of three, before any synthesis call.

Worth recording precisely because I twice reported this wrongly. First as "segfaulted on
synthesis", then as "likely the espeak-ng phonemizer backend". Both were guesses that fit the
symptom. The phonemizer is fine — `EspeakG2P` returns correct phonemes — and what looked like a
silent crash in one earlier test was a `UnicodeEncodeError` on `\u0259`, the schwa, because the
Windows console codepage cannot print IPA. That is an encoding bug in printing, not in speech.

Two different failures wearing the same "no output" costume. The actual crash is at import, and no
amount of `PYTHONUTF8=1` touches it.

Kokoro may be excellent elsewhere. On this machine it is unusable, and "82M parameters, Apache-2.0,
54 voices" is a specification rather than a result.

## STT — not yet run

Search-grade only, and labelled as such: NVIDIA Parakeet TDT 0.6B v3 (~3 GB, reported 6.34% WER)
and Moonshine (245M, built for streaming). Neither has been executed here, so neither is a
recommendation yet.
