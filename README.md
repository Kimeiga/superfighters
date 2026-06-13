# Superfighters

Browser fighting game with local two-player controls, online lobby support, mobile touch controls, and PWA metadata.

## Local Development

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` or the Vite URL shown in the terminal.

Local controls:

- P1: `WASD`, `1` melee, `2` shoot, `3` grenade, `4` powerup
- P2: arrows, `M` melee, `,` shoot, `.` grenade, `/` powerup

## Online Multiplayer Development

Run the Vite client and the Geckos server in separate terminals:

```sh
npm run dev
npm run server
```

The browser defaults to a Geckos server at `http://<host>:9208`. In dev, keep Vite on its normal port and the Geckos server on `9208`.

Useful server environment variables:

```sh
PORT=9208
BASE_PATH=/superfighters/
VITE_BASE_PATH=/superfighters/
GECKOS_UDP_MIN=20000
GECKOS_UDP_MAX=20000
PUBLIC_ORIGIN=https://your-domain.example
```

## Production / VPS

Build and run the combined static app plus Geckos signaling server:

```sh
npm ci
npm run build
npm start
```

To build for `https://hakanalpay.com/superfighters/`, set `BASE_PATH=/superfighters/` for the server and `VITE_BASE_PATH=/superfighters/` during `npm run build`.

This repo includes a GitHub Actions deploy workflow. Configure these repository secrets before relying on automatic deploys:

- `VPS_HOST`
- `VPS_USER`
- `VPS_PORT`
- `VPS_APP_DIR`
- `VPS_SSH_KEY`

For the first Vultr deployment, New York / New Jersey (EWR) is the best region if the players are in or near New York.

Firewall rules needed:

- TCP `9208` for HTTP/static app and Geckos signaling, unless you reverse proxy from `443`
- UDP `20000` for the WebRTC data channel using the default single-port range in this repo
- TCP `22` for SSH

For iPhone PWA play, serve over HTTPS, open the invite link in Safari, then use Share -> Add to Home Screen. iOS Safari does not expose the standard fullscreen API to normal web pages, so launching from the home screen is the practical fullscreen path.

## Online Flow

1. Open the game and press `Esc`.
2. Choose `Online Lobby`.
3. Create a lobby to get a four-letter code, or join with a code.
4. Share the copied invite link with the second player.
5. When both players are connected, the match starts.

The current online implementation has the server own lobby membership/player slots and relay timestamped input/snapshot packets over Geckos. The browser still runs Phaser gameplay locally so local play remains unchanged. Full server-side physics authority should be the next network hardening step once the core mechanics settle.
