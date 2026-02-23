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

        // 1. Get panel dimensions
        const panelWidth = panel.offsetWidth || 160;
        const panelHeight = panel.offsetHeight || 100;

        // 2. Calculate screen boundaries
        let left = x + 10; // Offset from cursor
        let top = y + 10;

        // Check right edge
        if (left + panelWidth > window.innerWidth) {
            left = x - panelWidth - 10;
        }

        // Check bottom edge
        if (top + panelHeight > window.innerHeight) {
            top = y - panelHeight - 10;
        }

        // 3. Apply safe coordinates
        panel.style.left = `${Math.max(10, left)}px`;
        panel.style.top = `${Math.max(10, top)}px`;
    },

    hide() {
        const panel = document.getElementById("info-panel");
        if (panel) panel.classList.add("hidden");
    }
};
