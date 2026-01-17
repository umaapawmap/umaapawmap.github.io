document.addEventListener("DOMContentLoaded", () => {
    const mapCenter = [14.862697, 120.327579];
    const map = L.map("map", {
        preferCanvas: true,
        center: mapCenter
    }).setView(mapCenter, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        // This is a legal requirement for OSM License; Do not remove
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    fetch("../assets/data/barangays.geojson")
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data, {
                style: {
                    color: "#2563eb",
                    weight: 1,
                    fillOpacity: 0.4
                },
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
            map.fitBounds(layer.getBounds());
        });

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
        if (!day) return;
        const date = day.dataset.date;
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

    const toggleBtn = document.getElementById("togglePanelsBtn");
    const sidebar = document.getElementById("sidebar");
    const calendarPanel = document.getElementById("calendarPanel");

    toggleBtn.addEventListener("click", () => {
        const hidden = sidebar.classList.toggle("hidden");
        calendarPanel.classList.toggle("hidden", hidden);
        toggleBtn.setAttribute("aria-pressed", String(hidden));
    });

    document.querySelectorAll(".menu button").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("active");
        });
    });
});
