# Estuda+ — Aplicação Web

Projeto acadêmico de organização e acompanhamento de estudos. Front-end em HTML/CSS/JavaScript; back-end em Node.js + Express; banco MariaDB/MySQL.

## Requisitos
- Node.js instalado (`node -v` e `npm -v` devem funcionar).
- XAMPP com o módulo MySQL/MariaDB iniciado.
- MySQL Workbench pode ser usado para administrar o banco.

## 1. Preparar o banco
No Workbench, execute `database/schema.sql`. Ele cria o banco `estuda_plus` e as tabelas necessárias. Se você já criou as cinco tabelas, pode executar novamente com segurança: os comandos usam `IF NOT EXISTS`.

## 2. Configurar o back-end
Abra um terminal nesta pasta (a pasta que contém `package.json`) e execute:

```bash
npm install
```

Copie `.env.example` para um arquivo chamado `.env`. No Windows, você pode executar no Prompt de Comando:

```bat
copy .env.example .env
```

Abra `.env` e ajuste `DB_USER`, `DB_PASSWORD`, `DB_HOST` e `DB_PORT` conforme a conexão que funcionou no Workbench. Em uma instalação padrão do XAMPP, o usuário costuma ser `root`, a senha pode estar vazia e a porta costuma ser `3306`; use os valores reais do seu ambiente.

## 3. Iniciar o sistema
Com o XAMPP/MariaDB iniciado, execute:

```bash
npm start
```

Abra `http://localhost:3000` no navegador. Não abra `index.html` diretamente pelo explorador de arquivos, porque a integração com a API precisa do servidor.

## 4. Testar a API
Abra `http://localhost:3000/api/health`. O resultado esperado é `{"ok":true,"database":"connected"}`.

- `GET /api/studies` — consulta registros de estudo.
- `POST /api/studies` — salva um registro no banco.
- `DELETE /api/studies/:id` — exclui um registro.
- `GET /api/dashboard` — consulta indicadores calculados no banco.

Ao registrar um estudo na interface, a aplicação envia os dados para o MariaDB e depois os consulta pelo histórico.

## Observação acadêmica / segurança
Esta versão de demonstração usa um usuário local fixo (ID 1) para permitir testar o fluxo sem uma tela de login pronta. **Não é uma configuração pronta para produção ou para publicar na internet.** Antes de uso real, implemente autenticação, autorização por usuário e valide todas as operações. Não envie o arquivo `.env` nem senhas ao GitHub.
