import {
    GamepadApiWrapper,
    GamepadEmulator,
    GamepadDisplay,
    CenterTransformOrigin, CenterTransformOriginDebug, // utilities
    gamepadButtonType, gamepadDirection, gamepadEmulationState, // enums
  } from "virtual-gamepad-lib";
  
export function showGamepad(containerOrId: string | HTMLElement, pollInterval: number = 60) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;
    if (!container) {
      console.error("Container not found:", containerOrId);
      return;
    }

    // Inject CSS only once
    if (!document.getElementById("gamepad-style")) {
      const style = document.createElement("style");
      style.id = "gamepad-style";
      style.textContent = `
        .gamepad-button {
          display: inline-block;
          width: 30px;
          height: 30px;
          margin: 5px;
          border: 1px solid #444;
          border-radius: 5px;
          text-align: center;
          line-height: 30px;
          background: #eee;
          font-family: sans-serif;
          font-size: 14px;
          transition: background 0.1s;
        }
        .gamepad-axis {
          margin: 5px;
          font-family: monospace;
        }
      `;
      document.head.appendChild(style);
    }

    container.innerHTML = ""; // clear old stuff

    // Create button indicators
    const buttons: HTMLDivElement[] = [];
    for (let i = 0; i < 16; i++) {
      const btn = document.createElement("div");
      btn.className = "gamepad-button";
      btn.innerText = i.toString();
      container.appendChild(btn);
      buttons.push(btn);
    }

    // Create axis indicators
    const axes: HTMLDivElement[] = [];
    for (let i = 0; i < 4; i++) {
      const axis = document.createElement("div");
      axis.className = "gamepad-axis";
      axis.innerText = `Axis ${i}: 0`;
      container.appendChild(axis);
      axes.push(axis);
    }

    // Poll loop
    function update() {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0]; // first connected gamepad
      if (gp) {
        gp.buttons.forEach((b, i) => {
          if (buttons[i]) {
            buttons[i].style.backgroundColor = b.pressed ? "red" : "#eee";
          }
        });

        gp.axes.forEach((a, i) => {
          if (axes[i]) {
            axes[i].innerText = `Axis ${i}: ${a.toFixed(2)}`;
          }
        });
      }
      setTimeout(update, pollInterval);
    }
    update();
  }