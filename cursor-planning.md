# 📝 Cursor Planning - Clone Notion (Lovable Project)

## 🎯 Visão Geral do Projeto

Este é um clone do Notion construído com tecnologias web modernas, focando em oferecer uma experiência de edição de documentos hierárquica e colaborativa, similar ao Notion original.

**Nome do Projeto:** Notion Clone  
**Status:** 🟡 Em Desenvolvimento Ativo  
**Última Atualização:** 2025-10-09

---

## 🛠️ Stack Tecnológica

### **Frontend**
- **React 18.3.1** - Biblioteca UI principal
- **TypeScript 5.8.3** - Tipagem estática
- **Vite 5.4.19** - Build tool e dev server
- **TailwindCSS 3.4.17** - Estilização utility-first
- **React Router DOM 6.30.1** - Roteamento client-side

### **UI Components & Libraries**
- **Radix UI** - Componentes acessíveis e sem estilo (30+ componentes)
- **shadcn/ui** - Sistema de componentes baseado em Radix
- **Lucide React 0.462.0** - Biblioteca de ícones
- **Next Themes 0.3.0** - Gerenciamento de temas (dark/light)
- **Sonner 1.7.4** - Toast notifications elegantes
- **cmdk 1.1.1** - Command menu (Ctrl+K)

### **State Management & Data Fetching**
- **TanStack React Query 5.83.0** - Server state management
- **React Hook Form 7.61.1** - Gerenciamento de formulários
- **Zod 3.25.76** - Validação de schemas

### **Drag & Drop**
- **@dnd-kit/core 6.3.1** - Core do drag and drop
- **@dnd-kit/sortable 10.0.0** - Utilitários para listas ordenáveis
- **@dnd-kit/utilities 3.2.2** - Helpers e utilities

### **Backend (Lovable Cloud / Supabase)**
- **Supabase 2.58.0** - Backend-as-a-Service
  - PostgreSQL Database
  - Row Level Security (RLS)
  - Authentication
  - Real-time subscriptions (não implementado ainda)
  - Storage (não implementado ainda)

### **Utilities**
- **date-fns 3.6.0** - Manipulação de datas
- **use-debounce 10.0.6** - Debounce hooks
- **clsx 2.1.1** - Utilidades de className
- **tailwind-merge 2.6.0** - Merge de classes Tailwind

---

## 🗂️ Estrutura de Banco de Dados

### **Tabelas Criadas**

#### 1. **`profiles`**
```sql
- id (UUID, PK) → Referencia auth.users
- full_name (TEXT)
- avatar_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```
**RLS Policies:**
- ✅ Users can view all profiles
- ✅ Users can insert own profile
- ✅ Users can update own profile
- ❌ DELETE bloqueado

**Trigger:**
- `handle_new_user()` - Cria profile automaticamente ao criar usuário

---

#### 2. **`pages`**
```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- title (TEXT, DEFAULT 'Untitled')
- is_favorite (BOOLEAN, DEFAULT false)
- parent_id (UUID, FK → pages) ← Hierarquia
- position (INTEGER, DEFAULT 0)
- icon (TEXT, nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```
**RLS Policies:**
- ✅ Users can view own pages
- ✅ Users can insert own pages
- ✅ Users can update own pages
- ✅ Users can delete own pages

**Trigger:**
- `update_updated_at_column()` - Atualiza `updated_at` automaticamente

**Features Implementadas:**
- ✅ Páginas hierárquicas (nested pages via `parent_id`)
- ✅ Favoritos (`is_favorite`)
- ✅ Reordenação (`position`)
- ✅ Ícones customizados (`icon`)

---

#### 3. **`blocks`**
```sql
- id (UUID, PK)
- page_id (UUID, FK → pages)
- type (TEXT) ← Tipo do bloco
- content (TEXT)
- metadata (JSONB, DEFAULT '{}')
- parent_block_id (UUID, FK → blocks) ← Blocos nested
- position (INTEGER, DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```
**RLS Policies:**
- ✅ Users can view blocks of own pages
- ✅ Users can insert blocks on own pages
- ✅ Users can update blocks of own pages
- ✅ Users can delete blocks of own pages

