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

        if (!data?.daily?.precipitation_sum || data.daily.precipitation_sum.length === 0) return 0;

        const rainfall = data.daily.precipitation_sum[0];
        const floodHeight = calculateFloodHeight(rainfall || 0);
        console.log(`${date.getDate()} ${rainfall}`)
        cache.set(cacheKey, floodHeight);
        return floodHeight;
    } catch (error) {
        console.error(error);
        return 0;
    }
}
