# Burn Five: данные для App Store Connect

Все поля ниже вставляются в App Store Connect как есть. Основной язык страницы: English (U.S.), дополнительный: Russian.

## Общие данные

| Поле | Значение |
|---|---|
| Bundle ID | `com.daagamma.burnfive` (задан в проекте Xcode, можно поменять до первой отправки) |
| SKU | `burnfive` |
| Категория | Games, подкатегории Puzzle и Board |
| Цена | Free |
| Устройства | только iPhone |
| Privacy Policy URL | https://burnfive.daagamma.com/privacy |
| Support URL | https://burnfive.daagamma.com |
| Copyright | 2026 и название компании-издателя |
| Возрастной рейтинг | 4+ (во всех вопросах анкеты ответ None / No, кроме пользовательского контента, см. ниже) |
| Шифрование | в Info.plist уже указано, что приложение не использует собственное шифрование, вопрос в Connect не появится |

## English (U.S.)

**Name** (до 30 знаков): Burn Five

**Subtitle** (до 30): A calm color-line puzzle

**Promotional Text** (до 170): Slide cubes one cell at a time, push whole rows and burn lines of four. Twelve levels, a daily challenge and an endless game, all offline.

**Keywords** (до 100): `puzzle,lines,blocks,cubes,color,logic,daily,brain,relax,board,strategy,offline,levels,match`

**Description**:

Burn Five is a calm puzzle about color and space.

Slide any cube one cell at a time. Line up four cubes of the same color and they burn. Every move that burns nothing lets new cubes drop onto the board, so each step counts.

Push whole rows with a single move, watch for cracked cubes that turn to stone, and use jokers, triples and the destroyer when the board gets tight. Faint markers show where the next cubes will land, so you can plan ahead instead of guessing.

THREE WAYS TO PLAY
• Game: an endless round on an 8×8 or 10×10 board, with a gentle start and a tense finish.
• Levels: twelve hand-made puzzles with pillars, ice, portals and paint, each with its own goal.
• Daily: the same board and the same cubes for everyone, with a daily leaderboard.

MADE TO BE EASY ON YOU
• Every color has its own symbol, so the game is color-blind friendly.
• One undo per game for that one bad move.
• Works offline. No accounts, no ads.
• Light and dark themes, English and Russian.

**What's New** (версия 1.0): First release.

## Русский

**Name**: Burn Five

**Subtitle** (до 30): Головоломка: собери линию

**Promotional Text**: Двигайте кубики по одной клетке, толкайте целые ряды и сжигайте линии из четырех. Двенадцать уровней, задача дня и бесконечная игра, все без интернета.

**Keywords**: `головоломка,линии,кубики,блоки,цвета,логика,задача дня,уровни,без интернета,стратегия,релакс`

**Description**:

Burn Five: спокойная головоломка про цвет и пространство.

Двигайте любой кубик на одну клетку. Четыре кубика одного цвета в ряд сгорают. Если на ходу ничего не сгорело, на поле падают новые кубики, поэтому важен каждый шаг.

Толкайте целые ряды одним ходом, следите за треснутыми кубиками, которые превращаются в камень, и пускайте в ход джокер, тройку и уничтожитель, когда на поле становится тесно. Бледные метки показывают, куда упадут следующие кубики, так что можно планировать, а не гадать.

ТРИ РЕЖИМА
• Игра: бесконечная партия на поле 8×8 или 10×10, спокойное начало и напряженный финал.
• Уровни: двенадцать головоломок ручной работы с колоннами, льдом, порталами и краской, у каждой своя цель.
• День: одно и то же поле и одни и те же кубики для всех, с таблицей лучших за день.

ЧТОБЫ БЫЛО УДОБНО
• У каждого цвета свой знак, поэтому играть удобно и при нарушениях цветового зрения.
• Одна отмена хода за партию.
• Работает без интернета. Без аккаунтов и рекламы.
• Светлая и темная тема, английский и русский языки.

**What's New**: Первый выпуск.

## Скриншоты

Папки `screenshots/en` и `screenshots/ru`: по 5 картинок 1320×2868, это размер iPhone 6.9". Apple сама уменьшит их для остальных iPhone. Загружать в том же порядке, как пронумерованы файлы.

## App Privacy (раздел «Конфиденциальность приложения»)

Ответ на «Do you or your third-party partners collect data from this app?»: **Yes**.

| Тип данных | Связаны с пользователем | Используются для слежки | Цели |
|---|---|---|---|
| Usage Data → Product Interaction (итоги партий) | No | No | Analytics |
| User Content → Other User Content (имя в таблице дня) | No | No | App Functionality |

Больше ничего не собирается: ни контактов, ни местоположения, ни идентификаторов устройства и рекламы.

## Возрастной рейтинг

Во всех пунктах про насилие, азартные игры, контент для взрослых и прочее отвечаем None / No. На вопрос о пользовательском контенте (User-Generated Content) отвечаем Yes: в таблице дня видны имена других игроков. Сервер заменяет грубые слова в именах на «Player». Итог: 4+ (если анкета из-за этого поднимет рейтинг, это нормально).

## Notes for Review (поле для проверяющего, на английском)

Burn Five is a single-player puzzle game. It works fully offline: all game files are bundled in the app. The only network calls are anonymous game statistics and the optional daily leaderboard at burnfive.daagamma.com. Leaderboard names are short nicknames typed by players; offensive words are replaced on the server. No login is required to review any part of the app.
