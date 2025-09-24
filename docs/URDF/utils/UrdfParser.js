"use strict";
// create interface‐instances of the model based on XML‐URDF file.
// These interfaces are closer to the Three.js structure so it's easy to visualize.
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrdfParser = void 0;
exports.getRootLinks = getRootLinks;
exports.getRootJoints = getRootJoints;
exports.getChildJoints = getChildJoints;
exports.updateOrigin = updateOrigin;
const helper_1 = require("./helper");
/**
 * Find all "root" links of a robot. A link is considered a root if
 * no joint in the robot references it as a "child". In other words,
 * it has no parent joint.
 *
 * @param robot - The parsed IUrdfRobot object whose links and joints we examine
 * @returns An array of IUrdfLink objects that have no parent joint (i.e. root links)
 */
function getRootLinks(robot) {
    // Compute the links
    const links = [];
    const joints = robot.joints;
    for (const link of Object.values(robot.links)) {
        let isRoot = true;
        for (const joint of joints) {
            if (joint.child.name === link.name) {
                isRoot = false;
                break;
            }
        }
        if (isRoot) {
            links.push(link);
        }
    }
    return links;
}
/**
 * Find all "root" joints of a robot. A joint is considered a root if
 * its parent link is never used as a "child link" anywhere else.
 *
 * For example, if Joint A's parent is "Base" and no other joint has
 * child="Base", then Joint A is a root joint.
 *
 * @param robot - The parsed IUrdfRobot object
 * @returns An array of IUrdfJoint objects with no parent joint (i.e. root joints)
 */
function getRootJoints(robot) {
    const joints = robot.joints;
    const rootJoints = [];
    for (const joint of joints) {
        let isRoot = true;
        // If any other joint's child matches this joint's parent, then this joint isn't root
        for (const parentJoint of joints) {
            if (joint.parent.name === parentJoint.child.name) {
                isRoot = false;
                break;
            }
        }
        if (isRoot) {
            rootJoints.push(joint);
        }
    }
    return rootJoints;
}
/**
 * Given a parent link, find all joints in the robot that use that link as their parent.
 *
 * @param robot  - The parsed IUrdfRobot object
 * @param parent - An IUrdfLink object to use as the "parent" in comparison
 * @returns A list of IUrdfJoint objects whose parent.name matches parent.name
 */
function getChildJoints(robot, parent) {
    const childJoints = [];
    const joints = robot.joints;
    if (!joints) {
        return [];
    }
    for (const joint of joints) {
        if (joint.parent.name === parent.name) {
            childJoints.push(joint);
        }
    }
    return childJoints;
}
/**
 * Update the <origin> element's attributes (xyz and rpy) in the XML
 * for either a joint or a visual element, based on the object's current origin_xyz/origin_rpy.
 *
 * @param posable - Either an IUrdfJoint or an IUrdfVisual whose `.elem` has an <origin> child
 */
function updateOrigin(posable) {
    const origin = posable.elem.getElementsByTagName("origin")[0];
    origin.setAttribute("xyz", posable.origin_xyz.join(" "));
    origin.setAttribute("rpy", posable.origin_rpy.join(" "));
}
/**
 * Main URDF parser class. Given a URDF filename (or XML string), it will:
 *  1) Fetch the URDF text (if given a URL/filename)
 *  2) Parse materials/colors
 *  3) Parse links (including visual & collision)
 *  4) Parse joints
 *  5) Build an IUrdfRobot data structure that is easier to traverse in JS/Three.js
 */
