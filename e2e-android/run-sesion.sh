#!/bin/bash
# ---------------------------------------------------------------------------
# Prueba de sesion en el emulador Android (Fase 1 del plan movil, ADR-0031).
#
# Maestro corre el flujo `.maestro/sesion.yaml`; si falla, deja diagnostico en
# `diagnostico/` (captura de pantalla, jerarquia de UI, logcat y salida de
# Maestro) para que el workflow lo suba como artefacto.
#
# Lo ejecuta la accion android-emulator-runner EN UNA SOLA LINEA; toda la
# logica vive aqui porque la accion ejecuta el script linea por linea.
# ---------------------------------------------------------------------------
set -u

export MAESTRO_CLI_NO_ANALYTICS=1

adb install -r apk/app-debug.apk
maestro test .maestro/sesion.yaml
resultado=$?

if [ "$resultado" -ne 0 ]; then
  mkdir -p "$GITHUB_WORKSPACE/diagnostico"
  adb exec-out screencap -p > "$GITHUB_WORKSPACE/diagnostico/pantalla.png" || true
  adb logcat -d -t 800 > "$GITHUB_WORKSPACE/diagnostico/logcat.txt" || true
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/ui.xml "$GITHUB_WORKSPACE/diagnostico/ui.xml" || true
  cp -r "$(ls -dt "$HOME"/.maestro/tests/* 2>/dev/null | head -1)" "$GITHUB_WORKSPACE/diagnostico/maestro" 2>/dev/null || true
fi

exit "$resultado"