**Tipos de Blocos Suportados:**
- `paragraph` - Texto normal
- `heading1`, `heading2`, `heading3` - Títulos
- `bulleted-list`, `numbered-list` - Listas
- `code` - Código com syntax highlighting (manual)
- `quote` - Citações
- `callout` - Alertas coloridos (info, warning, success, error, note)
- `toggle` - Blocos expansíveis com children
- `image` - Upload de imagens (base64, **não integrado com Storage**)
- `divider` - Linha horizontal

---

#### 4. **`templates`**
```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- name (TEXT)
- description (TEXT)
- blocks (JSONB) ← Blocos salvos como JSON
- is_public (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
```
**RLS Policies:**
- ✅ Users can view public templates OR own templates
- ✅ Users can insert own templates
- ✅ Users can update own templates
- ✅ Users can delete own templates

**Status:** 🔴 **Tabela criada, mas NÃO integrada no frontend**

---

## 🎨 Features Implementadas

### ✅ **1. Autenticação Completa**
**Arquivos:**
- `src/contexts/AuthContext.tsx` - Context global de auth
- `src/pages/Auth.tsx` - Tela de login/signup
- `src/components/ProtectedRoute.tsx` - Proteção de rotas

**Funcionalidades:**
- ✅ Sign Up com email + senha
- ✅ Login com email + senha
- ✅ Logout
- ✅ Auto-confirm de emails (Supabase configurado)
- ✅ Redirecionamento automático se autenticado
- ✅ Proteção de rotas via `ProtectedRoute`

**Observações:**
- ❌ Não suporta OAuth (Google, GitHub)
- ❌ Sem reset de senha implementado

---

### ✅ **2. Editor de Blocos (Notion-like)**
**Arquivos:**
- `src/components/Editor.tsx` - Editor principal
- `src/components/RichTextEditor.tsx` - Editor de texto rico
- `src/components/SlashMenu.tsx` - Menu de comandos (/)

**Funcionalidades:**
- ✅ **Slash Commands (/)** - Menu para criar blocos
- ✅ **Rich Text Editing:**
  - Bold (`Ctrl+B`)
  - Italic (`Ctrl+I`)
  - Underline (`Ctrl+U`)
  - Inline Code
  - Links
- ✅ **Toolbar Flutuante** - Aparece ao selecionar texto
- ✅ **Drag & Drop de Blocos** - Reordenação visual
- ✅ **Hover Actions:**
  - GripVertical - Para arrastar
  - Plus - Para adicionar bloco
  - Delete - Para apagar (em nested blocks)
- ✅ **Keyboard Navigation:**
  - `Enter` - Criar novo bloco
  - `Backspace` - Deletar bloco vazio
  - Foco automático no bloco anterior

**Blocos Especiais:**
- ✅ **CalloutBlock** - 5 tipos (info, warning, success, error, note)
- ✅ **CodeBlock** - Com botão "Copy to clipboard"
- ✅ **ImageBlock** - Upload via drag/drop ou clique
- ✅ **ToggleBlock** - Blocos expansíveis com children
- ✅ **QuoteBlock** - Citações estilizadas

**Limitações:**
- ❌ Imagens salvam como base64 (não usa Supabase Storage)
- ❌ Não suporta Markdown import/export
- ❌ Não suporta colaboração em tempo real
- ❌ Não suporta mentions (@user)
- ❌ Não suporta tabelas

---

### ✅ **3. Sidebar com Hierarquia de Páginas**
**Arquivos:**
- `src/components/Sidebar.tsx` - Sidebar principal
- `src/hooks/usePageHierarchy.ts` - Lógica de árvore hierárquica
- `src/hooks/usePages.ts` - CRUD de páginas

