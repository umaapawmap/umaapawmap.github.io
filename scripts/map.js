import { UI } from "./ui.js";
import { getFloodData, getFloodColor, calculateFloodHeight, isDataCached } from "./api.js";
import { Timeline } from "./timeline.js";
import { Visualizer } from "./visualizer.js";

const State = {
    selectedLayer: null,
    activeDate: new Date()
};

let geoJsonLayer;

export const MapManager = {
    create(config) {
        return L.map("map", {
            zoomControl: false,
            attributionControl: false,
            doubleClickZoom: false
        }).setView(config.map.center, 13);
    },

    addBaseLayer(map) {
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        ).addTo(map);
    },

    addGeoJson(map, data) {
        geoJsonLayer = L.geoJSON(data, {
            style: { color: "#333333", weight: 1, fillOpacity: 0.8 },
            onEachFeature: (feature, l) => {
                l.on("click", e => this.handleFeatureClick(e, l, feature));
            }
        }).addTo(map);

        this.updateMapColors();

        const reset = () => {
            UI.hide();
            if (State.selectedLayer) {
                this.updateMapColors();
                State.selectedLayer = null;
            }
        };

        map.on("click movestart zoomstart", reset);
        return geoJsonLayer;
    },

    async updateMapColors() {
        if (!geoJsonLayer) return;

        let needsLoading = false;
        geoJsonLayer.eachLayer(layer => {
            const { lat, lng } = layer.getBounds().getCenter();
            if (!isDataCached(lat, lng, State.activeDate)) {
                needsLoading = true;
            }
        });

        const spinner = document.getElementById("loading-spinner");
        if (needsLoading && spinner) spinner.classList.remove("hidden");

        try {
            const floodConfig = await fetch("./config/flood-config.json").then(r => r.json());
            const promises = [];

            geoJsonLayer.eachLayer(layer => {
                const { lat, lng } = layer.getBounds().getCenter();
                const bgyName = layer.feature.properties.ADM4_EN;

                const task = getFloodData(lat, lng, State.activeDate).then(rain => {
                    const height = calculateFloodHeight(rain, bgyName, floodConfig);
                    return { layer, color: getFloodColor(Number(height)) };
                });
                promises.push(task);
            });

            const updates = await Promise.all(promises);
            updates.forEach(({ layer, color }) => {
                layer.setStyle({
                    fillColor: color,
                    color: color,
                    fillOpacity: 0.6
                });
            });
        } catch (err) {
            console.error("Map update failed:", err);
        } finally {
            if (spinner) spinner.classList.add("hidden");
        }
    },

    async handleFeatureClick(e, layer, feature) {
        L.DomEvent.stopPropagation(e);

        if (State.selectedLayer) {
            State.selectedLayer.setStyle({ fillOpacity: 0.6 });
        }

        layer.setStyle({ fillOpacity: 0.9, weight: 1 });
        State.selectedLayer = layer;

        const { lat, lng } = layer.getBounds().getCenter();
        const { clientX, clientY } = e.originalEvent;
        const bgyName = feature.properties.ADM4_EN;

        UI.show(bgyName, clientX, clientY);

        const heightDisplay = document.getElementById("info-height");
        if (heightDisplay) {
            const dateOptions = { month: "short", day: "numeric", year: "numeric" };
            const formattedDate = State.activeDate.toLocaleDateString("en-US", dateOptions);

            if (!isDataCached(lat, lng, State.activeDate)) {
                heightDisplay.innerHTML = "Calculating...";
            }

            try {
                const floodConfig = await fetch("./config/flood-config.json").then(r => r.json());
                const rain = await getFloodData(lat, lng, State.activeDate);
                const height = calculateFloodHeight(rain, bgyName, floodConfig);

                heightDisplay.innerHTML = `
                    <div style="margin-bottom: 4px;">Date: <strong>${formattedDate}</strong></div>
                    <div style="margin-bottom: 4px;">Rainfall: <strong>${rain}mm</strong></div>
                    <div>Flood Height: <strong>${height}m</strong></div>
                `;
            } catch (err) {
                heightDisplay.innerHTML = "Error";
            }
        }

        const vizBtn = document.getElementById("visualize-flood-btn");
        vizBtn.onclick = () => {
            Visualizer.open(lat, lng, State.activeDate, bgyName);
        };
    }
};

Timeline.subscribe(newDate => {
    const panel = document.getElementById("info-panel");
    if (panel && !panel.classList.contains("hidden")) {
        UI.hide();
    }
    State.activeDate = newDate;
    MapManager.updateMapColors();
});
