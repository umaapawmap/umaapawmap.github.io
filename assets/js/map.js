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
        mapDiv.classList.toggle("dimmed", isOpen);
        toggleBtn.setAttribute("aria-pressed", String(isOpen));
    });

    const drawerCloseBtn = document.getElementById("drawerCloseBtn");

    drawerCloseBtn.addEventListener("click", () => {
        drawer.classList.remove("open");
        mapDiv.classList.remove("dimmed");
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
});