**Funcionalidades:**
- ✅ **Páginas Hierárquicas (Nested Pages):**
  - Páginas podem ter filhas via `parent_id`
  - Renderização recursiva com indentação
  - Ícones de expansão/colapso (ChevronDown/ChevronRight)
- ✅ **Drag & Drop Hierárquico:**
  - Arrastar página "sobre" outra → Torna filha
  - Arrastar "entre" páginas → Reordena no mesmo nível
  - Validação de ciclos (não pode arrastar para descendente)
  - Feedback visual (linhas de inserção, highlight)
  - Cursor "not-allowed" para drops inválidos
- ✅ **Favoritos:**
  - Seção separada "Favoritos"
  - Toggle de favorito via estrela
- ✅ **Criação de Páginas:**
  - Botão "+" global (cria página root)
  - Botão "+" em cada página (cria subpágina)
  - Seletor de templates (Blank, Todo, Meeting, Code, Brainstorm)
- ✅ **Renomear Páginas:**
  - Inline editing via `AlertDialog`
- ✅ **Deletar Páginas:**
  - Com confirmação via `AlertDialog`
- ✅ **Menu de Contexto:**
  - Rename, Delete, Duplicate (não implementado)

**Estado de Expansão:**
- ✅ Gerenciado via `expandedPageIds` (Set)
- ❌ Não persiste no localStorage (perde ao recarregar)

---

### ✅ **4. Global Search (Ctrl+K)**
**Arquivos:**
- `src/components/GlobalSearch.tsx`

**Funcionalidades:**
- ✅ **Busca Rápida:**
  - Atalho `Ctrl/Cmd + K`
  - Busca em títulos de páginas (in-memory)
  - Busca em conteúdo de blocos (query no Supabase)
  - Limite de 20 resultados
- ✅ **Debounce de 300ms** - Otimização de performance
- ✅ **Buscas Recentes:**
  - Salva últimas 5 buscas no `localStorage`
  - Clique para repetir busca
- ✅ **Navegação por Teclado:**
  - `ArrowUp/ArrowDown` - Navegar resultados
  - `Enter` - Selecionar
  - `Escape` - Fechar
- ✅ **Loading State** - Spinner durante busca
- ✅ **Preview de Conteúdo** - Mostra trecho do bloco encontrado

**Limitações:**
- ❌ Não suporta busca fuzzy (typos)
- ❌ Não suporta filtros (por tipo, data, autor)

---

### ✅ **5. Auto-Save**
**Arquivos:**
- `src/hooks/useAutoSave.ts`

**Funcionalidades:**
- ✅ **Debounce de 2 segundos** - Salva após usuário parar de digitar
- ✅ **Indicador Visual:**
  - `src/components/SaveIndicator.tsx`
  - Estados: "Saving...", "Saved", "Error"
  - Mostra última vez salvo (e.g., "Saved 5 seconds ago")
- ✅ **Batch Updates:**
  - Salva múltiplos blocos de uma vez via `useBatchUpdateBlocks`
- ✅ **Optimistic Updates:**
  - UI atualiza instantaneamente
  - Reverte em caso de erro

---

### ✅ **6. Breadcrumbs Dinâmicos**
**Arquivos:**
- `src/components/Breadcrumbs.tsx`

**Funcionalidades:**
- ✅ Mostra caminho hierárquico da página atual
- ✅ Clicável para navegar para página pai
- ✅ Usa `parent_id` para reconstruir árvore

---

### ✅ **7. Template Selector**
**Arquivos:**
- `src/components/TemplateSelector.tsx`

**Templates Hardcoded:**
1. **Blank** - Página vazia
2. **Todo** - Lista de tarefas com checkboxes
3. **Meeting** - Notas de reunião estruturadas
4. **Code** - Documentação de código
5. **Brainstorm** - Sessão de ideias

**Limitações:**
- ❌ Templates estão hardcoded (não usa tabela `templates`)
- ❌ Usuário não pode salvar páginas como template
- ❌ Não pode compartilhar templates

---

### ✅ **8. Skeletons Loaders**
**Arquivos:**
- `src/components/SidebarSkeleton.tsx`
- `src/components/EditorSkeleton.tsx`

