(function () {
  'use strict';

  const root = document.querySelector('#liveRoot');

  if (!root) return;

  fetch('data/site.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`site.json: HTTP ${response.status}`);
      return response.json();
    })
    .then(site => {
      const live = site.live || {};

      if (!live.active) {
        showOffline(live);
        return;
      }

      const startTimestamp = new Date(live.startsAt).getTime();

      if (!Number.isFinite(startTimestamp)) {
        showError('Неверно указано время эфира', 'Проверь поле startsAt в data/site.json.');
        return;
      }

      if (Date.now() >= startTimestamp) {
        openBroadcast(live, startTimestamp);
        return;
      }

      showCountdown(live, startTimestamp);
    })
    .catch(error => {
      console.error(error);
      showError('Не удалось загрузить данные эфира', 'Проверь файл data/site.json и путь к нему.');
    });

  function showOffline(live) {
    const players = Array.isArray(live.players) ? live.players : [];
    const playersText = players.length >= 2
      ? `${escapeHtml(players[0])} — ${escapeHtml(players[1])}`
      : 'Ближайшая встреча появится в расписании.';

    root.innerHTML = `
      <section class="offline card">
        <div class="offline-icon">🎾</div>
        <div class="eyebrow">Эфир временно закрыт</div>
        <h1>Сейчас матчей нет</h1>
        <p>${playersText}</p>
        <a class="btn primary" href="schedule.html">Открыть расписание</a>
      </section>
    `;
  }

  function showCountdown(live, startTimestamp) {
    const players = Array.isArray(live.players) ? live.players : ['Игрок 1', 'Игрок 2'];

    root.innerHTML = `
      <section class="offline card">
        <div class="offline-icon">⌛</div>
        <div class="eyebrow">До начала прямого эфира</div>
        <h1>${escapeHtml(live.title || 'Теннисный матч')}</h1>
        <p>${escapeHtml(players[0] || 'Игрок 1')} — ${escapeHtml(players[1] || 'Игрок 2')}</p>

        <div class="countdown">
          <span><b id="days">0</b><small class="muted"><br>дней</small></span>
          <span><b id="hours">00</b><small class="muted"><br>часов</small></span>
          <span><b id="minutes">00</b><small class="muted"><br>минут</small></span>
          <span><b id="seconds">00</b><small class="muted"><br>секунд</small></span>
        </div>
      </section>
    `;

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);

    function updateCountdown() {
      const remaining = startTimestamp - Date.now();

      if (remaining <= 0) {
        window.clearInterval(timer);
        openBroadcast(live, startTimestamp);
        return;
      }

      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      setText('days', days);
      setText('hours', String(hours).padStart(2, '0'));
      setText('minutes', String(minutes).padStart(2, '0'));
      setText('seconds', String(seconds).padStart(2, '0'));
    }
  }

  function openBroadcast(live, startTimestamp) {
    const page = live.page || 'live/index.html';
    const separator = page.includes('?') ? '&' : '?';
    const iframeUrl = `${page}${separator}start=${encodeURIComponent(startTimestamp)}`;

    root.innerHTML = `
      <div class="live-frame-wrap">
        <iframe
          class="live-frame"
          src="${escapeAttribute(iframeUrl)}"
          title="Прямой эфир"
          allow="autoplay"
        ></iframe>
      </div>
    `;
  }

  function showError(title, message) {
    root.innerHTML = `
      <section class="offline card">
        <div class="offline-icon">⚠️</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
      </section>
    `;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
