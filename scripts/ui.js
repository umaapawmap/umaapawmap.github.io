const menuBtn = document.getElementById("menu-toggle");
const drawer = document.getElementById("drawer");

menuBtn.addEventListener("click", () => {
    drawer.classList.toggle("open");
});

export const UI = {
    panel: document.getElementById("info-panel"),
    title: document.getElementById("info-title"),

    show(name, x, y) {
        this.title.innerText = name;
        this.panel.classList.remove("hidden");
        this.panel.style.left = `${x + 10}px`;
        this.panel.style.top = `${y + 10}px`;
    },

    hide() {
        this.panel.classList.add("hidden");
    }
};