**Funcionalidades:**
- ✅ Feedback visual durante carregamento inicial
- ✅ Melhora UX percebida

---

## 🔴 Features Pendentes (Roadmap)

### **1. Supabase Storage Integration**
**Prioridade:** 🔴 Alta  
**Razão:** Imagens atualmente salvas como base64 (ineficiente)

**Implementação:**
- Criar bucket público `page-images`
- Atualizar `ImageBlock.tsx` para fazer upload
- Salvar URL do Storage no `content` do block
- Adicionar limpeza de imagens órfãs

---

### **2. Templates do Banco de Dados**
**Prioridade:** 🟡 Média  
**Razão:** Tabela `templates` existe mas não é usada

**Implementação:**
- Integrar `useTemplates()` hook
- Adicionar botão "Salvar como template" no editor
- Modal para criar/editar templates
- Seção "Meus Templates" na sidebar
- Permitir templates públicos (community templates)

---

### **3. Colaboração em Tempo Real**
**Prioridade:** 🟢 Baixa (complexo)  
**Razão:** Feature avançada do Notion

**Implementação:**
- Habilitar Realtime do Supabase nas tabelas
- Implementar `supabase.channel('pages').on('postgres_changes')`
- Resolver conflitos de edição simultânea
- Mostrar usuários online
- Cursors colaborativos (muito complexo)

---

### **4. Markdown Import/Export**
**Prioridade:** 🟡 Média  
**Razão:** Interoperabilidade com outros apps

**Implementação:**
- Parser de Markdown → Blocos
- Serializer de Blocos → Markdown
- Botão "Export as Markdown" no menu
- Botão "Import Markdown file"

---

### **5. Comments & Discussions**
**Prioridade:** 🟢 Baixa  
**Razão:** Feature social

**Implementação:**
- Nova tabela `comments`
- Associar comentários a blocos (`block_id`)
- Thread de respostas
- Notificações

---

### **6. Version History**
**Prioridade:** 🟡 Média  
**Razão:** Segurança contra perda de dados

**Implementação:**
- Tabela `page_versions` com snapshots JSON
- Trigger para salvar versão a cada N minutos
- Modal "Version History" com preview
- Restaurar versão anterior

---

### **7. Advanced Search**
**Prioridade:** 🟡 Média  
**Razão:** Melhorar UX de busca

**Features:**
- Filtros (por tipo, data, autor)
- Busca fuzzy (tolera typos)
- Regex support
- Full-text search do PostgreSQL

---

### **8. User Roles & Permissions**
**Prioridade:** 🔴 Alta (se multi-usuário)  
**Razão:** Workspaces compartilhados

**Implementação:**
- Tabela `workspaces`
- Tabela `workspace_members` (com role: owner, editor, viewer)
- RLS policies baseadas em workspace
- Convites via email

**⚠️ CRITICAL:** 
- Roles DEVEM estar em tabela separada (não em `profiles`)
- Usar `SECURITY DEFINER` function para checar roles
- Evitar privilege escalation attacks

---

### **9. Mobile Responsive**
**Prioridade:** 🟡 Média  
**Razão:** Usabilidade em smartphones

**Implementação:**
- Sidebar colapsável em mobile
- Touch gestures para drag & drop
- Bottom navigation bar
- Otimizar toolbar flutuante para touch

---

### **10. Dark/Light Theme Toggle**
**Prioridade:** 🟢 Baixa  
**Razão:** `next-themes` já está instalado

**Implementação:**
- Botão de toggle no header
- Persistir preferência no localStorage
- Já funciona via `next-themes`, só falta UI

---

### **11. Tabelas (Tables)**
**Prioridade:** 🟡 Média  
**Razão:** Feature importante do Notion

**Implementação:**
- Novo tipo de bloco `table`
- Metadata para armazenar linhas/colunas
- Adicionar/remover linhas e colunas
- Sorting e filtering

---

