# Guia de Migração Firebase → Supabase

## 1. Criar projeto no Supabase

1. Acesse https://supabase.com e crie uma conta
2. Clique em **New Project**
3. Escolha um nome (ex: medbio) e uma senha forte para o banco
4. Aguarde o projeto ser criado (~2 min)

## 2. Criar as tabelas

1. No painel do Supabase vá em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo do arquivo `schema.sql` desta pasta
4. Clique em **Run**
5. Todas as tabelas serão criadas automaticamente

## 3. Pegar as chaves de API

No painel do Supabase vá em **Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` → campo **Project URL**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → campo **anon public**
- `SUPABASE_SERVICE_ROLE_KEY` → campo **service_role** (clique em Reveal)

## 4. Configurar variáveis de ambiente

### Local:
```bash
cp .env.example .env.local
# Preencha as chaves do Supabase no .env.local
```

### Vercel:
1. Vá em seu projeto na Vercel → **Settings → Environment Variables**
2. Adicione as três variáveis do Supabase
3. Remova as variáveis antigas do Firebase

## 5. Instalar dependências

```bash
npm install
```

## 6. Fazer deploy

```bash
git add .
git commit -m "feat: migração Firebase → Supabase"
git push
```

A Vercel fará o deploy automaticamente.

## 7. Migrar dados existentes (opcional)

Se tiver dados no Firebase que quer manter:

1. No Firebase Console → Firestore → **Exportar dados**
2. Use o script de migração (solicite ao assistente se precisar)
3. Os dados serão importados nas tabelas do Supabase

## O que mudou no código

| Antes (Firebase) | Depois (Supabase) |
|---|---|
| `onSnapshot` (cobra por leitura) | Realtime só para inserções novas |
| `collection.get()` sem filtro | `select()` com `limit()` |
| `firebase-admin` no webhook | `@supabase/supabase-js` server-side |
| Custo por leitura/escrita | Ilimitado no plano gratuito |
| `whatsappMessages` (Firestore) | `whatsapp_messages` (PostgreSQL) |

## Vantagens do Supabase

- Sem limite de leituras/escritas
- SQL real — queries muito mais poderosas
- Dashboard melhor para visualizar dados
- Integração nativa no n8n (nó Supabase)
- Backup automático
- Realtime sem cobrar por documento
