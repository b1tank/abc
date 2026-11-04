"""Build offline word clips with macOS Samantha and phoneme clips with eSpeak NG.
Requires: say (macOS), ffmpeg, espeak-ng (brew install espeak-ng).
Run once: python3 generate_audio.py
"""
from pathlib import Path
import subprocess
import tempfile
import re

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'audio'
OUT.mkdir(exist_ok=True)
WORDS = ['as', 'it', 'at', 'have', 'a', 'to', 'and']
# eSpeak's phoneme input, NOT spoken letter names. /a/ here is English TRAP /æ/.
SOUNDS = {'short-a': 'a', 'short-i': 'I', 'z': 'z', 't': 't',
          'h': 'h', 'v': 'v', 'long-a': 'eI', 'schwa': '@',
          'oo': 'u:', 'n': 'n', 'd': 'd@'}
with tempfile.TemporaryDirectory() as tmp:
    for word in WORDS:
        source = str(Path(tmp) / f'{word}.aiff')
        subprocess.run(['say', '-v', 'Samantha (English (US))', '-r', '140',
                        '-o', source, word], check=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', source,
                        '-af', 'loudnorm', '-codec:a', 'libmp3lame', '-q:a', '3',
                        str(OUT / f'word-{word}.mp3')], check=True)
    for name, phoneme in SOUNDS.items():
        source = str(Path(tmp) / f'{name}.wav')
        subprocess.run(['espeak-ng', '-v', 'en-us', '-s', '110', '-w', source,
                        f'[[{phoneme}]]'], check=True)
        # A final isolated /d/ is unreleased (silent) in eSpeak. Keep only
        # its initial release from /də/, before the sustained vowel.
        trim = 'atrim=end=0.09,afade=t=out:st=0.075:d=0.015,' if name == 'd' else ''
        probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', source,
                                '-af', trim + 'volumedetect', '-f', 'null', '-'],
                               capture_output=True, text=True, check=True)
        peak = float(re.search(r'max_volume: ([-\d.]+) dB', probe.stderr)[1])
        gain = min(35, -3 - peak)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', source,
                        '-af', trim + f'volume={gain}dB,apad=pad_dur=0.15',
                        '-ar', '44100', '-codec:a', 'libmp3lame', '-q:a', '3',
                        str(OUT / f'sound-{name}.mp3')], check=True)
print(f'Built {len(WORDS) + len(SOUNDS)} audio clips in {OUT}')