### **12. Databases (Notion-style)**
**Prioridade:** 🔴 Alta (feature killer)  
**Razão:** Diferencial do Notion

**Implementação Complexa:**
- Tabela `databases` (coleções de páginas)
- Tabela `database_properties` (colunas customizadas)
- Views: Table, Board, Calendar, Gallery, List
- Filtros, sorts, agrupamentos
- Relations entre databases
- Rollups e fórmulas

**Estimativa:** 2-4 semanas de trabalho

---

### **13. API Pública**
**Prioridade:** 🟢 Baixa  
**Razão:** Integrações externas

**Implementação:**
- Edge Functions para endpoints
- API Key authentication
- Rate limiting
- Documentação Swagger/OpenAPI

---

### **14. OAuth Providers**
**Prioridade:** 🟡 Média  
**Razão:** Facilita onboarding

**Implementação:**
- Google Sign-In (Supabase já suporta)
- GitHub Sign-In
- Configurar redirect URLs

---

### **15. Reset Password / Forgot Password**
**Prioridade:** 🔴 Alta  
**Razão:** UX essencial

**Implementação:**
- Link "Esqueci a senha" na tela de login
- Email com link de reset (Supabase envia automaticamente)
- Tela para definir nova senha

---

## 🐛 Bugs Conhecidos

### **1. Expansão de Páginas não Persiste**
- **Issue:** `expandedPageIds` perde estado ao recarregar
- **Fix:** Salvar no `localStorage` ou em `user_preferences` table

### **2. Imagens Base64 Aumentam Tamanho do Banco**
- **Issue:** Base64 é ~33% maior que binário
- **Fix:** Migrar para Supabase Storage

### **3. Drag & Drop Pode Ficar "Travado"**
- **Issue:** Às vezes o drop não funciona corretamente
- **Fix:** Revisar lógica de `customCollisionDetection`

### **4. Auto-Save Pode Causar Race Condition**
- **Issue:** Múltiplas mutations simultâneas
- **Fix:** Implementar fila de mutations ou usar `useMutation` com serial mode

---

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   ├── blocks/          # Blocos especializados
│   │   ├── CalloutBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── ImageBlock.tsx
│   │   ├── QuoteBlock.tsx
│   │   └── ToggleBlock.tsx
│   ├── ui/              # shadcn/ui components (30+ arquivos)
│   ├── Breadcrumbs.tsx
│   ├── Editor.tsx       # Editor principal
│   ├── EditorSkeleton.tsx
│   ├── GlobalSearch.tsx
│   ├── ProtectedRoute.tsx
│   ├── RichTextEditor.tsx
│   ├── SaveIndicator.tsx
│   ├── Sidebar.tsx      # Sidebar hierárquica
│   ├── SidebarSkeleton.tsx
│   ├── SlashMenu.tsx
│   └── TemplateSelector.tsx
├── contexts/
│   └── AuthContext.tsx  # Context de autenticação
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useAutoSave.ts   # Auto-save com debounce
│   ├── useBlocks.ts     # CRUD de blocos
│   ├── usePageHierarchy.ts # Árvore hierárquica
│   ├── usePages.ts      # CRUD de páginas
│   └── useTemplates.ts  # Busca templates (não usado)
├── integrations/supabase/
│   ├── client.ts        # Cliente Supabase (auto-gerado)
│   └── types.ts         # Tipos do DB (auto-gerado)
├── lib/
│   └── utils.ts         # Utilitários (cn, etc)
├── pages/
│   ├── Auth.tsx         # Tela de login/signup
│   ├── Index.tsx        # App principal
│   └── NotFound.tsx     # 404
├── App.tsx              # Router e providers
├── index.css            # Estilos globais + Tailwind
└── main.tsx             # Entry point
```

---

## 🔐 Segurança

### **Row Level Security (RLS)**
- ✅ Habilitado em todas as tabelas
- ✅ Políticas testadas e funcionais
- ✅ Usuários só veem seus próprios dados

### **Prevenção de Ataques**
- ✅ SQL Injection → Prevenido pelo Supabase Client
- ✅ XSS → React escapa automaticamente
- ✅ CSRF → Não aplicável (SPA + JWT)
- ❌ Rate Limiting → Não implementado (Supabase tem built-in)

### **⚠️ CRITICAL: Roles Implementation**
Se implementar roles no futuro:
- ❌ **NUNCA** armazenar roles em `profiles` ou client-side
- ✅ Criar tabela `user_roles` separada
- ✅ Usar função `SECURITY DEFINER` para checar roles
- ✅ Evitar recursão em RLS policies

---

## 🚀 Deploy & Infra

### **Lovable Cloud (Atual)**
- ✅ Deploy automático ao fazer push
- ✅ Supabase gerenciado pelo Lovable
- ✅ SSL/HTTPS automático
- ✅ CDN global

### **Variáveis de Ambiente**
```env
VITE_SUPABASE_URL=https://[projeto].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[id]
```

---

## 📊 Métricas de Performance

### **Otimizações Implementadas**
- ✅ React Query cache (5 min default)
- ✅ Debounce em busca (300ms)
- ✅ Auto-save debounce (2s)
- ✅ Lazy loading de imagens
- ✅ Code splitting via Vite

### **Oportunidades de Melhoria**
- ❌ Virtual scrolling para muitas páginas
- ❌ Service Worker para offline mode
- ❌ Compression de imagens antes de upload
- ❌ Pagination de blocos (se página muito grande)

---

## 🧪 Testing

**Status:** ❌ Nenhum teste implementado

**Recomendações:**
- Unit tests com Vitest
- E2E tests com Playwright
- RLS policy tests no Supabase

---

## 📝 Convenções de Código

### **Commits Convencionais (Atomic Commits)**
```
feat: adiciona drag & drop hierárquico
fix: corrige race condition no auto-save
refactor: separa lógica de hierarquia em hook
docs: atualiza README com novas features
chore: atualiza dependências

