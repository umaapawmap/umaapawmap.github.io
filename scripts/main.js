import { MapManager } from "./map.js";
import { Timeline } from "./timeline.js";
import { Calendar } from "./calendar.js";
import { MarkerManager } from "./markers.js";
import { TyphoonNav } from "./typhoon.js";

async function bootstrap() {
    try {
        const calendarInput = document.getElementById("calendar-input");

        const [config, data] = await Promise.all([
            fetch("../config/config.json").then(r => r.json()),
            fetch("../data/barangays.geojson").then(r => r.json())
        ]);

        Timeline.init();

        const map = MapManager.create(config);
        MapManager.addBaseLayer(map);
        MarkerManager.addHospitals(map);
        MapManager.addGeoJson(map, data);

        Timeline.subscribe(newDate => {
            if (calendarInput) {
                // FIXED: Using local date instead of UTC ISO string
                const y = newDate.getFullYear();
                const m = String(newDate.getMonth() + 1).padStart(2, '0');
                const d = String(newDate.getDate()).padStart(2, '0');
                calendarInput.value = `${y}-${m}-${d}`;
            }
        });

        TyphoonNav.init();
    } catch (err) {
        console.error("App failed:", err);
    }
}

bootstrap();
