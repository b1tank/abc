# Little word cards

Open on the same Wi-Fi: http://192.168.86.125:8088/

Seven words: as, it, at, have, a, to, and. Tap to hear whole words or
individual phonemes. Includes sound-it-out playback, slow playback, and a
listen-and-find game. `have` correctly uses short /æ/ and silent e.

Start or restart (from this directory):

```sh
python3 -m http.server 8088 --bind 0.0.0.0 --directory .
```

Serves only this directory. No dependencies or internet needed for playback.
The Mac must remain awake and reachable; allow Python through its firewall if
prompted. The LAN IP may change. Find it with `ipconfig getifaddr en0`.

Word recordings: macOS Samantha. Isolated phonemes: eSpeak NG. These are
synthetic pronunciation aids; the mouth/airflow of stop consonants such as t
and d is very brief. Rebuild clips with `python3 generate_audio.py` on macOS
with ffmpeg and espeak-ng installed.

Audio starts on taps, not automatically. A single reused audio player supports
iPhone Safari's audio permission model. Tested at an iPhone viewport in
Playwright WebKit; physical iPhone testing still recommended.
