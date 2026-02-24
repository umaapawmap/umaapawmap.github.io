import { Timeline } from "./timeline.js";

export const TyphoonNav = {
    async init() {
        console.log("TyphoonNav: Initializing...");

        const link = document.getElementById("view-typhoons-link");
        const selector = document.getElementById("typhoon-selector");
        const yearSelect = document.getElementById("year-select");
        const typhoonList = document.getElementById("typhoon-list");

        if (!link || !selector || !yearSelect || !typhoonList) {
            console.error(
                "TyphoonNav Error: One or more HTML elements missing!",
                {
                    link: !!link,
                    selector: !!selector,
                    yearSelect: !!yearSelect,
                    typhoonList: !!typhoonList
                }
            );
            return;
        }

        try {
            const response = await fetch("./data/typhoons.json");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            link.addEventListener("click", e => {
                e.preventDefault();
                selector.classList.toggle("hidden");
            });

            const years = Object.keys(data).sort((a, b) => b - a);

            years.forEach(year => {
                const opt = document.createElement("option");
                opt.value = year;
                opt.textContent = year;
                yearSelect.appendChild(opt);
            });

            yearSelect.addEventListener("change", e => {
                const year = e.target.value;
                typhoonList.innerHTML = "";

                if (data[year]) {
                    data[year].forEach(t => {
                        const li = document.createElement("li");
                        li.innerHTML = `<button class="typhoon-btn">${t.display}</button>`;
                        li.onclick = () => {
                            const [sY, sM, sD] = t.start;
                            const [eY, eM, eD] = t.end;

                            const startDate = new Date(sY, sM - 1, sD);
                            const endDate = new Date(eY, eM - 1, eD);

                            Timeline.jumpToDate(startDate, endDate);
                        };

                        typhoonList.appendChild(li);
                    });
                }
            });

        } catch (error) {
            return
        }
    }
};
