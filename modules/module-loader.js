/*
 * VERSOS & NARRATIVAS — MODULE LOADER V76
 * Loads each screen from its own modules/<module>/index.html file.
 * The shared app shell, authentication and backend controller remain centralized.
 */
(function () {
  'use strict';

  const REGISTRY_URL = './modules/registry.json';

  async function fetchModule(module) {
    const response = await fetch(module.file, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Não foi possível carregar o módulo "' + module.title + '" (' + response.status + ').');
    }
    const markup = await response.text();
    if (!markup.trim()) throw new Error('O módulo "' + module.title + '" está vazio.');
    return { module, markup };
  }

  async function mountModules() {
    const response = await fetch(REGISTRY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar o registro de módulos.');
    const registry = await response.json();
    if (!Array.isArray(registry.modules) || !registry.modules.length) {
      throw new Error('O registro de módulos está vazio ou inválido.');
    }

    const loaded = await Promise.all(registry.modules.map(fetchModule));
    for (const item of loaded) {
      const target = document.getElementById(item.module.target);
      if (!target) throw new Error('Área de montagem ausente para o módulo ' + item.module.id + '.');
      target.insertAdjacentHTML('beforeend', item.markup);
    }

    document.documentElement.dataset.vpModules = registry.version || '49';
    window.dispatchEvent(new CustomEvent('vp:modules-mounted', {
      detail: { modules: registry.modules.map(module => module.id) }
    }));
    return registry;
  }

  window.VP_MODULES_READY = mountModules().catch(error => {
    console.error('[Versos & Narrativas] falha ao montar módulos:', error);
    const host = document.getElementById('moduleHost');
    if (host) {
      host.innerHTML = '<section class="module-load-error"><h2>Não foi possível abrir a biblioteca</h2><p>' +
        String(error.message || 'Falha ao carregar as telas.') +
        '</p><button type="button" onclick="location.reload()">Tentar novamente</button></section>';
    }
    throw error;
  });
})();
