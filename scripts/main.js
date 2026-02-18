import { MapManager } from "./map.js";
import { Timeline } from "./timeline.js";
import { Calendar } from "./calendar.js";
import { MarkerManager } from "./markers.js";

async function bootstrap() {
    try {
        const calendarInput = document.getElementById("calendar-input");

        const [config, data] = await Promise.all([
            fetch("../config/config.json").then(r => r.json()),
            fetch("../data/barangays.geojson").then(r => r.json())
        ]);

        const map = MapManager.create(config);
        MapManager.addBaseLayer(map);
        MarkerManager.addHospitals(map);
        MapManager.addGeoJson(map, data);

        Timeline.subscribe(newDate => {
            if (calendarInput) {
                calendarInput.value = newDate.toISOString().split("T")[0];
            }
        });
    } catch (err) {
        console.error("App failed:", err);
    }
}

bootstrap();
