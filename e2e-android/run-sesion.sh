#!/bin/bash
# ---------------------------------------------------------------------------
# Suite movil en el emulador Android (Fase 1 del plan movil, ADR-0031):
#   1. sesion.yaml         primer arranque, conexion, ingreso y restauracion
#   2. venta.yaml          venta de POS con conexion
#   3. venta-offline.yaml  venta sin conexion (queda en la cola local)
#   4. sincronizacion.yaml al reconectar, la cola se vacia sola
#
# Si un flujo falla, deja diagnostico en `diagnostico/` (captura de pantalla,
# jerarquia de UI, logcat, conectividad y salida de Maestro) para el artefacto
# de CI.
#
# Lo ejecuta la accion android-emulator-runner EN UNA SOLA LINEA; toda la
# logica vive aqui porque la accion ejecuta el script linea por linea.
# ---------------------------------------------------------------------------
set -u

export MAESTRO_CLI_NO_ANALYTICS=1

diagnostico() {
  mkdir -p "$GITHUB_WORKSPACE/diagnostico"
  adb exec-out screencap -p > "$GITHUB_WORKSPACE/diagnostico/pantalla.png" || true
  adb logcat -d -t 1200 > "$GITHUB_WORKSPACE/diagnostico/logcat.txt" || true
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/ui.xml "$GITHUB_WORKSPACE/diagnostico/ui.xml" || true
  adb shell dumpsys connectivity > "$GITHUB_WORKSPACE/diagnostico/connectivity.txt" 2>/dev/null || true
  cp -r "$(ls -dt "$HOME"/.maestro/tests/* 2>/dev/null | head -1)" "$GITHUB_WORKSPACE/diagnostico/maestro" 2>/dev/null || true
}

correr() {
  local flujo="$1"
  echo "[movil] flujo: $flujo"
  if ! maestro test "$flujo"; then
    echo "[movil] FALLO en $flujo"
    diagnostico
    exit 1
  fi
}

# El flujo de sesion es autocontenido (arranca con clearState): un reintento
# absorbe los hipos del emulador sin enmascarar fallos de la app.
correr_flexible() {
  local flujo="$1"
  echo "[movil] flujo: $flujo"
  if ! maestro test "$flujo"; then
    echo "[movil] reintento de $flujo (flujo autocontenido)"
    if ! maestro test "$flujo"; then
      echo "[movil] FALLO en $flujo (tras reintento)"
      diagnostico
      exit 1
    fi
  fi
}

adb install -r apk/app-debug.apk
correr_flexible .maestro/sesion.yaml
correr .maestro/venta.yaml

echo "[movil] red fuera (modo avion + wifi/datos)"
adb shell cmd connectivity airplane-mode enable || true
adb shell svc wifi disable || true
adb shell svc data disable || true
sleep 5
correr .maestro/venta-offline.yaml

echo "[movil] red de vuelta"
adb shell cmd connectivity airplane-mode disable || true
adb shell svc wifi enable || true
adb shell svc data enable || true
sleep 5
if ! maestro test .maestro/sincronizacion.yaml; then
  echo "[movil] la cola no vacio a la primera; se re-dispara el evento online"
  adb shell svc wifi disable || true
  sleep 3
  adb shell svc wifi enable || true
  sleep 5
  if ! maestro test .maestro/sincronizacion.yaml; then
    echo "[movil] FALLO en .maestro/sincronizacion.yaml"
    diagnostico
    exit 1
  fi
fi

echo "[movil] suite completa en verde"
