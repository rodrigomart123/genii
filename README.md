# Genii

Plataforma educativa gamificada - HTML5, CSS3, JavaScript puro, Firebase e Vercel.

Feita no âmbito da Prova de Aptidão Profissional (PAP) do curso Técnico de Gestão e Programação de Sistemas Informáticos na Escola Secundária Pinheiro e Rosa.

**Ao vivo em: [gnii.me](https://gnii.me)**

## O que é o Genii?

Uma plataforma onde professores e alunos criam e jogam quizzes interativos. Ao contrário do Kahoot, o Genii tem gamificação contínua: XP, níveis, avatares personalizáveis, missões diárias, turmas virtuais e multiplayer ao vivo para dezenas de jogadores. Tem também IA para gerar perguntas e imagens automaticamente.

### Funcionalidades principais
- Criar quizzes (múltipla escolha, verdadeiro/falso, escrita, slides)
- Modo multiplayer ao vivo com PIN
- Sistema de XP, níveis e streaks
- Missões diárias
- Turmas virtuais com trabalhos
- Avatares compostos por camadas PNG
- Geração de perguntas e imagens com IA (Gemini + Cloudflare)
- Modo escuro
- Página Descobrir com quizzes públicos

## Como correr localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- Git
- Uma conta na [Vercel](https://vercel.com) (gratuita)

### Passos

```bash
# 1. Clona o repositório
git clone https://github.com/rodrigomart123/genii.git
cd genii

# 2. Instala as dependências
npm install

# 3. Instala o Vercel CLI (globalmente)
npm install -g vercel

# 4. Faz login na Vercel (abre o browser)
vercel login

# 5. Liga ao teu projeto Vercel (se já existir) ou cria um novo
vercel link

# 6. Cria o ficheiro .env na raiz do projeto
#    Usa o .env.example como template e preenche com as tuas chaves
copy .env.example .env

# 7. Corre o servidor de desenvolvimento local
vercel dev
```

O Genii vai estar disponível em `http://localhost:3000`.

### Configuração do Firebase

O Genii usa Firebase (Authentication, Firestore e Realtime Database). A configuração está em **`firebase-config.js`**:

- O ficheiro atual usa o projeto Firebase do autor (`playgenii`).
- Se quiseres usar o teu **próprio Firebase**, cria um projeto em https://console.firebase.google.com, copia as credenciais Web e substitui o ficheiro.
- Podes usar o template em `firebase-config.example.js` como ponto de partida.

**Nota:** As credenciais do Firebase Web (`apiKey`, `authDomain`, etc.) são concebidas para serem públicas — a segurança está nas **Firestore Security Rules** (`firestore.rules`).

### Variáveis de ambiente necessárias (.env)

| Variável | Descrição |
|---|---|
| `GEMINI_API_KEY` | Chave da API do Google Gemini |
| `CLOUDFLARE_API_KEY` | Chave da API da Cloudflare AI |
| `CLOUDFLARE_WORKER_URL` | URL do worker da Cloudflare |
| `UNSPLASH_API_KEY` | Chave da API do Unsplash |
| `FIREBASE_SERVICE_ACCOUNT` | JSON da conta de serviço do Firebase |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | Chave da API do Cloudinary |
| `CLOUDINARY_API_SECRET` | Secret da API do Cloudinary |

> **Importante:** As funções serverless (pasta `api/`) precisam destas variáveis para funcionar. Sem elas, a aplicação abre mas a IA, uploads e validação de respostas não funcionam.

## Estrutura do projeto

```
genii/
├── api/                  # Funções serverless (Vercel)
│   ├── gemini.js         # Proxy para o Google Gemini
│   ├── generate_image.js # Proxy para Cloudflare AI
│   ├── unsplash.js       # Proxy para Unsplash
│   ├── quiz-play.js      # Encripta respostas para o jogo
│   ├── check-answer.js   # Valida respostas no servidor
│   ├── upload.js         # Upload para Cloudinary
│   ├── delete-image.js   # Apagar imagens do Cloudinary
│   ├── credits.js        # Gestão de créditos diários
│   ├── _firebase.js      # Admin SDK do Firebase
│   ├── _credits.js       # Verificação de tokens e créditos
│   └── _validation.js    # Encriptação AES-256-GCM
├── static/
│   ├── css/style.css     # Todo o CSS global
│   ├── js/
│   │   ├── components.js     # Sidebar, avatar, helpers
│   │   ├── gamification.js   # Motor de XP e níveis
│   │   ├── daily-missions.js # Missões diárias
│   │   ├── theme.js          # Modo escuro
│   │   ├── credits.js        # Créditos de IA
│   │   ├── cache.js          # Cache de recursos
│   │   └── skeleton.js       # Skeleton loading
│   ├── img/              # Imagens, ícones, mascotes
│   └── audio/            # Efeitos sonoros
├── *.html                # Páginas (index, login, studio, etc.)
├── firebase-config.js         # Config do Firebase (pública)
├── firebase-config.example.js # Template para quem quer usar o próprio Firebase
├── firestore.rules       # Regras de segurança
├── vercel.json           # Configuração da Vercel
└── package.json          # Dependências
```

## Tecnologias

- **Frontend:** HTML5, CSS3, Vanilla JS (ES6 Modules)
- **Backend:** Firebase Auth + Firestore + Realtime Database
- **Serverless:** Vercel Functions (Node.js)
- **Imagens:** Cloudinary
- **IA:** Google Gemini, Cloudflare Workers AI
- **Fontes:** Fredoka (títulos), Nunito (corpo)

Feito por Rodrigo Martins - 3º TGPSI, 2025/2026.
