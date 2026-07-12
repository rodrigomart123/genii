# APRESENTAÇÃO

## 01. O Genii

O Kahoot oferece jogos isolados sem progressão. O Genii introduz uma gamificação contínua com níveis, missões diárias e avatares personalizáveis. Isto incentiva os alunos a voltar todos os dias.

IMAGEM 1: Figura 1 do relatório (Homepage com a secção hero).
IMAGEM 2: Figura 2 do relatório (Funcionalidades entre alunos e professores).

---

## 02. A Origem

O Genii nasceu como projeto final do meu curso de TGPSI. Queria destacar-me na apresentação com algo interativo, por isso olhei para o Kahoot, que é muito popular em sala de aula, mas sentia que poderia ter mais. Então decidi construir uma alternativa do zero que aplicasse tudo o que aprendi durante o curso.

IMAGEM 3: Mascote Genii de corpo inteiro com a coroa dourada (ou uma fotografia da tua escola).

---

## 03. O Branding

O projeto começou por se chamar SÁBIO, com um rato amarelo como mascote. Procurei sinónimos de inteligência e encontrei Genii, o plural de génio em latim. Assim nasceu a mascote atual.

IMAGEM 4: Evolução da mascote (SÁBIO rato amarelo → Genii génio).

---

## 04. Arquitetura Serverless

O Genii corre em arquitetura serverless na Vercel, eliminando a necessidade de um servidor 24/7, o que corta custos de manutenção. O Firebase trata da sincronização em tempo real e da base de dados, a Cloudinary guarda os imagens e por fim as funções serverless protegem as chaves das APIs. O resultado é rapidez, escalabilidade automática e custos zero no domínio gnii.me.

IMAGEM 5: Diagrama simples do fluxo (Cliente -> Vercel API -> Firebase e Cloudinary).

---

## 05. O Motor de Gamificação

A progressão segue uma fórmula quadrática para manter o desafio. Cada nível exige mais XP que o anterior e a conversão usa a fórmula resolvente sem iterações. As recompensas estão centralizadas para facilitar ajustes.

Código (máximo 8 linhas):
```javascript
export function xpForLevel(level) {
    if (level <= 1) return 0;
    return 50 * level * (level - 1);
}
export function levelFromXp(totalXp) {
    if (totalXp <= 0) return 1;
    return Math.floor((1 + Math.sqrt(1 + totalXp / 12.5)) / 2);
}
```

IMAGEM 6: Figura 14 do relatório (Página de perfil com o avatar e a barra de XP).

---

## 06. Jogo ao Vivo

O professor cria uma sessão com um PIN de seis dígitos e os alunos entram em tempo real. O jogo segue uma máquina de estados rígida com temporizadores sincronizados e opções baralhadas no cliente.

IMAGEM 7: Figura 9 do relatório (Lobby multiplayer do host com o PIN).
IMAGEM 8: Figura 10 ou 11 do relatório (Lobby ou ecrã do jogador no telemóvel).

---

## 07. Segurança e Proteção de Chaves

As chaves das APIs nunca chegam ao navegador, pois ficam em variáveis de ambiente na Vercel. Cada chamada é autenticada com um token JWT do Firebase e limitada por um sistema de créditos diários.

IMAGEM 9: Ícone gráfico de um cadeado a representar a validação de tokens JWT no servidor.

---

## 08. Anti-Cheating

As respostas corretas são encriptadas num token opaco com AES-256-GCM. O token contém a resposta, os pontos e o tipo de pergunta. O servidor decripta e valida a resposta sem consultar o Firestore.

Código (máximo 8 linhas):
```javascript
const ALGORITHM = 'aes-256-gcm';
export function encryptAnswer(data) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    let enc = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + tag + ':' + enc;
}
```

IMAGEM 10: Exemplo de código do token encriptado _vt versus a resposta correta decifrada.

---

## 09. O Modelo de Dados NoSQL

Nas aulas aprendi SQLite com tabelas fixas e joins. O Genii usa Cloud Firestore, uma base NoSQL que tive de aprender sozinho. Exigiu uma nova mentalidade com documentos JSON e dados desnormalizados.

IMAGEM 11: Exemplo gráfico de um documento JSON da coleção "users" ou "quizzes" do Firestore.

---

## 10. Inteligência Artificial

O Geno AI utiliza o Gemini 3.1 Flash Lite para gerar perguntas e opções a partir de um tópico. As respostas aparecem em streaming no ecrã e as ilustrações são geradas pela Cloudflare Workers AI.

IMAGEM 12: Figura 7 do relatório (Painel do Geno AI no Studio).

---

## 11. O Sistema de Avatares

O sistema combina três camadas PNG (pele, rosto e chapéu) num canvas HTML5. A imagem final é exportada e guardada na Cloudinary para aparecer no perfil e nas classificações.

IMAGEM 13: Diagrama simples a mostrar a composição das 3 camadas do avatar (Pele + Rosto + Chapéu).

---

## 12. Fluidez e Responsividade

A plataforma foi desenhada mobile-first com botões grandes e grelhas adaptáveis a cada ecrã. O sistema de prefetch carrega a página seguinte antes do clique para uma navegação quase instantânea.

IMAGEM 14: Figura 15 do relatório (Modo solo a responder a uma pergunta no telemóvel).

---

## 13. Desafios

A transição de SQL para NoSQL e os listeners do Firebase no multiplayer foram desafios técnicos significativos. Erros de CORS e da conversão de ArrayBuffer para Buffer consumiram horas de depuração.

```javascript
// CORS — browser bloqueava pedidos cross-origin
res.setHeader('Access-Control-Allow-Credentials', true);
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
);
if (req.method === 'OPTIONS') { res.status(200).end(); return; }

// ArrayBuffer — resposta da Cloudflare não era compatível com res.send()
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
res.setHeader('Content-Type', 'image/jpeg');
return res.send(buffer);
```

---

## 14. Conclusão e Demonstração

O Genii está online e foi testado em produção com dezenas de jogadores em tempo real. A inteligência artificial gera quizzes e imagens como previsto. Convidamos o júri a experimentar o jogo através do QR code.

IMAGEM 16: QR Code grande a apontar para gnii.me para convidar o júri a jogar.

---
