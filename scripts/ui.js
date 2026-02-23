const menuBtn = document.getElementById("menu-toggle");
const drawer = document.getElementById("drawer");

menuBtn.addEventListener("click", () => {
    drawer.classList.toggle("open");
});

export const UI = {
    show(title, x, y) {
        const panel = document.getElementById("info-panel");
        const titleEl = document.getElementById("info-title");

        if (!panel || !titleEl) return;

        titleEl.innerText = title;
        panel.classList.remove("hidden");

        const panelWidth = panel.offsetWidth || 160;
        const panelHeight = panel.offsetHeight || 100;

        let left = x + 10;
        let top = y + 10;

        if (left + panelWidth > window.innerWidth) {
            left = x - panelWidth - 10;
        }

        if (top + panelHeight > window.innerHeight) {
            top = y - panelHeight - 10;
        }

        panel.style.left = `${Math.max(10, left)}px`;
        panel.style.top = `${Math.max(10, top)}px`;
    },

    hide() {
        const panel = document.getElementById("info-panel");
        if (panel) panel.classList.add("hidden");
    }
};

document.getElementById("legend-toggle").addEventListener("click", function () {
    const legend = document.getElementById("map-legend");
    const isCollapsed = legend.classList.toggle("collapsed");
    this.innerText = isCollapsed ? "i" : "×";
});
