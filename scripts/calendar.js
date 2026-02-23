import { Timeline } from "./timeline.js";

const calendarBtn = document.getElementById("calendar-btn");
const calendarInput = document.getElementById("calendar-input");

export const Calendar = {
    init() {
        const today = new Date().toISOString().split("T")[0];
        calendarInput.max = today;
        calendarInput.min = "1940-01-31";

        calendarBtn.addEventListener("click", () => calendarInput.showPicker());

        calendarInput.addEventListener("change", e => {
            const selectedDate = e.target.value;
            if (!selectedDate) return;

            const [y, m, d] = selectedDate.split("-").map(Number);
            const targetDate = new Date(y, m - 1, d);

            this.jump(targetDate);
        });
    },

    jump(date) {
        Timeline.jumpToDate(date, null);
    }
};

Calendar.init();
