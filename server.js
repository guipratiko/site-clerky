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

// Privacy Policy page (Portuguese)
app.get('/politica-privacidade', (req, res) => {
  serveHTML(path.join(publicPath, 'politica-privacidade.html'), res);
});

// Anti-Spam Policy
app.get('/politica-anti-spam', (req, res) => {
  serveHTML(path.join(publicPath, 'politica-anti-spam.html'), res);
});

// Acceptable Use Policy
app.get('/politica-de-uso-aceitavel', (req, res) => {
  serveHTML(path.join(publicPath, 'politica-de-uso-aceitavel.html'), res);
});

// Terms page (Portuguese)
app.get('/termos', (req, res) => {
  serveHTML(path.join(publicPath, 'termos.html'), res);
});


// Documentation page
app.get('/documentacao', (req, res) => {
  serveHTML(path.join(publicPath, 'documentacao.html'), res);
});

// Landing campanha Meta — CRM Kanban Instagram (sem link no menu)
app.get('/crm-insta', (req, res) => {
  serveHTML(path.join(publicPath, 'instagram-crm-kanban.html'), res);
});

// Checkout result pages
app.get('/sucesso', (req, res) => {
  serveHTML(path.join(publicPath, 'sucesso.html'), res);
});
app.get('/cancelado', (req, res) => {
  serveHTML(path.join(publicPath, 'cancelado.html'), res);
});
app.get('/expirado', (req, res) => {
  serveHTML(path.join(publicPath, 'expirado.html'), res);
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

// Remove prefixos tipo data URL / "image/png;base64," — a API Asaas espera só o base64 puro
function stripBase64DataPrefixes(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  const dataUrl = /^data:image\/[^;]+;base64,/i;
  if (dataUrl.test(s)) return s.replace(dataUrl, '');
  const mimeOnly = /^image\/[^;]+;base64,/i;
  if (mimeOnly.test(s)) return s.replace(mimeOnly, '');
  return s;
}

// Converte valor do Mongo (string, Buffer, Binary) para string UTF-8 quando possível
function mongoFieldToImageString(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (raw.buffer && Buffer.isBuffer(raw.buffer)) return raw.buffer.toString('utf8');
  if (typeof raw.toString === 'function') {
    try {
      const s = raw.toString('utf8');
      if (s && s.length > 0) return s;
    } catch (_) {
      try {
        const s = raw.toString();
        if (s && s.length > 0) return s;
      } catch (_) { /* ignore */ }
    }
  }
  return null;
}

function pickImagePayloadFromDoc(doc) {
  if (!doc || typeof doc !== 'object') return null;
  // Compass/JSON às vezes grava a data URL inteira como *nome* do campo (chave), não como valor.
  const dataUrlKey = /^data:image\/[^;]+;base64,/i;
  for (const key of Object.keys(doc)) {
    if (key === '_id' || !dataUrlKey.test(key)) continue;
    const extra = mongoFieldToImageString(doc[key]);
    const blob = extra && String(extra).trim() ? key + String(extra).trim() : key;
    const s = mongoFieldToImageString(blob) || blob;
    if (s && String(s).trim()) return String(s).trim();
  }
  const preferred = ['base64', 'data', 'imageBase64', 'image'];
  for (const key of preferred) {
    if (doc[key] != null) {
      const s = mongoFieldToImageString(doc[key]);
      if (s && s.trim()) return s;
    }
  }
  for (const key of Object.keys(doc)) {
    if (key === '_id') continue;
    const lower = key.toLowerCase();
    if (['base64', 'data', 'imagebase64', 'image'].includes(lower)) {
      const s = mongoFieldToImageString(doc[key]);
      if (s && s.trim()) return s;
    }
  }
  return null;
}

// Busca imagem em landing.img (ou COLLECTION do .env). Aceita `_id` ObjectId ou string hex 24.
async function getImageBase64(imageDocIdRaw) {
  const imageDocId = String(imageDocIdRaw || '').replace(/^\uFEFF/, '').trim();
  if (!imageDocId) {
    console.warn('[CHECKOUT] CHECKOUT_IMAGE_DOC_ID vazio');
    return null;
  }
  try {
    const client = await getMongoClient();
    const { MONGODB_DB_NAME, COLLECTION } = process.env;
    const db = client.db(MONGODB_DB_NAME || 'landing');
    const collection = db.collection(COLLECTION || 'img');

    let doc = null;
    if (/^[a-f0-9]{24}$/i.test(imageDocId)) {
      doc = await collection.findOne({ _id: new ObjectId(imageDocId) });
      if (!doc) {
        doc = await collection.findOne({ _id: imageDocId });
      }
    } else {
      doc = await collection.findOne({ _id: imageDocId });
    }

    if (!doc) {
      console.warn(
        '[CHECKOUT] MongoDB: documento não encontrado em',
        `${MONGODB_DB_NAME || 'landing'}.${COLLECTION || 'img'}`,
        '_id=',
        imageDocId,
        '(confira se este _id existe no mesmo host da MONGODB_URI)',
      );
      return null;
    }

    const raw = pickImagePayloadFromDoc(doc);
    if (!raw) {
      console.warn('[CHECKOUT] MongoDB: documento encontrado mas sem campo de imagem útil. Campos:', Object.keys(doc));
      return null;
    }

    const cleaned = stripBase64DataPrefixes(raw);
    return cleaned && cleaned.length > 0 ? cleaned : null;
  } catch (error) {
    console.error('[MONGODB] Erro ao buscar imagem:', error);
    return null;
  }
}

// Preços por plano (variáveis de ambiente). Ex.: CHECKOUT_PRICE_STARTED=59.00
const PLAN_ENV_KEYS = {
  started: 'CHECKOUT_PRICE_STARTED',
  advanced: 'CHECKOUT_PRICE_ADVANCED',
  pro: 'CHECKOUT_PRICE_PRO',
};
const PLAN_NAMES = { started: 'OnlyFlow Started', advanced: 'OnlyFlow Advanced', pro: 'OnlyFlow PRO' };

// API endpoint para criar checkout
app.post('/api/checkout', async (req, res) => {
  try {
    const {
      ASAAS_API_URL,
      ASAAS_ACCESS_TOKEN: rawToken,
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

    const plan = (req.body.plan || '').toLowerCase();
    if (!plan || !PLAN_ENV_KEYS[plan]) {
      return res.status(400).json({
        success: false,
        error: 'Plano inválido. Use started, advanced ou pro.',
      });
    }

    const priceEnv = process.env[PLAN_ENV_KEYS[plan]];
    const subscriptionValue = priceEnv ? parseFloat(priceEnv) : null;
    if (subscriptionValue == null || isNaN(subscriptionValue) || subscriptionValue <= 0) {
      console.error('[CHECKOUT] Preço não configurado para o plano:', plan, 'Variável:', PLAN_ENV_KEYS[plan]);
      return res.status(500).json({
        success: false,
        error: 'Preço do plano não configurado. Configure ' + PLAN_ENV_KEYS[plan] + ' no .env',
      });
    }

    // Remover aspas do token se existirem
    const ASAAS_ACCESS_TOKEN = rawToken.replace(/^["']|["']$/g, '');

    // Gerar externalReference único
    const externalReference = randomUUID();
    
    // Buscar imagem base64 do MongoDB (CHECKOUT_IMAGE_DOC_ID no .env; fallback = doc do landing.img)
    const imageDocId = (process.env.CHECKOUT_IMAGE_DOC_ID || '69d4fb622dc66fee4d3de820')
      .replace(/^\uFEFF/, '')
      .trim();
    const imageBase64 = await getImageBase64(imageDocId);

    if (!imageBase64) {
      console.warn('[CHECKOUT] Imagem não carregada do MongoDB; checkout segue sem imageBase64 no item');
    }

    // billingTypes: obrigatório, array
    const billingTypes = Array.isArray(req.body.billingTypes) 
      ? req.body.billingTypes 
      : req.body.billingTypes 
        ? [req.body.billingTypes] 
        : ['CREDIT_CARD'];
    
    // Próxima cobrança: 7 dias após hoje
    const today = new Date();
    const nextDueDate = new Date(today);
    nextDueDate.setDate(nextDueDate.getDate() + 7);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // externalReference único para o item
    const itemExternalReference = randomUUID();
    
    // Item do checkout: não enviar imageBase64 vazio/placeholder — a Asaas valida e retorna
    // "Extensão não suportada" se receber string inválida (ex.: um espaço).
    const checkoutItem = {
      name: PLAN_NAMES[plan],
      quantity: req.body.quantity || 1,
      value: subscriptionValue,
      description: req.body.description || 'Assinatura mensal',
      externalReference: itemExternalReference,
    };
    if (imageBase64 && String(imageBase64).trim() !== '') {
      checkoutItem.imageBase64 = imageBase64;
    }

    const checkoutData = {
      billingTypes: billingTypes,
      chargeTypes: ['RECURRENT'], // obrigatório
      subscription: {
        cycle: 'MONTHLY',            // assinatura mensal
        nextDueDate: nextDueDateStr, // 7 dias após hoje
      },
      callback: {
        successUrl: 'https://onlyflow.com.br/sucesso',
        cancelUrl: 'https://onlyflow.com.br/cancelado',
        expiredUrl: 'https://onlyflow.com.br/expirado',
      },
      items: [checkoutItem],
      minutesToExpire: req.body.minutesToExpire || 10,
      externalReference: externalReference,
    };

    // Garantia explícita: não enviar endDate para a Asaas
    if (checkoutData.subscription && 'endDate' in checkoutData.subscription) {
      delete checkoutData.subscription.endDate;
    }

    console.log('[CHECKOUT] Criando checkout na Asaas:', {
      billingTypes: checkoutData.billingTypes,
      chargeTypes: checkoutData.chargeTypes,
      subscription: checkoutData.subscription,
      items: checkoutData.items?.map(item => ({
        name: item.name,
        quantity: item.quantity,
        value: item.value,
        hasImage: !!(item.imageBase64 && String(item.imageBase64).trim()),
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
  console.log(`OnlyFlow website server running on http://localhost:${PORT}`);
  console.log(`Available languages: ${Object.keys(translations).join(', ')}`);
  console.log(`Serving files from: ${__dirname}`);
});
