/**
 * OnlyFlow — página de captura: checkout plano Started + formulário → WhatsApp
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-captura-checkout]').forEach(function (btn) {
    var plan = btn.getAttribute('data-captura-checkout');
    if (!plan) return;
    var textEl = btn.querySelector('.captura-checkout-text');
    var loadingEl = btn.querySelector('.captura-checkout-loading');
    var originalLabel = textEl ? textEl.textContent : '';

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      if (textEl) textEl.textContent = 'Processando...';
      if (loadingEl) loadingEl.classList.remove('hidden');
      try {
        var response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billingTypes: ['CREDIT_CARD'],
            quantity: 1,
            plan: plan,
          }),
        });
        var data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar checkout');
        }
        if (data.success && data.link) {
          window.location.href = data.link;
        } else {
          throw new Error('URL do checkout não retornada');
        }
      } catch (err) {
        console.error('Erro ao criar checkout:', err);
        alert('Erro ao processar checkout. Por favor, tente novamente.');
        btn.disabled = false;
        if (textEl) textEl.textContent = originalLabel;
        if (loadingEl) loadingEl.classList.add('hidden');
      }
    });
  });

  var form = document.getElementById('captura-form');
  if (!form) return;

  var phone = '5562993557070';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = (document.getElementById('captura-nome') || {}).value || '';
    var email = (document.getElementById('captura-email') || {}).value || '';
    var zap = (document.getElementById('captura-whatsapp') || {}).value || '';

    var lines = [
      'Olá! Vim pela página de captura OnlyFlow.',
      '',
      '*Nome:* ' + nome.trim(),
      '*E-mail:* ' + email.trim(),
      '*WhatsApp:* ' + zap.trim(),
      '',
      'Quero falar sobre os planos OnlyFlow.',
    ];
    var text = lines.join('\n');
    var url =
      'https://wa.me/' +
      phone +
      '?text=' +
      encodeURIComponent(text);
    window.open(url, '_blank', 'noopener,noreferrer');
  });
})();
