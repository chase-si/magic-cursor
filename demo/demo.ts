import { createEffect, type Destroyable, type EffectName } from "magic-cursor";

const stage = document.getElementById("stage") as HTMLElement;
const toolbar = document.getElementById("toolbar") as HTMLElement;
const hint = document.getElementById("hint") as HTMLElement;
const magneticRow = document.getElementById("magneticRow") as HTMLElement;

const effects: { id: EffectName; label: string }[] = [
  { id: "spotlight", label: "聚光灯" },
  { id: "trail", label: "拖尾" },
  { id: "magnetic", label: "磁吸" },
  { id: "ring", label: "圆环" },
];

let current: Destroyable | null = null;
let activeId: EffectName = "spotlight";

function destroyCurrent() {
  current?.destroy();
  current = null;
}

function applyUiForEffect(name: EffectName) {
  magneticRow.hidden = name !== "magnetic";
  hint.hidden = name === "magnetic";
}

function start(name: EffectName) {
  destroyCurrent();
  activeId = name;
  applyUiForEffect(name);

  switch (name) {
    case "spotlight":
      current = createEffect("spotlight", stage, {
        radius: 130,
        dimColor: "rgba(2, 6, 23, 0.88)",
      });
      break;
    case "trail":
      current = createEffect("trail", stage, {
        color: "rgba(129, 140, 248, 0.75)",
        maxDots: 28,
        size: 7,
      });
      break;
    case "magnetic":
      current = createEffect("magnetic", stage, {
        strength: 0.4,
        selector: "[data-magnetic]",
      });
      break;
    case "ring":
      current = createEffect("ring", stage, {
        size: 40,
        color: "rgba(165, 180, 252, 0.95)",
        borderWidth: 2,
        smoothing: 0.22,
      });
      break;
  }

  for (const btn of toolbar.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.effect === name);
  }
}

for (const { id, label } of effects) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.dataset.effect = id;
  btn.addEventListener("click", () => start(id));
  toolbar.appendChild(btn);
}

start(activeId);
