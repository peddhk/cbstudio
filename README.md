# CB Studio's — Minecraft Replay Cloud

Site (HTML/CSS/JS estático) + API (PHP) para receber, armazenar e
distribuir replays cinemáticos gerados pelo addon **CB Studio's** do
Minecraft Bedrock.

> O addon do Minecraft grava o replay localmente, permite assistir a
> ele com câmera cinematográfica dentro do jogo, e exporta como JSON.
> Você cola o JSON na página `/upload.html` do site, recebe uma KEY
> única (`CBXX-XXXX`) e compartilha com seus amigos.

---

## Como tudo funciona

```
┌─────────────────┐                 ┌──────────────────────┐
│ Minecraft       │                 │ Site (InfinityFree)  │
│ + Addon CB      │                 │                      │
│                 │  copy & paste   │  /upload.html        │
│  [Gravar]  ───────────────────►   │  [Cola o JSON]       │
│  [Assistir]     │   do JSON       │  [Recebe a KEY]      │
│  [Exportar]     │                 │                      │
└─────────────────┘                 │  /index.html         │
                                    │  [Digite a KEY]      │
                  ◄───────────────  │  [Baixar replay]     │
                    qualquer pessoa │                      │
                                    └──────────────────────┘
```

---

## Estrutura do projeto

```
cb-studios/
├── README.md
└── public/                # arquivos estáticos da InfinityFree
    ├── index.html         # busca por KEY → download
    ├── upload.html        # envio do replay → gera KEY
    ├── upload.js
    ├── admin.html         # painel admin (lista todos)
    ├── style.css
    ├── script.js
    └── logo.svg
```

E na InfinityFree, separadamente, vivem os arquivos PHP que respondem
à API:

```
htdocs/api/
├── upload.php             # POST /api/upload
├── status.php             # GET  /api/status/:key
├── download.php           # GET  /api/download/:key
├── view.php               # GET  /api/view/:key
└── list.php               # GET  /api/list (admin)
htdocs/.htaccess           # rewrites /api/upload → api/upload.php
htdocs/_helpers.php
```

---

## Deploy

1. Suba todos os arquivos de `public/` por FTP para a raiz `htdocs/` do
   seu host (ex: InfinityFree).
2. Suba também os PHPs (`api/`, `_helpers.php`, `.htaccess`).
3. Crie a pasta `htdocs/storage/` (com `.htaccess` bloqueando acesso
   externo) onde os JSONs dos replays serão salvos.

Não precisa de Node.js, banco de dados ou nada extra. PHP simples.

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/upload` | Recebe JSON do replay, gera KEY, salva em `storage/KEY.json` |
| `GET`  | `/api/status/:key` | `{ exists: true|false }` |
| `GET`  | `/api/download/:key` | Download forçado do replay |
| `GET`  | `/api/view/:key` | Retorna o JSON pra inspeção |
| `GET`  | `/api/list` | Lista todos (header `x-admin-token`) |

---

## Formato da KEY

`CBXX-XXXX` — 2 letras/dígitos + hífen + 4 letras/dígitos. Exclui
caracteres ambíguos (`0`, `O`, `1`, `I`).

Regex: `/^CB[A-Z0-9]{2}-[A-Z0-9]{4}$/`

---

## Licença

MIT — © CB Studio's
