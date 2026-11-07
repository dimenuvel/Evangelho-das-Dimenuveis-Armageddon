# Evangelho das Dimenúveis: Armageddon

[![Build Android APK](https://github.com/dimenuvel/Evangelho-das-Dimenuveis-Armageddon/actions/workflows/build-apk.yml/badge.svg)](https://github.com/dimenuvel/Evangelho-das-Dimenuveis-Armageddon/actions/workflows/build-apk.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js)](https://nodejs.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.6.0-119EFF?logo=capacitor)](https://capacitorjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> **Cosmic Bowling Artillery Warfare (Jogo Tático de Artilharia 2D Cósmica)**  
> Um jogo de estratégia e artilharia por turnos em 2D com terreno destrutível em tempo real, física de projéteis balísticos, simulação gravitacional e física de boliche cósmico. Inspirado no universo místico do *Evangelho das Dimenúveis* e em clássicos atemporais como *Worms Armageddon* e *Scorched Earth*.

---

## 📑 Sumário / Table of Contents
- [🌌 Visão Geral & Funcionalidades / Features](#-visão-geral--funcionalidades--features)
- [💣 Arsenal Sagrado (14 Armas) / Sacred Arsenal](#-arsenal-sagrado-14-armas--sacred-arsenal)
- [🪐 Facções & Lore / Factions & Lore](#-facções--lore--factions--lore)
- [🗺️ Mapas & Biomas Cósmicos / Battlegrounds](#️-mapas--biomas-cósmicos--battlegrounds)
- [⚔️ Modos de Jogo / Game Modes](#️-modos-de-jogo--game-modes)
- [📡 Multijogador em Rede Local Wi-Fi (LAN) / Local Wi-Fi Multiplayer](#-multijogador-em-rede-local-wi-fi-lan--local-wi-fi-multiplayer)
- [📱 Aplicativo Android (APK) & Detecção de IP / Android APK & IP Auto-Discovery](#-aplicativo-android-apk--detecção-de-ip--android-apk--ip-auto-discovery)
- [🎮 Controles e Jogabilidade / Controls & Gameplay](#-controles-e-jogabilidade--controls--gameplay)
- [📁 Arquitetura do Projeto / Project Architecture](#-arquitetura-do-projeto--project-architecture)
- [🚀 Como Executar Localmente (Web) / Local Setup](#-como-executar-localmente-web--local-setup)
- [📦 Como Compilar o APK Android / Building Android APK](#-como-compilar-o-apk-android--building-android-apk)
- [📜 Licença / License](#-licença--license)

---

## 🌌 Visão Geral & Funcionalidades / Features

- **Destruição Dinâmica de Terreno em Tempo Real:** Cada explosão arranca crateras matemáticas no terreno via manipulação de pixels direta no Canvas 2D (`CanvasRenderingContext2D`), recalculando as máscaras de colisão dos guerreiros instantaneamente.
- **Física Balística Completa com Vento:** Simulação real de gravidade, resistência ao ar, velocidade de lançamento, ricochetes de bolas de boliche em encostas acidentadas e influência do vento variável a cada turno.
- **Multijogador em Rede Local Wi-Fi (LAN) via WebSockets:**
  - Batalha direta em tempo real entre dois celulares (ou celular e computador) conectados na mesma rede Wi-Fi residencial;
  - Detecção nativa automática de IP do celular no Android (`window.AndroidDevice.getDeviceLocalIp()`) e via WebRTC;
  - Criação de salas com código de 4 caracteres e geração de QR Code na tela do anfitrião para entrada instantânea da câmera do desafiante;
  - Atalhos de sub-rede (`192.168.1.X`, etc.) para agilizar a conexão.
- **Multijogador Hot-Seat no Mesmo Aparelho:** Dois jogadores se enfrentam alternando o aparelho, com tela de transição de privacidade opcional (para que um não veja a posição e armas do outro antes de receber o celular).
- **Inteligência Artificial Tática Avançada (Solo vs CPU):**
  - Três níveis de dificuldade com trajetórias balísticas calculadas matematicamente:
    - **Fácil (Iniciado):** Disparos com dispersão angular e de potência generosas;
    - **Normal (Adepto Cósmico):** Disparos equilibrados com mira responsiva;
    - **Pesadelo dos Arcontes (Nightmare):** Priorização de alvos próximos ao Vazio para eliminação por queda d'água/vazio cósmico e cálculo preciso de vento e parábola balística.
- **Campanha "Os Seis Julgamentos Sagrados" (The Six Sacred Trials):**
  - Sequência progressiva de 6 batalhas míticas com desafios e terrenos únicos;
  - Desbloqueio progressivo de divindades do Panteão das Dimenúveis conforme cada julgamento é superado.
- **Panteão Cósmico & Códice de Divindades:**
  - Galeria mística de divindades desbloqueáveis com suas respectivas passagens sagradas, títulos cósmicos e arquétipos celestiais.
- **Áudio Sintetizado Procedural (Web Audio API):** Efeitos sonoros dinâmicos de explosões, ricochetes, alertas de recuo e marchas sem dependência de arquivos externos pesados.
- **Bilinguismo Completo e Instantâneo:** Alternância entre Português do Brasil (PT-BR) e Inglês (EN) a qualquer momento.

---

## 💣 Arsenal Sagrado (14 Armas) / Sacred Arsenal

O jogo oferece um arsenal diversificado que combina artilharia tradicional com física de boliche e conceitos esotéricos:

| Ícone | Arma | Descrição Tática | Dano Base | Raio | Munição Padrão |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 🚀 | **Foguete Cósmico** *(Cosmic Rocket)* | Projétil clássico impulsionado por vetor direto. Sensível ao vento. | 45 | 45px | ∞ |
| 🎳 | **Bola de Boliche Cósmica** *(Cosmic Bowling Ball)* | Rola pelas curvas do terreno com inércia antes de detonar. Esmaga pinos e inimigos na descida. | 60 | 55px | 4 |
| 💣 | **Santa Granada da 9ª Dimensão** *(Holy Hand Grenade)* | Granada com pavio de 3 segundos que ricocheteia no chão até detonar com canto celestial. | 80 | 75px | 3 |
| 📐 | **Canhão da Proporção Áurea** *(Golden Ratio Cannon)* | Disparo que se divide no ar em 3 submunições em espiral Fibonacci ao atingir o ápice. | 75 | 50px | 3 |
| 📦 | **Coletor de Impostos dos Arcontes** *(Archon Tax Collector)* | Ataque aéreo orbital. Clique no mapa para definir o alvo: caixas burocráticas pesadas despencam do céu. | 70 | 60px | 2 |
| 🌈 | **Ataque dos Sete Chakras** *(Seven Chakra Strike)* | Bombardeio cósmico orbital de 7 raios celestiais coloridos sequenciais sobre o ponto indicado. | 110 | 80px | 1 |
| ☄️ | **Meteoro Akáshico** *(Akashic Meteor)* | Meteoro titânico de alto calibre que cava crateras gigantescas e arremessa oponentes longe. | 95 | 90px | 1 |
| 🪃 | **Bumerangue Hermético** *(Hermetic Boomerang)* | Arma com curva aerodinâmica reversa que faz a volta em torno de obstáculos e retorna. | 50 | 40px | 3 |
| 🌌 | **O Apagador de Ego** *(The Ego Eraser)* | Cria uma singularidade gravitacional que atrai todos os oponentes próximos e desintegra a matéria. | 100 | 85px | 1 |
| 🦗 | **As Dez Pragas** *(The Ten Plagues)* | Projétil fragmentário que explode em enxame de submunições saltitantes que varrem o relevo. | 85 | 65px | 2 |
| 🎳 | **Strike Divino** *(Divine Strike)* | Evoca um grupo de 10 pinos de boliche celestiais caindo do céu em formação perfeita. | 90 | 70px | 1 |
| 🧨 | **Dinamite Santa** *(Holy Dynamite)* | Solta um cilindro aos pés do guerreiro com pavio de 5s. Dá tempo para recuar ou usar mochila. | 90 | 80px | 2 |
| 🌀 | **Teletransporte Dimensional** *(Dimensional Teleport)* | Teletransporta seu guerreiro instantaneamente para qualquer ponto livre do mapa. | 0 | - | 2 |
| 🎒 | **Mochila a Jato Cósmica** *(Cosmic Jetpack)* | Propulsor gravitacional portátil com 100 unidades de combustível para reposicionamento aéreo. | - | - | 2 |

---

## 🪐 Facções & Lore / Factions & Lore

1. **Os Bolichistas Cósmicos 🎳 *(Cosmic Bowlers)*:**  
   *Cores: Roxo Místico & Dourado Solar.* Mestres que acreditam que o cosmos é uma pista perfeita de boliche e que os planetas são pinos a serem alinhados.
2. **Os Arcontes da Burocracia 📜 *(Archons of Bureaucracy)*:**  
   *Cores: Azul Tecnocrático & Prata Fria.* Entidades controladoras do tecido dimensional que taxam a existência com relatórios celestiais e decretos gravitacionais.
3. **Os Iluminados da 9ª Dimensão 👁️ *(Enlightened of the 9th Dimension)*:**  
   *Cores: Verde Esmeralda & Dourado Astral.* Monges ascetas que alcançaram a transcendência do ego e manipulam geometrias sagradas e proporções áureas.
4. **Os Niilistas do Vazio 🕳️ *(Void Nihilists)*:**  
   *Cores: Carmesim Sangue & Preto Cósmico.* Cultistas que buscam apagar todas as dimensões e precipitar todas as almas na escuridão do Vazio Final.

---

## 🗺️ Mapas & Biomas Cósmicos / Battlegrounds

- **Pista de Boliche Cósmica *(Cosmic Bowling Alley)*:** Pista celestial com calhas dimensionais, madeira polida mística e pinos sagrados.
- **Cidadela dos Arcontes *(Archon Citadel)*:** Fortaleza de pilares geométricos e plataformas burocráticas suspensas no éter.
- **Jardim do Éden Interdimensional *(Garden of Eden)*:** Relevo orgânico com colinas verdejantes, raízes cósmicas e cavernas destrutíveis.
- **Sete Céus *(Seven Heavens)*:** Ilhas flutuantes etéreas onde qualquer queda descuidada leva diretamente ao Vazio.
- **Biblioteca Akáshica *(Akashic Library)*:** Arquivos ancestrais formados por cristais de memória e pergaminhos flutuantes.
- **Vazio Cósmico *(Cosmic Void)*:** Terreno hostil de matéria escura com vento caótico e poços gravitacionais implacáveis.

---

## ⚔️ Modos de Jogo / Game Modes

1. **Solo vs CPU:** Escolha o número de guerreiros por equipe (2v2, 3v3 ou 4v4), o mapa, o tempo por turno (30s, 45s ou 60s) e enfrente a IA.
2. **Multijogador Hot-Seat (Mesmo Aparelho):** Dois jogadores disputam turnos no mesmo smartphone ou computador, ideal para jogar lado a lado.
3. **Rede Local Wi-Fi (LAN Multiplayer):** Dois aparelhos na mesma rede sem fio jogam através de sincronização de rede em tempo real sem precisar de servidores externos.
4. **Campanha dos Seis Julgamentos:** Supere as 6 missões canônicas do Evangelho das Dimenúveis para desbloquear todas as deidades no Códice.

---

## 📡 Multijogador em Rede Local Wi-Fi (LAN) / Local Wi-Fi Multiplayer

O jogo conta com uma arquitetura dedicada em `server.ts` combinando **Express** e **WebSocket (`ws`)** para permitir partidas sem latência na rede Wi-Fi doméstica:

### Como Jogar Celular vs Celular (ou Celular vs PC):

1. **Conecte os dois aparelhos na mesma rede Wi-Fi residencial.**
2. **Aparelho 1 (Anfitrião / Host):**
   - No Menu Principal, toque em **Rede Local (Wi-Fi)**.
   - Na aba **Criar Sala (Host)**, o jogo preenche automaticamente o **IP Local do seu aparelho** (ex: `http://192.168.1.105:3000`).
   - Escolha o nome, facção, mapa, guerreiros por equipe e toque em **Criar Sala**.
   - A tela exibirá o **Código da Sala** (ex: `7K9P`) e um **QR Code** de conexão rápida.
3. **Aparelho 2 (Desafiante / Guest):**
   - Abra o jogo e toque em **Rede Local (Wi-Fi)** > aba **Entrar (Join)**.
   - Digite o código de 4 caracteres da sala ou aponte a câmera para o QR Code do anfitrião.
   - Se o IP não foi preenchido automaticamente, selecione o atalho de sub-rede da sua casa (ex: `http://192.168.1.`) e insira o IP do anfitrião.
   - Toque em **Entrar na Sala**.
4. **Iniciar o Combate:**
   - Assim que o segundo jogador conectar, o anfitrião toca em **Iniciar Batalha Cósmica**. O servidor envia uma semente aleatória idêntica para que ambos gerem o mesmo mapa destrutível milímetro a milímetro.

---

## 📱 Aplicativo Android (APK) & Detecção de IP / Android APK & IP Auto-Discovery

O aplicativo Android utiliza a plataforma nativa **Capacitor 8** com configurações especiais para jogatina em rede local:

- **Ponte Nativa de Detecção de IP (`MainActivity.java`):**
  A classe principal do Android registra uma interface JavaScript nativa `window.AndroidDevice.getDeviceLocalIp()` que inspeciona as interfaces de rede ativas (`NetworkInterface`) e obtém o IP IPv4 do Wi-Fi (`192.168.X.X`) instantaneamente, mesmo em modo offline.
- **Tráfego Cleartext Liberado (`android:usesCleartextTraffic="true"`):**
  O `AndroidManifest.xml` e o `capacitor.config.json` estão configurados para permitir conexões HTTP e WebSockets diretas (`ws://` e `http://`) entre aparelhos na rede local, contornando o bloqueio padrão do Android 9+.
- **Permissões de Estado de Rede:**
  Inclusão de `ACCESS_NETWORK_STATE` e `ACCESS_WIFI_STATE` para consulta sem interrupções.

---

## 🎮 Controles e Jogabilidade / Controls & Gameplay

| Ação | Toque / Mobile | Teclado & Mouse (Desktop) |
| :--- | :--- | :--- |
| **Mover o Mapa (Câmera)** | Arraste um dedo livremente em qualquer área do mapa | Clique e arraste com o botão esquerdo do mouse |
| **Focalizar Guerreiro (Recenter)** | Botão `Focalizar` / `Recenter` no topo | Barra de atalho superior |
| **Trocar Guerreiro (Cycle)** | Botão `Trocar` / `Cycle` no painel superior | Disponível na fase de mira antes de disparar |
| **Andar para a Esquerda / Direita** | Botões direcionais `◀` e `▶` no painel inferior | Teclas `A` / `D` ou Setas Esquerda / Direita |
| **Pulo Frontal (Jump)** | Botão `Pulo` | Tecla `W` ou Seta para Cima |
| **Giro Mortal para Trás (Backflip)**| Botão `Giro` (salto de alta elevação) | Tecla `S` |
| **Ajustar Ângulo de Disparo** | Botões `+` / `-`, barra de ângulo ou botão `Virar` | Setas Cima / Baixo |
| **Disparar Projétil** | Segure o botão `FOGO` para dosar a força (0 a 100%) e solte | Mantenha a `Barra de Espaço` pressionada e solte |
| **Selecionar Alvo (Ataque Aéreo)** | Toque diretamente na coluna horizontal desejada do mapa | Clique na coordenada desejada |
| **Ativar Mochila a Jato** | Toque no botão do raio da mochila | Ativa o modo de impulso aéreo |
| **Abrir Arsenal de Armas** | Toque no botão do nome da arma atual | Abre a grade com munições e descrições |
| **Tempo de Recuo (Retreat)** | Após disparar, você tem 5 segundos para fugir ou se proteger | Movimente-se rapidamente antes do fim do turno |

---

## 📁 Arquitetura do Projeto / Project Architecture

```
.
├── .github/
│   └── workflows/
│       └── build-apk.yml               # Pipeline GitHub Actions de compilação automática do APK Debug
├── android/                            # Projeto nativo Android completo (Capacitor)
│   ├── app/
│   │   ├── build.gradle                # Configuração do módulo Android (Java 21, SDK 36, dependencies)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml     # Manifest com permissões de rede, tela cheia e cleartext
│   │       ├── assets/public/          # Web assets sincronizados para a WebView nativa
│   │       └── java/com/dimenuveis/armageddon/
│   │           └── MainActivity.java   # Ponto de entrada nativo com AndroidDevice bridge
│   ├── build.gradle                    # Configuração raiz Gradle
│   ├── gradlew                         # Script executável Gradle para Linux/macOS
│   └── gradlew.bat                     # Script executável Gradle para Windows
├── capacitor.config.json               # Configurações do Capacitor (cleartext, allowMixedContent, webDir)
├── package.json                        # Scripts e dependências (React 19, Tailwind, Express, ws, Vite)
├── server.ts                           # Servidor fullstack (Express, WebSocket multiplayer e Vite middleware)
├── tsconfig.json                       # Configuração TypeScript moderna
├── vite.config.ts                      # Configuração do Vite com plugin Tailwind e React
└── src/
    ├── App.tsx                         # Orquestrador principal da aplicação, estado e ciclo de vida
    ├── components/
    │   ├── CampaignModal.tsx           # Mapa da Campanha dos 6 Julgamentos
    │   ├── DeitiesModal.tsx            # Galeria e Códice das Divindades desbloqueadas
    │   ├── FirstLaunchTourModal.tsx    # Tour e tutorial interativo ilustrado
    │   ├── GameCanvas.tsx              # Renderizador do canvas (terreno destrutível, física, entidades)
    │   ├── GameHUD.tsx                 # Controles de mira, força, movimentação e status do turno
    │   ├── GameOverModal.tsx           # Tela de fim de partida, estatísticas e revanche
    │   ├── HotSeatTransitionModal.tsx  # Tela de privacidade para troca de jogador no Hot-Seat
    │   ├── LocalNetworkModal.tsx       # Interface de salas LAN (Host, Join, QR Code e IP discovery)
    │   ├── SettingsModal.tsx           # Configurações de som, música, idioma e dados
    │   ├── TitleMenu.tsx               # Menu principal estilizado arcade retrô cósmico
    │   └── WeaponSheet.tsx             # Modal do arsenal sagrado e seleção de armamentos
    ├── services/
    │   ├── ai.ts                       # Motor de inteligência artificial balística
    │   ├── gameConstants.ts            # Tabela de armas, facções, deidades e mapas
    │   ├── localization.ts             # Dicionário completo de traduções (PT / EN)
    │   ├── networkService.ts           # Cliente WebSocket e descoberta de IP local / WebRTC
    │   ├── physics.ts                  # Simulação de colisões, gravidade, explosões e ricochetes
    │   ├── sound.ts                    # Sintetizador procedural de áudio (Web Audio API)
    │   ├── storage.ts                  # Persistência local (campanha, preferências e estatísticas)
    │   └── terrain.ts                  # Gerador procedural e destrutível de mapas de pixels
    └── types/
        └── game.ts                     # Definições completas de tipos TypeScript
```

---

## 🚀 Como Executar Localmente (Web) / Local Setup

### Pré-requisitos
- **Node.js**: Versão 20 LTS ou 22 LTS
- **npm**: Versão 9+

### Passos de Execução:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento (Porta 3000):**
   ```bash
   npm run dev
   ```
   O servidor iniciará tanto a aplicação web com Vite quanto o servidor de WebSocket na porta `3000`:
   ```
   > Evangelho das Dimenúveis: Armageddon Server running
   > Local:   http://localhost:3000
   > Network: http://192.168.1.X:3000
   ```

3. **Verificação de Tipos e Linter:**
   ```bash
   npm run lint
   ```

4. **Gerar Build de Produção:**
   ```bash
   npm run build
   ```

---

## 📦 Como Compilar o APK Android / Building Android APK

### Método 1: GitHub Actions (Automático - Sem instalar SDK)

O repositório inclui a esteira completa em `.github/workflows/build-apk.yml`.
1. Acesse o seu repositório no GitHub.
2. Vá até a aba **Actions** > selecione **Build Android APK**.
3. Clique em **Run workflow**.
4. Ao término da execução, baixe o artefato:
   `Evangelho-das-Dimenuveis-Armageddon-v1.0.apk`.

---

### Método 2: Compilação Local com Android Studio / Linha de Comando

#### Pré-requisitos:
- **Java JDK 21**: (ex: Eclipse Temurin 21 ou Zulu 21)
- **Android SDK**: Build-Tools `35.0.0` ou `36.0.0`
- Variável `ANDROID_HOME` configurada no sistema

#### Passo a Passo:

1. **Gerar a build web e sincronizar para a pasta nativa Android:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Compilar o APK de depuração via Gradle:**
   ```bash
   cd android
   chmod +x gradlew
   ./gradlew assembleDebug
   ```
   *(No Windows utilize: `gradlew.bat assembleDebug`)*

3. **Localização do APK gerado:**
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Instalar via USB (ADB):**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 📜 Licença / License

Desenvolvido para o universo transmídia de **Evangelho das Dimenúveis**.  
Distribuído sob os termos da licença **Apache 2.0**.
