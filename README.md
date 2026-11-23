# Burn Five

Головоломка на поле 10×10: двигайте кубики на одну клетку, собирайте линии из 5 и больше кубиков одного цвета.

- Игра: https://burnfive.daagamma.com
- Статистика партий: https://burnfive.daagamma.com/stats?key=ADMIN_KEY

## Устройство

- `src/index.html`: сама игра, одна страница.
- `src/worker.js`: Cloudflare Worker. Отдает игру, принимает итоги партий (`POST /api/game`) в KV, показывает `/stats` и `/stats.csv`.
- `wrangler.toml`: имя воркера, домен burnfive.daagamma.com, хранилище KV `GAMES`.

Секрет `ADMIN_KEY` задается в Cloudflare: Workers → burnfive → Settings → Variables and Secrets.

Деплой идет автоматически из ветки `main` через Cloudflare Workers Builds.
