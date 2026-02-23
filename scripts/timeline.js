const track = document.getElementById("timeline-track");

export const Timeline = {
    subscribers: [],
    currentDate: null,
    debounceTimer: null,

    init() {
        this.render();
        this.attachListeners();
        this.scrollToToday();
    },

    subscribe(callback) {
        this.subscribers.push(callback);
    },

    render(targetDate = new Date(), endDate = null) {
        let start, end;
        if (endDate) {
            start = new Date(targetDate);
            end = new Date(endDate);
        } else {
            start = new Date(targetDate);
            start.setDate(targetDate.getDate() - 30);
            end = new Date(targetDate);
            end.setDate(targetDate.getDate() + 3);
        }

        let html = "";
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const isTarget = d.toDateString() === targetDate.toDateString();
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const monthName = d.toLocaleDateString("en-US", { month: "short" });
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const dateFull = `${y}-${m}-${day}`;

            html += `
            <div class="day-slot ${isTarget ? "today" : ""}" data-date="${dateFull}">
                <p>${dayName}</p>
                <span>${d.getDate()}</span>
                <small>${monthName} ${y}</small>
            </div>`;
        }
        track.innerHTML = html;
    },

    attachListeners() {
        track.addEventListener("scroll", () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.handleScroll(), 50);
        });
    },

    handleScroll() {
        const centerX = track.scrollLeft + track.offsetWidth / 2;
        const slots = Array.from(track.querySelectorAll(".day-slot"));
        if (slots.length === 0) return;

        const activeSlot = slots.reduce((prev, curr) => {
            const prevDiff = Math.abs(centerX - (prev.offsetLeft + prev.offsetWidth / 2));
            const currDiff = Math.abs(centerX - (curr.offsetLeft + curr.offsetWidth / 2));
            return currDiff < prevDiff ? curr : prev;
        });

        if (activeSlot && this.currentDate !== activeSlot.dataset.date) {
            this.currentDate = activeSlot.dataset.date;
            const input = document.getElementById("calendar-input");
            if (input) input.value = this.currentDate;
            this.subscribers.forEach(callback => callback(new Date(this.currentDate)));
        }
    },

    scrollToToday() {
        const todaySlot = track.querySelector(".today");
        if (todaySlot) {
            track.scrollTo({
                left: todaySlot.offsetLeft - track.offsetWidth / 2 + todaySlot.offsetWidth / 2,
                behavior: "instant"
            });
        }
    },

    jumpToDate(startDate, endDate = null) {
        this.render(startDate, endDate);
        
        // FIXED: Using local date instead of UTC ISO string
        const targetFullDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        this.currentDate = targetFullDate;

        const targetSlot = track.querySelector(`[data-date="${targetFullDate}"]`);
        if (targetSlot) {
            track.scrollTo({
                left: targetSlot.offsetLeft - (track.offsetWidth / 2) + (targetSlot.offsetWidth / 2),
                behavior: "smooth"
            });
        }
        this.subscribers.forEach(callback => callback(new Date(this.currentDate)));
    }
};
