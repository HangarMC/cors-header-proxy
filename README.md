# cors-header-proxy

simple cf worker that injects CORS headers into proxied responses for apis that don't support cors.

run locally with `bun dev`

to use this, set a SERVER\_${NAME}\_URL as a secret. for local development, you can set it in a .env file.
