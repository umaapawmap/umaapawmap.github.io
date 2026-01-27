document.addEventListener("DOMContentLoaded", () => {
    const mapCenter = [14.862697, 120.327579];
    const map = L.map("map", {
        preferCanvas: true,
        center: mapCenter,
        zoom: 12.5,
        minZoom: 12.5,
        zoomControl: false
    }).setView(mapCenter, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);


    let combinedBounds;

    fetch("../assets/data/contours.geojson")
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: {
                    weight: 0.4,
                    color: "#888888"
                }
            }).addTo(map);
            map.fitBounds(layer.getBounds());
        })
        .catch(err => console.error("GeoJSON error:", err))  

    fetch("../assets/data/barangays.geojson")
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: { color: "#41d8ab", weight: 1.5, fillOpacity: 0.4 },
                onEachFeature: (feature, layer) => {
                    layer.bindTooltip(feature.properties.ADM4_EN, {
                        sticky: true
                    });
                    layer.on({
                        mouseover: e => e.target.setStyle({ fillOpacity: 0.7 }),
                        mouseout: e => e.target.setStyle({ fillOpacity: 0.4 })
                    });
                }
            }).addTo(map);

            combinedBounds = layer.getBounds();
            map.fitBounds(combinedBounds);
            map.setMaxBounds(combinedBounds.pad(0.3));
        });

      

    let userMarker;

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

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
            },
            error => {
                console.error("Geolocation error:", error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser");
    }

    const toggleBtn = document.getElementById("toggleDrawerBtn");
    const drawer = document.getElementById("drawer");
    const mapDiv = document.getElementById("map");

    toggleBtn.addEventListener("click", () => {
        const isOpen = drawer.classList.toggle("open");
        toggleBtn.setAttribute("aria-pressed", String(isOpen));
    });

    const drawerCloseBtn = document.getElementById("drawerCloseBtn");

    drawerCloseBtn.addEventListener("click", () => {
        drawer.classList.remove("open");
        toggleBtn.setAttribute("aria-pressed", "false");
    });

    const tabLabel = document.getElementById("tabLabel");
    const tabLeft = document.getElementById("tabLeft");
    const tabRight = document.getElementById("tabRight");
    const tabPanes = document.querySelectorAll(".tab-pane");

    const tabs = ["layers", "info", "calendar"];
    let activeIndex = 0;

    function updateTab() {
        tabLabel.textContent =
            tabs[activeIndex].charAt(0).toUpperCase() +
            tabs[activeIndex].slice(1);
        tabLeft.classList.toggle("hidden", activeIndex === 0);
        tabRight.classList.toggle("hidden", activeIndex === tabs.length - 1);
        tabPanes.forEach(p => p.classList.remove("active"));
        document
            .querySelector(`.tab-pane[data-tab="${tabs[activeIndex]}"]`)
            .classList.add("active");
    }

    tabLeft.addEventListener("click", () => {
        if (activeIndex > 0) {
            activeIndex--;
            updateTab();
        }
    });

    tabRight.addEventListener("click", () => {
        if (activeIndex < tabs.length - 1) {
            activeIndex++;
            updateTab();
        }
    });

    updateTab();

    const monthYear = document.getElementById("monthYear");
    const calendarDays = document.getElementById("calendarDays");
    const prevMonth = document.getElementById("prevMonth");
    const nextMonth = document.getElementById("nextMonth");

    let current = new Date();

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

        const today = new Date();
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
                d === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
            ) {
                cell.classList.add("today");
            }
            calendarDays.appendChild(cell);
        }
    }

    calendarDays.addEventListener("click", e => {
        const day = e.target.closest(".day");
        if (!day || day.classList.contains("empty")) return;

        document.querySelectorAll(".calendar-days .day.selected").forEach(d => {
            d.classList.remove("selected");
        });

        day.classList.add("selected");

        day.focus();
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

    renderCalendar(current);

    const daySlider = document.getElementById("daySlider");
    const dayPointer = document.getElementById("dayPointer");

    let pointerDate = new Date();

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

        const tempItem = document.createElement("div");
        tempItem.className = "day-item";
        tempItem.style.visibility = "hidden";
        daySlider.appendChild(tempItem);
        const itemWidth = tempItem.getBoundingClientRect().width;
        tempItem.remove();

        const sliderWidth = daySlider.getBoundingClientRect().width;
        const spacerWidth = sliderWidth / 2 - itemWidth / 2;

        const startSpacer = document.createElement("div");
        startSpacer.className = "spacer";
        startSpacer.style.flex = `0 0 ${spacerWidth}px`;
        daySlider.appendChild(startSpacer);

        const todayStr = new Date().toISOString().split("T")[0];

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
        scrollToCurrentDay();
    }

    function updateSelectedDay() {
        const items = Array.from(daySlider.querySelectorAll(".day-item"));
        const sliderRect = daySlider.getBoundingClientRect();
        const pointerX = sliderRect.left + sliderRect.width / 2;

        let closestItem = null;
        let minDist = Infinity;
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const dist = Math.abs(pointerX - itemCenter);
            if (dist < minDist) {
                minDist = dist;
                closestItem = item;
            }
        });

        items.forEach(i => i.classList.remove("selected"));
        if (closestItem) {
            closestItem.classList.add("selected");
            pointerDate = new Date(closestItem.dataset.date);
        }
    }

    daySlider.addEventListener("scroll", updateSelectedDay);

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

    generateDaySlider(new Date(), 7, 7);
    scrollToCurrentDay();

    const waterOverlay = document.getElementById("waterOverlay");
    let maxMeters = 10.6;
    let heightMultiplier = 1;

    function setWaterLevel(meters) {
        meters = Math.min(Math.max(meters, 0), maxMeters);
        const percent = (meters / maxMeters) * 100 * heightMultiplier;
        waterOverlay.style.height = percent + "%";
    }

    setWaterLevel(5);

    const visualizer = document.getElementById("visualizer");
    const dimOverlay = document.getElementById("dimOverlay");

    let isExpanded = false;

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
        if (isExpanded) {
            dimOverlay.style.background = "rgba(0,0,0,0)";
            dimOverlay.style.pointerEvents = "none";

            visualizer.classList.remove("visualizer-expanded");
            isExpanded = false;
        }
    });
    
    
});
