# Clerky Website

Site institucional da Clerky com suporte a múltiplos idiomas (Português e Inglês).

## 📁 Estrutura do Projeto

```
SiteClerky/
├── public/                    # Páginas HTML
│   ├── index.html
│   ├── status.html
│   ├── politica-privacidade.html
│   └── termos.html
├── assets/                    # Recursos estáticos
│   ├── css/
│   │   └── style.css         # Estilos globais
│   ├── js/
│   │   └── language.js       # Sistema de troca de idioma
│   └── translations/
│       └── translations.json # Traduções PT/EN
├── server.js                  # Servidor Node.js/Express
├── package.json               # Dependências do projeto
├── .gitignore                 # Arquivos ignorados pelo Git
└── README.md                  # Este arquivo
```

## 🚀 Como usar

### Instalação

```bash
npm install
```

### Executar o servidor

```bash
npm start
```

O site estará disponível em `http://localhost:3000`

### Troca de idioma

O botão de troca de idioma aparece no canto inferior direito de todas as páginas. O idioma escolhido é salvo no localStorage do navegador.

## 🌐 Adicionar traduções

Edite o arquivo `assets/translations/translations.json` para adicionar ou modificar traduções. Use a estrutura de chaves aninhadas (ex: `nav.about`).

Para marcar elementos HTML para tradução, adicione o atributo `data-i18n` com a chave correspondente:

```html
<a href="#" data-i18n="nav.about">Sobre</a>
```

## 🛠️ Desenvolvimento

O servidor usa Express para servir arquivos estáticos:
- `/public` - Páginas HTML (servidas na raiz `/`)
- `/assets` - Recursos estáticos (CSS, JS, traduções)

## 📝 Notas

- Os arquivos HTML estão na pasta `public/` e são servidos na raiz do site
- Os assets (CSS, JS, traduções) estão em `assets/` e são servidos em `/assets/`
- O servidor injeta automaticamente os scripts de idioma nas páginas HTML
