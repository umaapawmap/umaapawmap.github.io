const track = document.getElementById("timeline-track");

export const Timeline = {
    subscribers: [],

    init() {
        this.render();
        this.attachListeners();
        this.scrollToToday();
    },

    subscribe(callback) {
        this.subscribers.push(callback);
    },

    render() {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 150);
        
        const end = new Date();
        end.setDate(today.getDate() + 3);

        let html = "";
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const isToday = d.toDateString() === today.toDateString();
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const monthName = d.toLocaleDateString("en-US", { month: "short" });

            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const dateFull = `${y}-${m}-${day}`;

            html += `
            <div class="day-slot ${isToday ? "today" : ""}" data-date="${dateFull}">
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
    }
};

Timeline.init();
