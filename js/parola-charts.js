/**
 * Parola Visualization Engine - Phase 4 Core Customization Dashboard
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Parola Engine: Visual scripting pipeline initializing...");

    let customCol1Width = null;
    let customCol2Width = null;
    let currentTitle = "";
    let currentSubtitle = "";

    const canvas = d3.select("#d3-test-canvas");
    if (canvas.empty()) {
        console.warn("⚠️ Target container #d3-test-canvas not found on this page.");
        return;
    }

    // Read config settings from #d3-test-canvas data attributes
    const defaultCsv = canvas.attr("data-source-file") || "";
    const defaultFont = canvas.attr("typography-font-family") || "sans-serif";
    const defaultChartType = canvas.attr("chart-type") || "bar";
    const defaultLogoStyle = canvas.attr("logo-style") || "parola logo only.png";

    // Table settings
    const rawShowTable = canvas.attr("data-show-table-legend");
    const defaultShowTable = rawShowTable === null ? true : (rawShowTable === "true");

    canvas.style("position", "relative").style("overflow", "visible");

    // Clear any existing default content
    canvas.selectAll("*").remove();

    // ==========================================
    // 1. INJECT ROBUST CONTROL DASHBOARD UI
    // ==========================================
    const controls = canvas.append("div")
        .style("margin-bottom", "25px")
        .style("padding", "20px")
        .style("background-color", "#f9f9f9")
        .style("border", "1px solid #e5e5e5")
        .style("border-radius", "8px")
        .style("font-family", "sans-serif")
        .style("font-size", "13px")
        .style("display", "grid")
        .style("grid-template-columns", "repeat(auto-fit, minmax(220px, 1fr))")
        .style("gap", "15px");

    // Helper function to generate clean standard inputs
    function createInputGroup(parent, labelText, type, id, defaultValue, attributes = {}) {
        const wrapper = parent.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "5px");
        wrapper.append("label").text(labelText).style("font-weight", "bold").style("color", "#444");
        const input = wrapper.append("input").attr("type", type).attr("id", id).attr("value", defaultValue);
        for (let key in attributes) { input.attr(key, attributes[key]); }
        return input;
    }

    // Row 1: File & Core Theme Styling Controls
    const fileInput = createInputGroup(controls, "1. Data Source File (.csv):", "file", "csv-file", "", { accept: ".csv" });

    // Typography Dropdown Picker
    const fontWrapper = controls.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "5px");
    fontWrapper.append("label").text("3. Typography Font Family:").style("font-weight", "bold").style("color", "#444");
    const fontPicker = fontWrapper.append("select").style("padding", "4px");
    ["sans-serif", "serif", "monospace", "cursive", "system-ui"].forEach(font => {
        const option = fontPicker.append("option").attr("value", font).text(font);
        if (font === defaultFont) option.property("selected", true);
    });

    // Chart Type Dropdown Picker
    const typeWrapper = controls.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "5px");
    typeWrapper.append("label").text("Chart Type:").style("font-weight", "bold").style("color", "#444");
    const typePicker = typeWrapper.append("select").style("padding", "4px");
    [
        { value: "bar", label: "Bar" },
        { value: "line", label: "Line" },
        { value: "pie", label: "Pie Chart" },
        { value: "stacked-bar", label: "Stacked Bar Chart" },
        { value: "horizontal-bar", label: "Horizontal Bar Chart" },
        { value: "horizontal-stacked-bar", label: "Horizontal Stacked Bar Chart" }
    ].forEach(item => {
        const option = typePicker.append("option").attr("value", item.value).text(item.label);
        if (item.value === defaultChartType) option.property("selected", true);
    });

    // Logo Dropdown picker
    const logoWrapper = controls.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "5px");
    logoWrapper.append("label").text("Logo Style:").style("font-weight", "bold").style("color", "#444");
    const logoPicker = logoWrapper.append("select").style("padding", "4px");
    [
        { value: "parola logo only.png", label: "Logo Only" },
        { value: "parola logo all white.png", label: "All White" },
        { value: "parola logo with text.png", label: "Logo with Text" }
    ].forEach(item => {
        const option = logoPicker.append("option").attr("value", item.value).text(item.label);
        if (item.value === defaultLogoStyle) option.property("selected", true);
    });

    // Detect the script's directory URL to construct correct logo asset paths dynamically
    let themeJsUrl = '';
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        if (script.src && script.src.includes('parola-charts.js')) {
            themeJsUrl = script.src.substring(0, script.src.lastIndexOf('/') + 1);
            break;
        }
    }
    if (!themeJsUrl) {
        themeJsUrl = '/wp-content/themes/parola-child-theme/js/';
    }

    // Table Legend Configuration — separated section, only visible for applicable chart types
    const TABLE_CHART_TYPES = new Set(["pie", "horizontal-bar", "horizontal-stacked-bar"]);
    const DEFAULT_TABLE_LEGEND_WIDTH = 220;
    const DEFAULT_TABLE_LEGEND_HEIGHT = 360;

    const tableLegendSection = controls.append("div")
        .attr("id", "table-legend-controls-section")
        .style("grid-column", "1 / -1")
        .style("display", "none")
        .style("padding", "15px")
        .style("margin-top", "5px")
        .style("border-top", "2px solid #ddd")
        .style("background-color", "#f0f4f5")
        .style("border-radius", "6px");

    tableLegendSection.append("div")
        .text("Table Legend Settings")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .style("color", "#333")
        .style("margin-bottom", "10px");

    const tableLegendGrid = tableLegendSection.append("div")
        .style("display", "grid")
        .style("grid-template-columns", "repeat(auto-fit, minmax(220px, 1fr))")
        .style("gap", "15px");

    const tableToggleWrapper = tableLegendGrid.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "5px");
    tableToggleWrapper.append("label").text("Show Table Legend:").style("font-weight", "bold").style("color", "#444");
    const tableToggle = tableToggleWrapper.append("input").attr("type", "checkbox").attr("id", "table-toggle").property("checked", defaultShowTable).style("width", "20px").style("height", "20px").style("cursor", "pointer");

    function updateTableControlsVisibility() {
        const visible = TABLE_CHART_TYPES.has(typePicker.property("value"));
        tableLegendSection.style("display", visible ? "block" : "none");
    }
    updateTableControlsVisibility();

    // Set fallback defaults if inputs are not explicitly configured
    // ==========================================
    // 2. INITIALIZE CHART CANVAS AND TOOLTIP
    // ==========================================
    const margin = { top: 60, right: 30, bottom: 60, left: 70 };
    const width = 550 - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    // Tooltip attached to body to show over the entire chart and bypass all boundaries
    const tooltip = d3.select("body").selectAll(".parola-chart-tooltip").data([null]).join("div")
        .attr("class", "parola-chart-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "#333")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-family", "sans-serif")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
        .style("z-index", "99999");

    // Wrapper container to position editable explanation/legend table and SVG side-by-side using rows/columns
    // Outer sizing container — occupies the correct page-layout space after scaling.
    // Its width and height are set explicitly by applyResponsiveScale().
    const chartWrapperContainer = canvas.append("div")
        .attr("id", "chart-wrapper-container")
        .style("position", "relative")
        .style("overflow", "visible")
        .style("width", "100%");

    // Inner wrapper — receives the CSS scale transform
    const chartWrapper = chartWrapperContainer.append("div")
        .attr("id", "chart-wrapper")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("position", "relative")
        .style("overflow", "visible")
        .style("width", "100%");

    // Row 1: Header (Title, Subtitle, and optional centered legend colors below subtitle)
    const headerRow = chartWrapper.append("div")
        .attr("id", "chart-header-row")
        .style("width", "100%")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("align-items", "flex-start")
        .style("margin-bottom", "15px");

    const headerTitle = headerRow.append("div")
        .attr("id", "chart-header-title")
        .style("font-weight", "bold")
        .style("color", "#333")
        .style("line-height", "1.2");

    const headerSubtitle = headerRow.append("div")
        .attr("id", "chart-header-subtitle")
        .style("color", "#545454")
        .style("line-height", "1.2")
        .style("margin-top", "4px");

    const headerLegend = headerRow.append("div")
        .attr("id", "chart-header-legend")
        .style("display", "none")
        .style("width", "100%")
        .style("justify-content", "center")
        .style("gap", "20px")
        .style("margin-top", "10px");

    // Row 2: Content columns
    const contentRow = chartWrapper.append("div")
        .attr("id", "chart-content-row")
        .style("display", "flex")
        .style("flex-direction", "row")
        .style("align-items", "flex-start")
        .style("position", "relative")
        .style("overflow", "visible")
        .style("width", "100%");

    // Row 3: Logo dedicated row below the chart row
    const logoRow = chartWrapper.append("div")
        .attr("id", "chart-logo-row")
        .style("width", "100%")
        .style("display", "flex")
        .style("justify-content", "flex-end")
        .style("padding-top", "10px")
        .style("padding-bottom", "10px");

    const tableContainer = contentRow.append("div")
        .attr("id", "table-container");

    const svgOuter = contentRow.append("svg")
        .style("overflow", "visible");
    const svg = svgOuter.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xAxisGroup = svg.append("g");
    const yAxisGroup = svg.append("g");

    // Append Persistent Structural Text Element Selectors
    const mainTitleText = svg.append("text").attr("x", 0).attr("y", -35).attr("text-anchor", "start").style("font-weight", "bold");
    const subtitleText = svg.append("text").attr("x", 0).attr("y", -15).attr("text-anchor", "start").attr("fill", "#545454");

    // ==========================================
    // 3. CORE RENDERING ENGINE FUNCTION
    // ==========================================
    let currentData = [];

    // ==========================================
    // RESPONSIVE SCALING ENGINE
    // ==========================================
    let _naturalWrapperWidth = 0;
    let _naturalWrapperHeight = 0;

    /**
     * Applies a uniform CSS scale transform to chartWrapper so the visualisation
     * fills the full available canvas width while preserving its aspect ratio.
     * chartWrapperContainer is explicitly sized to the scaled visual footprint
     * so the surrounding page layout accounts for the height correctly.
     */
    function applyResponsiveScale() {
        const canvasNode = canvas.node();
        if (!canvasNode || _naturalWrapperWidth <= 0) return;

        const availableWidth = canvasNode.getBoundingClientRect().width;
        if (availableWidth <= 0) return;

        const scale = availableWidth / _naturalWrapperWidth;
        const scaledHeight = _naturalWrapperHeight * scale;

        // Pin chartWrapper to its natural design width, then scale uniformly to fill canvas
        chartWrapper
            .style("min-width", null)
            .style("min-height", null)
            .style("width", `${_naturalWrapperWidth}px`)
            .style("transform", `scale(${scale})`)
            .style("transform-origin", "top left");

        // Size the outer container to the resulting scaled visual footprint
        chartWrapperContainer
            .style("width", `${availableWidth}px`)
            .style("height", `${scaledHeight}px`);

        // Canvas-level spacing is now managed by chartWrapperContainer
        canvas.style("padding-bottom", null).style("margin-bottom", null);
    }

    /**
     * Resets any existing transform and lets the DOM fully settle over three
     * animation frames — ensuring updateChartWrapperLayout's async applyLayout
     * callback has already run — then measures natural dimensions and scales.
     */
    function scheduleResponsiveScale() {
        // Reset to natural state so dimensions can be measured accurately
        chartWrapper
            .style("transform", null)
            .style("transform-origin", null)
            .style("min-width", null)
            .style("min-height", null)
            .style("width", "100%");

        chartWrapperContainer
            .style("width", "100%")
            .style("height", null);

        canvas.style("padding-bottom", null).style("margin-bottom", null);

        // Three rAFs: frame 1 lets applyLayout run, frame 2 lets the browser
        // recalculate layout, frame 3 measures and scales.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!chartWrapper.node()) return;

                    // Design width = SVG render width + visible table legend width
                    const svgW = parseFloat(svgOuter.attr("width")) || 0;
                    const tableVisible = tableContainer.style("display") !== "none";
                    const containerWidth = canvas.node().getBoundingClientRect().width || 550;
                    const activeType = typePicker.property("value");
                    let tableW = 0;
                    if (tableVisible) {
                        if (activeType === "horizontal-bar" || activeType === "horizontal-stacked-bar") {
                            tableW = Math.max(120, Math.min(240, containerWidth * 0.3));
                        } else {
                            tableW = Math.max(180, Math.min(300, containerWidth * 0.4));
                        }
                    }
                    _naturalWrapperWidth = svgW + tableW;

                    // Full rendered height including the HTML header row above the chart
                    _naturalWrapperHeight = chartWrapper.node().getBoundingClientRect().height;

                    if (_naturalWrapperWidth > 0 && _naturalWrapperHeight > 0) {
                        applyResponsiveScale();
                    }
                });
            });
        });
    }

    function applyTableLegendContainerStyles() {
        const containerWidth = canvas.node().getBoundingClientRect().width || 550;

        const activeType = typePicker.property("value");
        let targetWidth;
        if (activeType === "horizontal-bar" || activeType === "horizontal-stacked-bar") {
            targetWidth = Math.max(120, Math.min(240, containerWidth * 0.3));
        } else {
            targetWidth = Math.max(180, Math.min(300, containerWidth * 0.4));
        }

        tableContainer.style("display", "block")
            .style("position", "relative")
            .style("left", "0px")
            .style("top", "0px")
            .style("margin", "0")
            .style("padding", "0")
            .style("width", `${targetWidth}px`)
            .style("overflow", "visible")
            .style("transform", null);
    }

    function applyChartContainerStyles(activeType, showTable) {
        svgOuter.style("position", null)
            .style("left", null)
            .style("top", null)
            .style("margin", null)
            .style("transform", null);
    }
    function updateChartWrapperLayout() {
        const layoutBuffer = 40;

        const applyLayout = () => {
            const wrapperNode = chartWrapper.node();
            if (!wrapperNode) return;

            const wrapperRect = wrapperNode.getBoundingClientRect();
            const contentNode = contentRow.node();
            if (!contentNode) return;
            const contentRect = contentNode.getBoundingClientRect();

            let maxContentBottom = 0;
            let maxContentRight = 0;

            if (tableContainer.style("display") !== "none" && tableContainer.node()) {
                const tableRect = tableContainer.node().getBoundingClientRect();
                maxContentBottom = Math.max(maxContentBottom, tableRect.bottom - contentRect.top);
                maxContentRight = Math.max(maxContentRight, tableRect.right - contentRect.left);
            }

            if (svgOuter.node()) {
                const chartRect = svgOuter.node().getBoundingClientRect();
                maxContentBottom = Math.max(maxContentBottom, chartRect.bottom - contentRect.top);
                maxContentRight = Math.max(maxContentRight, chartRect.right - contentRect.left);
            }

            contentRow
                .style("min-height", `${Math.ceil(maxContentBottom)}px`)
                .style("min-width", `${Math.ceil(maxContentRight)}px`);

            const headerHeight = headerRow.node() ? headerRow.node().getBoundingClientRect().height : 0;
            const logoHeight = (logoRow.node() && logoRow.node().children.length > 0) ? logoRow.node().getBoundingClientRect().height : 0;
            const totalRequiredHeight = headerHeight + maxContentBottom + logoHeight;

            let maxRight = maxContentRight;
            if (logoRow.node() && logoRow.node().children.length > 0) {
                const logoRect = logoRow.node().getBoundingClientRect();
                maxRight = Math.max(maxRight, logoRect.right - wrapperRect.left);
            }

            chartWrapper
                .style("min-height", `${Math.ceil(totalRequiredHeight + layoutBuffer)}px`)
                .style("min-width", `${Math.ceil(maxRight)}px`);

            canvas
                .style("padding-bottom", `${layoutBuffer}px`)
                .style("margin-bottom", `${layoutBuffer}px`);
        };

        requestAnimationFrame(applyLayout);
    }
    // function updateChartWrapperLayout(usesTableLegendLayout) {
    //     const layoutBuffer = 40;

    //     const applyLayout = () => {
    //         if (!usesTableLegendLayout) {
    //             chartWrapper
    //                 .style("min-height", null)
    //                 .style("min-width", null);
    //             canvas.style("padding-bottom", null);
    //             canvas.style("margin-bottom", null);
    //             return;
    //         }

    //         const wrapperNode = chartWrapper.node();
    //         if (!wrapperNode) return;

    //         const wrapperRect = wrapperNode.getBoundingClientRect();
    //         let maxBottom = 0;
    //         let maxRight = 0;

    //         if (tableContainer.style("display") !== "none" && tableContainer.node()) {
    //             const tableRect = tableContainer.node().getBoundingClientRect();
    //             maxBottom = Math.max(maxBottom, tableRect.bottom - wrapperRect.top);
    //             maxRight = Math.max(maxRight, tableRect.right - wrapperRect.left);
    //         }

    //         if (svgOuter.node()) {
    //             const chartRect = svgOuter.node().getBoundingClientRect();
    //             maxBottom = Math.max(maxBottom, chartRect.bottom - wrapperRect.top);
    //             maxRight = Math.max(maxRight, chartRect.right - wrapperRect.left);
    //         }

    //         if (logoRow.node() && logoRow.node().children.length > 0) {
    //             const logoRect = logoRow.node().getBoundingClientRect();
    //             maxBottom = Math.max(maxBottom, logoRect.bottom - wrapperRect.top);
    //             maxRight = Math.max(maxRight, logoRect.right - wrapperRect.left);
    //         }

    //         chartWrapper
    //             .style("min-height", `${Math.ceil(maxBottom + layoutBuffer)}px`)
    //             .style("min-width", `${Math.ceil(maxRight)}px`);

    //         canvas
    //             .style("padding-bottom", `${layoutBuffer}px`)
    //             .style("margin-bottom", `${layoutBuffer}px`);
    //     };

    //     if (usesTableLegendLayout) {
    //         requestAnimationFrame(applyLayout);
    //     } else {
    //         applyLayout();
    //     }
    // }

    function renderHTMLHeader(mainTitleVal, subtitleVal, activeFont, mainTitleSize, activeType, showTable, valueKeys, tickSize) {
        const usesTableLegendLayout = TABLE_CHART_TYPES.has(activeType) && showTable;
        const isStackedType = activeType === "stacked-bar" || activeType === "horizontal-stacked-bar";

        // For non-table stacked charts, show the header row so the legend row is visible
        if (!usesTableLegendLayout && !isStackedType) {
            headerRow.style("display", "none");
            headerLegend.style("display", "none");
            return;
        }

        headerRow.style("display", "flex");
        const subtitleSize = `${Math.max(10, parseFloat(mainTitleSize) - 4)}px`;

        headerTitle
            .text(mainTitleVal)
            .style("font-family", activeFont)
            .style("font-size", mainTitleSize);

        headerSubtitle
            .text(subtitleVal)
            .style("font-family", activeFont)
            .style("font-size", subtitleSize);

        headerLegend.selectAll("*").remove();

        const stackedColors = ["#063137", "#16a1b5"];
        const colorScale = d3.scaleOrdinal()
            .domain(valueKeys)
            .range(valueKeys.map((_, i) => stackedColors[i % stackedColors.length]));

        if (activeType === "horizontal-stacked-bar" || activeType === "stacked-bar") {
            headerLegend.style("display", "flex").style("justify-content", "center");

            valueKeys.forEach(key => {
                const item = headerLegend.append("div")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("gap", "6px");

                item.append("div")
                    .style("width", "12px")
                    .style("height", "12px")
                    .style("border-radius", "50%")
                    .style("background-color", colorScale(key));

                item.append("span")
                    .text(key)
                    .style("font-family", activeFont)
                    .style("font-size", tickSize)
                    .style("color", "#333");
            });
        } else {
            headerLegend.style("display", "none");
        }
    }

    function applyTableLegendScale(table) {
        const containerWidth = canvas.node().getBoundingClientRect().width || 550;
        const activeType = typePicker.property("value");
        let targetWidth;
        if (activeType === "horizontal-bar" || activeType === "horizontal-stacked-bar") {
            targetWidth = Math.max(120, Math.min(240, containerWidth * 0.3));
        } else {
            targetWidth = Math.max(180, Math.min(300, containerWidth * 0.4));
        }
        let chartWidth = containerWidth;
        let chartHeight = Math.max(300, containerWidth * 0.65);
        if (activeType === "pie") {
            const size = Math.min(chartWidth, 480);
            chartWidth = size;
            chartHeight = size;
        }
        const targetHeight = chartHeight;

        table.style("width", `${targetWidth}px`)
            .style("height", `${targetHeight}px`);
    }

    function renderHorizontalBarLegendTable(data, catKey, activeFont, legendFontSize, borderThickness, yScale, svgMarginTop) {
        applyTableLegendContainerStyles();

        // Inject scrollbar-hiding CSS if not already present
        if (d3.select("#hide-scrollbar-style").empty()) {
            d3.select("head").append("style")
                .attr("id", "hide-scrollbar-style")
                .text(`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `);
        }

        const bandH = yScale.bandwidth();
        const stepH = yScale.step();
        const firstItemTop = yScale(data[0][catKey]);
        const containerWidth = canvas.node().getBoundingClientRect().width || 550;
        const activeType = typePicker.property("value");
        let chartHeight = Math.max(300, containerWidth * 0.65);

        let targetWidth;
        if (activeType === "horizontal-bar" || activeType === "horizontal-stacked-bar") {
            targetWidth = Math.max(120, Math.min(240, containerWidth * 0.3));
        } else {
            targetWidth = Math.max(180, Math.min(300, containerWidth * 0.4));
        }

        tableContainer.style("position", "relative")
            .style("height", `${chartHeight}px`);

        // Render each description text as an absolutely positioned div aligned with the bar.
        // yScale values are in the SVG g coordinate space (after margin.top translation),
        // so we add svgMarginTop so the HTML divs line up with the rendered bars.
        const marginTop = svgMarginTop || 0;

        data.forEach((d, i) => {
            const yTop = yScale(d[catKey]) + marginTop;

            const descDiv = tableContainer.append("div")
                .style("position", "absolute")
                .style("left", "0")
                .style("top", `${yTop}px`)
                .style("width", `${targetWidth}px`)
                .style("height", `${bandH}px`)
                .style("display", "flex")
                .style("align-items", "center")
                .style("justify-content", "flex-end")
                .style("box-sizing", "border-box")
                .style("font-family", activeFont)
                .style("font-size", legendFontSize);

            descDiv.append("div")
                .attr("class", "no-scrollbar")
                .style("max-width", "100%")
                .style("overflow-x", "auto")
                .style("overflow-y", "hidden")
                .style("white-space", "nowrap")
                .style("text-align", "right")
                .text(() => {
                    const descKey = Object.keys(d).find(k => k.toLowerCase() === "description");
                    return descKey ? String(d[descKey] || "") : "";
                });

            // Draw a separator line centred in the gap between this bar and the next.
            // Positioned independently so it has no effect on text layout.
            if (i < data.length - 1) {
                const nextYTop = yScale(data[i + 1][catKey]) + marginTop;
                const yLine = (yTop + bandH + nextYTop) / 2;

                tableContainer.append("div")
                    .style("position", "absolute")
                    .style("left", "0")
                    .style("top", `${yLine}px`)
                    .style("width", `${targetWidth}px`)
                    .style("height", `${borderThickness}px`)
                    .style("background-color", "#858585");
            }
        });
    }

    function renderChart(data) {
        if (!data || data.length === 0) return;
        currentData = data;

        const activeFont = fontPicker.property("value");
        const activeType = typePicker.property("value");

        const containerWidth = canvas.node().getBoundingClientRect().width || 550;
        let chartWidth = containerWidth;
        let chartHeight = Math.max(300, containerWidth * 0.65);
        if (activeType === "pie") {
            const size = Math.min(chartWidth, 480);
            chartWidth = size;
            chartHeight = size;
        }

        const activeWidth = chartWidth - margin.left - margin.right;
        const activeHeight = chartHeight - margin.top - margin.bottom;

        svgOuter.attr("width", activeWidth + margin.left + margin.right)
            .attr("height", activeHeight + margin.top + margin.bottom);

        xAxisGroup.attr("transform", `translate(0,${activeHeight})`);

        const mainTitleVal = currentTitle || "Intellectual Property Metrics";
        const subtitleVal = currentSubtitle || "Global Patent Trends";

        const mainTitleSize = Math.max(14, Math.min(22, chartWidth * 0.035)) + "px";
        const tickSize = Math.max(9, Math.min(13, chartWidth * 0.02)) + "px";
        const legendFontSize = Math.max(10, Math.min(14, chartWidth * 0.022)) + "px";

        // Apply Custom Typographic Text & Font Properties
        mainTitleText.text(mainTitleVal).style("font-family", activeFont).style("font-size", mainTitleSize);
        subtitleText.text(subtitleVal).style("font-family", activeFont).style("font-size", `${Math.max(10, parseFloat(mainTitleSize) - 4)}px`);

        const showTable = tableToggle.property("checked");
        const borderThickness = 1; // standard minimum table border

        // Dynamically detect category and value keys in parsed CSV data
        const keys = Object.keys(data[0]);
        const catKey = keys[0] || "Company";
        const descKey = keys.find(k => k.toLowerCase() === "description");
        let valueKeys = keys.slice(1).filter(k => k !== descKey && (typeof data[0][k] === "number" || !isNaN(parseFloat(data[0][k]))));
        if (valueKeys.length === 0) {
            valueKeys = ["Patents"];
        }

        // Convert values to float safely
        data.forEach(d => {
            valueKeys.forEach(k => {
                if (d[k] !== undefined && typeof d[k] === "string") {
                    d[k] = parseFloat(d[k]) || 0;
                }
            });
        });

        tableContainer.selectAll("*").remove();
        tableContainer.style("display", "none")
            .style("padding-top", "0")
            .style("transform", null);

        const usesTableLegendLayout = TABLE_CHART_TYPES.has(activeType) && showTable;

        // Title and subtitle render above the table legend instead of inside the SVG,
        // also shown for stacked chart types so the HTML legend row is visible
        if (usesTableLegendLayout || activeType === "stacked-bar" || activeType === "horizontal-stacked-bar") {
            mainTitleText.style("display", "none");
            subtitleText.style("display", "none");
        } else {
            mainTitleText.style("display", null);
            subtitleText.style("display", null);
        }

        renderHTMLHeader(mainTitleVal, subtitleVal, activeFont, mainTitleSize, activeType, showTable, valueKeys, tickSize);
        applyChartContainerStyles(activeType, showTable);

        // Clear previous shapes and specific groups
        svg.selectAll(".bar-label").remove();
        svg.selectAll("rect").remove();
        svg.selectAll(".chart-line").remove();
        svg.selectAll(".chart-dot").remove();
        svg.selectAll(".pie-group").remove();
        svg.selectAll(".legend-group").remove();
        svg.selectAll(".stack-layer").remove();
        svg.selectAll(".stack-label").remove();
        svg.selectAll(".total-label").remove();

        if (activeType === "pie") {
            xAxisGroup.style("display", "none");
            yAxisGroup.style("display", "none");

            const baseRadius = 100;
            const rx = Math.max(10, activeWidth / 2 - 10);
            const ry = Math.max(10, activeHeight / 2 - 10);
            const scaleX = rx / baseRadius;
            const scaleY = ry / baseRadius;

            const pieGroup = svg.append("g")
                .attr("class", "pie-group")
                .attr("transform", `translate(${activeWidth / 2}, ${activeHeight / 2})`);

            const pie = d3.pie()
                .value(d => d[valueKeys[0]] || 0)
                .sort(null);

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(baseRadius);

            const labelArc = d3.arc()
                .innerRadius(baseRadius + 12)
                .outerRadius(baseRadius + 12);

            const PIE_COLORS = [
                "#126274",
                "#23a1b5",
                "#1e8b9f",
                "#44b2bf",
                "#30c8e3",
                "#97ffff",
                "#28b9b3",
                "#d4edbc",
                "#d2b50b",
                "#eee8aa"
            ];
            const sortedData = [...data].sort((a, b) => (b[valueKeys[0]] || 0) - (a[valueKeys[0]] || 0));
            const colorMap = new Map();
            sortedData.forEach((d, i) => {
                colorMap.set(d[catKey], PIE_COLORS[i % PIE_COLORS.length]);
            });

            const pieData = pie(data);

            const arcs = pieGroup.selectAll(".arc")
                .data(pieData)
                .enter()
                .append("g")
                .attr("class", "arc");

            arcs.append("path")
                .attr("d", arc)
                .attr("transform", `scale(${scaleX}, ${scaleY})`)
                .attr("fill", d => colorMap.get(d.data[catKey]))
                .attr("stroke", "none")
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    d3.select(this).attr("opacity", 0.85);
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    tooltip
                        .html(`<strong>${catKey}:</strong> ${d.data[catKey]}<br/><strong>${valueKeys[0]}:</strong> ${d.data[valueKeys[0]]}`)
                        .style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("opacity", 1.0);
                    tooltip.style("visibility", "hidden");
                });

            const totalSum = d3.sum(data, d => d[valueKeys[0]] || 0);

            // Add text labels outside the pie using scaled centroid coordinates
            arcs.append("text")
                .attr("transform", d => {
                    const centroid = labelArc.centroid(d);
                    const tx = centroid[0] * scaleX;
                    const ty = centroid[1] * scaleY;
                    return `translate(${tx}, ${ty})`;
                })
                .attr("text-anchor", d => {
                    const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                    return midAngle < Math.PI ? "start" : "end";
                })
                .style("font-family", activeFont)
                .style("font-size", tickSize)
                .style("fill", "#333")
                .text(d => {
                    const percentage = totalSum > 0 ? ((d.data[valueKeys[0]] || 0) / totalSum * 100).toFixed(1) : 0;
                    return `${d.data[catKey]} (${percentage}%)`;
                });

            // Prevent overlapping labels
            const labelTexts = pieGroup.selectAll("text");
            const renderedBounds = [];
            labelTexts.each(function () {
                const self = d3.select(this);
                let box = this.getBoundingClientRect();
                if (box.width === 0 && box.height === 0 && this.getBBox) {
                    const bbox = this.getBBox();
                    box = {
                        left: bbox.x,
                        top: bbox.y,
                        right: bbox.x + bbox.width,
                        bottom: bbox.y + bbox.height,
                        width: bbox.width,
                        height: bbox.height
                    };
                }

                let overlaps = false;
                for (const r of renderedBounds) {
                    const pad = 2; // small padding
                    if (!(box.right + pad < r.left - pad ||
                        box.left - pad > r.right + pad ||
                        box.bottom + pad < r.top - pad ||
                        box.top - pad > r.bottom + pad)) {
                        overlaps = true;
                        break;
                    }
                }

                if (overlaps) {
                    self.style("display", "none");
                } else {
                    renderedBounds.push(box);
                }
            });

            // Legend Table to the Left for Pie Chart
            if (showTable) {
                applyTableLegendContainerStyles();

                const targetWidth = Math.max(140, Math.min(220, containerWidth * 0.28));
                const targetHeight = Math.min(containerWidth, 480);
                const rowCount = sortedData.length;
                const rowHeight = targetHeight / rowCount;

                // Shrink legend font size and padding to fit every row within the pie chart's height instead of letting the table grow taller than the pie
                const baseFontSize = parseFloat(legendFontSize) || 12;
                const maxFontForRow = Math.max(7, rowHeight - 8);
                const pieLegendFontSize = `${Math.min(baseFontSize, maxFontForRow)}px`;
                const cellPadding = rowHeight < 24 ? "1px 4px" : "4px 6px";

                tableContainer.style("height", `${targetHeight}px`).style("overflow-y", "auto").style("overflow-x", "hidden").style("scrollbar-width", "thin").style("direction", "rtl");

                const table = tableContainer.append("table")
                    .style("direction", "ltr")
                    .style("border-collapse", "collapse")
                    .style("font-family", activeFont)
                    .style("table-layout", "fixed");

                applyTableLegendScale(table);

                const rows = table.selectAll("tr")
                    .data(sortedData)
                    .enter()
                    .append("tr")
                    .style("height", `${rowHeight}px`)
                    .style("box-sizing", "border-box");

                rows.each(function (d, i) {
                    const row = d3.select(this);
                    if (i < sortedData.length - 1) {
                        row.style("border-bottom", `${borderThickness}px solid #858585`);
                    }
                });

                // Set column widths from custom states or default
                let colorColPx = customCol1Width !== null ? customCol1Width : rowHeight;
                let nameColPx = customCol2Width !== null ? customCol2Width : colorColPx;
                let textColPx = Math.max(10, targetWidth - colorColPx - nameColPx);

                const col1Cells = [];
                const col2Cells = [];
                const col3Cells = [];

                rows.each(function (d, i) {
                    const row = d3.select(this);

                    // Column 1: Full colored square cell
                    const cell1 = row.append("td")
                        .style("width", `${colorColPx}px`)
                        .style("min-width", `${colorColPx}px`)
                        .style("padding", "0")
                        .style("vertical-align", "middle")
                        .style("position", "relative")
                        .style("background-color", d => colorMap.get(d[catKey]));
                    col1Cells.push(cell1);

                    // Column 2: Item Name
                    const cell2 = row.append("td")
                        .style("width", `${nameColPx}px`)
                        .style("padding", cellPadding)
                        .style("vertical-align", "middle")
                        .style("font-size", pieLegendFontSize)
                        .style("word-break", "break-word")
                        .style("position", "relative")
                        .text(d => d[catKey]);
                    col2Cells.push(cell2);

                    // Column 3: Description Text from CSV (non-editable)
                    const cell3 = row.append("td")
                        .style("width", `${textColPx}px`)
                        .style("padding", cellPadding)
                        .style("vertical-align", "middle")
                        .style("font-size", pieLegendFontSize)
                        .style("position", "relative");
                    col3Cells.push(cell3);

                    cell3.append("div")
                        .style("min-height", "1.2em")
                        .style("word-break", "break-word")
                        .text(d => descKey ? String(d[descKey] || "") : "");

                    // Add absolute drag-resize handles to col1
                    const resizer1 = cell1.append("div")
                        .style("position", "absolute")
                        .style("top", "0")
                        .style("right", "0")
                        .style("width", "6px")
                        .style("height", "100%")
                        .style("cursor", "col-resize")
                        .style("z-index", "10");

                    resizer1.on("mousedown", function (event) {
                        event.preventDefault();
                        const startX = event.clientX;
                        const startW = colorColPx;

                        d3.select(window).on("mousemove.resizer1", function (moveEvent) {
                            const delta = moveEvent.clientX - startX;
                            colorColPx = Math.max(10, startW + delta);
                            customCol1Width = colorColPx;
                            const newTextWidth = Math.max(10, targetWidth - colorColPx - nameColPx);

                            col1Cells.forEach(c => c.style("width", `${colorColPx}px`).style("min-width", `${colorColPx}px`));
                            col3Cells.forEach(c => c.style("width", `${newTextWidth}px`));
                        });

                        d3.select(window).on("mouseup.resizer1", function () {
                            d3.select(window).on("mousemove.resizer1", null);
                            d3.select(window).on("mouseup.resizer1", null);
                            if (currentData.length > 0) renderChart(currentData);
                        });
                    });

                    // Add absolute drag-resize handles to col2
                    const resizer2 = cell2.append("div")
                        .style("position", "absolute")
                        .style("top", "0")
                        .style("right", "0")
                        .style("width", "6px")
                        .style("height", "100%")
                        .style("cursor", "col-resize")
                        .style("z-index", "10");

                    resizer2.on("mousedown", function (event) {
                        event.preventDefault();
                        const startX = event.clientX;
                        const startW = nameColPx;

                        d3.select(window).on("mousemove.resizer2", function (moveEvent) {
                            const delta = moveEvent.clientX - startX;
                            nameColPx = Math.max(10, startW + delta);
                            customCol2Width = nameColPx;
                            const newTextWidth = Math.max(10, targetWidth - colorColPx - nameColPx);

                            col2Cells.forEach(c => c.style("width", `${nameColPx}px`));
                            col3Cells.forEach(c => c.style("width", `${newTextWidth}px`));
                        });

                        d3.select(window).on("mouseup.resizer2", function () {
                            d3.select(window).on("mousemove.resizer2", null);
                            d3.select(window).on("mouseup.resizer2", null);
                            if (currentData.length > 0) renderChart(currentData);
                        });
                    });
                });
            }

        } else if (activeType === "line") {
            xAxisGroup.style("display", null);
            yAxisGroup.style("display", null);

            const xScale = d3.scaleBand().domain(data.map(d => d[catKey])).range([0, activeWidth]).padding(0.3);
            const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d[valueKeys[0]] || 0) * 1.1]).range([activeHeight, 0]);

            xAxisGroup.call(d3.axisBottom(xScale))
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            yAxisGroup.call(d3.axisLeft(yScale))
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            const lineGenerator = d3.line()
                .x(d => xScale(d[catKey]) + xScale.bandwidth() / 2)
                .y(d => yScale(d[valueKeys[0]] || 0));

            const linePath = svg.selectAll(".chart-line").data([data]);
            linePath.enter()
                .append("path")
                .attr("class", "chart-line")
                .merge(linePath)
                .attr("d", lineGenerator)
                .attr("fill", "none")
                .attr("stroke", "#1ea0af")
                .attr("stroke-width", 3);

            const dots = svg.selectAll(".chart-dot").data(data);
            dots.exit().remove();
            dots.enter()
                .append("circle")
                .attr("class", "chart-dot")
                .merge(dots)
                .attr("cx", d => xScale(d[catKey]) + xScale.bandwidth() / 2)
                .attr("cy", d => yScale(d[valueKeys[0]] || 0))
                .attr("r", 6)
                .attr("fill", "#1ea0af")
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    d3.select(this).attr("fill", d3.rgb("#1ea0af").darker(0.5)).attr("r", 8);
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    tooltip
                        .html(`<strong>${catKey}:</strong> ${d[catKey]}<br/><strong>${valueKeys[0]}:</strong> ${d[valueKeys[0]]}`)
                        .style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("fill", "#1ea0af").attr("r", 6);
                    tooltip.style("visibility", "hidden");
                });

        } else if (activeType === "bar") {
            xAxisGroup.style("display", null);
            yAxisGroup.style("display", null);

            const xScale = d3.scaleBand().domain(data.map(d => d[catKey])).range([0, activeWidth]).padding(0.3);
            const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d[valueKeys[0]] || 0) * 1.1]).range([activeHeight, 0]);

            xAxisGroup.call(d3.axisBottom(xScale))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").remove())
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            yAxisGroup.selectAll("*").remove();

            const bars = svg.selectAll("rect").data(data);
            bars.exit().remove();
            bars.enter()
                .append("rect")
                .merge(bars)
                .attr("x", d => xScale(d[catKey]))
                .attr("y", d => yScale(d[valueKeys[0]] || 0))
                .attr("width", xScale.bandwidth())
                .attr("height", d => activeHeight - yScale(d[valueKeys[0]] || 0))
                .attr("fill", "#1ea0af")
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    d3.select(this).attr("fill", d3.rgb("#1ea0af").darker(0.5));
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    tooltip
                        .html(`<strong>${catKey}:</strong> ${d[catKey]}<br/><strong>${valueKeys[0]}:</strong> ${d[valueKeys[0]]}`)
                        .style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("fill", "#1ea0af");
                    tooltip.style("visibility", "hidden");
                });

            // White text inside the column, at the top inside edge
            svg.selectAll(".bar-label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "bar-label")
                .attr("x", d => xScale(d[catKey]) + xScale.bandwidth() / 2)
                .attr("y", d => yScale(d[valueKeys[0]] || 0) + 15)
                .attr("text-anchor", "middle")
                .attr("fill", "#ffffff")
                .style("font-family", activeFont)
                .style("font-weight", "bold")
                .style("font-size", `${Math.max(10, parseFloat(tickSize))}px`)
                .text(d => d[valueKeys[0]] || 0);

        } else if (activeType === "horizontal-bar") {
            xAxisGroup.style("display", null);
            yAxisGroup.style("display", null);

            const yScale = d3.scaleBand().domain(data.map(d => d[catKey])).range([0, activeHeight]).padding(0.3);
            const xScale = d3.scaleLinear().domain([0, d3.max(data, d => d[valueKeys[0]] || 0) * 1.1]).range([0, activeWidth]);

            xAxisGroup.selectAll("*").remove();

            yAxisGroup.call(d3.axisLeft(yScale))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").remove())
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            const bars = svg.selectAll("rect").data(data);
            bars.exit().remove();
            bars.enter()
                .append("rect")
                .merge(bars)
                .attr("x", 0)
                .attr("y", d => yScale(d[catKey]))
                .attr("width", d => xScale(d[valueKeys[0]] || 0))
                .attr("height", yScale.bandwidth())
                .attr("fill", "#1ea0af")
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    d3.select(this).attr("fill", d3.rgb("#1ea0af").darker(0.5));
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    tooltip
                        .html(`<strong>${catKey}:</strong> ${d[catKey]}<br/><strong>${valueKeys[0]}:</strong> ${d[valueKeys[0]]}`)
                        .style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("fill", "#1ea0af");
                    tooltip.style("visibility", "hidden");
                });

            // Explanation Table to the Left for Horizontal Bar Chart
            if (showTable) {
                renderHorizontalBarLegendTable(data, catKey, activeFont, tickSize, borderThickness, yScale, margin.top);
            }

        } else if (activeType === "stacked-bar") {
            xAxisGroup.style("display", null);
            yAxisGroup.style("display", null);

            const xScale = d3.scaleBand().domain(data.map(d => d[catKey])).range([0, activeWidth]).padding(0.3);
            const maxStack = d3.max(data, d => d3.sum(valueKeys, k => d[k] || 0)) || 10;
            const yScale = d3.scaleLinear().domain([0, maxStack * 1.1]).range([activeHeight, 0]);

            xAxisGroup.call(d3.axisBottom(xScale))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").remove())
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            yAxisGroup.selectAll("*").remove();

            const stackedData = d3.stack().keys(valueKeys)(data);

            const stackedColors = ["#063137", "#16a1b5"];
            const colorScale = d3.scaleOrdinal()
                .domain(valueKeys)
                .range(valueKeys.map((_, i) => stackedColors[i % stackedColors.length]));

            const layers = svg.selectAll(".stack-layer").data(stackedData);
            layers.exit().remove();
            const layersEnter = layers.enter().append("g").attr("class", "stack-layer");

            const mergedLayers = layersEnter.merge(layers)
                .attr("fill", d => colorScale(d.key));

            const rects = mergedLayers.selectAll("rect").data(d => d);
            rects.exit().remove();
            rects.enter().append("rect")
                .merge(rects)
                .attr("x", d => xScale(d.data[catKey]))
                .attr("y", d => yScale(d[1]))
                .attr("width", xScale.bandwidth())
                .attr("height", d => yScale(d[0]) - yScale(d[1]))
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    d3.select(this).attr("opacity", 0.85);
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    const key = d3.select(this.parentNode).datum().key;
                    const val = d[1] - d[0];
                    tooltip
                        .html(`<strong>${catKey}:</strong> ${d.data[catKey]}<br/><strong>${key}:</strong> ${val}`)
                        .style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("opacity", 1.0);
                    tooltip.style("visibility", "hidden");
                });

            // Segment value labels inside segments at the top inside edge
            mergedLayers.selectAll(".stack-label")
                .data(d => d)
                .enter()
                .append("text")
                .attr("class", "stack-label")
                .attr("x", d => xScale(d.data[catKey]) + xScale.bandwidth() / 2)
                .attr("y", d => yScale(d[1]) + 12)
                .attr("text-anchor", "middle")
                .attr("fill", "#fff")
                .style("font-family", activeFont)
                .style("font-size", `${Math.max(9, parseFloat(tickSize) - 2)}px`)
                .text(d => {
                    const val = d[1] - d[0];
                    return val > 0 ? val : "";
                });

            // Adjust stack labels to prevent showing if text size is larger than shape, or if overlapping
            svg.selectAll(".stack-label").each(function (d) {
                const node = d3.select(this);
                const val = d[1] - d[0];
                if (val <= 0) {
                    node.style("display", "none");
                    return;
                }

                const bbox = this.getBBox();
                const textWidth = bbox.width;
                const textHeight = bbox.height || parseFloat(node.style("font-size")) || 10;

                const segmentWidth = xScale.bandwidth();
                const segmentHeight = yScale(d[0]) - yScale(d[1]);

                if (segmentHeight < textHeight || segmentWidth < textWidth) {
                    node.style("display", "none");
                }
            });

            const columnGroups = {};
            svg.selectAll(".stack-label").each(function (d) {
                const node = d3.select(this);
                if (node.style("display") === "none") return;

                const cat = d.data[catKey];
                if (!columnGroups[cat]) {
                    columnGroups[cat] = [];
                }

                columnGroups[cat].push({
                    node: node,
                    rect: this.getBoundingClientRect(),
                    val: d[1] - d[0]
                });
            });

            Object.keys(columnGroups).forEach(cat => {
                const items = columnGroups[cat];
                items.sort((a, b) => b.val - a.val);

                const kept = [];
                items.forEach(item => {
                    let overlaps = false;
                    for (const k of kept) {
                        const pad = 1;
                        if (!(item.rect.right + pad < k.rect.left - pad ||
                            item.rect.left - pad > k.rect.right + pad ||
                            item.rect.bottom + pad < k.rect.top - pad ||
                            item.rect.top - pad > k.rect.bottom + pad)) {
                            overlaps = true;
                            break;
                        }
                    }
                    if (overlaps) {
                        item.node.style("display", "none");
                    } else {
                        kept.push(item);
                    }
                });
            });

            // Legend is now rendered in the HTML headerLegend row (no SVG legend group needed)


            // Total value labels on top of columns
            svg.selectAll(".total-label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "total-label")
                .attr("x", d => xScale(d[catKey]) + xScale.bandwidth() / 2)
                .attr("y", d => yScale(d3.sum(valueKeys, k => d[k])) - 5)
                .attr("text-anchor", "middle")
                .attr("fill", "#333")
                .style("font-weight", "bold")
                .style("font-family", activeFont)
                .style("font-size", tickSize)
                .text(d => d3.sum(valueKeys, k => d[k]));

        } else if (activeType === "horizontal-stacked-bar") {
            xAxisGroup.style("display", null);
            yAxisGroup.style("display", null);

            const yScale = d3.scaleBand().domain(data.map(d => d[catKey])).range([0, activeHeight]).padding(0.3);
            const maxStack = d3.max(data, d => d3.sum(valueKeys, k => d[k] || 0)) || 10;
            const xScale = d3.scaleLinear().domain([0, maxStack * 1.1]).range([0, activeWidth]);

            xAxisGroup.selectAll("*").remove();

            yAxisGroup.call(d3.axisLeft(yScale))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").remove())
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            const stackedData = d3.stack().keys(valueKeys)(data);

            const stackedColors = ["#063137", "#16a1b5"];
            const colorScale = d3.scaleOrdinal()
                .domain(valueKeys)
                .range(valueKeys.map((_, i) => stackedColors[i % stackedColors.length]));

            const layers = svg.selectAll(".stack-layer").data(stackedData);
            layers.exit().remove();
            const layersEnter = layers.enter().append("g").attr("class", "stack-layer");

            const mergedLayers = layersEnter.merge(layers)
                .attr("fill", d => colorScale(d.key));

            const rects = mergedLayers.selectAll("rect").data(d => d);
            rects.exit().remove();
            rects.enter().append("rect")
                .merge(rects)
                .attr("x", d => xScale(d[0]))
                .attr("y", d => yScale(d.data[catKey]))
                .attr("width", d => xScale(d[1]) - xScale(d[0]))
                .attr("height", yScale.bandwidth())
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    d3.select(this).attr("opacity", 0.85);
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    const key = d3.select(this.parentNode).datum().key;
                    const val = d[1] - d[0];
                    tooltip
                        .html(`<strong>${catKey}:</strong> ${d.data[catKey]}<br/><strong>${key}:</strong> ${val}`)
                        .style("top", (event.pageY + 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).attr("opacity", 1.0);
                    tooltip.style("visibility", "hidden");
                });

            // Segment value labels inside segments at the far right inside edge
            mergedLayers.selectAll(".stack-label")
                .data(d => d)
                .enter()
                .append("text")
                .attr("class", "stack-label")
                .attr("x", d => xScale(d[1]) - 5)
                .attr("y", d => yScale(d.data[catKey]) + yScale.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .attr("fill", "#fff")
                .style("font-family", activeFont)
                .style("font-size", `${Math.max(9, parseFloat(tickSize) - 2)}px`)
                .text(d => {
                    const val = d[1] - d[0];
                    return val > 0 ? val : "";
                });

            // Adjust stack labels to prevent showing if text size is larger than shape, or if overlapping
            svg.selectAll(".stack-label").each(function (d) {
                const node = d3.select(this);
                const val = d[1] - d[0];
                if (val <= 0) {
                    node.style("display", "none");
                    return;
                }

                const bbox = this.getBBox();
                const textWidth = bbox.width;
                const textHeight = bbox.height || parseFloat(node.style("font-size")) || 10;

                const segmentWidth = xScale(d[1]) - xScale(d[0]);
                const segmentHeight = yScale.bandwidth();

                if (segmentWidth < textWidth || segmentHeight < textHeight) {
                    node.style("display", "none");
                }
            });

            const rowGroups = {};
            svg.selectAll(".stack-label").each(function (d) {
                const node = d3.select(this);
                if (node.style("display") === "none") return;

                const cat = d.data[catKey];
                if (!rowGroups[cat]) {
                    rowGroups[cat] = [];
                }

                rowGroups[cat].push({
                    node: node,
                    rect: this.getBoundingClientRect(),
                    val: d[1] - d[0]
                });
            });

            Object.keys(rowGroups).forEach(cat => {
                const items = rowGroups[cat];
                items.sort((a, b) => b.val - a.val);

                const kept = [];
                items.forEach(item => {
                    let overlaps = false;
                    for (const k of kept) {
                        const pad = 1;
                        if (!(item.rect.right + pad < k.rect.left - pad ||
                            item.rect.left - pad > k.rect.right + pad ||
                            item.rect.bottom + pad < k.rect.top - pad ||
                            item.rect.top - pad > k.rect.bottom + pad)) {
                            overlaps = true;
                            break;
                        }
                    }
                    if (overlaps) {
                        item.node.style("display", "none");
                    } else {
                        kept.push(item);
                    }
                });
            });

            // Legend is rendered in the HTML headerLegend row (no SVG legend group needed)


            // Total value labels beside columns (on the right)
            svg.selectAll(".total-label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "total-label")
                .attr("x", d => xScale(d3.sum(valueKeys, k => d[k])) + 5)
                .attr("y", d => yScale(d[catKey]) + yScale.bandwidth() / 2)
                .attr("alignment-baseline", "middle")
                .attr("fill", "#333")
                .style("font-weight", "bold")
                .style("font-family", activeFont)
                .style("font-size", tickSize)
                .text(d => d3.sum(valueKeys, k => d[k]));

            // Explanation Table to the Left for Horizontal Stacked Bar Chart
            if (showTable) {
                renderHorizontalBarLegendTable(data, catKey, activeFont, tickSize, borderThickness, yScale, margin.top);
            }
        }

        // Render logo in its own dedicated row below the chart content row
        logoRow.selectAll("*").remove();
        const selectedLogo = logoPicker.property("value");
        if (selectedLogo) {
            // Larger logo size
            const logoWidth = Math.max(40, Math.min(80, containerWidth * 0.12));
            let logoHeight = logoWidth;
            if (selectedLogo.includes("with text") || selectedLogo.includes("all white")) {
                logoHeight = logoWidth * 0.35;
            }

            logoRow.append("img")
                .attr("src", themeJsUrl + encodeURIComponent(selectedLogo))
                .style("width", `${logoWidth}px`)
                .style("height", `${logoHeight}px`)
                .style("object-fit", "contain");
        }

        updateChartWrapperLayout();
        scheduleResponsiveScale();
    }

    // ==========================================
    // 4. REAL-TIME EVENT LISTENER PIPELINES
    // ==========================================
    const dynamicInputs = [
        fontPicker, typePicker, logoPicker,
        tableToggle
    ];

    // Trigger instant redraw when any text field or font property shifts
    dynamicInputs.forEach(inputSelector => {
        inputSelector.on("input", () => { if (currentData.length > 0) renderChart(currentData); });
        inputSelector.on("change", () => { if (currentData.length > 0) renderChart(currentData); });
    });
    // Also update visibility whenever the chart type or table legend toggle changes
    typePicker.on("change.tablevis", updateTableControlsVisibility);
    tableToggle.on("change.chartoffsetvis", () => {
        updateChartOffsetControlsVisibility();
        if (currentData.length > 0) renderChart(currentData);
    });

    // Re-apply responsive scaling on window resize — no full re-render needed
    window.addEventListener('resize', applyResponsiveScale);

    // ==========================================
    // ERROR AND CUSTOM CSV PARSING HANDLERS
    // ==========================================
    function displayErrorState(message = "Tracking metrics update pending") {
        chartWrapperContainer.style("display", "none");
        let errorDiv = canvas.select("#chart-error-message");
        if (errorDiv.empty()) {
            errorDiv = canvas.append("div").attr("id", "chart-error-message");
        }
        errorDiv.style("display", "block")
            .style("padding", "30px")
            .style("margin", "20px 0")
            .style("text-align", "center")
            .style("font-family", fontPicker.property("value") || "sans-serif")
            .style("font-size", "16px")
            .style("color", "#666")
            .style("background-color", "#f9f9f9")
            .style("border", "1px dashed #ccc")
            .style("border-radius", "6px")
            .text(message);
    }

    function parseCSVAndRender(rawCsvText) {
        try {
            if (!rawCsvText || rawCsvText.trim() === "") {
                throw new Error("CSV data is empty");
            }
            Papa.parse(rawCsvText, {
                header: false,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function (results) {
                    try {
                        const rawData = results.data;
                        if (!rawData || rawData.length === 0) {
                            throw new Error("Empty CSV data");
                        }

                        const firstCell = String(rawData[0][0] || "").trim().toLowerCase();
                        let parsedData = [];

                        if (firstCell === "title") {
                            currentTitle = String(rawData[0][1] || "").trim();
                            if (rawData[1] && String(rawData[1][0] || "").trim().toLowerCase() === "subtitle") {
                                currentSubtitle = String(rawData[1][1] || "").trim();
                            } else {
                                currentSubtitle = "";
                            }

                            // Row 2 is headers/labels
                            if (!rawData[2]) {
                                throw new Error("Missing headers row in custom CSV");
                            }
                            const keys = rawData[2].map(k => String(k || "").trim());

                            // Data starts from index 3
                            for (let i = 3; i < rawData.length; i++) {
                                const row = rawData[i];
                                if (!row || row.length === 0) continue;
                                const obj = {};
                                keys.forEach((key, colIdx) => {
                                    let val = row[colIdx];
                                    if (typeof val === "string") {
                                        val = val.trim();
                                        const parsedNum = parseFloat(val);
                                        if (!isNaN(parsedNum)) {
                                            val = parsedNum;
                                        }
                                    }
                                    obj[key] = val;
                                });
                                parsedData.push(obj);
                            }
                        } else {
                            // Standard CSV format: Row 0 is headers
                            currentTitle = "";
                            currentSubtitle = "";
                            const keys = rawData[0].map(k => String(k || "").trim());
                            for (let i = 1; i < rawData.length; i++) {
                                const row = rawData[i];
                                if (!row || row.length === 0) continue;
                                const obj = {};
                                keys.forEach((key, colIdx) => {
                                    let val = row[colIdx];
                                    if (typeof val === "string") {
                                        val = val.trim();
                                        const parsedNum = parseFloat(val);
                                        if (!isNaN(parsedNum)) {
                                            val = parsedNum;
                                        }
                                    }
                                    obj[key] = val;
                                });
                                parsedData.push(obj);
                            }
                        }

                        if (parsedData.length === 0) {
                            throw new Error("No data records found in CSV");
                        }

                        // Hide error, show chart wrapper
                        const errorDiv = canvas.select("#chart-error-message");
                        if (!errorDiv.empty()) errorDiv.style("display", "none");
                        chartWrapperContainer.style("display", "block");

                        renderChart(parsedData);
                    } catch (e) {
                        console.error(e);
                        displayErrorState("Tracking metrics update pending");
                    }
                },
                error: function (err) {
                    console.error(err);
                    displayErrorState("Tracking metrics update pending");
                }
            });
        } catch (err) {
            console.error(err);
            displayErrorState("Tracking metrics update pending");
        }
    }

    // Detect file uploading activity
    fileInput.on("change", function (event) {
        const file = event.target.files[0];
        if (!file) {
            displayErrorState("Tracking metrics update pending");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const rawText = e.target.result;
            parseCSVAndRender(rawText);
        };
        reader.onerror = function () {
            displayErrorState("Tracking metrics update pending");
        };
        reader.readAsText(file);
    });

    // ==========================================
    // 5. RUNTIME INITIALIZATION (BASELINE FILE)
    // ==========================================
    const defaultCsvPath = defaultCsv || '/wp-content/media/csv/test-data.csv';
    fetch(defaultCsvPath)
        .then(response => { if (!response.ok) throw new Error(); return response.text(); })
        .then(rawCsvText => {
            parseCSVAndRender(rawCsvText);
        })
        .catch(err => {
            console.log("ℹ️ Waiting for initial CSV upload prompt...");
            displayErrorState("Tracking metrics update pending");
        });
});
