import { UI } from "./ui.js";
import { fetchRainfallData, getFloodColor } from "./api.js";
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
                l.on("click", e =>
                    this.handleFeatureClick(e, l, feature, geoJsonLayer)
                );
            }
        }).addTo(map);

        this.updateMapColors();

        const reset = async () => {
            UI.hide();
            if (State.selectedLayer) {
                const layer = State.selectedLayer;
                const { lat, lng } = layer.getBounds().getCenter();

                const height = await fetchRainfallData(
                    lat,
                    lng,
                    State.activeDate
                );
                const color = getFloodColor(height);

                layer.setStyle({
                    fillColor: color,
                    color: color,
                    fillOpacity: 0.4
                });

                State.selectedLayer = null;
            }
        };

        map.on("click movestart zoomstart", reset);
        return geoJsonLayer;
    },

    async updateMapColors() {
        if (!geoJsonLayer) return;

        const spinner = document.getElementById("loading-spinner");
        if (spinner) spinner.classList.remove("hidden");
        
        const promises = [];

        geoJsonLayer.eachLayer(layer => {
            const { lat, lng } = layer.getBounds().getCenter();

            const task = fetchRainfallData(lat, lng, State.activeDate).then(
                height => ({
                    layer,
                    color: getFloodColor(height)
                })
            );

            promises.push(task);
        });
        
        try {
        const updates = await Promise.all(promises);
        updates.forEach(({ layer, color }) => {
            layer.setStyle({
                fillColor: color,
                color: color,
                fillOpacity: 0.4
            });
        });
    } catch (err) {
        console.error(err);
    } finally {
        // 2. Hide it when all promises are done
        if (spinner) spinner.classList.add("hidden"); 
    }

        const updates = await Promise.all(promises);

        updates.forEach(({ layer, color }) => {
            layer.setStyle({
                fillColor: color,
                color: color,
                fillOpacity: 0.4
            });
        });
    },

    async handleFeatureClick(e, layer, feature, parent) {
        L.DomEvent.stopPropagation(e);

        if (State.selectedLayer) {
            const prev = State.selectedLayer;
            const { lat, lng } = prev.getBounds().getCenter();
            const h = await fetchRainfallData(lat, lng, State.activeDate);
            const c = getFloodColor(h);
            prev.setStyle({ fillColor: c, color: c, fillOpacity: 0.4 });
        }

        layer.setStyle({ fillOpacity: 0.5, weight: 1 });
        State.selectedLayer = layer;

        const { lat, lng } = layer.getBounds().getCenter();
        const { clientX, clientY } = e.originalEvent;

        UI.show(feature.properties.ADM4_EN, clientX, clientY);

        const vizBtn = document.getElementById("visualize-flood-btn");
        vizBtn.onclick = () => {
            Visualizer.open(lat, lng, State.activeDate);
        };
    }
};

Timeline.subscribe(newDate => {
    State.activeDate = newDate;
    MapManager.updateMapColors();
});
