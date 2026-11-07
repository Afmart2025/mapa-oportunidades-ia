/**
 * Mapa de Oportunidades con IA
 * Conexión pública directa a Supabase (SDK oficial + Respaldo REST nativo)
 */

(function () {
  'use strict';

  const SUPABASE_URL = "https://okwhuglwlwbamlwjhauh.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rd2h1Z2x3bHdiYW1sd2poYXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5OTY4NzcsImV4cCI6MjEwOTU3Mjg3N30.0ElwIp6d59_1uqsKJBuo9L4mgqfRW9JI8xYOc-5J3CM";

  // Cliente Supabase oficial (evitando colisión de identificadores con window.supabase)
  let supabaseClient = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("Cliente Supabase oficial inicializado correctamente.");
    } else {
      console.warn("Librería window.supabase no detectada, se usará el motor REST nativo.");
    }
  } catch (err) {
    console.error("Error al inicializar cliente Supabase:", err);
  }

  // Estado de la aplicación
  let allOpportunities = [];
  let likedIds = new Set(JSON.parse(localStorage.getItem('liked_opportunities') || '[]'));

  // Elementos DOM
  const opportunitiesGrid = document.getElementById('opportunities-grid');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const visibleCount = document.getElementById('visible-count');
  const connectionDot = document.getElementById('connection-dot');
  const connectionStatusText = document.getElementById('connection-status-text');

  // Stats DOM
  const statTotal = document.getElementById('stat-total');
  const statCities = document.getElementById('stat-cities');
  const statCountries = document.getElementById('stat-countries');
  const statLikes = document.getElementById('stat-likes');

  // Filtros y Búsqueda
  const searchInput = document.getElementById('search-input');
  const filterCountry = document.getElementById('filter-country');
  const filterCity = document.getElementById('filter-city');
  const filterCategory = document.getElementById('filter-category');
  const sortSelect = document.getElementById('sort-select');
  const btnClearFilters = document.getElementById('btn-clear-filters');
  const btnRefresh = document.getElementById('btn-refresh');
  const refreshIcon = document.getElementById('refresh-icon');

  // Modal y Formulario
  const modalContainer = document.getElementById('modal-container');
  const btnOpenModal = document.getElementById('btn-open-modal');
  const btnEmptyPublish = document.getElementById('btn-empty-publish');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel');
  const opportunityForm = document.getElementById('opportunity-form');
  const btnSubmit = document.getElementById('btn-submit');
  const btnSubmitText = document.getElementById('btn-submit-text');
  const btnSubmitSpinner = document.getElementById('btn-submit-spinner');
  const formError = document.getElementById('form-error');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  /**
   * Helper para peticiones directas vía REST API (Respaldo 100% nativo de navegador)
   */
  async function supabaseRest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errText}`);
    }

    if (response.status === 204) return null;
    return await response.json();
  }

  /**
   * Actualizar badge de conexión
   */
  function setConnectionStatus(connected, message = null) {
    if (!connectionDot || !connectionStatusText) return;
    if (connected) {
      connectionDot.style.backgroundColor = '#10b981';
      connectionDot.style.boxShadow = '0 0 10px #10b981';
      connectionStatusText.textContent = message || 'Conectado a Supabase (En vivo)';
      connectionStatusText.style.color = '#34d399';
    } else {
      connectionDot.style.backgroundColor = '#f43f5e';
      connectionDot.style.boxShadow = '0 0 10px #f43f5e';
      connectionStatusText.textContent = message || 'Error de conexión con Supabase';
      connectionStatusText.style.color = '#fda4af';
    }
  }

  /**
   * Escapar texto HTML para prevenir XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Formatear fecha amigable
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'Reciente';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return 'Justo ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;

      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Reciente';
    }
  }

  /**
   * Mostrar notificación Toast
   */
  function showToast(message, isError = false) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.style.borderColor = isError ? 'rgba(244, 63, 94, 0.6)' : 'rgba(99, 102, 241, 0.6)';
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  /**
   * Obtener todas las oportunidades desde Supabase
   */
  async function fetchOpportunities(showLoading = true) {
    if (showLoading) {
      loadingState.classList.remove('hidden');
      emptyState.classList.add('hidden');
      opportunitiesGrid.innerHTML = '';
    }

    if (refreshIcon) refreshIcon.style.animation = 'spin 0.8s linear infinite';

    try {
      let data = null;

      // 1. Intentar con el cliente SDK
      if (supabaseClient) {
        const res = await supabaseClient
          .from('opportunities')
          .select('*')
          .order('created_at', { ascending: false });

        if (!res.error) {
          data = res.data;
        } else {
          console.warn("Fallo con SDK, usando REST nativo:", res.error);
        }
      }

      // 2. Si no hay SDK o falló, usar REST directo nativo
      if (!data) {
        data = await supabaseRest('opportunities?select=*&order=created_at.desc');
      }

      allOpportunities = data || [];
      setConnectionStatus(true, `Conectado a Supabase (${allOpportunities.length} registradas)`);
      updateFilterOptions();
      updateStats();
      renderFilteredOpportunities();
    } catch (err) {
      console.error("Error al consultar Supabase:", err);
      setConnectionStatus(false, 'Fallo al comunicar con Supabase');
      showToast(`Error de conexión con Supabase: ${err.message}`, true);
    } finally {
      loadingState.classList.add('hidden');
      if (refreshIcon) refreshIcon.style.animation = 'none';
    }
  }

  /**
   * Actualizar las opciones desplegables de país y ciudad basándose en los datos
   */
  function updateFilterOptions() {
    const currentCountry = filterCountry.value;
    const currentCity = filterCity.value;

    const countries = [...new Set(allOpportunities.map(o => o.country?.trim()).filter(Boolean))].sort();
    
    filterCountry.innerHTML = '<option value="">Todos los países</option>';
    countries.forEach(country => {
      const opt = document.createElement('option');
      opt.value = country;
      opt.textContent = country;
      if (country === currentCountry) opt.selected = true;
      filterCountry.appendChild(opt);
    });

    const filteredForCities = currentCountry 
      ? allOpportunities.filter(o => o.country?.trim() === currentCountry)
      : allOpportunities;

    const cities = [...new Set(filteredForCities.map(o => o.city?.trim()).filter(Boolean))].sort();

    filterCity.innerHTML = '<option value="">Todas las ciudades</option>';
    cities.forEach(city => {
      const opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      if (city === currentCity) opt.selected = true;
      filterCity.appendChild(opt);
    });
  }

  /**
   * Actualizar barra de estadísticas
   */
  function updateStats() {
    const total = allOpportunities.length;
    const uniqueCities = new Set(allOpportunities.map(o => o.city?.trim().toLowerCase()).filter(Boolean)).size;
    const uniqueCountries = new Set(allOpportunities.map(o => o.country?.trim().toLowerCase()).filter(Boolean)).size;
    const totalLikes = allOpportunities.reduce((acc, curr) => acc + (curr.likes || 0), 0);

    statTotal.textContent = total;
    statCities.textContent = uniqueCities;
    statCountries.textContent = uniqueCountries;
    statLikes.textContent = totalLikes;
  }

  /**
   * Filtrar, ordenar y renderizar las tarjetas
   */
  function renderFilteredOpportunities() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCountry = filterCountry.value.trim().toLowerCase();
    const selectedCity = filterCity.value.trim().toLowerCase();
    const selectedCategory = filterCategory.value.trim().toLowerCase();
    const sortBy = sortSelect.value;

    let filtered = allOpportunities.filter(opp => {
      if (query) {
        const matchName = opp.name?.toLowerCase().includes(query);
        const matchCity = opp.city?.toLowerCase().includes(query);
        const matchCountry = opp.country?.toLowerCase().includes(query);
        const matchProblem = opp.problem?.toLowerCase().includes(query);
        const matchSolution = opp.ai_solution?.toLowerCase().includes(query);
        const matchCategory = opp.category?.toLowerCase().includes(query);
        if (!matchName && !matchCity && !matchCountry && !matchProblem && !matchSolution && !matchCategory) {
          return false;
        }
      }

      if (selectedCountry && opp.country?.trim().toLowerCase() !== selectedCountry) {
        return false;
      }

      if (selectedCity && opp.city?.trim().toLowerCase() !== selectedCity) {
        return false;
      }

      if (selectedCategory && opp.category?.trim().toLowerCase() !== selectedCategory) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'likes') {
        return (b.likes || 0) - (a.likes || 0);
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

    visibleCount.textContent = filtered.length;

    if (filtered.length === 0) {
      opportunitiesGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    opportunitiesGrid.innerHTML = filtered.map(opp => createCardHtml(opp)).join('');

    // Conectar eventos de like a los botones generados
    document.querySelectorAll('.btn-like').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLike(btn.dataset.id);
      });
    });
  }

  /**
   * Generar HTML de cada tarjeta de oportunidad
   */
  function createCardHtml(opp) {
    const isLiked = likedIds.has(String(opp.id));
    const potentialClass = getPotentialClass(opp.potential);

    return `
      <article class="opp-card" data-id="${opp.id}">
        <div class="opp-body">
          <div class="opp-top">
            <span class="badge-category">${escapeHtml(opp.category || 'Innovación')}</span>
            <span class="badge-potential ${potentialClass}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              ${escapeHtml(opp.potential || 'Medio')}
            </span>
          </div>

          <h3 class="opp-title">${escapeHtml(opp.name)}</h3>
          <div class="opp-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHtml(opp.city)}, ${escapeHtml(opp.country)}
          </div>

          <div class="opp-section">
            <div class="opp-section-label">
              <span>🚨</span> Problema Detectado
            </div>
            <p class="opp-problem-text">${escapeHtml(opp.problem)}</p>
          </div>

          <div class="opp-solution-box">
            <div class="opp-section-label" style="color: #a5b4fc;">
              <span>🤖</span> Solución con IA
            </div>
            <p class="opp-solution-text">${escapeHtml(opp.ai_solution)}</p>
          </div>
        </div>

        <div class="opp-footer">
          <span class="opp-date">${formatDate(opp.created_at)}</span>
          <button class="btn-like ${isLiked ? 'liked' : ''}" data-id="${opp.id}" title="Dar like a esta oportunidad">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span class="like-count">${opp.likes || 0}</span>
          </button>
        </div>
      </article>
    `;
  }

  function getPotentialClass(potential) {
    if (!potential) return 'potential-medio';
    const p = potential.toLowerCase();
    if (p.includes('alto')) return 'potential-alto';
    if (p.includes('global') || p.includes('escalable')) return 'potential-global';
    return 'potential-medio';
  }

  /**
   * Gestionar dar like a una oportunidad y actualizar en Supabase
   */
  async function handleLike(id) {
    const opp = allOpportunities.find(o => String(o.id) === String(id));
    if (!opp) return;

    // Actualización optimista en memoria y UI
    const currentLikes = opp.likes || 0;
    const newLikes = currentLikes + 1;
    opp.likes = newLikes;

    likedIds.add(String(id));
    localStorage.setItem('liked_opportunities', JSON.stringify([...likedIds]));

    const card = document.querySelector(`.opp-card[data-id="${id}"]`);
    if (card) {
      const countEl = card.querySelector('.like-count');
      const btn = card.querySelector('.btn-like');
      if (countEl) countEl.textContent = newLikes;
      if (btn) btn.classList.add('liked');
    }
    updateStats();

    try {
      let saved = false;

      // 1. Intentar RPC si está disponible
      if (supabaseClient) {
        const { error: rpcError } = await supabaseClient.rpc('increment_likes', { row_id: opp.id });
        if (!rpcError) saved = true;
      }

      // 2. Si no, actualizar directamente vía PATCH
      if (!saved) {
        if (supabaseClient) {
          const { error: updateError } = await supabaseClient
            .from('opportunities')
            .update({ likes: newLikes })
            .eq('id', opp.id);
          if (!updateError) saved = true;
        }
      }

      // 3. Fallback directo a REST nativo
      if (!saved) {
        await supabaseRest(`opportunities?id=eq.${opp.id}`, {
          method: 'PATCH',
          body: { likes: newLikes }
        });
      }

      showToast("❤️ ¡Like guardado en Supabase!");
    } catch (err) {
      console.error("Error al actualizar likes en Supabase:", err);
      showToast("No se pudo sincronizar el like con Supabase", true);
    }
  }

  /**
   * Publicar una nueva oportunidad en Supabase
   */
  async function handleFormSubmit(e) {
    e.preventDefault();
    formError.classList.add('hidden');
    formError.textContent = '';

    const name = document.getElementById('input-name').value.trim();
    const city = document.getElementById('input-city').value.trim();
    const country = document.getElementById('input-country').value.trim();
    const category = document.getElementById('input-category').value;
    const potential = document.getElementById('input-potential').value;
    const problem = document.getElementById('input-problem').value.trim();
    const ai_solution = document.getElementById('input-ai-solution').value.trim();

    if (!name || !city || !country || !category || !potential || !problem || !ai_solution) {
      formError.textContent = 'Por favor completa todos los campos requeridos.';
      formError.classList.remove('hidden');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmitText.textContent = 'Publicando en Supabase...';
    btnSubmitSpinner.classList.remove('hidden');

    try {
      const newOpportunity = {
        name,
        city,
        country,
        category,
        potential,
        problem,
        ai_solution,
        likes: 0
      };

      let inserted = null;

      // 1. Intentar con SDK
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('opportunities')
          .insert([newOpportunity])
          .select();
        
        if (!error && data && data.length > 0) {
          inserted = data;
        }
      }

      // 2. Si falló el SDK o no existe, usar REST nativo
      if (!inserted) {
        inserted = await supabaseRest('opportunities', {
          method: 'POST',
          body: newOpportunity
        });
      }

      closeModal();
      opportunityForm.reset();
      showToast("🚀 ¡Oportunidad publicada en Supabase con éxito!");
      
      // Recargar lista actualizada
      await fetchOpportunities(false);

    } catch (err) {
      console.error("Error al publicar en Supabase:", err);
      formError.textContent = `Error al guardar en Supabase: ${err.message}`;
      formError.classList.remove('hidden');
    } finally {
      btnSubmit.disabled = false;
      btnSubmitText.textContent = 'Guardar en Supabase';
      btnSubmitSpinner.classList.add('hidden');
    }
  }

  function openModal() {
    formError.classList.add('hidden');
    modalContainer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const inputName = document.getElementById('input-name');
    if (inputName) inputName.focus();
  }

  function closeModal() {
    modalContainer.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Suscribirse a cambios en tiempo real
   */
  function setupRealtime() {
    if (!supabaseClient) return;

    try {
      supabaseClient
        .channel('realtime-opportunities')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'opportunities' },
          (payload) => {
            console.log("Evento en tiempo real detectado desde Supabase:", payload);
            fetchOpportunities(false);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Canal Realtime conectado exitosamente.");
          }
        });
    } catch (e) {
      console.warn("Realtime no disponible en este entorno:", e);
    }
  }

  function init() {
    searchInput.addEventListener('input', () => renderFilteredOpportunities());
    filterCountry.addEventListener('change', () => {
      updateFilterOptions();
      renderFilteredOpportunities();
    });
    filterCity.addEventListener('change', () => renderFilteredOpportunities());
    filterCategory.addEventListener('change', () => renderFilteredOpportunities());
    sortSelect.addEventListener('change', () => renderFilteredOpportunities());

    btnClearFilters.addEventListener('click', () => {
      searchInput.value = '';
      filterCountry.value = '';
      updateFilterOptions();
      filterCity.value = '';
      filterCategory.value = '';
      sortSelect.value = 'newest';
      renderFilteredOpportunities();
    });

    btnRefresh.addEventListener('click', () => {
      fetchOpportunities(true);
    });

    btnOpenModal.addEventListener('click', openModal);
    if (btnEmptyPublish) btnEmptyPublish.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalContainer.classList.contains('hidden')) {
        closeModal();
      }
    });

    opportunityForm.addEventListener('submit', handleFormSubmit);

    // Arrancar lectura
    fetchOpportunities(true);
    setupRealtime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
