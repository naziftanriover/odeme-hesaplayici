#!/bin/sh
# Ödeme Hesaplayıcı'yı GitHub'a yükler ve GitHub Pages linkini açar.
cd "$HOME/Projects/odeme-hesaplayici" || exit 1
if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create odeme-hesaplayici --public --source=. --push || exit 1
fi
gh api -X POST repos/naziftanriover/odeme-hesaplayici/pages -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1
echo ""
echo "TAMAM. 1-2 dakika sonra link acilir:"
echo "https://naziftanriover.github.io/odeme-hesaplayici/"
