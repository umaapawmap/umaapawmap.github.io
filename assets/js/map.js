document.addEventListener('DOMContentLoaded', () => {
  /* MAP */
  const OLONGAPO = { lat: 14.8395, lng: 120.2826 };
  const GEOJSON_PATH = '../assets/data/contours.geojson';
  const map = L.map('map', { preferCanvas: true }).setView([OLONGAPO.lat, OLONGAPO.lng], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  fetch(GEOJSON_PATH)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(geojson => {
      function detectHeightProp(feature) {
        const p = feature.properties || {};
        for (const key of ['flood_height', 'flood', 'elevation', 'height', 'elev', 'avg_elev']) {
          if (p.hasOwnProperty(key)) return key;
        }
        for (const k of Object.keys(p)) {
          if (typeof p[k] === 'number') return k;
        }
        return null;
      }

      const sample = Array.isArray(geojson.features) && geojson.features[0];
      const heightProp = sample ? detectHeightProp(sample) : null;

      const styleFn = feat => {
        const val = heightProp ? +feat.properties[heightProp] : NaN;
        let fill = '#00bcd4';
        if (!Number.isFinite(val)) fill = '#88c0d0';
        else if (val > 6) fill = '#ff4d4f';
        else if (val > 3) fill = '#ffa500';
        return { color: fill, fillColor: fill, fillOpacity: 0.45, weight: 1 };
      };

      const onEach = (feature, layer) => {
        const props = feature.properties || {};
        const title = props.name || props.zone || 'Zone';
        const height = heightProp ? props[heightProp] : 'N/A';
        layer.bindPopup(`<strong>${title}</strong><br/>Height: ${height}`);
      };

      const layer = L.geoJSON(geojson, { style: styleFn, onEachFeature: onEach }).addTo(map);

      // keep map centered by default; fit to geojson bounds if available
      try {
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
      } catch (e) {
        // fallback: map stays at default center
      }
    })
    .catch(err => {
      console.error('GeoJSON load error:', err);
    });

  /* CALENDAR */
  const monthYear = document.getElementById('monthYear');
  const calendarDays = document.getElementById('calendarDays');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');

  let current = new Date();

  function renderCalendar(date) {
    calendarDays.innerHTML = '';
    const year = date.getFullYear();
    const month = date.getMonth();
    monthYear.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      calendarDays.appendChild(empty);
    }

    const today = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const cell = document.createElement('div');
      cell.tabIndex = 0;
      cell.className = 'day';
      cell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cell.textContent = d;
      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cell.classList.add('today');
      }
      calendarDays.appendChild(cell);
    }
  }

  calendarDays.addEventListener('click', e => {
    const day = e.target.closest('.day');
    if (!day) return;
    const date = day.dataset.date;
    // TODO: hook map filtering/time selection here
  });

  calendarDays.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.target.click();
    }
  });

  prevMonth.addEventListener('click', () => {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    renderCalendar(current);
  });
  nextMonth.addEventListener('click', () => {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    renderCalendar(current);
  });
  renderCalendar(current);

  /* UI */
  const toggleBtn = document.getElementById('togglePanelsBtn');
  const sidebar = document.getElementById('sidebar');
  const calendarPanel = document.getElementById('calendarPanel');

  toggleBtn.addEventListener('click', () => {
    const hidden = sidebar.classList.toggle('hidden');
    calendarPanel.classList.toggle('hidden', hidden);
    toggleBtn.setAttribute('aria-pressed', String(hidden));
  });

  document.querySelectorAll('.menu button').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      // TODO: implement show/hide layer
    });
  });
});