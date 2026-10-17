# Driftopolis server

Malý multiplayer server pro hru Driftopolis. Přeposílá mezi hráči jejich polohu, vzhled auta a stav závodu. Nic neukládá a nemá databázi. Každý svět (Město, Dálnice, Poušť) je samostatná místnost.

Běží na Node.js 18 nebo novějším a jedné závislosti (`ws`).

## Spuštění lokálně

```bash
npm install
npm start
```

Server poslouchá na portu `8080`, nebo na portu z proměnné `PORT`. Když v prohlížeči otevřeš `http://localhost:8080`, zobrazí se text `Driftopolis server OK`.

Ve hře pak v `index.html` nastav:

```html
<script>window.G3D_SERVER = "ws://localhost:8080";</script>
```

## Nasazení na Render (zdarma)

1. Nahraj `server.js` a `package.json` do repozitáře na GitHubu.
2. Na [render.com](https://render.com) zvol **New → Web Service** a vyber repozitář.
3. Nastav:
   - **Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Po nasazení dostaneš adresu `https://nazev.onrender.com`. Port nastavovat nemusíš, Render ho dodá sám.

Do hry zapiš adresu s `wss://`:

```html
<script>window.G3D_SERVER = "wss://nazev.onrender.com";</script>
```

Zdarma plán po cca 15 minutách bez provozu usne. První připojení pak trvá asi minutu. Server můžeš udržovat vzhůru pravidelným pingem na jeho adresu, například přes UptimeRobot.

## Jak to funguje

Klient se připojí přes WebSocket a pošle zprávy ve formátu JSON.

| Směr | Zpráva | Význam |
|---|---|---|
| klient → server | `{"t":"join","room":"w-city"}` | vstup do místnosti |
| klient → server | `{"t":"p","d":{...}}` | moje aktuální data (poloha, auto, závod) |
| server → klient | `{"t":"welcome","id":"...","peers":[...]}` | tvoje ID a hráči, kteří už v místnosti jsou |
| server → klient | `{"t":"u","id":"...","d":{...}}` | jiný hráč poslal nová data |
| server → klient | `{"t":"l","id":"..."}` | hráč odešel |
| server → klient | `{"t":"full"}` | místnost je plná |

Server obsah `d` nezkoumá, jen ho přeposílá ostatním v místnosti. Název místnosti smí mít jen písmena, číslice, `_` a `-` do délky 32 znaků.

## Limity

- nejvýše 24 hráčů v jedné místnosti
- zpráva smí mít nejvýše 2 kB
- od jednoho hráče server přijme zprávu nejdřív za 40 ms, rychlejší zahodí
- nečinná spojení se po cca 20–40 sekundách odpojí (ping/pong)

Tyto hodnoty jsou na začátku `server.js` (`MAX_PER_ROOM`, `MAX_MSG`, `MIN_GAP`).

## Bezpečnost

Server nemá přihlášení a data od klientů nekontroluje. Hodí se pro hru s kamarády, ne pro soutěže s cenami. Hráč s upraveným klientem může posílat falešné pozice nebo časy závodu. Připojit se může kdokoli, kdo zná adresu serveru.
