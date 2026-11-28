#!/bin/sh
# Копирует игру из src/ в приложение для iOS (ios/LineBlast/www). Запускать после любых правок игры.
set -e
cd "$(dirname "$0")/.."
for f in index.html engine.js levels.js app.js i18n.js; do cp "src/$f" "ios/LineBlast/www/$f"; done
echo "ios/LineBlast/www обновлена"
