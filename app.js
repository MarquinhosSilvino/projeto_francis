// app.js
(function () {
  const isHome = location.pathname.endsWith('home.html') || document.title.includes('Imóveis');

  // Sessão simples via localStorage
  function isLoggedIn() {
    return Boolean(localStorage.getItem('he_user'));
  }

  function requireAuth() {
    if (!isHome) return; // só checa na home
    if (!isLoggedIn()) {
      location.href = 'index.html';
    }
  }

  function handleLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!email || !password) return;

      // Demo: qualquer email/senha
      localStorage.setItem('he_user', JSON.stringify({ email }));
      location.href = 'home.html';
    });
  }

  function parseAvailability(jsonStr) {
    try {
      const ranges = JSON.parse(jsonStr || '[]');
      return ranges.map(r => ({
        start: new Date(r.start + 'T00:00:00'),
        end: new Date(r.end + 'T23:59:59')
      }));
    } catch {
      return [];
    }
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function dateInRange(date, start, end) {
    return date >= start && date <= end;
  }

  function rangeOverlapsAny(checkin, checkout, ranges) {
    // válido se todo o período selecionado couber dentro de algum range disponível
    return ranges.some(({ start, end }) => checkin >= start && checkout <= end && checkin <= checkout);
  }

  function describeRanges(ranges) {
    if (ranges.length === 0) return 'Sem datas disponíveis no momento.';
    return 'Períodos disponíveis: ' + ranges
      .map(r => `${formatDate(r.start)} a ${formatDate(r.end)}`)
      .join(' • ');
  }

  function setupHome() {
    requireAuth();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('he_user');
        location.href = 'index.html';
      });
    }

    const modal = document.getElementById('calendarModal');
    const modalTitle = document.getElementById('modalTitle');
    const availabilityInfo = document.getElementById('availabilityInfo');
    const bookingForm = document.getElementById('bookingForm');
    const checkinInput = document.getElementById('checkin');
    const checkoutInput = document.getElementById('checkout');
    const feedback = document.getElementById('feedback');
    const openButtons = document.querySelectorAll('.open-calendar');

    let activeProperty = null;
    let activeRanges = [];

    // Fechar modal
    modal.addEventListener('click', (e) => {
      const target = e.target;
      if (target.dataset.close === 'true') {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        feedback.textContent = '';
        feedback.className = 'feedback';
        bookingForm.reset();
      }
    });

    // Abrir modal
    openButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.property');
        const name = card.dataset.name;
        const location = card.dataset.location;
        const availableJson = card.dataset.available;

        activeProperty = {
          id: card.dataset.id,
          name,
          location,
        };
        activeRanges = parseAvailability(availableJson);

        modalTitle.textContent = `Disponibilidade - ${name}`;
        availabilityInfo.textContent = describeRanges(activeRanges);

        // Ajusta min/max conforme ranges
        const minDate = activeRanges.length ? activeRanges.reduce((a, b) => a.start < b.start ? a : b).start : new Date();
        const maxDate = activeRanges.length ? activeRanges.reduce((a, b) => a.end > b.end ? a : b).end : new Date();

        checkinInput.min = formatDate(minDate);
        checkoutInput.min = formatDate(minDate);
        checkinInput.max = formatDate(maxDate);
        checkoutInput.max = formatDate(maxDate);

        // Reset
        bookingForm.reset();
        feedback.textContent = '';
        feedback.className = 'feedback';

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
      });
    });

    // Força checkout >= checkin
    checkinInput.addEventListener('change', () => {
      if (checkinInput.value) {
        checkoutInput.min = checkinInput.value;
      }
    });

    // Reservar / Solicitar troca (demo)
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      feedback.textContent = '';
      feedback.className = 'feedback';

      const ci = new Date(checkinInput.value + 'T00:00:00');
      const co = new Date(checkoutInput.value + 'T23:59:59');

      if (!(checkinInput.value && checkoutInput.value)) {
        feedback.textContent = 'Selecione as duas datas.';
        feedback.classList.add('warn');
        return;
      }
      if (co < ci) {
        feedback.textContent = 'Check-out não pode ser antes do check-in.';
        feedback.classList.add('err');
        return;
      }
      if (!rangeOverlapsAny(ci, co, activeRanges)) {
        feedback.textContent = 'Período fora das janelas disponíveis deste imóvel.';
        feedback.classList.add('err');
        return;
      }

      // Demo: apenas confirma
      feedback.textContent = `Solicitação enviada para ${activeProperty.name} (${activeProperty.location}) de ${checkinInput.value} a ${checkoutInput.value}.`;
      feedback.classList.add('ok');
    });
  }

  // Init
  handleLoginPage();
  if (isHome) setupHome();
})();