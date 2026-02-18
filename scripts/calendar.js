import { Timeline } from "./timeline.js";

const calendarBtn = document.getElementById("calendar-btn");
const calendarInput = document.getElementById("calendar-input");

export const Calendar = {
    init() {
        calendarBtn.addEventListener("click", () => calendarInput.showPicker());
        
        calendarInput.addEventListener("change", (e) => {
            const selectedDate = e.target.value;
            this.syncTimeline(selectedDate);
        });
    },

    syncTimeline(dateString) {
        const track = document.getElementById("timeline-track");
        const targetSlot = track.querySelector(`[data-date="${dateString}"]`);

        if (targetSlot) {
            track.scrollTo({
                left: targetSlot.offsetLeft - (track.offsetWidth / 2) + (targetSlot.offsetWidth / 2),
                behavior: "smooth"
            });
        }
    }
};

Calendar.init();
