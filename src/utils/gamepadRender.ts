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
        .gamepad-svg-wrapper {
          position: relative;
          width: 100%;
          max-width: 200px;
          margin: 0 auto;
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 8px;
        }
        .gamepad-axis-readout {
          font-family: monospace;
          font-size: 12px;
          color: #333;
          margin-top: 6px;
          text-align: center;
        }
        .pressed-highlight {
          filter: brightness(1.2) saturate(1.4);
        }

        .gamepad-svg-wrapper svg {
          display: block;
          width: 100%;
          height: auto;
        }
      `;
      document.head.appendChild(style);
    }

    container.innerHTML = ""; // clear old stuff

    const wrapper = document.createElement('div');
    wrapper.className = 'gamepad-svg-wrapper';
    container.appendChild(wrapper);

    const axisReadout = document.createElement('div');
    axisReadout.className = 'gamepad-axis-readout';
    container.appendChild(axisReadout);

    // Load the SVG and insert inline so we can manipulate its elements
    const svgPath = './Switch Pro Controller VSCView.svg';

    let svgRoot: SVGSVGElement | null = null;
    let leftStickGroup: SVGGElement | null = null;
    let rightStickGroup: SVGGElement | null = null;
    let bumperLeft: SVGElement | null = null;
    let bumperRight: SVGElement | null = null;
    let triggerLeft: SVGElement | null = null;
    let triggerRight: SVGElement | null = null;

    // Store original transforms/fills to restore after interactions
    const baseTransforms = new Map<SVGElement, string | null>();
    const baseFills = new Map<SVGElement, string | null>();

    function recordBase(el: SVGElement | null) {
      if (!el) return;
      if (!baseTransforms.has(el)) baseTransforms.set(el, el.getAttribute('transform'));
      if (!baseFills.has(el)) baseFills.set(el, el.getAttribute('fill'));
    }

    function setTranslate(el: SVGElement | null, tx: number, ty: number) {
      if (!el) return;
      const base = baseTransforms.get(el) ?? '';
      // Keep original transform first, then apply our translation
      const cleaned = (base || '').replace(/\s+translate\([^\)]*\)/g, '');
      el.setAttribute('transform', `${cleaned} translate(${tx.toFixed(2)}, ${ty.toFixed(2)})`);
    }

    function setPressed(el: SVGElement | null, pressed: boolean) {
      if (!el) return;
      if (pressed) {
        el.classList.add('pressed-highlight');
      } else {
        el.classList.remove('pressed-highlight');
      }
    }

    fetch(svgPath)
      .then(r => r.text())
      .then(txt => {
        wrapper.innerHTML = txt;
        svgRoot = wrapper.querySelector('svg');
        if (!svgRoot) {
          console.error('Failed to load SVG root.');
          return;
        }
        // Grab groups/elements we know from the SVG by id (from inspected file)
        leftStickGroup = svgRoot.querySelector('#g2489'); // Left Joystick group
        rightStickGroup = svgRoot.querySelector('#g2495'); // Right Joystick group
        bumperLeft = svgRoot.querySelector('#path2365'); // L Bumper
        bumperRight = svgRoot.querySelector('#path5183'); // R Bumper
        triggerLeft = svgRoot.querySelector('#path8519'); // ZL Trigger
        triggerRight = svgRoot.querySelector('#path1458'); // ZR Trigger

        // Record bases
        [leftStickGroup, rightStickGroup, bumperLeft, bumperRight, triggerLeft, triggerRight]
          .forEach(el => recordBase(el as SVGElement | null));
      })
      .catch(err => console.error('Error loading SVG:', err));

    // Poll loop
    function update() {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0]; // first connected gamepad
      if (gp) {
        // Axes: [0,1] left stick; [2,3] right stick in standard mapping
        const lx = gp.axes[0] ?? 0;
        const ly = gp.axes[1] ?? 0;
        const rx = gp.axes[2] ?? 0;
        const ry = gp.axes[3] ?? 0;

        // Maximum pixel offset for visual translation
        const maxOffset = 6; // tune as needed to fit artwork scale
        // In SVG Y+ goes down; invert ly/ry for natural feel
        setTranslate(leftStickGroup, lx * maxOffset, (ly * maxOffset));
        setTranslate(rightStickGroup, rx * maxOffset, (ry * maxOffset));

        // Buttons (standard mapping)
        // 4: LB, 5: RB, 6: LT, 7: RT
        setPressed(bumperLeft, !!gp.buttons[4]?.pressed);
        setPressed(bumperRight, !!gp.buttons[5]?.pressed);
        setPressed(triggerLeft, !!gp.buttons[6]?.pressed);
        setPressed(triggerRight, !!gp.buttons[7]?.pressed);

        // Readout
        axisReadout.innerText = `LX: ${lx.toFixed(2)}  LY: ${ly.toFixed(2)}  |  RX: ${rx.toFixed(2)}  RY: ${ry.toFixed(2)}`;
      }
      setTimeout(update, pollInterval);
    }
    update();
  }