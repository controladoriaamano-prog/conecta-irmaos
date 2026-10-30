# Conecta Irmãos

Plataforma de serviços da **Igreja Presença de Deus** — *by Elton · Sistema e Logística*.

PWA leve (HTML + CSS + JS puro, sem build) com **dois painéis interligados** na mesma base de dados.

## Painéis

| Painel | Quem usa | O que faz |
|---|---|---|
| **1 · Central gerencial e técnica** | Master (PIN) | Estatísticas ao vivo (usuários, profissionais, online), aprovação de cadastros, liberação de certificações/selos, cadastro manual de profissionais, gestão de usuários, **caça profissional em modo teste**. |
| **2 · Painel do profissional** | Profissional aprovado | Disponibilidade online/offline, pedidos recebidos (caça), clientes, **ordem de serviço**, **recibo**, **carteirinha** (com CNPJ + certificação), perfil, envio de cópias de cursos/diplomas. |
| **Tela inicial** | Cliente / profissional | "Sou cliente" ou "Sou profissional" + acesso discreto à Central. |

Cliente: cadastro simples (nome, nascimento, CPF, foto opcional). Ao usar o caça profissional o cadastro é completado (CPF, identidade, endereço, foto).

## Arquivos

```
index.html            interface e estilos
app.js                toda a lógica (sem dependências)
config.js             URL + chave pública do Supabase (opcional)
sw.js                 service worker (offline / instalação)
manifest.webmanifest  dados do PWA
icon.svg              ícone
supabase-schema.sql   tabelas para sincronizar entre aparelhos
```

## Modo local x nuvem

- **Sem configurar nada:** funciona 100% no aparelho (localStorage). Bom para testar.
- **Com Supabase:** rode `supabase-schema.sql` no SQL Editor e preencha `config.js` com
  `supabaseUrl` e `supabaseAnonKey` (chave **anon public**). Aí os números de online,
  cadastros, pedidos e OS passam a ser compartilhados entre todos os aparelhos.

## PIN da Central

Padrão **1234**. Trocar em *Central → Ajustes*.

## Publicação

GitHub Pages, branch `main`, raiz do repositório.
