# dondone tools

[中文](README.zh.md)

A collection of lightweight browser-side tools. All computation runs locally — no user input is ever uploaded.

## Tools

- **Cryptography & Auth**: AES, Server JWT Token, Client Sign
- **Hashing**: MD5, SHA-2, SHA-3, BLAKE, xxHash3
- **Encoding**: Base64, Base64 Image, Base58, QR Code
- **Security**: Password Strength
- **Text & Fun**: String Length, Ugly Avatar

## Stack

- React · TypeScript · Vite
- Tailwind CSS · Radix UI
- Vitest

## Development

```bash
pnpm install
pnpm dev
```

## Commands

```bash
pnpm test:run   # run tests
pnpm build      # production build
pnpm lint       # lint
```

## Data

Password strength detection uses a bundled weak-password list derived from SecLists `10k-most-common.txt` and SplashData annual rankings. The list is loaded with the frontend bundle and matched entirely in the browser.

## Privacy

No backend. All tool input, file processing, and password checking runs locally in the browser.
