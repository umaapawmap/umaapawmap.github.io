const cache = new Map();

export function getFloodColor(height) {
    if (height < 0.1) return "#2ecc71";
    if (height <= 0.5) return "#f1c40f";
    if (height <= 1.5) return "#e67e22";
    return "#e74c3c";
}

export function calculateFloodHeight(precipitation) {
    if (precipitation <= 0) return 0;
    const height = precipitation * 0.05;
    return Math.min(height, 5).toFixed(1);
}

export async function fetchRainfallData(lat, lng, date) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${lat}-${lng}-${dateStr}`;

    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    const isHistorical = date < twoDaysAgo;
    
    const baseUrl = isHistorical 
        ? "https://archive-api.open-meteo.com/v1/archive" 
        : "https://api.open-meteo.com/v1/forecast";

    const params = isHistorical
        ? `&start_date=${dateStr}&end_date=${dateStr}`
        : `&past_days=2&forecast_days=3`;

    const url = `${baseUrl}?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&timezone=Asia%2FSingapore${params}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data?.daily?.precipitation_sum) return 0;

        const rainfall = isHistorical 
            ? data.daily.precipitation_sum[0] 
            : data.daily.precipitation_sum[data.daily.time.indexOf(dateStr)];

        const floodHeight = calculateFloodHeight(rainfall || 0);
        cache.set(cacheKey, floodHeight);
        return floodHeight;
    } catch (error) {
        console.error(error);
        return 0;
    }
}
