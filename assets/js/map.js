document.addEventListener("DOMContentLoaded", () => {
    /* ---------------- MAP ---------------- */
    const map = L.map("map").setView([0, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18
    }).addTo(map);

    const geojsonURL = "../assets/data/contours.geojson";

    fetch(geojsonURL)
        .then(r => r.json())
        .then(data => {
            const layer = L.geoJSON(data).addTo(map);
            map.fitBounds(layer.getBounds());
        })
        .catch(err => console.error("GeoJSON error:", err));

    /* ---------------- CALENDAR ---------------- */
    const monthYear = document.getElementById("monthYear");
    const calendarDays = document.getElementById("calendarDays");
    const prevMonth = document.getElementById("prevMonth");
    const nextMonth = document.getElementById("nextMonth");

    let currentDate = new Date();

    function renderCalendar(date) {
        calendarDays.innerHTML = "";

        const year = date.getFullYear();
        const month = date.getMonth();

        monthYear.textContent = date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < firstDay; i++) {
            calendarDays.appendChild(document.createElement("div"));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement("div");
            cell.textContent = day;

            if (
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
            ) {
                cell.classList.add("today");
            }

            cell.onclick = () => {
                console.log(`Selected date: ${year}-${month + 1}-${day}`);
                // Hook map filtering here later
            };

            calendarDays.appendChild(cell);
        }
    }

    prevMonth.onclick = () => {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );
        renderCalendar(currentDate);
    };

    nextMonth.onclick = () => {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1
        );
        renderCalendar(currentDate);
    };

    renderCalendar(currentDate);
});

const toggleBtn = document.getElementById("togglePanelsBtn");
const sidebar = document.querySelector(".sidebar");
const calendarPanel = document.querySelector(".calendar-panel");

toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
    calendarPanel.classList.toggle("hidden");
});
