import { Diagram, DiagramType, DiagramStyle, TextData, Path } from "./diagram.js";
import { tab_color, get_color } from "./color_palette.js";

// TODO : add guard for the dictionary key
// since the implementation is using `for (let stylename in style)` without checking
// if the correct key is in the dictionary, it can lead to unintended behavior
// for example, `font-size` could be defined in default_text_diagram_style
// and will shadow the `font-size` in default_diagram_style

export const default_diagram_style : DiagramStyle = {
    "fill"             : "none",
    "stroke"           : "black",
    "stroke-width"     : "1",
    "stroke-linecap"   : "butt",
    "stroke-dasharray" : "none",
    "stroke-linejoin"  : "round",
    "vector-effect"    : "non-scaling-stroke",
}
export const _init_default_diagram_style : DiagramStyle = {...default_diagram_style}

export const default_text_diagram_style : DiagramStyle = {
    "fill"             : "black",
    "stroke"           : "none",
    "stroke-width"     : "1",
    "stroke-linecap"   : "butt",
    "stroke-dasharray" : "none",
    "stroke-linejoin"  : "round",
    "vector-effect"    : "non-scaling-stroke",
}
export const _init_default_text_diagram_style : DiagramStyle = {...default_text_diagram_style}

export const default_textdata : TextData = {
    "text"             : "",
    "font-family"      : "Latin Modern Math, sans-serif",
    "font-size"        : "18",
    "font-weight"      : "normal",
    "text-anchor"      : "middle",
    "dominant-baseline": "middle",
}
export const _init_default_textdata : TextData = {...default_textdata}

function draw_polygon(svgelement : SVGSVGElement, diagram : Diagram) : void {
    // get properties
    let style = {...default_diagram_style, ...diagram.style}; // use default if not defined
    style.fill = get_color(style.fill as string, tab_color);
    style.stroke = get_color(style.stroke as string, tab_color);

    // draw svg
    let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    for (let stylename in style) {
        polygon.style[stylename as any] = (style as any)[stylename as any];
    }
    // polygon.style.fill = color_fill;
    // polygon.style.stroke = color_stroke;
    // use tab_color color palette

    svgelement.appendChild(polygon);
    if (diagram.path != undefined) {
        for (let p of diagram.path.points) {
            var point = svgelement.createSVGPoint();
            point.x =  p.x;
            point.y = -p.y;
            polygon.points.appendItem(point);
        }
    }
}


function draw_curve(svgelement : SVGSVGElement, diagram : Diagram) : void {
    // get properties
    let style = {...default_diagram_style, ...diagram.style}; // use default if not defined
    style.fill = "none";
    style.stroke = get_color(style.stroke as string, tab_color);

    // draw svg
    let polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    for (let stylename in style) {
        polyline.style[stylename as any] = (style as any)[stylename as any];
    }

    svgelement.appendChild(polyline);
    if (diagram.path != undefined) {
        for (let p of diagram.path.points) {
            var point = svgelement.createSVGPoint();
            point.x =  p.x;
            point.y = -p.y;
            polyline.points.appendItem(point);
        }
    }
}

/**
 * Collect all DiagramType.Text in the diagram
 * @param diagram the outer diagram
 * @returns a list of DiagramType.Text
*/
function collect_text(diagram : Diagram) : Diagram[] {
    if (diagram.type == DiagramType.Text) {
        return [diagram];
    } else if (diagram.type == DiagramType.Diagram) {
        let result : Diagram[] = [];
        for (let d of diagram.children) {
            result = result.concat(collect_text(d));
        }
        return result;
    } else {
        return [];
    }
}

function draw_texts(svgelement : SVGSVGElement, diagrams : Diagram[]) : void {

    // scale font-size adjusting for svgelement.bbox and size
    let bbox = svgelement.getBBox();
    let svgelement_width = svgelement.width.baseVal.value;
    let svgelement_height = svgelement.height.baseVal.value;
    let scale = Math.max(bbox.width / svgelement_width, bbox.height / svgelement_height)

    for (let diagram of diagrams) {
        let style = {...default_text_diagram_style, ...diagram.style}; // use default if not defined
        style.fill = get_color(style.fill as string, tab_color);
        style.stroke = get_color(style.stroke as string, tab_color);

        let textdata = {...default_textdata, ...diagram.textdata}; // use default if not defined
        if (diagram.path == undefined) { throw new Error("Text must have a path"); }
        // draw svg of text
        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", diagram.path.points[0].x.toString());
        text.setAttribute("y", (-diagram.path.points[0].y).toString());

        let font_size = parseFloat(textdata["font-size"] as string) * scale;

        // set font styles (font-family, font-size, font-weight)
        text.setAttribute("font-family", textdata["font-family"] as string);
        text.setAttribute("font-size", font_size.toString());
        text.setAttribute("font-weight", textdata["font-weight"] as string);
        text.setAttribute("text-anchor", textdata["text-anchor"] as string);
        text.setAttribute("dominant-baseline", textdata["dominant-baseline"] as string);
        for (let stylename in style) {
            text.style[stylename as any] = (style as any)[stylename as any];
        }

        // set the content of the text
        text.innerHTML = textdata["text"] as string;

        // add to svgelement
        svgelement.appendChild(text);
    }
}
    

export function draw_to_svg(svgelement : SVGSVGElement, diagram : Diagram,
    set_html_attribute : boolean = true, render_text : boolean = true) : void {

    if (diagram.type == DiagramType.Polygon) {
        draw_polygon(svgelement, diagram);
    } else if (diagram.type == DiagramType.Curve){
        draw_curve(svgelement, diagram);
    } else if (diagram.type == DiagramType.Empty || diagram.type == DiagramType.Text){
        // do nothing
    } else if (diagram.type == DiagramType.Diagram){
        for (let d of diagram.children) {
            draw_to_svg(svgelement, d, false, false);
        }
    } else {
        console.warn("Unreachable, unknown diagram type : " + diagram.type);
    }

    // draw text last to make the scaling works
    // because the text is scaled based on the bounding box of the svgelement
    if (render_text) {
        let text_diagrams : Diagram[] = collect_text(diagram);
        draw_texts(svgelement, text_diagrams);
    }
    
    if (set_html_attribute) {
        // set viewbox to the bounding box
        let bbox = svgelement.getBBox();
        // add padding of 10px to the bounding box (if the graph is small, it'll mess it up)
        // scale 10px based on the width and height of the svgelement
        let svgelement_width = svgelement.width.baseVal.value;
        let svgelement_height = svgelement.height.baseVal.value;
        let scale = Math.max(bbox.width / svgelement_width, bbox.height / svgelement_height)
        let pad = 10 * scale;
        bbox.x -= pad;
        bbox.y -= pad;
        bbox.width += 2 * pad;
        bbox.height += 2 * pad;
        svgelement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        // set preserveAspectRatio to xMidYMid meet
        svgelement.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
}
