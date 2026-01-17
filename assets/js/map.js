document.addEventListener("DOMContentLoaded", () => {
    const mapCenter = [14.862697, 120.327579];
    const map = L.map("map", {
        preferCanvas: true,
        center: mapCenter,
        zoom: 12.5,
        minZoom: 12.5
    }).setView(mapCenter, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    let combinedBounds;

    fetch("../assets/data/barangays.geojson")
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: { color: "#2563eb", weight: 1.5, fillOpacity: 0.4 },
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
});
