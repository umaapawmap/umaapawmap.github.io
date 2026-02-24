const cache = new Map();

export function getFloodColor(height) {
    if (height < 0.1) return "#2ecc71";
    if (height <= 0.5) return "#f1c40f";
    if (height <= 1.5) return "#e67e22";
    return "#e74c3c";
}

export function calculateFloodHeight(precipitation, barangayName, floodConfig) {
    if (precipitation <= 0) return 0;
    
    const config = floodConfig[barangayName] || { 
        runoffCoefficient: 0.6, 
        drainageFactor: 0.5 
    };

    const effectiveRain = precipitation * config.runoffCoefficient;
    const height = (effectiveRain / 10) * (1 - config.drainageFactor);
    
    return Math.min(height, 5).toFixed(1);
}

export async function getFloodData(lat, lng, date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const cacheKey = `${lat}-${lng}-${dateStr}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    const isHistorical = checkDate < twoDaysAgo;
    
    const baseUrl = isHistorical 
        ? "https://archive-api.open-meteo.com/v1/archive" 
        : "https://api.open-meteo.com/v1/forecast";

    const url = `${baseUrl}?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&timezone=Asia%2FSingapore&start_date=${dateStr}&end_date=${dateStr}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const rain = data?.daily?.precipitation_sum?.[0] || 0;
        cache.set(cacheKey, rain);
        return rain;
    } catch (err) {
        return 0;
    }
}
