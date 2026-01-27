document.addEventListener("DOMContentLoaded", () => {
    const MAP_CENTER = [14.862697, 120.327579];
    const MAP_MIN_ZOOM = 12.5;
    const MAP_START_ZOOM = 13;
    const MAX_METERS = 10.6;
    const HEIGHT_MULTIPLIER = 1;
    const TABS = ["layers", "info", "calendar"];

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
    let DAILY_RAIN_MM = null;
    const DEFAULT_VULNERABILITY = 1.0;

    async function fetchRainfallForDate(dateObj) {
        const dateStr = dateObj.toISOString().split("T")[0];

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

            DAILY_RAIN_MM = data.daily.precipitation_sum[0];
            console.log("Rainfall (mm):", DAILY_RAIN_MM);
        } catch (err) {
            console.error("Rain fetch failed", err);
            DAILY_RAIN_MM = null;
        }
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

        updateSelectedDay();
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
            fetchRainfallForDate(pointerDate);
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

    function setWaterLevel(meters) {
        meters = Math.min(Math.max(meters, 0), MAX_METERS);
        const percent = (meters / MAX_METERS) * 100 * HEIGHT_MULTIPLIER;
        waterOverlay.style.height = percent + "%";
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

                            if (DAILY_RAIN_MM === null) {
                                alert("Rainfall data not loaded yet.");
                                return;
                            }

                            const floodMeters = computeFloodHeight(
                                DAILY_RAIN_MM,
                                selectedBarangay
                            );

                            setWaterLevel(floodMeters);
                        }
                    });
                }
            }).addTo(map);

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

    updateTab();
    renderCalendar(pointerDate);
    generateDaySlider(pointerDate, 7, 7);
    setWaterLevel(5);
    fetchRainfallForDate(new Date());
});
