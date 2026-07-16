fetch('data/rankings.json')
  .then(response => {
    if (!response.ok) throw new Error('Не удалось загрузить рейтинг');
    return response.json();
  })
  .then(data => {
    const table = document.querySelector('#rankTable');

    table.innerHTML = data.map(player => {
      const fallback = player.name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const movementClass = player.movement > 0
        ? 'up'
        : player.movement < 0
          ? 'down'
          : 'same';

      const movementText = player.movement > 0
        ? `▲ +${player.movement}`
        : player.movement < 0
          ? `▼ ${player.movement}`
          : '—';

      return `
        <article class="rank-row card reveal ${player.rank === 1 ? 'top1' : ''}">
          <div class="rank-number">${player.rank}</div>

          <div class="player-photo-wrap" aria-label="Фотография ${player.name}">
            <img
              class="player-photo"
              src="${player.photo || ''}"
              alt="${player.name}"
              loading="lazy"
              onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
            >
            <span class="photo-fallback" hidden>${fallback}</span>
          </div>

          <div class="player-name">
            <b>
              <img
                class="country-flag"
                src="${player.flagImage || ''}"
                alt="${player.flagAlt || player.country}"
                title="${player.country}"
                loading="lazy"
              >
              <span>${player.name}</span>
            </b>
            <small>${player.country}</small>
          </div>

          <div class="points">
            <strong>${player.points}</strong><small class="muted"> очков</small>
          </div>

          <div class="movement ${movementClass}">${movementText}</div>
          <div class="titles">🏆 ${player.titles} ${titleWord(player.titles)}</div>
          <div class="form">${player.form.map(value => `<i class="${value ? 'w' : 'l'}"></i>`).join('')}</div>
        </article>
      `;
    }).join('');

    document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
  })
  .catch(error => {
    console.error(error);
    document.querySelector('#rankTable').innerHTML = `
      <section class="card empty-state">
        <h2>Не удалось загрузить рейтинг</h2>
        <p class="muted">Проверь файл data/rankings.json.</p>
      </section>
    `;
  });

function titleWord(value) {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'титулов';
  if (last === 1) return 'титул';
  if (last >= 2 && last <= 4) return 'титула';
  return 'титулов';
}
