# CB Studio's — Minecraft Replay Cloud

API + Website para receber, armazenar e distribuir replays cinemáticos
gerados pelo addon **CB Studio's** do Minecraft Bedrock.

> O addon do Minecraft já existe e cuida de gravar o replay, gerar o JSON e
> enviar para esta API via `POST /api/upload`. O servidor devolve uma **KEY**
> única que o jogador vê no chat e usa neste site para baixar o replay.

---

## ✨ Features

- **POST /api/upload** — recebe o JSON do replay, gera uma KEY (`CBXX-XXXX`) e salva em `/storage/KEY.json`
- **GET /api/status/:key** — verifica se a key existe
- **GET /api/download/:key** — baixa o replay (download forçado)
- **GET /api/view/:key** — exibe o JSON no navegador
- **GET /api/list** — lista todos os replays (modo admin, requer token)
- **/admin** — painel administrativo simples
- Frontend em HTML + CSS + JavaScript vanilla (preto fosco + verde neon)
- Segurança: `helmet`, `cors`, `compression`, rate limit, validação, sanitização
  e proteção contra path traversal
- Pronto para deploy no **Render.com**, Replit, Railway, Fly.io ou qualquer host Node.js

---

## 🚀 Deploy no Render.com (grátis, 1 clique)

1. Faça push deste repositório no seu GitHub.
2. No Render: **New → Web Service → Connect a repository** → selecione `cbstudio`.
3. O Render lê o arquivo `render.yaml` automaticamente. Confirme:
   - Runtime: **Node**
   - Build: `npm install`
   - Start: `node server.js`
   - Plan: **Free**
4. Clique **Create Web Service**. Em 2-3 min sua API estará no ar em
   `https://cb-studios.onrender.com`.

> ⚠️ **Free tier do Render**: o serviço dorme após 15 min sem uso (acorda em
> ~30s na próxima request) e o disco é efêmero — replays podem se perder em
> reinícios. Pra produção séria, use plano pago ou conecte um banco persistente.

### Variáveis de ambiente no Render

Definidas automaticamente pelo `render.yaml`:

| Variável | Valor | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Modo produção |
| `ADMIN_TOKEN` | gerado | Token aleatório seguro (veja em Settings → Environment) |
| `MAX_UPLOAD_MB` | `25` | Tamanho máximo de upload |
| `ALLOWED_ORIGINS` | `https://cbstudio.infinityfree.me,...` | Origens CORS permitidas |

---

## 🖥️ Como rodar localmente

```bash
npm install
npm start
```

A API ficará em <http://localhost:3000>.

---

## 🎮 Como conectar o addon do Minecraft

No script do addon, ao terminar a gravação, faça uma requisição `POST` para
`/api/upload` com o JSON do replay. Exemplo (TypeScript do addon Bedrock):

```ts
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

const API_BASE = "https://cb-studios.onrender.com";

export async function uploadReplay(replay: any): Promise<string> {
  const req = new HttpRequest(`${API_BASE}/api/upload`);
  req.method = HttpRequestMethod.Post;
  req.headers = [new HttpHeader("Content-Type", "application/json")];
  req.body = JSON.stringify(replay);

  const res = await http.request(req);
  const data = JSON.parse(res.body);
  if (!data.success) throw new Error(data.error || "Falha no upload.");
  return data.key; // ex: "CBA9-21LK"
}
```

E no chat do jogador:

```ts
world.sendMessage(`§a[CB Studio's] §fSua KEY: §e${key}`);
world.sendMessage(`§7Acesse o site e digite a KEY para baixar.`);
```

---

## 📤 Exemplo de payload aceito por `POST /api/upload`

```json
{
  "player": "Pedro",
  "replayName": "cinematic_01",
  "mode": "advanced",
  "frames": [
    { "tick": 0, "pos": [0, 64, 0], "rot": [0, 0] }
  ],
  "settings": {
    "weather": "rain",
    "time": "night",
    "fov": 90
  }
}
```

Resposta:

```json
{ "success": true, "key": "CBA9-21LK" }
```

---

## 🌐 Usando o frontend em outro host (ex: InfinityFree)

Se você quiser servir o frontend em outro domínio (ex: `cbstudio.infinityfree.me`)
e a API no Render:

1. Faça upload da pasta `/public` para o seu host estático.
2. Edite `index.html` e `admin.html` e troque a meta tag `cb-api-base` pela
   URL do seu Render:
   ```html
   <meta name="cb-api-base" content="https://cb-studios.onrender.com" />
   ```
3. No Render, defina `ALLOWED_ORIGINS=https://seu-dominio.com` para liberar CORS.

---

## 🛡️ Endpoints admin

`GET /api/list` exige o header `x-admin-token: <ADMIN_TOKEN>` (ou
`?token=<ADMIN_TOKEN>` na query). O painel `/admin` permite informar o token
diretamente na interface.

---

## 📁 Estrutura

```
cb-studios/
├── server.js          # backend Express
├── package.json
├── render.yaml        # config one-click pro Render
├── .env               # local dev (NÃO comitar)
├── README.md
├── storage/           # arquivos KEY.json (efêmero no Render free)
└── public/
    ├── index.html     # site principal
    ├── admin.html     # painel admin
    ├── style.css
    ├── script.js
    └── logo.svg
```

---

## 📜 Licença

MIT — © CB Studio's
