import { fetchRainfallData } from "./api.js";

const visWindow = document.getElementById('flood-visualizer');
const waterFill = document.getElementById('water-fill');
const heightVal = document.getElementById('height-val');
const exitBtn = document.getElementById('exit-visualizer');

export const Visualizer = {
    init() {
        if (exitBtn) {
            exitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                visWindow.classList.add('hidden');
                this.resetWater();
            });
        }
    },

    async open(lat, lng, date) {
        this.resetWater();
        visWindow.classList.remove('hidden');

        const height = await fetchRainfallData(lat, lng, date);
        
        setTimeout(() => {
            waterFill.style.transition = 'height 1.2s ease-out';
            this.syncWater(height);
        }, 50);
    },

    syncWater(m) {
        const lines = document.querySelectorAll('.ruler-line');
        const container = document.querySelector('.ruler-container');
        
        if (!waterFill || lines.length < 4) return;

        const topLine = lines[0];
        const bottomLine = lines[3];
        const totalTravel = bottomLine.offsetTop - topLine.offsetTop;
        const pxPerMeter = totalTravel / 3;

        waterFill.style.height = (m * pxPerMeter) + 'px';
        waterFill.style.bottom = (container.offsetHeight - bottomLine.offsetTop) + 'px';
        heightVal.innerText = parseFloat(m).toFixed(1);
    },

    resetWater() {
        waterFill.style.transition = 'none';
        waterFill.style.height = '0px';
        heightVal.innerText = "0.0";
    }
};

Visualizer.init();
