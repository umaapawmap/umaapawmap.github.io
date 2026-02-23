export const MarkerManager = {
    async addHospitals(map) {
        try {
            const response = await fetch("./data/hospitals.json");
            const hospitals = await response.json();

            const hospitalIcon = L.icon({
                iconUrl: '/assets/images/hospital.png',
                iconSize: [30, 30], 
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });

            hospitals.forEach(h => {
                L.marker([h.lat, h.lng], { icon: hospitalIcon })
                    .addTo(map)
                    .bindPopup(`<strong>${h.name}</strong><br>Healthcare Facility`);
            });
        } catch (err) {
            console.error("Failed to load hospital markers:", err);
        }
    }
};