Co-authored-by: Adrianno Esnarriaga <esadrianno@gmail.com>
```

### **TypeScript**
- ✅ Strict mode habilitado
- ✅ Tipos gerados automaticamente do Supabase
- ✅ Interfaces para props de componentes

### **Estilização**
- ✅ Tailwind utility classes
- ✅ `cn()` helper para merge de classes
- ✅ Design system via shadcn/ui

---

## 🎯 Próximos Passos Recomendados

### **Curto Prazo (1-2 semanas)**
1. ✅ ~~Implementar Páginas Hierárquicas~~ (CONCLUÍDO)
2. 🔴 Migrar imagens para Supabase Storage
3. 🔴 Adicionar Reset Password
4. 🟡 Integrar templates do banco de dados
5. 🟡 Persistir `expandedPageIds` no localStorage

### **Médio Prazo (1 mês)**
1. 🔴 Implementar Workspaces + Roles
2. 🟡 Markdown import/export
3. 🟡 Version History
4. 🟡 Advanced Search
5. 🟡 Dark/Light theme toggle UI

### **Longo Prazo (3+ meses)**
1. 🟢 Colaboração em tempo real
2. 🔴 Databases (Notion-style)
3. 🟡 Mobile responsive
4. 🟡 Tabelas avançadas
5. 🟢 API pública

---

## 📚 Recursos & Documentação

- **Lovable Docs:** https://docs.lovable.dev/
- **Supabase Docs:** https://supabase.com/docs
- **React Query:** https://tanstack.com/query/latest
- **dnd-kit:** https://docs.dndkit.com/
- **shadcn/ui:** https://ui.shadcn.com/

---

## 👥 Colaboradores

- **Adrianno Esnarriaga** <esadrianno@gmail.com> - Co-author
- **Lovable AI** - Development Assistant

---

## 📄 Licença

(Definir licença do projeto)

---

**Última Atualização:** 2025-10-09  
**Status do Projeto:** 🟡 Em Desenvolvimento Ativo  
**Versão:** 0.1.0 (Pre-release)
