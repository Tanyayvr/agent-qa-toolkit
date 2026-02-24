#!/usr/bin/env sh
set -e

cmd="$1"
shift || true

case "$cmd" in
  runner)
    exec npm -w runner run dev -- "$@"
    ;;
  evaluator)
    exec npm -w evaluator run dev -- "$@"
    ;;
  *)
    echo "Usage: entrypoint-prod.sh runner|evaluator -- <args>"
    echo "Note: this image requires a runtime with ts-node (use dev target or include dev deps)."
    exit 2
    ;;
esac
