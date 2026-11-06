# Evangelho das Dimenúveis: Armageddon

[![Build Android APK](https://github.com/dimenuvel/Evangelho-das-Dimenuveis-Armageddon/actions/workflows/build-apk.yml/badge.svg)](https://github.com/dimenuvel/Evangelho-das-Dimenuveis-Armageddon/actions/workflows/build-apk.yml)

> **Cosmic Bowling Artillery Warfare**  
> Um jogo de estratégia e artilharia por turnos em 2D com terreno destrutível em tempo real, física de projéteis e simulação gravitacional cósmica. Inspirado no universo do Evangelho das Dimenúveis e nos clássicos de artilharia como *Worms* e *Scorched Earth*.

---

## 🌌 Visão Geral do Jogo / Game Overview

*Evangelho das Dimenúveis: Armageddon* coloca facções transcendentais, entidades do Evangelho das Dimenúveis, Arcontes burocráticos e mestres do boliche cósmico em um campo de batalha cósmico destrutível.

### Principais Características / Key Features:
- **Destruição Dinâmica do Terreno:** Explosões arrancam crateras em tempo real no mapa via manipulação de pixels do canvas.
- **Arsenal Sagrado (14 Armas Exclusivas):**
  - Foguete Cósmico (Cosmic Rocket)
  - Bola de Boliche Cósmica (Cosmic Bowling Ball - rola por encostas e derruba pinos)
  - Santa Granada da 9ª Dimensão (Holy Hand Grenade com pavio de 3 segundos)
  - Canhão da Proporção Áurea (Golden Ratio Cannon - divide-se em 3 submunições Fibonacci)
  - Coletor de Impostos dos Arcontes (Archon Tax Collector - ataque aéreo de caixote burocrático)
  - Ataque dos Sete Chakras (Seven Chakra Strike - bombardeio orbital sequencial em arco-íris)
  - Meteoro Akáshico (Akashic Meteor - cratera monumental)
  - Bumerangue Hermético (Hermetic Boomerang - curva de retorno aerodinâmica)
  - O Apagador de Ego (The Ego Eraser - singularidade gravitacional)
  - As Dez Pragas (The Ten Plagues - submunições saltitantes)
  - Strike Divino (Divine Bowling Strike - chuva de pinos gigantes)
  - Dinamite Santa (Holy Dynamite - pavio de 5s aos pés)
  - Teletransporte Dimensional (Dimensional Teleport)
  - Mochila a Jato Cósmica (Cosmic Jetpack - 100 unidades de voo)
- **Modos de Jogo:**
  - Solo vs CPU (3 níveis de inteligência artificial: Fácil, Normal e Pesadelo dos Arcontes)
  - Multijogador Local Hot-Seat (2 Jogadores no mesmo aparelho, com tela de privacidade opcional)
  - Campanha dos Seis Julgamentos Sagrados (The Six Sacred Trials) com desbloqueio de divindades do Panteão
  - Campo de Treino (Target Range)
- **Controles Intuitivos para Mobile e Desktop:**
  - **Mover o Mapa Livremente:** Arraste com um ou dois dedos em qualquer lugar do campo de batalha para inspecionar o terreno sem disparar acidentalmente;
  - **Botão de Focalização (Recenter):** Retorne a câmera instantaneamente ao guerreiro ativo;
  - **Alternância de Guerreiros (Cycle Warrior / Trocar Guerreiro):** Botão dedicado no HUD para alternar livremente entre guerreiros vivos da sua equipe durante a fase de mira;
  - **Controle Preciso de Ângulo:** Botões `+` e `-` com repetição por pressão mantida, barra deslizante e botão de inversão rápida de 180° (`Virar Mira`);
  - **HUD Responsivo e Adaptativo:** Layout de 2 níveis no modo retrato (vertical) e barra compacta no modo paisagem (horizontal).
- **Localização Completa:** Suporte nativo e instantâneo a Português do Brasil (PT-BR) e Inglês (EN).

---

## 📁 Estrutura do Projeto / Project Architecture

```
.
├── .github/
│   └── workflows/
│       └── build-apk.yml               # Pipeline de CI/CD para compilar APK Debug automaticamente
├── android/                            # Projeto nativo Android completo (Capacitor)
│   ├── app/
│   │   ├── build.gradle                # Configurações de compilação, SDKs e plugins do app
│   │   └── src/main/
│   │       ├── AndroidManifest.xml     # Manifest do Android (orientação, permissões, tela cheia)
│   │       ├── assets/public/          # Web assets sincronizados para a WebView nativa
│   │       └── java/com/dimenuveis/armageddon/
│   │           └── MainActivity.java   # Ponto de entrada nativo do app Android
│   ├── gradle/wrapper/                 # Gradle Wrapper oficial
│   │   ├── gradle-wrapper.jar
│   │   └── gradle-wrapper.properties   # Distribuição Gradle 8.2.1
│   ├── build.gradle                    # Configurações do projeto raiz Gradle
│   ├── settings.gradle                 # Definições de módulos Gradle
│   ├── gradlew                         # Script executável Linux/macOS do Gradle
│   └── gradlew.bat                     # Script executável Windows do Gradle
├── capacitor.config.json               # Configuração oficial do Capacitor (App ID, pasta web, etc.)
├── package.json                        # Dependências do projeto (React 19, Tailwind, Capacitor)
├── package-lock.json                   # Árvore exata de dependências para compilações reprodutíveis
├── tsconfig.json                       # Configurações do compilador TypeScript
├── vite.config.ts                      # Configuração do empacotador Vite
└── src/
    ├── App.tsx                         # Loop principal do jogo, gerenciamento de estado e turnos
    ├── components/
    │   ├── GameCanvas.tsx              # Renderizador do terreno, personagens, projéteis e partículas
    │   ├── GameHUD.tsx                 # Interface com botões de ação, alternância de guerreiro e mira
    │   ├── TitleMenu.tsx               # Menu principal estilizado arcade cósmico
    │   ├── GameSetupModal.tsx          # Configuração de partida (facções, mapas, IA, regras)
    │   ├── WeaponSheet.tsx             # Seletor modal do arsenal sagrado
    │   ├── HotSeatTransitionModal.tsx  # Tela de privacidade para passagem de turno em 2P
    │   ├── CampaignModal.tsx           # Mapa da campanha dos 6 Julgamentos
    │   ├── DeityGalleryModal.tsx       # Códice com divindades desbloqueáveis e estatísticas
    │   ├── FirstLaunchTourModal.tsx    # Tutorial inicial ilustrado e interativo
    │   ├── SettingsModal.tsx           # Configurações de som, música e troca de idioma
    │   └── GameOverModal.tsx           # Resumo do apocalipse, estatísticas e revanche
    ├── services/
    │   ├── audioService.ts             # Sintetizador procedural Web Audio API (sem dependência externa)
    │   ├── gameConstants.ts            # Definições de armas, facções, mapas e constantes de física
    │   ├── localization.ts             # Dicionário de traduções completas (EN / PT)
    │   ├── storageService.ts           # Persistência de progresso local (campanha e recordes)
    │   └── terrainGenerator.ts        # Gerador procedural de mapas destrutíveis por bioma
    └── types/
        └── game.ts                     # Interfaces TypeScript (armas, entidades, facções, terreno)
```

---

## 🚀 Como Executar Localmente (Web) / Local Web Development

### Pré-requisitos:
- Node.js versão 18+ (recomendado Node.js 20 LTS)
- npm versão 9+

### Instalação e Execução:
```bash
# 1. Instalar as dependências com lockfile garantido
npm ci

# 2. Iniciar o servidor de desenvolvimento Vite (porta 3000)
npm run dev

# 3. Compilar a versão otimizada de produção
npm run build
```

---

## 📱 Compilação do APK Android (Debug APK)

O projeto está 100% configurado com **Capacitor** e **Gradle Wrapper** para compilar aplicativos nativos Android sem esforço.

### Método 1: Compilação Automática via GitHub Actions (Recomendado)

O repositório já inclui o fluxo pronto em `.github/workflows/build-apk.yml`.

1. Ao enviar commits para a branch `main` ou `master` (ou disparar via botão `workflow_dispatch` na aba **Actions** do GitHub);
2. O runner do Ubuntu executa:
   - Configuração do Node.js 20 e Java 21 (Zulu LTS);
   - Instalação das dependências exatas com `npm ci`;
   - Build do web app via `npm run build`;
   - Sincronização com o Android via `npx cap sync android`;
   - Compilação do APK via `./gradlew assembleDebug --no-daemon`;
3. O arquivo final é salvo nos artefatos da execução com o nome:
   `Evangelho-das-Dimenuveis-Armageddon-v1.0.apk`.

---

### Método 2: Compilação Local com Android SDK / Linha de Comando

#### Pré-requisitos:
- **Java Development Kit (JDK):** Versão 21 (LTS recomendada para Capacitor 8)
- **Android SDK:** Configurado com a variável de ambiente `ANDROID_HOME` apontando para o SDK
  - Build Tools: `35.0.0`
  - Compile SDK: `36` (ou `35`)
  - Min SDK: `24` (Android 7.0+)

#### Passo a Passo:

1. **Construir a aplicação web e sincronizar os arquivos para o Android:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Entrar no diretório do Android e compilar o APK:**
   ```bash
   cd android
   chmod +x gradlew
   ./gradlew assembleDebug
   ```
   *(No Windows com PowerShell ou CMD, execute `gradlew.bat assembleDebug`)*

3. **Localização do APK gerado:**
   Após a conclusão, o arquivo APK de depuração estará em:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Instalar diretamente em um celular ou emulador conectado via USB:**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

### Método 3: Abrir no Android Studio

Se preferir utilizar a IDE oficial do Android Studio para depuração com logcat, emulador virtual e inspeção:

```bash
npx cap open android
```
No Android Studio:
1. Aguarde a sincronização inicial do Gradle;
2. Selecione o dispositivo de destino (dispositivo físico ou emulador AVD);
3. Clique no botão **Run** (ícone de play verde) ou no menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 🎮 Controles e Guia Rápido de Jogo / Controls

| Ação | Controle na Tela | Teclado / Atalho |
| :--- | :--- | :--- |
| **Mover o Mapa** | Toque e arraste com o dedo no mapa | Clique e arraste com o mouse |
| **Focalizar Jogador** | Botão `FOCALIZAR` / `RECENTER` no topo | - |
| **Trocar de Guerreiro** | Botão `TROCAR` / `CYCLE` ao lado do nome | Alterna entre guerreiros vivos |
| **Andar** | Botões `◀` e `▶` no painel inferior | Setas Esquerda / Direita ou `A` / `D` |
| **Pular** | Botão `PULO` | `W` ou Seta Cima |
| **Salto Mortal** | Botão `GIRO` (salto alto para trás) | `Backspace` ou `Shift + W` |
| **Ajustar Ângulo** | Botões `+` / `-`, barra de ângulo ou `Virar` | Setas Cima / Baixo |
| **Mochila a Jato** | Botão do raio com percentual de combustível | Barra de espaço (quando ativa) |
| **Disparar** | Segurar botão `FOGO` para dosar a força e soltar | Barra de espaço mantida |
| **Arsenal** | Botão com o nome da arma atual | Abre a tela de armas |

---

## 📜 Licença

Desenvolvido para o universo de **Evangelho das Dimenúveis**. Distribuído sob os termos da licença Apache 2.0.
