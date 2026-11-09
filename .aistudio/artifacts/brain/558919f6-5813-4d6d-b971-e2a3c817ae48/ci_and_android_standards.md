# Diretrizes Críticas de Arquitetura, Android e CI/CD (Memória de Sessões)

Este documento registra as decisões, soluções de erros e padrões de engenharia estabelecidos para este projeto e para futuras criações de aplicativos na plataforma.

---

## 1. Requisitos de Ambiente & Versões do Node.js
- **Capacitor 8 CLI:** Requer estritamente **Node.js >= 22.0.0** (Node 22 LTS). Versões inferiores (como Node 20) causam erro fatal imediato no `npx cap sync android`.
- **Java:** **Java 21 LTS** (Zulu / Temurin) em conformidade com o Gradle 8.13+ e o Android Gradle Plugin moderno.
- **Porta Padrão:** Servidor local e WebSockets sempre na porta `3000`.

---

## 2. Padrões de CI/CD no GitHub Actions (`.github/workflows/build-apk.yml`)
- **Node.js Setup:**
  ```yaml
  - name: Set up Node.js
    uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: 'npm'
  ```
- **Instalação de Dependências Resiliente:**
  Evita falhas do `npm ci` decorrentes de divergências sutis de lockfile:
  ```yaml
  - name: Install Dependencies
    run: |
      if [ -f package-lock.json ]; then
        npm ci || npm install
      else
        npm install
      fi
  ```
- **Android SDK no GitHub Actions (`ubuntu-latest`):**
  - **NÃO utilizar** `android-actions/setup-android@v3` — a action tenta instalar o pacote legado `tools`, descontinuado e removido pelo Google no SDK moderno, causando falha com `exit code 1` (`Failed to find package 'tools'`).
  - O runner `ubuntu-latest` **já possui o Android SDK completo** pré-instalado em `$ANDROID_HOME` (`/usr/local/lib/android/sdk`).
  - Para aceitar licenças sem quebrar o pipeline:
    ```yaml
    - name: Accept Android SDK Licenses
      run: |
        SDKMANAGER=$(find "$ANDROID_HOME/cmdline-tools" -name sdkmanager -type f 2>/dev/null | head -n 1)
        if [ -n "$SDKMANAGER" ]; then
          yes | "$SDKMANAGER" --licenses || true
        else
          yes | sdkmanager --licenses || true
        fi
    ```

---

## 3. Servidor Local Nativo & Rede Wi-Fi no Android
- **Servidor Embarcado (`EmbeddedGameServer.java`):**
  - O aparelho do jogador atua diretamente como servidor através de um `ServerSocket` em Java padrão na porta 3000.
  - Implementa WebSocket RFC 6455 sem dependências externas pesadas e endpoints REST (`/api/network-info`, `/api/rooms`).
- **Detecção de IP Local (`MainActivity.java`):**
  - A interface nativa `window.AndroidDevice.getDeviceLocalIp()` enumera as `NetworkInterface` do dispositivo para extrair o endereço IPv4 real da rede Wi-Fi (`192.168.x.x` ou `10.x.x.x`) e pré-preenche as telas de Host e Cliente.

---

## 4. Escaneamento de QR Code & Carregamento Direto no App
- **Leitor Embutido na Aplicação (`LocalNetworkModal.tsx`):**
  - Utiliza `jsQR` via WebRTC/HTML5 `<video>` no WebView, com permissões `android.permission.CAMERA` e `WebChromeClient.onPermissionRequest` no `MainActivity.java`.
  - Ao ler o QR Code, extrai automaticamente IP e código da sala e conecta instantaneamente.
- **Deep Links & Android Intents:**
  - Esquemas de URL registrados no `AndroidManifest.xml`: `armageddon://join?code=...&host=...`.
  - Quando escaneado por aplicativos externos (Google Lens, Câmera do Android ou Chrome), o servidor local despacha um Intent nativo (`intent://join...#Intent;scheme=armageddon;package=com.dimenuveis.armageddon;end`) para carregar a sessão no app instalado em vez de prender o usuário no navegador.
  - Cold starts e novas instâncias capturam a URI via `DeviceNetworkInterface.getPendingJoinUri()` e evento CustomEvent `appDeepLink`.
