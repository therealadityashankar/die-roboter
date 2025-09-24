"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urdfState = exports.URDF_COLORS = void 0;
// Color constants for better maintainability
exports.URDF_COLORS = {
    COLLISION: "#813d9c", // purple
    JOINT: "#62a0ea", // blue
    LINK: "#57e389", // green
    JOINT_INDICATOR: "#f66151", // red
    HIGHLIGHT: "#ffa348", // orange
    BACKGROUND: "#241f31" // dark purple
};
// Create the reactive state
exports.urdfState = $state({
    // Robot data
    robot: undefined,
    jointStates: {
        continuous: {},
        revolute: {}
    },
    // Visibility settings
    visibility: {
        visual: true,
        collision: false,
        joints: true,
        jointNames: true,
        linkNames: true
    },
    // Appearance settings
    appearance: {
        colors: {
            collision: exports.URDF_COLORS.COLLISION,
            joint: exports.URDF_COLORS.JOINT,
            link: exports.URDF_COLORS.LINK,
            jointIndicator: exports.URDF_COLORS.JOINT_INDICATOR,
            background: exports.URDF_COLORS.BACKGROUND
        },
        opacity: {
            visual: 1.0,
            collision: 0.7,
            link: 1.0
        }
    },
    // Editor configuration
    editor: {
        isEditMode: false,
        currentTool: "translate",
        snap: {
            translation: 0.001,
            scale: 0.001,
            rotation: 1
        }
    },
    // View configuration
    view: {
        zoom: {
            current: 1.3,
            initial: 1.3
        },
        nameHeight: 0.05
    }
});
