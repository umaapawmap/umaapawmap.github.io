document.addEventListener("DOMContentLoaded", () => {
    const MAP_CENTER = [14.862697, 120.327579];
    const MAP_MIN_ZOOM = 12.5;
    const MAP_START_ZOOM = 13;
    const MAX_METERS = 10.6;
    const HEIGHT_MULTIPLIER = 1;
    const TABS = ["layers", "info", "calendar", "typhoons"];

    const RUNOFF_COEFFICIENT = 0.65;
    const FLOODABLE_FRACTION = 0.15;
    const DRAINAGE_FACTOR = 0.75;
    const VULNERABILITY_FACTORS = {
        Asinan: 1.2,
        Banicain: 1.15,
        Barretto: 1.3,
        "East Bajac-bajac": 1.1,
        "East Tapinac": 1.1,
        "Gordon Heights": 0.85,
        Kalaklan: 1.0,
        Mabayuan: 0.9,
        "New Cabalan": 1.25,
        "New Ilalim": 1.3,
        "New Kababae": 1.1,
        "New Kalalake": 1.05,
        "Old Cabalan": 1.2,
        "Pag-asa": 0.95,
        "Santa Rita": 1.15,
        "West Bajac-bajac": 1.15,
        "West Tapinac": 1.1
    };

    const mapDiv = document.getElementById("map");
    const toggleBtn = document.getElementById("toggleDrawerBtn");
    const drawer = document.getElementById("drawer");
    const drawerCloseBtn = document.getElementById("drawerCloseBtn");
    const infoPanel = document.getElementById("infoPanel");
    const infoPanelClose = document.getElementById("infoPanelClose");
    const infoPanelTitle = document.getElementById("infoPanelTitle");
    const infoPanelBody = document.getElementById("infoPanelBody");

    const tabLabel = document.getElementById("tabLabel");
    const tabLeft = document.getElementById("tabLeft");
    const tabRight = document.getElementById("tabRight");
    const tabPanes = document.querySelectorAll(".tab-pane");

    const monthYear = document.getElementById("monthYear");
    const calendarDays = document.getElementById("calendarDays");
    const prevMonth = document.getElementById("prevMonth");
    const nextMonth = document.getElementById("nextMonth");

    const daySlider = document.getElementById("daySlider");
    const dayPointer = document.getElementById("dayPointer");

    const waterOverlay = document.getElementById("waterOverlay");
    const visualizer = document.getElementById("visualizer");
    const dimOverlay = document.getElementById("dimOverlay");

    let activeIndex = 0;
    let combinedBounds;
    let userMarker;
    let current = new Date();
    let pointerDate = new Date();
    let isExpanded = false;
    let selectedBarangay;
    let selectedBarangayFeature = null;
    let DAILY_RAIN_MM = null;
    let RECORDED_RAIN_MM = null;
    let HISTORICAL_DATA = {};
    let FLOOD_DATA = {}; // Store recorded flood heights by date
    let TYPHOON_DATA = null;
    let typhoonLayer = L.layerGroup();
    let historicalLayer = L.layerGroup();
    let barangayFeatures = [];
    let typhoonIntensity = 0; // 0.0 - 1.0
    const DEFAULT_VULNERABILITY = 1.0;
    let realtime = false;
    let realtimeIntervalMs = 5 * 60 * 1000; // 5 minutes
    let realtimeTimer = null;
    let lastFetchedAt = null;

    async function fetchRainfallForDate(dateObj) {
        const dateStr = dateObj.toISOString().split("T")[0];
        // Prefer historical recorded value if available
        if (HISTORICAL_DATA[dateStr] !== undefined) {
            RECORDED_RAIN_MM = HISTORICAL_DATA[dateStr];
            DAILY_RAIN_MM = RECORDED_RAIN_MM;
            console.log("Using historical rainfall (mm):", DAILY_RAIN_MM);
            return;
        }

        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=14.8627` +
            `&longitude=120.3276` +
            `&daily=precipitation_sum` +
            `&start_date=${dateStr}` +
            `&end_date=${dateStr}` +
            `&timezone=Asia/Manila`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            DAILY_RAIN_MM = data.daily && data.daily.precipitation_sum ? data.daily.precipitation_sum[0] : null;
            RECORDED_RAIN_MM = null;
            lastFetchedAt = new Date();
            updateLastUpdated(lastFetchedAt);
            console.log("Rainfall (mm):", DAILY_RAIN_MM);
        } catch (err) {
            console.error("Rain fetch failed", err);
            DAILY_RAIN_MM = null;
            RECORDED_RAIN_MM = null;
        }
    }

    function updateLastUpdated(date) {
        const el = document.getElementById("lastUpdated");
        if (!el) return;
        if (!date) {
            el.textContent = "-";
            return;
        }
        el.textContent = date.toLocaleString();
    }

    function startRealTime() {
        if (realtimeTimer) clearInterval(realtimeTimer);
        realtime = true;
        // immediate fetch
        fetchRainfallForDate(new Date()).then(() => {
            if (document.getElementById("toggleHistory")?.checked) renderHistoricalMarkers(new Date());
            if (selectedBarangay && selectedBarangayFeature) {
                showInfoPanel(selectedBarangay, selectedBarangayFeature);
            }
        });
        realtimeTimer = setInterval(() => {
            fetchRainfallForDate(new Date()).then(() => {
                if (document.getElementById("toggleHistory")?.checked) renderHistoricalMarkers(new Date());
                if (selectedBarangay && selectedBarangayFeature) {
                    showInfoPanel(selectedBarangay, selectedBarangayFeature);
                    const predicted = predictRainfall(pointerDate, selectedBarangay);
                    const floodMeters = computeFloodHeight(predicted, selectedBarangay);
                    setWaterLevel(floodMeters);
                }
            });
        }, realtimeIntervalMs);
    }

    function stopRealTime() {
        realtime = false;
        if (realtimeTimer) {
            clearInterval(realtimeTimer);
            realtimeTimer = null;
        }
    }

    function loadHistoricalData() {
        return Promise.all([
            fetch("../assets/data/historical_weather.json").then(r => r.json()),
            fetch("../assets/data/historical_weather_2025_full.json").then(r => r.json()).catch(() => [])
        ])
        .then(([arr2026, arr2025]) => {
            HISTORICAL_DATA = {};
            FLOOD_DATA = {};
            // Load both 2026 and 2025 data
            [...arr2026, ...arr2025].forEach(item => {
                HISTORICAL_DATA[item.date] = item.rainfall_mm;
                if (item.flood_height_m !== undefined) {
                    FLOOD_DATA[item.date] = item.flood_height_m;
                }
            });
            console.log("✓ Historical data loaded (", Object.keys(HISTORICAL_DATA).length, "dates,", Object.keys(FLOOD_DATA).length, "flood records )");
        })
        .catch(err => {
            console.error("Historical data load failed", err);
        });
    }

    function loadTyphoonData() {
        return fetch("../assets/data/typhoon_data.json")
            .then(r => r.json())
            .then(data => {
                TYPHOON_DATA = data;
                console.log("✓ Typhoon data loaded:", data.current?.name, "forecast +", data.historical?.length || 0, "historical");
                renderTyphoonTrack();
                populateHistoricalTyphoonDropdown();
                console.log("✓ Typhoon track rendered, dropdown populated");
            })
            .catch(err => {
                console.error("✗ Typhoon data load failed", err);
                TYPHOON_DATA = null;
            });
    }

    function computeTyphoonIntensity(dateObj) {
        if (!TYPHOON_DATA || !TYPHOON_DATA.current) return 0;
        
        const OLONGAPO_LAT = 14.862697;
        const OLONGAPO_LON = 120.327579;
        const dateStr = dateObj.toISOString().split("T")[0];
        
        // Find forecast point for this date
        const forecast = TYPHOON_DATA.current.forecast;
        let closestPoint = null;
        let minDistance = Infinity;
        
        for (const point of forecast) {
            if (point.date === dateStr) {
                // Calculate great-circle distance (km)
                const lat1 = OLONGAPO_LAT * Math.PI / 180;
                const lat2 = point.latitude * Math.PI / 180;
                const dLat = lat2 - lat1;
                const dLon = (point.longitude - OLONGAPO_LON) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
                const distance = 2 * 6371 * Math.asin(Math.sqrt(a));
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            }
        }
        
        if (!closestPoint) return 0;
        
        // Intensity weakens with distance: 100% at 0 km, 0% at 500+ km
        const base_intensity = closestPoint.intensity_percent / 100;
        const distanceFactor = Math.max(0, 1 - (minDistance / 500));
        return base_intensity * distanceFactor;
    }

    function renderTyphoonTrack() {
        if (!TYPHOON_DATA || !TYPHOON_DATA.current) return;
        typhoonLayer.clearLayers();
        
        const forecast = TYPHOON_DATA.current.forecast || [];
        if (forecast.length === 0) return;
        
        // Draw polyline for typhoon track
        const trackPoints = forecast.map(p => [p.latitude, p.longitude]);
        const trackLine = L.polyline(trackPoints, {
            color: '#ff6b00',
            weight: 3,
            opacity: 0.8,
            dashArray: '5,5',
            lineCap: 'round'
        });
        typhoonLayer.addLayer(trackLine);
        
        // Add markers for significant points
        forecast.forEach((point, idx) => {
            if (idx % 2 === 0) { // Show every other point to avoid clutter
                const marker = L.circleMarker([point.latitude, point.longitude], {
                    radius: 6,
                    fillColor: point.intensity_percent > 60 ? '#ff0000' : '#ff8800',
                    color: '#fff',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.7
                });
                marker.bindPopup(`<b>${TYPHOON_DATA.current.name}</b><br/>${point.date}<br/>${point.category}<br/>Intensity: ${point.intensity_percent}%`);
                typhoonLayer.addLayer(marker);
            }
        });
        
        // Ensure layer is visible on map
        console.log("renderTyphoonTrack: added", forecast.length, "forecast points");
    }

    function populateHistoricalTyphoonDropdown() {
        if (!TYPHOON_DATA || !TYPHOON_DATA.historical) return;
        
        const select = document.getElementById("historicalTyphoonSelect");
        if (!select) return;
        
        TYPHOON_DATA.historical.forEach((typhoon, idx) => {
            const option = document.createElement("option");
            const label = `${typhoon.name} (${typhoon.year}${typhoon.month ? ' - ' + typhoon.month : ''})`;
            option.value = idx;
            option.textContent = label;
            select.appendChild(option);
        });
    }

    function navigateToDate(targetDate) {
        // Update the current month/year to show this date
        current = new Date(targetDate);
        pointerDate = new Date(targetDate);
        
        // Render the calendar for this month
        renderCalendar(current);
        
        // Generate day slider centered on this date
        generateDaySlider(pointerDate, 7, 7);
        
        // Trigger data load for this date
        setTimeout(() => updateSelectedDay(), 100);
        
        console.log("📅 Navigated to", targetDate.toDateString());
    }

    function renderHistoricalTyphoonTrack(typhoonIndex) {
        if (!TYPHOON_DATA || !TYPHOON_DATA.historical) return;
        
        const typhoon = TYPHOON_DATA.historical[typhoonIndex];
        if (!typhoon || !typhoon.track) return;
        
        typhoonLayer.clearLayers();
        
        // Draw polyline for historical track
        const trackPoints = typhoon.track.map(p => [p.latitude, p.longitude]);
        const trackLine = L.polyline(trackPoints, {
            color: '#0066cc',
            weight: 3,
            opacity: 0.7,
            dashArray: '3,3',
            lineCap: 'round'
        });
        typhoonLayer.addLayer(trackLine);
        
        // Add markers for all points
        typhoon.track.forEach((point, idx) => {
            const marker = L.circleMarker([point.latitude, point.longitude], {
                radius: 5,
                fillColor: point.intensity_percent > 60 ? '#ff0000' : point.intensity_percent > 40 ? '#ff8800' : '#ffcc00',
                color: '#fff',
                weight: 1.5,
                opacity: 0.8,
                fillOpacity: 0.7
            });
            
            let popupText = `<b>${typhoon.name}</b><br/>${point.date}<br/>Intensity: ${point.intensity_percent}%`;
            if (point.rainfall_mm) {
                popupText += `<br/>Rainfall: ${point.rainfall_mm} mm`;
            }
            marker.bindPopup(popupText);
            typhoonLayer.addLayer(marker);
        });
        
        console.log("renderHistoricalTyphoonTrack: rendered", typhoon.name, "with", typhoon.track.length, "points");
    }

    function avgLastNDays(dateObj, n = 7) {
        const res = [];
        for (let i = 1; i <= n; i++) {
            const d = new Date(dateObj);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split("T")[0];
            if (HISTORICAL_DATA[key] !== undefined) res.push(HISTORICAL_DATA[key]);
        }
        if (res.length === 0) return null;
        return res.reduce((a, b) => a + b, 0) / res.length;
    }

    function predictRainfall(dateObj, barangayName) {
        const today = new Date();
        // baseline: average of last 7 days if available, otherwise use last known DAILY_RAIN_MM or 2mm
        const avg7 = avgLastNDays(dateObj, 7);
        let baseline = avg7 ?? (DAILY_RAIN_MM ?? 2);

        // simple pattern: weekend/weekday modifier (example)
        const dow = dateObj.getDay();
        const dowFactor = dow === 0 || dow === 6 ? 1.05 : 1.0;

        // typhoon influence: amplify baseline by typhoonIntensity (0-1). stronger effect for future dates
        const futureFactor = dateObj > today ? 1 + typhoonIntensity * 2.5 : 1 + typhoonIntensity * 1.2;

        const predicted = baseline * dowFactor * futureFactor;

        return Math.max(0, predicted);
    }

    function computeFloodHeight(rainMM, barangayName) {
        const vulnerability =
            VULNERABILITY_FACTORS[barangayName] ?? DEFAULT_VULNERABILITY;

        const height =
            (rainMM * RUNOFF_COEFFICIENT * vulnerability) /
            (1000 * FLOODABLE_FRACTION * DRAINAGE_FACTOR);

        return height;
    }

    const map = L.map("map", {
        preferCanvas: true,
        center: MAP_CENTER,
        zoom: MAP_MIN_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        zoomControl: false
    }).setView(MAP_CENTER, MAP_START_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // Add layer groups to map so they're initially available
    typhoonLayer.addTo(map);
    historicalLayer.addTo(map);

    function updateTab() {
        tabLabel.textContent =
            TABS[activeIndex].charAt(0).toUpperCase() +
            TABS[activeIndex].slice(1);
        tabLeft.classList.toggle("hidden", activeIndex === 0);
        tabRight.classList.toggle("hidden", activeIndex === TABS.length - 1);
        tabPanes.forEach(p => p.classList.remove("active"));
        document
            .querySelector(`.tab-pane[data-tab="${TABS[activeIndex]}"]`)
            .classList.add("active");
    }

    function renderCalendar(date) {
        calendarDays.innerHTML = "";
        const year = date.getFullYear();
        const month = date.getMonth();
        monthYear.textContent = date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayIndex; i++) {
            const empty = document.createElement("div");
            empty.className = "empty";
            calendarDays.appendChild(empty);
        }

        for (let d = 1; d <= totalDays; d++) {
            const cell = document.createElement("div");
            cell.tabIndex = 0;
            cell.className = "day";
            cell.dataset.date = `${year}-${String(month + 1).padStart(
                2,
                "0"
            )}-${String(d).padStart(2, "0")}`;
            cell.textContent = d;

            if (
                pointerDate &&
                cell.dataset.date === pointerDate.toISOString().split("T")[0]
            ) {
                cell.classList.add("today");
            }

            calendarDays.appendChild(cell);
        }
    }

    function generateDaySlider(
        centerDate = new Date(),
        pastDays = 7,
        futureDays = 7
    ) {
        daySlider
            .querySelectorAll(".day-item, .spacer")
            .forEach(d => d.remove());

        const totalDays = pastDays + futureDays + 1;
        const start = new Date(centerDate);
        start.setDate(centerDate.getDate() - pastDays);

        const temp = document.createElement("div");
        temp.className = "day-item";
        temp.style.visibility = "hidden";
        daySlider.appendChild(temp);
        const itemWidth = temp.getBoundingClientRect().width;
        temp.remove();

        const sliderWidth = daySlider.getBoundingClientRect().width;
        const spacerWidth = sliderWidth / 2 - itemWidth / 2;

        const startSpacer = document.createElement("div");
        startSpacer.className = "spacer";
        startSpacer.style.flex = `0 0 ${spacerWidth}px`;
        daySlider.appendChild(startSpacer);

        const todayStr = pointerDate.toISOString().split("T")[0];

        for (let i = 0; i < totalDays; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);

            const item = document.createElement("div");
            item.className = "day-item";
            item.dataset.date = d.toISOString().split("T")[0];

            if (item.dataset.date === todayStr) item.classList.add("today");

            const weekday = document.createElement("div");
            weekday.className = "day-label-weekday";
            weekday.textContent = d.toLocaleDateString("en-US", {
                weekday: "short"
            });

            const monthDay = document.createElement("div");
            monthDay.className = "day-label-date";
            monthDay.textContent = d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric"
            });

            item.appendChild(weekday);
            item.appendChild(monthDay);
            daySlider.appendChild(item);
        }

        const endSpacer = document.createElement("div");
        endSpacer.className = "spacer";
        endSpacer.style.flex = `0 0 ${spacerWidth}px`;
        daySlider.appendChild(endSpacer);

        // ensure the slider is centered on the provided centerDate before selecting
        const selectedDateStr = centerDate.toISOString().split("T")[0];
        // wait a frame for layout, then scroll and update selection
        requestAnimationFrame(() => {
            scrollToDateStr(selectedDateStr, "auto");
            // small delay to allow scroll/layout to settle, then pick the selected day
            setTimeout(() => updateSelectedDay(), 80);
        });
    }

    function updateSelectedDay() {
        const items = Array.from(daySlider.querySelectorAll(".day-item"));
        const sliderRect = daySlider.getBoundingClientRect();
        const pointerX = sliderRect.left + sliderRect.width / 2;

        let closest = null;
        let minDist = Infinity;

        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const dist = Math.abs(pointerX - center);
            if (dist < minDist) {
                minDist = dist;
                closest = item;
            }
        });

        items.forEach(i => i.classList.remove("selected"));

        if (closest) {
            closest.classList.add("selected");
            pointerDate = new Date(closest.dataset.date);
            
            // Auto-compute typhoon intensity based on date
            typhoonIntensity = computeTyphoonIntensity(pointerDate);
            const typhoonValueEl = document.getElementById("typhoonValue");
            if (typhoonValueEl) {
                typhoonValueEl.textContent = `${Math.round(typhoonIntensity * 100)}%`;
            }
            
            fetchRainfallForDate(pointerDate).then(() => {
                renderHistoricalMarkers(pointerDate);
                // Refresh info panel with new typhoon intensity
                if (selectedBarangay && selectedBarangayFeature) {
                    showInfoPanel(selectedBarangay, selectedBarangayFeature);
                    const predicted = predictRainfall(pointerDate, selectedBarangay);
                    const floodMeters = computeFloodHeight(predicted, selectedBarangay);
                    setWaterLevel(floodMeters);
                }
            });

            // position the pointer image to point at the selected day
            try {
                const rect = closest.getBoundingClientRect();
                const center = rect.left + rect.width / 2; // viewport x
                if (dayPointer) {
                    dayPointer.style.left = `${center}px`;
                }
            } catch (e) {
                // ignore
            }
        }
    }

    function scrollToCurrentDay() {
        const items = Array.from(daySlider.querySelectorAll(".day-item"));
        const todayStr = new Date().toISOString().split("T")[0];
        const todayItem = items.find(i => i.dataset.date === todayStr);

        if (todayItem) {
            const sliderRect = daySlider.getBoundingClientRect();
            const itemRect = todayItem.getBoundingClientRect();
            const scrollLeft =
                todayItem.offsetLeft -
                sliderRect.width / 2 +
                itemRect.width / 2;
            daySlider.scrollTo({ left: scrollLeft, behavior: "auto" });
        }
    }

    function scrollToDateStr(dateStr, behavior = "auto") {
        const items = Array.from(daySlider.querySelectorAll(".day-item"));
        const item = items.find(i => i.dataset.date === dateStr);
        if (!item) return;

        const sliderRect = daySlider.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const scrollLeft = item.offsetLeft - sliderRect.width / 2 + itemRect.width / 2;
        daySlider.scrollTo({ left: scrollLeft, behavior });
    }

    function setWaterLevel(meters) {
        meters = Math.min(Math.max(meters, 0), MAX_METERS);
        const percent = (meters / MAX_METERS) * 100 * HEIGHT_MULTIPLIER;
        waterOverlay.style.height = percent + "%";
    }

    function showInfoPanel(barangayName, feature) {
        infoPanelTitle.textContent = barangayName;
        
        let bodyHTML = "";
        
        // show recorded or predicted rainfall depending on data and selected date
        const dateStr = pointerDate.toISOString().split("T")[0];
        const recorded = HISTORICAL_DATA[dateStr] ?? null;
        const predicted = predictRainfall(pointerDate, barangayName);

        if (recorded !== null) {
            const floodMeters = computeFloodHeight(recorded, barangayName);
            bodyHTML += `
                <div class="info-item">
                    <div class="info-label">Recorded Rainfall (mm)</div>
                    <div class="info-value">${recorded.toFixed(2)} mm</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Projected Flood Height</div>
                    <div class="info-value">${floodMeters.toFixed(2)} m</div>
                </div>
            `;
        } else {
            const floodMeters = computeFloodHeight(predicted, barangayName);
            bodyHTML += `
                <div class="info-item">
                    <div class="info-label">Predicted Rainfall (mm)</div>
                    <div class="info-value">${predicted.toFixed(2)} mm</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Predicted Flood Height</div>
                    <div class="info-value">${floodMeters.toFixed(2)} m</div>
                </div>
            `;
        }

        // show typhoon intensity setting
        bodyHTML += `
            <div class="info-item">
                <div class="info-label">Typhoon intensity</div>
                <div class="info-value">${Math.round(typhoonIntensity * 100)}%</div>
            </div>
        `;
        
        if (feature && feature.properties) {
            if (feature.properties.population) {
                bodyHTML += `
                    <div class="info-item">
                        <div class="info-label">Population</div>
                        <div class="info-value">${feature.properties.population.toLocaleString()}</div>
                    </div>
                `;
            }
            if (feature.properties.area) {
                bodyHTML += `
                    <div class="info-item">
                        <div class="info-label">Area (km²)</div>
                        <div class="info-value">${feature.properties.area.toFixed(2)}</div>
                    </div>
                `;
            }
        }
        
        if (bodyHTML === "") {
            bodyHTML = '<div class="info-item"><div class="info-value">No data available</div></div>';
        }
        
        infoPanelBody.innerHTML = bodyHTML;
        infoPanel.classList.add("show");
    }

    function hideInfoPanel() {
        infoPanel.classList.remove("show");
    }

    function clearHistoricalMarkers() {
        historicalLayer.clearLayers();
    }

    function renderHistoricalMarkers(dateObj) {
        clearHistoricalMarkers();
        const dateStr = dateObj.toISOString().split("T")[0];

        barangayFeatures.forEach(item => {
            const feature = item.feature;
            const center = item.centroid || (item.layer ? item.layer.getBounds().getCenter() : null);
            if (!center) return;

            const recorded = HISTORICAL_DATA[dateStr] ?? null;
            const predicted = predictRainfall(dateObj, feature.properties.ADM4_EN);

            const value = recorded !== null ? recorded : predicted;

            const color = value >= 20 ? "#800026" : value >= 10 ? "#BD0026" : value >= 5 ? "#E31A1C" : "#FED976";
            const radius = Math.min(40, Math.max(4, value * 2));

            const circle = L.circleMarker(center, {
                radius,
                fillColor: color,
                color: "#333",
                weight: 0.5,
                fillOpacity: 0.8
            });

            circle.bindPopup(`
                <strong>${feature.properties.ADM4_EN}</strong><br/>
                ${recorded !== null ? `Recorded: ${recorded.toFixed(1)} mm` : `Predicted: ${predicted.toFixed(1)} mm`}
            `);

            historicalLayer.addLayer(circle);
        });
    }

    fetch("../assets/data/contours.geojson")
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: { weight: 0.4, color: "#888888" }
            }).addTo(map);
            map.fitBounds(layer.getBounds());
        });

    fetch("../assets/data/barangays.geojson")
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: { color: "#0b9c51", weight: 1.2, fillOpacity: 0.3 },
                onEachFeature: (feature, layer) => {
                    layer.bindTooltip(feature.properties.ADM4_EN, {
                        sticky: true
                    });
                    layer.on({
                        mouseover: e => e.target.setStyle({ fillOpacity: 0.7 }),
                        mouseout: e => e.target.setStyle({ fillOpacity: 0.4 }),

                        click: e => {
                            selectedBarangay = feature.properties.ADM4_EN;
                            selectedBarangayFeature = feature;

                            // use recorded if available for pointerDate, otherwise predict
                            const dateStr = pointerDate.toISOString().split("T")[0];
                            const recorded = HISTORICAL_DATA[dateStr] ?? null;
                            const rainfallForCalc = recorded !== null ? recorded : predictRainfall(pointerDate, selectedBarangay);

                            const floodMeters = computeFloodHeight(
                                rainfallForCalc,
                                selectedBarangay
                            );

                            setWaterLevel(floodMeters);
                            showInfoPanel(selectedBarangay, feature);
                        }
                    });
                }
            }).addTo(map);

            // store features and centroids for historical markers
            layer.eachLayer(l => {
                try {
                    const ctr = l.getBounds().getCenter();
                    barangayFeatures.push({ feature: l.feature, layer: l, centroid: ctr });
                } catch (e) {
                    // ignore
                }
            });

            // add historical layer but not visible until toggled
            historicalLayer.addTo(map);

            combinedBounds = layer.getBounds();
            map.fitBounds(combinedBounds);
            map.setMaxBounds(combinedBounds.pad(0.3));
        });

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (!userMarker) {
                userMarker = L.marker([lat, lng], {
                    icon: L.icon({
                        iconUrl:
                            "https://cdn-icons-png.flaticon.com/512/64/64113.png",
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    })
                }).addTo(map);
            } else {
                userMarker.setLatLng([lat, lng]);
            }
        });
    }

    toggleBtn.addEventListener("click", () => {
        const isOpen = drawer.classList.toggle("open");
        toggleBtn.setAttribute("aria-pressed", String(isOpen));
    });

    drawerCloseBtn.addEventListener("click", () => {
        drawer.classList.remove("open");
        toggleBtn.setAttribute("aria-pressed", "false");
    });

    infoPanelClose.addEventListener("click", hideInfoPanel);

    tabLeft.addEventListener("click", () => {
        if (activeIndex > 0) {
            activeIndex--;
            updateTab();
        }
    });

    tabRight.addEventListener("click", () => {
        if (activeIndex < TABS.length - 1) {
            activeIndex++;
            updateTab();
        }
    });

    calendarDays.addEventListener("click", e => {
        const day = e.target.closest(".day");
        if (!day) return;

        pointerDate = new Date(day.dataset.date);

        renderCalendar(pointerDate);
        generateDaySlider(pointerDate, 7, 7);
    });

    calendarDays.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.target.click();
        }
    });

    prevMonth.addEventListener("click", () => {
        current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        renderCalendar(current);
    });

    nextMonth.addEventListener("click", () => {
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        renderCalendar(current);
    });

    daySlider.addEventListener("scroll", updateSelectedDay);

    visualizer.addEventListener("click", () => {
        if (!isExpanded) {
            dimOverlay.style.pointerEvents = "auto";
            dimOverlay.style.background = "rgba(0,0,0,0.5)";
            visualizer.classList.add("visualizer-expanded");
            isExpanded = true;
        } else {
            dimOverlay.style.background = "rgba(0,0,0,0)";
            dimOverlay.style.pointerEvents = "none";
            visualizer.classList.remove("visualizer-expanded");
            isExpanded = false;
        }
    });

    dimOverlay.addEventListener("click", () => {
        dimOverlay.style.background = "rgba(0,0,0,0)";
        dimOverlay.style.pointerEvents = "none";
        visualizer.classList.remove("visualizer-expanded");
        isExpanded = false;
    });

    // load historical data, then fetch current rainfall and render markers
    Promise.all([
        loadHistoricalData(),
        loadTyphoonData()
    ]).then(() => {
        fetchRainfallForDate(new Date()).then(() => {
            renderHistoricalMarkers(new Date());
        });
    });

    // wire up UI controls added to dashboard HTML
    const toggleHistoryEl = document.getElementById("toggleHistory");
    const typhoonSlider = document.getElementById("typhoonIntensity");
    const typhoonValueEl = document.getElementById("typhoonValue");

    if (toggleHistoryEl) {
        toggleHistoryEl.addEventListener("change", e => {
            if (e.target.checked) {
                renderHistoricalMarkers(pointerDate);
            } else {
                clearHistoricalMarkers();
            }
        });
    }

    if (typhoonSlider) {
        // Typhoon intensity is now auto-calculated from typhoon data
        typhoonSlider.disabled = true;
        typhoonSlider.title = "Typhoon intensity is auto-calculated based on typhoon track position";
        typhoonSlider.addEventListener("input", e => {
            const v = Number(e.target.value || 0);
            if (typhoonValueEl) typhoonValueEl.textContent = `${v}%`;
        });
    }

    // real-time toggle
    const toggleRealtimeEl = document.getElementById("toggleRealtime");
    if (toggleRealtimeEl) {
        toggleRealtimeEl.addEventListener("change", e => {
            if (e.target.checked) startRealTime();
            else stopRealTime();
        });
    }

    // historical typhoon selector
    const historicalTyphoonSelect = document.getElementById("historicalTyphoonSelect");
    const typhoonDetails = document.getElementById("typhoonDetails");
    const viewTyphoonBtn = document.getElementById("viewTyphoonBtn");

    if (historicalTyphoonSelect) {
        historicalTyphoonSelect.addEventListener("change", e => {
            if (!e.target.value) {
                typhoonDetails.style.display = "none";
                typhoonLayer.clearLayers();
                return;
            }

            const typhoonIndex = parseInt(e.target.value);
            const typhoon = TYPHOON_DATA.historical[typhoonIndex];
            
            if (!typhoon) return;

            // Display typhoon details
            document.getElementById("typhoonName").textContent = typhoon.name + (typhoon.year ? ` (${typhoon.year})` : "");
            document.getElementById("typhoonDate").textContent = 
                typhoon.track && typhoon.track.length ? 
                `${typhoon.track[0].date} to ${typhoon.track[typhoon.track.length - 1].date}` : 
                typhoon.year || "";

            if (typhoon.flood_impact) {
                const impact = typhoon.flood_impact;
                document.getElementById("peakFloodHeight").textContent = impact.peak_flood_height_m ? `${impact.peak_flood_height_m} m (${impact.peak_date})` : "-";
                document.getElementById("peakRainfall").textContent = 
                    typhoon.track ? 
                    `${Math.max(...typhoon.track.map(p => p.rainfall_mm || 0)).toFixed(1)} mm` : 
                    "-";
                document.getElementById("affectedBarangays").textContent = 
                    impact.affected_barangays ? 
                    impact.affected_barangays.join(", ") : 
                    "-";
                document.getElementById("floodDescription").textContent = impact.description || "";
            }

            typhoonDetails.style.display = "block";
        });
    }

    if (viewTyphoonBtn) {
        viewTyphoonBtn.addEventListener("click", () => {
            const select = document.getElementById("historicalTyphoonSelect");
            if (!select.value) return;

            const typhoonIndex = parseInt(select.value);
            const typhoon = TYPHOON_DATA.historical[typhoonIndex];
            
            if (typhoon && typhoon.track && typhoon.track.length > 0) {
                // Navigate to the first day of the typhoon
                const firstDate = new Date(typhoon.track[0].date);
                navigateToDate(firstDate);
                console.log("🌀 Viewing", typhoon.name, "starting", firstDate.toDateString());
            }
            
            // Render the track
            renderHistoricalTyphoonTrack(typhoonIndex);
            
            // Close drawer and zoom to typhoon area
            if (drawer) drawer.classList.remove("open");
            if (toggleBtn) toggleBtn.setAttribute("aria-pressed", "false");
        });
    }

    updateTab();
    renderCalendar(pointerDate);
    generateDaySlider(pointerDate, 7, 7);
    setWaterLevel(5);
});
