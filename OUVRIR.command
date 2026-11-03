#!/bin/zsh
cd "$(dirname "$0")"
(lsof -i :8771 >/dev/null) || (python3 -m http.server 8771 >/dev/null 2>&1 &)
sleep 1
open -a Arc "http://127.0.0.1:8771/index.html"