class UrdfParser {
    /**
     * @param filename - Path or URL to the URDF file (XML). May be relative.
     * @param prefix   - A folder prefix used when resolving "package://" or relative mesh paths.
     */
    constructor(filename, prefix = "") {
        this.colors = {};
        this.robot = { name: "", links: {}, joints: [] };
        this.filename = filename;
        // Ensure prefix ends with exactly one slash
        this.prefix = prefix.endsWith("/") ? prefix : prefix + "/";
    }
    /**
     * Fetch the URDF file from `this.filename` and return its text.
     * @returns A promise that resolves to the raw URDF XML string.
     */
    async load() {
        return fetch(this.filename).then((res) => res.text());
    }
    /**
     * Clear any previously parsed robot data, preparing for a fresh parse.
     */
    reset() {
        this.robot = { name: "", links: {}, joints: [] };
    }
    /**
     * Parse a URDF XML string and produce an IUrdfRobot object.
     *
     * @param data - A string containing valid URDF XML.
     * @returns The fully populated IUrdfRobot, including colors, links, and joints.
     * @throws If the root element is not <robot>.
     */
    fromString(data) {
        this.reset();
        const dom = new window.DOMParser().parseFromString(data, "text/xml");
        this.robot.elem = dom.documentElement;
        return this.parseRobotXMLNode(dom.documentElement);
    }
    /**
     * Internal helper: ensure the root node is <robot>, then parse its children.
     *
     * @param robotNode - The <robot> Element from the DOMParser.
     * @returns The populated IUrdfRobot data structure.
     * @throws If robotNode.nodeName !== "robot"
     */
    parseRobotXMLNode(robotNode) {
        if (robotNode.nodeName !== "robot") {
            throw new Error(`Invalid URDF: no <robot> (found <${robotNode.nodeName}>)`);
        }
        this.robot.name = robotNode.getAttribute("name") || "";
        this.parseColorsFromRobot(robotNode);
        this.parseLinks(robotNode);
        this.parseJoints(robotNode);
        return this.robot;
    }
    /**
     * Look at all <material> tags under <robot> and store their names → RGBA values.
     *
     * @param robotNode - The <robot> Element.
     */
    parseColorsFromRobot(robotNode) {
        const xmlMaterials = robotNode.getElementsByTagName("material");
        for (let i = 0; i < xmlMaterials.length; i++) {
            const matNode = xmlMaterials[i];
            if (!matNode.hasAttribute("name")) {
                console.warn("Found <material> with no name attribute");
                continue;
            }
            const name = matNode.getAttribute("name");
            const colorTags = matNode.getElementsByTagName("color");
            if (colorTags.length === 0)
                continue;
            const colorElem = colorTags[0];
            if (!colorElem.hasAttribute("rgba"))
                continue;
            // e.g. "0.06 0.4 0.1 1.0"
            const rgba = (0, helper_1.rgbaFromString)(colorElem) || [0, 0, 0, 1];
            this.colors[name] = rgba;
        }
    }
    /**
     * Parse every <link> under <robot> and build an IUrdfLink entry containing:
     *  - name
     *  - arrays of IUrdfVisual for <visual> tags
     *  - arrays of IUrdfVisual for <collision> tags
     *  - a pointer to its original XML Element (elem)
     *
     * @param robotNode - The <robot> Element.
     */
    parseLinks(robotNode) {
        const xmlLinks = robotNode.getElementsByTagName("link");
        for (let i = 0; i < xmlLinks.length; i++) {
            const linkXml = xmlLinks[i];
            if (!linkXml.hasAttribute("name")) {
                console.error("Link without a name:", linkXml);
                continue;
            }
            const linkName = linkXml.getAttribute("name");
            const linkObj = {
                name: linkName,
                visual: [],
                collision: [],
                elem: linkXml
            };
            this.robot.links[linkName] = linkObj;
            // Parse all <visual> children
            const visualXmls = linkXml.getElementsByTagName("visual");
            for (let j = 0; j < visualXmls.length; j++) {
                linkObj.visual.push(this.parseVisual(visualXmls[j]));
            }
            // Parse all <collision> children (reuse parseVisual; color is ignored later)
            const collXmls = linkXml.getElementsByTagName("collision");
            for (let j = 0; j < collXmls.length; j++) {
                linkObj.collision.push(this.parseVisual(collXmls[j]));
            }
        }
    }
    /**
     * Parse a <visual> or <collision> element into an IUrdfVisual. Reads:
     *  - <geometry> (calls parseGeometry to extract mesh, cylinder, box, etc.)
     *  - <origin> (xyz, rpy)
     *  - <material> (either embedded <color> or named reference)
     *
     * @param node - The <visual> or <collision> Element.
     * @returns A fully populated IUrdfVisual object.
     */
    parseVisual(node) {
        const visual = { elem: node };
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            // Skip non-element nodes (like text nodes containing whitespace)
            if (child.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }
            const childElement = child;
            switch (childElement.nodeName) {
                case "geometry": {
                    this.parseGeometry(childElement, visual);
                    break;
                }
                case "origin": {
                    const pos = (0, helper_1.xyzFromString)(childElement);
                    const rpy = (0, helper_1.rpyFromString)(childElement);
                    if (pos)
                        visual.origin_xyz = pos;
                    if (rpy)
                        visual.origin_rpy = rpy;
                    break;
                }
                case "material": {
                    const cols = childElement.getElementsByTagName("color");
                    if (cols.length > 0 && cols[0].hasAttribute("rgba")) {
                        // Inline color specification
                        visual.color_rgba = (0, helper_1.rgbaFromString)(cols[0]);
                    }
                    else if (childElement.hasAttribute("name")) {
                        // Named material → look up previously parsed RGBA
                        const nm = childElement.getAttribute("name");
                        visual.color_rgba = this.colors[nm];
                    }
                    break;
                }
                default: {
                    console.warn("Unknown child node:", childElement.nodeName);
                    break;
                }
            }
        }
        return visual;
    }
    /**
     * Parse a <geometry> element inside <visual> or <collision>.
     * Currently only supports <mesh>. If you need <cylinder> or <box>,
     * you can extend this function similarly.
     *
     * @param node    - The <geometry> Element.
     * @param visual  - A partial IUrdfVisual object to populate
     */
    parseGeometry(node, visual) {
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            // Skip non-element nodes (like text nodes containing whitespace)
            if (child.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }
            const childElement = child;
            if (childElement.nodeName === "mesh") {
                const rawFilename = childElement.getAttribute("filename");
                if (!rawFilename) {
                    console.warn("<mesh> missing filename!");
                    return;
                }
                // 1) Resolve the URL (handles "package://" or relative paths)
                const resolvedUrl = this.resolveFilename(rawFilename);
                // 2) Parse optional scale (e.g. "1 1 1")
                let scale = [1, 1, 1];
                if (childElement.hasAttribute("scale")) {
                    const parts = childElement.getAttribute("scale").split(" ").map(parseFloat);
                    if (parts.length === 3) {
                        scale = [parts[0], parts[1], parts[2]];
                    }
                }
                // 3) Deduce mesh type from file extension
                const ext = resolvedUrl.slice(resolvedUrl.lastIndexOf(".") + 1).toLowerCase();
                let type;
                switch (ext) {
                    case "stl":
                        type = "stl";
                        break;
                    case "fbx":
                        type = "fbx";
                        break;
                    case "obj":
                        type = "obj";
                        break;
                    case "dae":
                        type = "dae";
                        break;
                    default:
                        throw new Error("Unknown mesh extension: " + ext);
                }
                visual.geometry = { filename: resolvedUrl, type, scale };
                visual.type = "mesh";
                return;
            }
            // If you also want <cylinder> or <box>, copy your previous logic here:
            // e.g. if (childElement.nodeName === "cylinder") { … }
        }
    }
    /**
     * Transform a URI‐like string into an actual URL. Handles:
     *  1) http(s):// or data: → leave unchanged
     *  2) package://some_package/... → replace with prefix + "some_package/...
     *  3) package:/some_package/... → same as above
     *  4) Anything else (e.g. "meshes/Foo.stl") is treated as relative.
     *
     * @param raw - The raw filename from URDF (e.g. "meshes/Base.stl" or "package://my_pkg/mesh.dae")
     * @returns The fully resolved URL string
     */
    resolveFilename(raw) {
        // 1) absolute http(s) or data URIs
        if (/^https?:\/\//.test(raw) || raw.startsWith("data:")) {
            return raw;
        }
        // 2) package://some_package/…
        if (raw.startsWith("package://")) {
            const rel = raw.substring("package://".length);
            return this.joinUrl(this.prefix, rel);
        }
        // 3) package:/some_package/…
        if (raw.startsWith("package:/")) {
            const rel = raw.substring("package:/".length);
            return this.joinUrl(this.prefix, rel);
        }
        // 4) anything else (e.g. "meshes/Foo.stl") is treated as relative
        return this.joinUrl(this.prefix, raw);
    }
    /**
     * Helper to join a base URL with a relative path, ensuring exactly one '/' in between
     *
     * @param base - e.g. "/robots/so_arm100/"
     * @param rel  - e.g. "meshes/Base.stl" (with or without a leading slash)
     * @returns A string like "/robots/so_arm100/meshes/Base.stl"
     */
    joinUrl(base, rel) {
        if (!base.startsWith("/"))
            base = "/" + base;
        if (!base.endsWith("/"))
            base = base + "/";
        if (rel.startsWith("/"))
            rel = rel.substring(1);
        return base + rel;
    }
    /**
     * Parse every <joint> under <robot> and build an IUrdfJoint entry. For each joint:
     *  1) parent link (lookup in `this.robot.links[parentName]`)
     *  2) child link  (lookup in `this.robot.links[childName]`)
     *  3) origin: xyz + rpy
     *  4) axis (default [0,0,1] if absent)
     *  5) limit (if present, lower/upper/effort/velocity)
     *
     * @param robotNode - The <robot> Element.
     * @throws If a joint references a link name that doesn't exist.
     */
    parseJoints(robotNode) {
        const links = this.robot.links;
        const joints = [];
        this.robot.joints = joints;
        const xmlJoints = robotNode.getElementsByTagName("joint");
        for (let i = 0; i < xmlJoints.length; i++) {
            const jointXml = xmlJoints[i];
            const parentElems = jointXml.getElementsByTagName("parent");
            const childElems = jointXml.getElementsByTagName("child");
            if (parentElems.length !== 1 || childElems.length !== 1) {
                console.warn("Joint without exactly one <parent> or <child>:", jointXml);
                continue;
            }
            const parentName = parentElems[0].getAttribute("link");
            const childName = childElems[0].getAttribute("link");
            const parentLink = links[parentName];
            const childLink = links[childName];
            if (!parentLink || !childLink) {
                throw new Error(`Joint references missing link: ${parentName} or ${childName}`);
            }
            // Default origin and rpy
            let xyz = [0, 0, 0];
            let rpy = [0, 0, 0];
            const originTags = jointXml.getElementsByTagName("origin");
            if (originTags.length === 1) {
                xyz = (0, helper_1.xyzFromString)(originTags[0]) || xyz;
                rpy = (0, helper_1.rpyFromString)(originTags[0]) || rpy;
            }
            // Default axis
            let axis = [0, 0, 1];
            const axisTags = jointXml.getElementsByTagName("axis");
            if (axisTags.length === 1) {
                axis = (0, helper_1.xyzFromString)(axisTags[0]) || axis;
            }
            // Optional limit
            let limit;
            const limitTags = jointXml.getElementsByTagName("limit");
            if (limitTags.length === 1) {
                const lim = limitTags[0];
                limit = {
                    lower: parseFloat(lim.getAttribute("lower") || "0"),
                    upper: parseFloat(lim.getAttribute("upper") || "0"),
                    effort: parseFloat(lim.getAttribute("effort") || "0"),
                    velocity: parseFloat(lim.getAttribute("velocity") || "0")
                };
            }
            joints.push({
                name: jointXml.getAttribute("name") || undefined,
                type: jointXml.getAttribute("type"),
                origin_xyz: xyz,
                origin_rpy: rpy,
                axis_xyz: axis,
                rotation: [0, 0, 0],
                parent: parentLink,
                child: childLink,
                limit: limit,
                elem: jointXml
            });
        }
    }
    /**
     * If you ever want to re‐serialize the robot back to URDF XML,
     * this method returns the stringified root <robot> element.
     *
     * @returns A string beginning with '<?xml version="1.0" ?>' followed by the current XML.
     */
    getURDFXML() {
        return this.robot.elem ? '<?xml version="1.0" ?>\n' + this.robot.elem.outerHTML : "";
    }
}
exports.UrdfParser = UrdfParser;
/**
 * ==============================================================================
 * Example of how the parsed data (IUrdfRobot) maps from the URDF XML ("so_arm100"):
 *
 * {
 *   // The <robot> name attribute
 *   name: "so_arm100",
 *
 *   // Materials/colors parsed from <material> tags
 *   colors: {
 *     "green": [0.06, 0.4, 0.1, 1.0],
 *     "black": [0.1, 0.1, 0.1, 1.0]
 *   },
 *
 *   // Each <link> under <robot> becomes an entry in `links`
 *   links: {
 *     "Base": {
 *       name: "Base",
 *
 *       // Array of visuals: each <visual> inside <link name="Base">
 *       visual: [
 *         {
 *           elem:  // the <visual> Element object for Base,
 *           type: "mesh",
 *           geometry: {
 *             filename: "/robots/so_arm100/meshes/Base.stl",
 *             type: "stl",
 *             scale: [1, 1, 1]
 *           },
 *           origin_xyz: [0, 0, 0],       // default since no <origin> in visual
 *           origin_rpy: [0, 0, 0],       // default since no <origin> in visual
 *           color_rgba: [0.06, 0.4, 0.1, 1.0]  // matches <material name="green">
 *         },
 *         {
 *           elem:  // the second <visual> Element for Base,
 *           type: "mesh",
 *           geometry: {
 *             filename: "/robots/so_arm100/meshes/Base_Motor.stl",
 *             type: "stl",
 *             scale: [1, 1, 1]
 *           },
 *           origin_xyz: [0, 0, 0],
 *           origin_rpy: [0, 0, 0],
 *           color_rgba: [0.1, 0.1, 0.1, 1.0]  // matches <material name="black">
 *         }
 *       ],
 *
 *       // Array of collisions: each <collision> inside <link name="Base">
 *       collision: [
 *         {
 *           elem:  // the <collision> Element for Base,
 *           type: "mesh",
 *           geometry: {
 *             filename: "/robots/so_arm100/meshes/Base.stl",
 *             type: "stl",
 *             scale: [1, 1, 1]
 *           },
 *           origin_xyz: [0, 0, 0],
 *           origin_rpy: [0, 0, 0]
 *           // no color for collisions
 *         }
 *       ]
 *     },
 *
 *     // ... other links (e.g. "Rotation_Pitch", "Upper_Arm", etc.) follow the same structure
 *   },
 *
 *   // Each <joint> under <robot> becomes an entry in `joints` array
 *   joints: [
 *     {
 *       name: "Rotation",
 *       type: "revolute",
 *       origin_xyz: [0, -0.0452, 0.0165],
 *       origin_rpy: [1.57079, 0, 0],
 *       axis_xyz: [0, -1, 0],
 *       rotation: [0, 0, 0],          // runtime placeholder
 *       parent:   // reference to links["Base"],
 *       child:    // reference to links["Rotation_Pitch"],
 *       limit: {
 *         lower: -2,
 *         upper: 2,
 *         effort: 35,
 *         velocity: 1
 *       },
 *       elem: // the <joint name="Rotation"> Element object
 *     },
 *
 *     {
 *       name: "Pitch",
 *       type: "revolute",
 *       origin_xyz: [0, 0.1025, 0.0306],
 *       origin_rpy: [-1.8, 0, 0],
 *       axis_xyz: [1, 0, 0],
 *       rotation: [0, 0, 0],
 *       parent: // reference to links["Rotation_Pitch"],
 *       child:  // reference to links["Upper_Arm"],
 *       limit: {
 *         lower: 0,
 *         upper: 3.5,
 *         effort: 35,
 *         velocity: 1
 *       },
 *       elem: // the <joint name="Pitch"> Element object
 *     },
 *
 *     // ... additional joints ("Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw") follow similarly
 *   ]
 * }
 *
 * ==============================================================================
 */
