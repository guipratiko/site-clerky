require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parse JSON
app.use(express.json());

// Serve static files from public and assets directories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Load translations
let translations = {};
try {
  const translationsPath = path.join(__dirname, 'assets', 'translations', 'translations.json');
  const translationsData = fs.readFileSync(translationsPath, 'utf8');
  translations = JSON.parse(translationsData);
} catch (error) {
  console.error('Error loading translations:', error);
}

// Helper function to serve HTML with language support
function serveHTML(filePath, res) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  let html = fs.readFileSync(filePath, 'utf8');
  
  // Inject theme, language switcher script and CSS if not already present
  const hasLanguageScript = html.includes('assets/js/language.js') || html.includes('language.js');
  const hasThemeScript = html.includes('assets/js/theme.js') || html.includes('theme.js');
  const hasStyleSheet = html.includes('assets/css/style.css') || html.includes('style.css');
  
  if (!hasStyleSheet && html.includes('</head>')) {
    const cssLink = '<link rel="stylesheet" href="/assets/css/style.css">';
    html = html.replace('</head>', `  ${cssLink}\n  </head>`);
  }
  
  if (!hasThemeScript && html.includes('</body>')) {
    const themeScript = '<script src="/assets/js/theme.js"></script>';
    html = html.replace('</body>', `  ${themeScript}\n  </body>`);
  }
  
  if (!hasLanguageScript && html.includes('</body>')) {
    const langScript = '<script src="/assets/js/language.js"></script>';
    html = html.replace('</body>', `  ${langScript}\n  </body>`);
  }

  res.send(html);
}

// Serve pages without .html extension
const publicPath = path.join(__dirname, 'public');

// Root route
app.get('/', (req, res) => {
  serveHTML(path.join(publicPath, 'index.html'), res);
});

// Status page
app.get('/status', (req, res) => {
  serveHTML(path.join(publicPath, 'status.html'), res);
});

// Privacy Policy page
app.get('/politica-privacidade', (req, res) => {
  serveHTML(path.join(publicPath, 'politica-privacidade.html'), res);
});

// Terms page
app.get('/termos', (req, res) => {
  serveHTML(path.join(publicPath, 'termos.html'), res);
});

// Documentation page
app.get('/documentacao', (req, res) => {
  serveHTML(path.join(publicPath, 'documentacao.html'), res);
});

// Redirect .html URLs to clean URLs (without extension)
// This must come AFTER the specific routes to avoid conflicts
app.get('*.html', (req, res) => {
  const htmlFile = req.path;
  const htmlPath = path.join(publicPath, htmlFile);
  
  // Only redirect if the HTML file exists in public folder
  if (fs.existsSync(htmlPath)) {
    const cleanPath = req.path.replace(/\.html$/, '');
    // Preserve query string and hash
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const hash = req.url.includes('#') ? req.url.substring(req.url.indexOf('#')) : '';
    res.redirect(301, cleanPath + queryString + hash);
  } else {
    res.status(404).send('File not found');
  }
});

// API endpoint to get translations
app.get('/api/translations', (req, res) => {
  const lang = req.query.lang || 'pt';
  res.json(translations[lang] || translations.pt || {});
});

// API endpoint to get all translations
app.get('/api/translations/all', (req, res) => {
  res.json(translations);
});

// MongoDB connection helper
let mongoClient = null;
async function getMongoClient() {
  if (!mongoClient) {
    const { MONGODB_URI } = process.env;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI não configurada no .env');
    }
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }
  return mongoClient;
}

// Função para buscar imagem base64 do MongoDB
async function getImageBase64(imageDocId) {
  try {
    const client = await getMongoClient();
    const { MONGODB_DB_NAME, COLLECTION } = process.env;
    const db = client.db(MONGODB_DB_NAME || 'landing');
    const collection = db.collection(COLLECTION || 'img');
    
    const doc = await collection.findOne({ _id: new ObjectId(imageDocId) });
    
    if (doc && doc.base64) {
      return doc.base64;
    }
    
    return null;
  } catch (error) {
    console.error('[MONGODB] Erro ao buscar imagem:', error);
    return null;
  }
}

