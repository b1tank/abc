# abc

## Little word cards

Pink-and-rainbow interactive phonics cards with word audio, individual sounds,
slow playback, a listening game, poppable balloons, and confetti.

Source and bundled audio: [`public/learn-cards/`](public/learn-cards/).

Serve the whole app on your LAN:

```sh
python3 -m http.server 8088 --bind 0.0.0.0 --directory public
```

Open `http://<your-computer-lan-ip>:8088/learn-cards/` on your iPhone.
The existing deployment scripts include the cards at `/abc/learn-cards/`.
See the [cards README](public/learn-cards/README.md) for audio generation and
instructions for serving just the cards at the server root.