// API endpoint para criar checkout
app.post('/api/checkout', async (req, res) => {
  try {
    const {
      ASAAS_API_URL,
      ASAAS_ACCESS_TOKEN: rawToken,
      SUBSCRIPTION_VALUE: envSubscriptionValue,
    } = process.env;

    if (!ASAAS_API_URL || !rawToken) {
      console.error('[CHECKOUT] Variáveis de ambiente faltando:', {
        hasApiUrl: !!ASAAS_API_URL,
        hasAccessToken: !!rawToken,
      });
      return res.status(500).json({
        success: false,
        error: 'Configuração do servidor incompleta',
      });
    }

    // Remover aspas do token se existirem
    const ASAAS_ACCESS_TOKEN = rawToken.replace(/^["']|["']$/g, '');

    // Gerar externalReference único
    const externalReference = randomUUID();
    
    // Buscar imagem base64 do MongoDB
    // ID do documento: 6972cf0ba5a0dda7d59692cc
    const imageDocId = '6972cf0ba5a0dda7d59692cc';
    const imageBase64 = await getImageBase64(imageDocId);
    
    if (!imageBase64) {
      console.warn('[CHECKOUT] Imagem não encontrada no MongoDB, usando string vazia');
    }

    // billingTypes: obrigatório, array
    const billingTypes = Array.isArray(req.body.billingTypes) 
      ? req.body.billingTypes 
      : req.body.billingTypes 
        ? [req.body.billingTypes] 
        : ['CREDIT_CARD']; // padrão

    // Valor da assinatura: req.body.value > env > 197
    const defaultSubscriptionValue = envSubscriptionValue 
      ? parseFloat(envSubscriptionValue) 
      : 197;
    const subscriptionValue = req.body.value || defaultSubscriptionValue;
    
    // Próxima cobrança: 7 dias após hoje
    const today = new Date();
    const nextDueDate = new Date(today);
    nextDueDate.setDate(nextDueDate.getDate() + 7);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // externalReference único para o item
    const itemExternalReference = randomUUID();
    
    const checkoutData = {
      billingTypes: billingTypes,
      chargeTypes: ['RECURRENT'], // obrigatório
      subscription: {
        cycle: 'MONTHLY',            // assinatura mensal
        nextDueDate: nextDueDateStr, // 7 dias após hoje
      },
      callback: {
        successUrl: 'https://clerky.com.br/sucesso',
        cancelUrl: 'https://clerky.com.br/cancelado',
        expiredUrl: 'https://clerky.com.br/expirado',
      },
      items: [
        {
          imageBase64: imageBase64 || ' ',
          name: 'Clerky PRO',
          quantity: req.body.quantity || 1,
          value: subscriptionValue,
          description: req.body.description || 'Assinatura mensal',
          externalReference: itemExternalReference,
        },
      ],
      minutesToExpire: req.body.minutesToExpire || 10,
      externalReference: externalReference,
    };

    console.log('[CHECKOUT] Criando checkout na Asaas:', {
      billingTypes: checkoutData.billingTypes,
      chargeTypes: checkoutData.chargeTypes,
      subscription: checkoutData.subscription,
      items: checkoutData.items?.map(item => ({
        name: item.name,
        quantity: item.quantity,
        value: item.value,
        hasImage: !!item.imageBase64 && item.imageBase64 !== ' ',
      })),
      externalReference: checkoutData.externalReference,
    });

    // Chamada à API Asaas (/checkouts)
    const asaasResponse = await fetch(`${ASAAS_API_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'access_token': ASAAS_ACCESS_TOKEN,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!asaasResponse.ok) {
      const errorText = await asaasResponse.text();
      console.error('[CHECKOUT] Erro na API Asaas:', {
        status: asaasResponse.status,
        statusText: asaasResponse.statusText,
        error: errorText,
      });

      return res.status(asaasResponse.status).json({
        success: false,
        error: 'Erro ao criar checkout na Asaas',
        details: errorText,
      });
    }

    const checkoutResponse = await asaasResponse.json();
    console.log('[CHECKOUT] Checkout criado na Asaas:', {
      id: checkoutResponse.id,
      status: checkoutResponse.status,
      link: checkoutResponse.link,
      url: checkoutResponse.url,
      invoiceUrl: checkoutResponse.invoiceUrl,
    });

    // URL de checkout (prioridade: link > url > invoiceUrl)
    const checkoutUrl = checkoutResponse.link || 
                       checkoutResponse.url || 
                       checkoutResponse.invoiceUrl || 
                       null;

    if (!checkoutUrl) {
      console.error('[CHECKOUT] URL do checkout não retornada pela API');
      return res.status(500).json({
        success: false,
        error: 'URL do checkout não retornada pela API',
      });
    }

    res.json({
      success: true,
      link: checkoutUrl,
      checkoutId: checkoutResponse.id,
      externalReference: externalReference,
      status: checkoutResponse.status,
    });
  } catch (error) {
    console.error('[CHECKOUT] Erro ao processar checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar checkout',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Clerky website server running on http://localhost:${PORT}`);
  console.log(`Available languages: ${Object.keys(translations).join(', ')}`);
  console.log(`Serving files from: ${__dirname}`);
});
