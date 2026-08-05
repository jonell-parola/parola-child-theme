/**
 * Parola Visualization Engine - Multi-instance Customization Dashboard
 *
 * Supports any number of .d3-test-canvas elements on the same page.
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Parola Engine: Visual scripting pipeline initializing...");

    const canvases = document.querySelectorAll(".d3-test-canvas");

    if (!canvases.length) {
        console.warn("⚠️ No .d3-test-canvas containers found on this page.");
        return;
    }

    canvases.forEach(function (canvasNode, instanceIndex) {
        initChart(canvasNode, instanceIndex);
    });

    function initChart(canvasNode, instanceIndex) {
        const canvas = d3.select(canvasNode);
        const uid = `p${instanceIndex}`;

        let customCol1Width = null;
        let customCol2Width = null;
        let currentTitle = "";
        let currentSubtitle = "";

        // Read configuration from each individual chart container.
        const defaultCsv =
    canvas.attr("data-csv-url") ||
    canvas.attr("data-source-file") ||
    "";
        const defaultFont =
            canvas.attr("typography-font-family") || "sans-serif";
        const defaultChartType = canvas.attr("chart-type") || "bar";
        const defaultLogoStyle =
            canvas.attr("logo-style") || "parola logo only.png";

        const rawShowTable = canvas.attr("data-show-table-legend");
        const defaultShowTable =
            rawShowTable === null ? true : rawShowTable === "true";

        canvas
            .style("position", "relative")
            .style("overflow", "visible");

        // Clear only this chart instance.
        canvas.selectAll("*").remove();

        // =========================================================
        // CONTROLS
        // =========================================================

        const controls = canvas
            .append("div")
            .style("margin-bottom", "25px")
            .style("padding", "20px")
            .style("background-color", "#f9f9f9")
            .style("border", "1px solid #e5e5e5")
            .style("border-radius", "8px")
            .style("font-family", "sans-serif")
            .style("font-size", "13px")
            .style("display", "grid")
            .style(
                "grid-template-columns",
                "repeat(auto-fit, minmax(220px, 1fr))"
            )
            .style("gap", "15px");

        function createInputGroup(
            parent,
            labelText,
            type,
            id,
            defaultValue,
            attributes = {}
        ) {
            const wrapper = parent
                .append("div")
                .style("display", "flex")
                .style("flex-direction", "column")
                .style("gap", "5px");

            wrapper
                .append("label")
                .text(labelText)
                .style("font-weight", "bold")
                .style("color", "#444");

            const input = wrapper
                .append("input")
                .attr("type", type)
                .attr("id", id)
                .attr("value", defaultValue);

            for (const key in attributes) {
                input.attr(key, attributes[key]);
            }

            return input;
        }

        const fileInput = createInputGroup(
            controls,
            "1. Data Source File (.csv):",
            "file",
            `csv-file-${uid}`,
            "",
            {
                accept: ".csv"
            }
        );

        // Typography dropdown.
        const fontWrapper = controls
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "5px");

        fontWrapper
            .append("label")
            .text("3. Typography Font Family:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const fontPicker = fontWrapper
            .append("select")
            .attr("id", `font-picker-${uid}`)
            .style("padding", "4px");

        [
            "sans-serif",
            "serif",
            "monospace",
            "cursive",
            "system-ui"
        ].forEach(function (font) {
            const option = fontPicker
                .append("option")
                .attr("value", font)
                .text(font);

            if (font === defaultFont) {
                option.property("selected", true);
            }
        });

        // Chart type dropdown.
        const typeWrapper = controls
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "5px");

        typeWrapper
            .append("label")
            .text("Chart Type:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const typePicker = typeWrapper
            .append("select")
            .attr("id", `chart-type-${uid}`)
            .style("padding", "4px");

        [
            {
                value: "bar",
                label: "Bar"
            },
            {
                value: "line",
                label: "Line"
            },
            {
                value: "pie",
                label: "Pie Chart"
            },
            {
                value: "stacked-bar",
                label: "Stacked Bar Chart"
            },
            {
                value: "horizontal-bar",
                label: "Horizontal Bar Chart"
            },
            {
                value: "horizontal-stacked-bar",
                label: "Horizontal Stacked Bar Chart"
            }
        ].forEach(function (item) {
            const option = typePicker
                .append("option")
                .attr("value", item.value)
                .text(item.label);

            if (item.value === defaultChartType) {
                option.property("selected", true);
            }
        });

        // Logo dropdown.
        const logoWrapper = controls
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "5px");

        logoWrapper
            .append("label")
            .text("Logo Style:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const logoPicker = logoWrapper
            .append("select")
            .attr("id", `logo-style-${uid}`)
            .style("padding", "4px");

        [
            {
                value: "parola logo only.png",
                label: "Logo Only"
            },
            {
                value: "parola logo all white.png",
                label: "All White"
            },
            {
                value: "parola logo with text.png",
                label: "Logo with Text"
            }
        ].forEach(function (item) {
            const option = logoPicker
                .append("option")
                .attr("value", item.value)
                .text(item.label);

            if (item.value === defaultLogoStyle) {
                option.property("selected", true);
            }
        });

        // Locate the JavaScript asset directory for the logo files.
        let themeJsUrl = "";

        const scripts = document.getElementsByTagName("script");

        for (const script of scripts) {
            if (
                script.src &&
                script.src.includes("parola-charts.js")
            ) {
                themeJsUrl = script.src.substring(
                    0,
                    script.src.lastIndexOf("/") + 1
                );

                break;
            }
        }

        if (!themeJsUrl) {
            themeJsUrl =
                "/wp-content/themes/parola-child-theme/js/";
        }

        const TABLE_CHART_TYPES = new Set([
            "pie",
            "horizontal-bar",
            "horizontal-stacked-bar"
        ]);

        const tableLegendSection = controls
            .append("div")
            .attr(
                "id",
                `table-legend-controls-section-${uid}`
            )
            .style("grid-column", "1 / -1")
            .style("display", "none")
            .style("padding", "15px")
            .style("margin-top", "5px")
            .style("border-top", "2px solid #ddd")
            .style("background-color", "#f0f4f5")
            .style("border-radius", "6px");

        tableLegendSection
            .append("div")
            .text("Table Legend Settings")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .style("color", "#333")
            .style("margin-bottom", "10px");

        const tableLegendGrid = tableLegendSection
            .append("div")
            .style("display", "grid")
            .style(
                "grid-template-columns",
                "repeat(auto-fit, minmax(220px, 1fr))"
            )
            .style("gap", "15px");

        const tableToggleWrapper = tableLegendGrid
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "5px");

        tableToggleWrapper
            .append("label")
            .text("Show Table Legend:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const tableToggle = tableToggleWrapper
            .append("input")
            .attr("type", "checkbox")
            .attr("id", `table-toggle-${uid}`)
            .property("checked", defaultShowTable)
            .style("width", "20px")
            .style("height", "20px")
            .style("cursor", "pointer");

        function updateTableControlsVisibility() {
            const visible = TABLE_CHART_TYPES.has(
                typePicker.property("value")
            );

            tableLegendSection.style(
                "display",
                visible ? "block" : "none"
            );
        }

        updateTableControlsVisibility();

        // =========================================================
        // CHART STRUCTURE
        // =========================================================

        const margin = {
            top: 60,
            right: 30,
            bottom: 60,
            left: 70
        };

        const tooltip = d3
            .select("body")
            .append("div")
            .attr(
                "class",
                `parola-chart-tooltip parola-chart-tooltip-${uid}`
            )
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "#333")
            .style("color", "#fff")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-family", "sans-serif")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style(
                "box-shadow",
                "0 2px 5px rgba(0,0,0,0.2)"
            )
            .style("z-index", "99999");

        const chartWrapperContainer = canvas
            .append("div")
            .attr(
                "id",
                `chart-wrapper-container-${uid}`
            )
            .style("position", "relative")
            .style("overflow", "visible")
            .style("width", "100%");

        const chartWrapper = chartWrapperContainer
            .append("div")
            .attr("id", `chart-wrapper-${uid}`)
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("position", "relative")
            .style("overflow", "visible")
            .style("width", "100%");

        const headerRow = chartWrapper
            .append("div")
            .attr("id", `chart-header-row-${uid}`)
            .style("width", "100%")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("align-items", "flex-start")
            .style("margin-bottom", "15px");

        const headerTitle = headerRow
            .append("div")
            .attr("id", `chart-header-title-${uid}`)
            .style("font-weight", "bold")
            .style("color", "#333")
            .style("line-height", "1.2");

        const headerSubtitle = headerRow
            .append("div")
            .attr(
                "id",
                `chart-header-subtitle-${uid}`
            )
            .style("color", "#545454")
            .style("line-height", "1.2")
            .style("margin-top", "4px");

        const headerLegend = headerRow
            .append("div")
            .attr("id", `chart-header-legend-${uid}`)
            .style("display", "none")
            .style("width", "100%")
            .style("justify-content", "center")
            .style("gap", "20px")
            .style("margin-top", "10px");

        const contentRow = chartWrapper
            .append("div")
            .attr("id", `chart-content-row-${uid}`)
            .style("display", "flex")
            .style("flex-direction", "row")
            .style("align-items", "flex-start")
            .style("position", "relative")
            .style("overflow", "visible")
            .style("width", "100%");

        const logoRow = chartWrapper
            .append("div")
            .attr("id", `chart-logo-row-${uid}`)
            .style("width", "100%")
            .style("display", "flex")
            .style("justify-content", "flex-end")
            .style("padding-top", "10px")
            .style("padding-bottom", "10px");

        const tableContainer = contentRow
            .append("div")
            .attr("id", `table-container-${uid}`);

        const svgOuter = contentRow
            .append("svg")
            .attr("class", `parola-chart-svg-${uid}`)
            .style("overflow", "visible");

        const svg = svgOuter
            .append("g")
            .attr(
                "transform",
                `translate(${margin.left},${margin.top})`
            );

        const xAxisGroup = svg
            .append("g")
            .attr("class", "x-axis");

        const yAxisGroup = svg
            .append("g")
            .attr("class", "y-axis");

        const mainTitleText = svg
            .append("text")
            .attr("x", 0)
            .attr("y", -35)
            .attr("text-anchor", "start")
            .style("font-weight", "bold");

        const subtitleText = svg
            .append("text")
            .attr("x", 0)
            .attr("y", -15)
            .attr("text-anchor", "start")
            .attr("fill", "#545454");

        let currentData = [];
        let naturalWrapperWidth = 0;
        let naturalWrapperHeight = 0;
                // =========================================================
        // RESPONSIVE SCALING
        // =========================================================

        function applyResponsiveScale() {
            const canvasElement = canvas.node();

            if (
                !canvasElement ||
                naturalWrapperWidth <= 0
            ) {
                return;
            }

            const availableWidth =
                canvasElement.getBoundingClientRect().width;

            if (availableWidth <= 0) {
                return;
            }

            const scale =
                availableWidth / naturalWrapperWidth;

            const scaledHeight =
                naturalWrapperHeight * scale;

            chartWrapper
                .style("min-width", null)
                .style("min-height", null)
                .style(
                    "width",
                    `${naturalWrapperWidth}px`
                )
                .style(
                    "transform",
                    `scale(${scale})`
                )
                .style(
                    "transform-origin",
                    "top left"
                );

            chartWrapperContainer
                .style(
                    "width",
                    `${availableWidth}px`
                )
                .style(
                    "height",
                    `${scaledHeight}px`
                );

            canvas
                .style("padding-bottom", null)
                .style("margin-bottom", null);
        }

        function scheduleResponsiveScale() {
            chartWrapper
                .style("transform", null)
                .style("transform-origin", null)
                .style("min-width", null)
                .style("min-height", null)
                .style("width", "100%");

            chartWrapperContainer
                .style("width", "100%")
                .style("height", null);

            canvas
                .style("padding-bottom", null)
                .style("margin-bottom", null);

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        if (!chartWrapper.node()) {
                            return;
                        }

                        const svgWidth =
                            parseFloat(
                                svgOuter.attr("width")
                            ) || 0;

                        const tableVisible =
                            tableContainer.style(
                                "display"
                            ) !== "none";

                        const containerWidth =
                            canvas
                                .node()
                                .getBoundingClientRect()
                                .width || 550;

                        const activeType =
                            typePicker.property("value");

                        let tableWidth = 0;

                        if (tableVisible) {
                            if (
                                activeType ===
                                    "horizontal-bar" ||
                                activeType ===
                                    "horizontal-stacked-bar"
                            ) {
                                tableWidth = Math.max(
                                    120,
                                    Math.min(
                                        240,
                                        containerWidth * 0.3
                                    )
                                );
                            } else {
                                tableWidth = Math.max(
                                    180,
                                    Math.min(
                                        300,
                                        containerWidth * 0.4
                                    )
                                );
                            }
                        }

                        naturalWrapperWidth =
                            svgWidth + tableWidth;

                        naturalWrapperHeight =
                            chartWrapper
                                .node()
                                .getBoundingClientRect()
                                .height;

                        if (
                            naturalWrapperWidth > 0 &&
                            naturalWrapperHeight > 0
                        ) {
                            applyResponsiveScale();
                        }
                    });
                });
            });
        }

        function applyTableLegendContainerStyles() {
            const containerWidth =
                canvas
                    .node()
                    .getBoundingClientRect()
                    .width || 550;

            const activeType =
                typePicker.property("value");

            let targetWidth;

            if (
                activeType === "horizontal-bar" ||
                activeType ===
                    "horizontal-stacked-bar"
            ) {
                targetWidth = Math.max(
                    120,
                    Math.min(
                        240,
                        containerWidth * 0.3
                    )
                );
            } else {
                targetWidth = Math.max(
                    180,
                    Math.min(
                        300,
                        containerWidth * 0.4
                    )
                );
            }

            tableContainer
                .style("display", "block")
                .style("position", "relative")
                .style("left", "0px")
                .style("top", "0px")
                .style("margin", "0")
                .style("padding", "0")
                .style(
                    "width",
                    `${targetWidth}px`
                )
                .style("overflow", "visible")
                .style("transform", null);
        }

        function applyChartContainerStyles() {
            svgOuter
                .style("position", null)
                .style("left", null)
                .style("top", null)
                .style("margin", null)
                .style("transform", null);
        }

        function updateChartWrapperLayout() {
            const layoutBuffer = 40;

            function applyLayout() {
                const wrapperNode =
                    chartWrapper.node();

                if (!wrapperNode) {
                    return;
                }

                const wrapperRect =
                    wrapperNode.getBoundingClientRect();

                const contentNode =
                    contentRow.node();

                if (!contentNode) {
                    return;
                }

                const contentRect =
                    contentNode.getBoundingClientRect();

                let maxContentBottom = 0;
                let maxContentRight = 0;

                if (
                    tableContainer.style(
                        "display"
                    ) !== "none" &&
                    tableContainer.node()
                ) {
                    const tableRect =
                        tableContainer
                            .node()
                            .getBoundingClientRect();

                    maxContentBottom = Math.max(
                        maxContentBottom,
                        tableRect.bottom -
                            contentRect.top
                    );

                    maxContentRight = Math.max(
                        maxContentRight,
                        tableRect.right -
                            contentRect.left
                    );
                }

                if (svgOuter.node()) {
                    const chartRect =
                        svgOuter
                            .node()
                            .getBoundingClientRect();

                    maxContentBottom = Math.max(
                        maxContentBottom,
                        chartRect.bottom -
                            contentRect.top
                    );

                    maxContentRight = Math.max(
                        maxContentRight,
                        chartRect.right -
                            contentRect.left
                    );
                }

                contentRow
                    .style(
                        "min-height",
                        `${Math.ceil(
                            maxContentBottom
                        )}px`
                    )
                    .style(
                        "min-width",
                        `${Math.ceil(
                            maxContentRight
                        )}px`
                    );

                const headerHeight =
                    headerRow.node()
                        ? headerRow
                              .node()
                              .getBoundingClientRect()
                              .height
                        : 0;

                const logoHeight =
                    logoRow.node() &&
                    logoRow.node().children
                        .length > 0
                        ? logoRow
                              .node()
                              .getBoundingClientRect()
                              .height
                        : 0;

                const totalRequiredHeight =
                    headerHeight +
                    maxContentBottom +
                    logoHeight;

                let maxRight = maxContentRight;

                if (
                    logoRow.node() &&
                    logoRow.node().children
                        .length > 0
                ) {
                    const logoRect =
                        logoRow
                            .node()
                            .getBoundingClientRect();

                    maxRight = Math.max(
                        maxRight,
                        logoRect.right -
                            wrapperRect.left
                    );
                }

                chartWrapper
                    .style(
                        "min-height",
                        `${Math.ceil(
                            totalRequiredHeight +
                                layoutBuffer
                        )}px`
                    )
                    .style(
                        "min-width",
                        `${Math.ceil(
                            maxRight
                        )}px`
                    );

                canvas
                    .style(
                        "padding-bottom",
                        `${layoutBuffer}px`
                    )
                    .style(
                        "margin-bottom",
                        `${layoutBuffer}px`
                    );
            }

            requestAnimationFrame(applyLayout);
        }

        function renderHTMLHeader(
            mainTitleValue,
            subtitleValue,
            activeFont,
            mainTitleSize,
            activeType,
            showTable,
            valueKeys,
            tickSize
        ) {
            const usesTableLegendLayout =
                TABLE_CHART_TYPES.has(
                    activeType
                ) && showTable;

            const isStackedType =
                activeType === "stacked-bar" ||
                activeType ===
                    "horizontal-stacked-bar";

            if (
                !usesTableLegendLayout &&
                !isStackedType
            ) {
                headerRow.style(
                    "display",
                    "none"
                );

                headerLegend.style(
                    "display",
                    "none"
                );

                return;
            }

            headerRow.style(
                "display",
                "flex"
            );

            const subtitleSize =
                `${Math.max(
                    10,
                    parseFloat(mainTitleSize) - 4
                )}px`;

            headerTitle
                .text(mainTitleValue)
                .style(
                    "font-family",
                    activeFont
                )
                .style(
                    "font-size",
                    mainTitleSize
                );

            headerSubtitle
                .text(subtitleValue)
                .style(
                    "font-family",
                    activeFont
                )
                .style(
                    "font-size",
                    subtitleSize
                );

            headerLegend
                .selectAll("*")
                .remove();

            const stackedColors = [
                "#063137",
                "#16a1b5"
            ];

            const colorScale =
                d3.scaleOrdinal()
                    .domain(valueKeys)
                    .range(
                        valueKeys.map(
                            function (_, index) {
                                return stackedColors[
                                    index %
                                        stackedColors.length
                                ];
                            }
                        )
                    );

            if (
                activeType ===
                    "horizontal-stacked-bar" ||
                activeType ===
                    "stacked-bar"
            ) {
                headerLegend
                    .style(
                        "display",
                        "flex"
                    )
                    .style(
                        "justify-content",
                        "center"
                    );

                valueKeys.forEach(
                    function (key) {
                        const item =
                            headerLegend
                                .append("div")
                                .style(
                                    "display",
                                    "flex"
                                )
                                .style(
                                    "align-items",
                                    "center"
                                )
                                .style(
                                    "gap",
                                    "6px"
                                );

                        item.append("div")
                            .style(
                                "width",
                                "12px"
                            )
                            .style(
                                "height",
                                "12px"
                            )
                            .style(
                                "border-radius",
                                "50%"
                            )
                            .style(
                                "background-color",
                                colorScale(key)
                            );

                        item.append("span")
                            .text(key)
                            .style(
                                "font-family",
                                activeFont
                            )
                            .style(
                                "font-size",
                                tickSize
                            )
                            .style(
                                "color",
                                "#333"
                            );
                    }
                );
            } else {
                headerLegend.style(
                    "display",
                    "none"
                );
            }
        }

        function applyTableLegendScale(
            table
        ) {
            const containerWidth =
                canvas
                    .node()
                    .getBoundingClientRect()
                    .width || 550;

            const activeType =
                typePicker.property("value");

            let targetWidth;

            if (
                activeType ===
                    "horizontal-bar" ||
                activeType ===
                    "horizontal-stacked-bar"
            ) {
                targetWidth = Math.max(
                    120,
                    Math.min(
                        240,
                        containerWidth * 0.3
                    )
                );
            } else {
                targetWidth = Math.max(
                    180,
                    Math.min(
                        300,
                        containerWidth * 0.4
                    )
                );
            }

            let chartWidth = containerWidth;
            let chartHeight = Math.max(
                300,
                containerWidth * 0.65
            );

            if (activeType === "pie") {
                const size = Math.min(
                    chartWidth,
                    480
                );

                chartWidth = size;
                chartHeight = size;
            }

            table
                .style(
                    "width",
                    `${targetWidth}px`
                )
                .style(
                    "height",
                    `${chartHeight}px`
                );
        }

        function renderHorizontalBarLegendTable(
            data,
            categoryKey,
            activeFont,
            legendFontSize,
            borderThickness,
            yScale,
            svgMarginTop
        ) {
            applyTableLegendContainerStyles();

            const scrollbarStyleId =
                `hide-scrollbar-style-${uid}`;

            if (
                d3.select(
                    `#${scrollbarStyleId}`
                ).empty()
            ) {
                d3.select("head")
                    .append("style")
                    .attr(
                        "id",
                        scrollbarStyleId
                    )
                    .text(`
                        .parola-no-scrollbar-${uid}::-webkit-scrollbar {
                            display: none;
                        }

                        .parola-no-scrollbar-${uid} {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                    `);
            }

            const bandHeight =
                yScale.bandwidth();

            const containerWidth =
                canvas
                    .node()
                    .getBoundingClientRect()
                    .width || 550;

            const activeType =
                typePicker.property("value");

            const chartHeight = Math.max(
                300,
                containerWidth * 0.65
            );

            let targetWidth;

            if (
                activeType ===
                    "horizontal-bar" ||
                activeType ===
                    "horizontal-stacked-bar"
            ) {
                targetWidth = Math.max(
                    120,
                    Math.min(
                        240,
                        containerWidth * 0.3
                    )
                );
            } else {
                targetWidth = Math.max(
                    180,
                    Math.min(
                        300,
                        containerWidth * 0.4
                    )
                );
            }

            tableContainer
                .style(
                    "position",
                    "relative"
                )
                .style(
                    "height",
                    `${chartHeight}px`
                );

            const marginTop =
                svgMarginTop || 0;

            data.forEach(
                function (row, index) {
                    const top =
                        yScale(
                            row[categoryKey]
                        ) + marginTop;

                    const description =
                        tableContainer
                            .append("div")
                            .style(
                                "position",
                                "absolute"
                            )
                            .style(
                                "left",
                                "0"
                            )
                            .style(
                                "top",
                                `${top}px`
                            )
                            .style(
                                "width",
                                `${targetWidth}px`
                            )
                            .style(
                                "height",
                                `${bandHeight}px`
                            )
                            .style(
                                "display",
                                "flex"
                            )
                            .style(
                                "align-items",
                                "center"
                            )
                            .style(
                                "justify-content",
                                "flex-end"
                            )
                            .style(
                                "box-sizing",
                                "border-box"
                            )
                            .style(
                                "font-family",
                                activeFont
                            )
                            .style(
                                "font-size",
                                legendFontSize
                            );

                    description
                        .append("div")
                        .attr(
                            "class",
                            `parola-no-scrollbar-${uid}`
                        )
                        .style(
                            "max-width",
                            "100%"
                        )
                        .style(
                            "overflow-x",
                            "auto"
                        )
                        .style(
                            "overflow-y",
                            "hidden"
                        )
                        .style(
                            "white-space",
                            "nowrap"
                        )
                        .style(
                            "text-align",
                            "right"
                        )
                        .text(function () {
                            const descriptionKey =
                                Object.keys(
                                    row
                                ).find(
                                    function (
                                        key
                                    ) {
                                        return (
                                            key.toLowerCase() ===
                                            "description"
                                        );
                                    }
                                );

                            return descriptionKey
                                ? String(
                                      row[
                                          descriptionKey
                                      ] || ""
                                  )
                                : "";
                        });

                    if (
                        index <
                        data.length - 1
                    ) {
                        const nextTop =
                            yScale(
                                data[
                                    index + 1
                                ][categoryKey]
                            ) + marginTop;

                        const lineTop =
                            (
                                top +
                                bandHeight +
                                nextTop
                            ) / 2;

                        tableContainer
                            .append("div")
                            .style(
                                "position",
                                "absolute"
                            )
                            .style(
                                "left",
                                "0"
                            )
                            .style(
                                "top",
                                `${lineTop}px`
                            )
                            .style(
                                "width",
                                `${targetWidth}px`
                            )
                            .style(
                                "height",
                                `${borderThickness}px`
                            )
                            .style(
                                "background-color",
                                "#858585"
                            );
                    }
                }
            );
        }
        // =========================================================
        // MAIN CHART RENDERER
        // =========================================================

        function renderChart(data) {
            if (!data || data.length === 0) {
                return;
            }

            currentData = data;

            const activeFont =
                fontPicker.property("value");

            const activeType =
                typePicker.property("value");

            const containerWidth =
                canvas
                    .node()
                    .getBoundingClientRect()
                    .width || 550;

            let chartWidth =
                containerWidth;

            let chartHeight =
                Math.max(
                    300,
                    containerWidth * 0.65
                );

            if (activeType === "pie") {
                const size =
                    Math.min(
                        chartWidth,
                        480
                    );

                chartWidth = size;
                chartHeight = size;
            }

            const activeWidth =
                chartWidth -
                margin.left -
                margin.right;

            const activeHeight =
                chartHeight -
                margin.top -
                margin.bottom;

            svgOuter
                .attr(
                    "width",
                    activeWidth +
                        margin.left +
                        margin.right
                )
                .attr(
                    "height",
                    activeHeight +
                        margin.top +
                        margin.bottom
                );

            xAxisGroup.attr(
                "transform",
                `translate(0,${activeHeight})`
            );

            const mainTitleValue =
                currentTitle ||
                "Intellectual Property Metrics";

            const subtitleValue =
                currentSubtitle ||
                "Global Patent Trends";

            const mainTitleSize =
                `${Math.max(
                    14,
                    Math.min(
                        22,
                        chartWidth * 0.035
                    )
                )}px`;

            const tickSize =
                `${Math.max(
                    9,
                    Math.min(
                        13,
                        chartWidth * 0.02
                    )
                )}px`;

            const legendFontSize =
                `${Math.max(
                    10,
                    Math.min(
                        14,
                        chartWidth * 0.022
                    )
                )}px`;

            mainTitleText
                .text(mainTitleValue)
                .style(
                    "font-family",
                    activeFont
                )
                .style(
                    "font-size",
                    mainTitleSize
                );

            subtitleText
                .text(subtitleValue)
                .style(
                    "font-family",
                    activeFont
                )
                .style(
                    "font-size",
                    `${Math.max(
                        10,
                        parseFloat(
                            mainTitleSize
                        ) - 4
                    )}px`
                );

            const showTable =
                tableToggle.property(
                    "checked"
                );

            const borderThickness = 1;

            // Detect category, description and numeric columns.
            const keys =
                Object.keys(data[0]);

            const categoryKey =
                keys[0] || "Company";

            const descriptionKey =
                keys.find(
                    function (key) {
                        return (
                            key.toLowerCase() ===
                            "description"
                        );
                    }
                );

            let valueKeys =
                keys
                    .slice(1)
                    .filter(
                        function (key) {
                            if (
                                key ===
                                descriptionKey
                            ) {
                                return false;
                            }

                            return (
                                typeof data[0][key] ===
                                    "number" ||
                                !isNaN(
                                    parseFloat(
                                        data[0][key]
                                    )
                                )
                            );
                        }
                    );

            if (
                valueKeys.length === 0
            ) {
                valueKeys = ["Patents"];
            }

            // Ensure all detected values are numeric.
            data.forEach(
                function (row) {
                    valueKeys.forEach(
                        function (key) {
                            if (
                                row[key] !==
                                    undefined &&
                                typeof row[key] ===
                                    "string"
                            ) {
                                row[key] =
                                    parseFloat(
                                        row[key]
                                    ) || 0;
                            }
                        }
                    );
                }
            );

            // Reset the table legend before each render.
            tableContainer
                .selectAll("*")
                .remove();

            tableContainer
                .style(
                    "display",
                    "none"
                )
                .style(
                    "padding-top",
                    "0"
                )
                .style(
                    "transform",
                    null
                );

            const usesTableLegendLayout =
                TABLE_CHART_TYPES.has(
                    activeType
                ) && showTable;

            if (
                usesTableLegendLayout ||
                activeType ===
                    "stacked-bar" ||
                activeType ===
                    "horizontal-stacked-bar"
            ) {
                mainTitleText.style(
                    "display",
                    "none"
                );

                subtitleText.style(
                    "display",
                    "none"
                );
            } else {
                mainTitleText.style(
                    "display",
                    null
                );

                subtitleText.style(
                    "display",
                    null
                );
            }

            renderHTMLHeader(
                mainTitleValue,
                subtitleValue,
                activeFont,
                mainTitleSize,
                activeType,
                showTable,
                valueKeys,
                tickSize
            );

            applyChartContainerStyles();

            // Clear visual elements from the previous chart type.
            svg.selectAll(
                ".bar-label"
            ).remove();

            svg.selectAll("rect").remove();

            svg.selectAll(
                ".chart-line"
            ).remove();

            svg.selectAll(
                ".chart-dot"
            ).remove();

            svg.selectAll(
                ".pie-group"
            ).remove();

            svg.selectAll(
                ".legend-group"
            ).remove();

            svg.selectAll(
                ".stack-layer"
            ).remove();

            svg.selectAll(
                ".stack-label"
            ).remove();

            svg.selectAll(
                ".total-label"
            ).remove();

            // =====================================================
            // PIE CHART
            // =====================================================

            if (activeType === "pie") {
                xAxisGroup.style(
                    "display",
                    "none"
                );

                yAxisGroup.style(
                    "display",
                    "none"
                );

                const baseRadius = 100;

                const radiusX =
                    Math.max(
                        10,
                        activeWidth / 2 - 10
                    );

                const radiusY =
                    Math.max(
                        10,
                        activeHeight / 2 - 10
                    );

                const scaleX =
                    radiusX / baseRadius;

                const scaleY =
                    radiusY / baseRadius;

                const pieGroup =
                    svg.append("g")
                        .attr(
                            "class",
                            "pie-group"
                        )
                        .attr(
                            "transform",
                            `translate(${
                                activeWidth / 2
                            },${
                                activeHeight / 2
                            })`
                        );

                const pie =
                    d3.pie()
                        .value(
                            function (row) {
                                return (
                                    row[
                                        valueKeys[0]
                                    ] || 0
                                );
                            }
                        )
                        .sort(null);

                const arc =
                    d3.arc()
                        .innerRadius(0)
                        .outerRadius(
                            baseRadius
                        );

                const labelArc =
                    d3.arc()
                        .innerRadius(
                            baseRadius + 12
                        )
                        .outerRadius(
                            baseRadius + 12
                        );

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

                const sortedData =
                    [...data].sort(
                        function (a, b) {
                            return (
                                (
                                    b[
                                        valueKeys[0]
                                    ] || 0
                                ) -
                                (
                                    a[
                                        valueKeys[0]
                                    ] || 0
                                )
                            );
                        }
                    );

                const colorMap =
                    new Map();

                sortedData.forEach(
                    function (
                        row,
                        index
                    ) {
                        colorMap.set(
                            row[
                                categoryKey
                            ],
                            PIE_COLORS[
                                index %
                                    PIE_COLORS.length
                            ]
                        );
                    }
                );

                const pieData =
                    pie(data);

                const arcs =
                    pieGroup
                        .selectAll(
                            ".arc"
                        )
                        .data(pieData)
                        .enter()
                        .append("g")
                        .attr(
                            "class",
                            "arc"
                        );

                arcs.append("path")
                    .attr("d", arc)
                    .attr(
                        "transform",
                        `scale(${scaleX},${scaleY})`
                    )
                    .attr(
                        "fill",
                        function (slice) {
                            return colorMap.get(
                                slice.data[
                                    categoryKey
                                ]
                            );
                        }
                    )
                    .attr(
                        "stroke",
                        "none"
                    )
                    .style(
                        "cursor",
                        "pointer"
                    )
                    .on(
                        "mouseover",
                        function () {
                            d3.select(this)
                                .attr(
                                    "opacity",
                                    0.85
                                );

                            tooltip.style(
                                "visibility",
                                "visible"
                            );
                        }
                    )
                    .on(
                        "mousemove",
                        function (
                            event,
                            slice
                        ) {
                            tooltip
                                .html(
                                    `<strong>${categoryKey}:</strong> ${
                                        slice
                                            .data[
                                            categoryKey
                                        ]
                                    }<br><strong>${valueKeys[0]}:</strong> ${
                                        slice
                                            .data[
                                            valueKeys[0]
                                        ]
                                    }`
                                )
                                .style(
                                    "top",
                                    `${
                                        event.pageY +
                                        10
                                    }px`
                                )
                                .style(
                                    "left",
                                    `${
                                        event.pageX +
                                        10
                                    }px`
                                );
                        }
                    )
                    .on(
                        "mouseout",
                        function () {
                            d3.select(this)
                                .attr(
                                    "opacity",
                                    1
                                );

                            tooltip.style(
                                "visibility",
                                "hidden"
                            );
                        }
                    );

                const totalSum =
                    d3.sum(
                        data,
                        function (row) {
                            return (
                                row[
                                    valueKeys[0]
                                ] || 0
                            );
                        }
                    );

                arcs.append("text")
                    .attr(
                        "transform",
                        function (slice) {
                            const centroid =
                                labelArc.centroid(
                                    slice
                                );

                            const x =
                                centroid[0] *
                                scaleX;

                            const y =
                                centroid[1] *
                                scaleY;

                            return `translate(${x},${y})`;
                        }
                    )
                    .attr(
                        "text-anchor",
                        function (slice) {
                            const middleAngle =
                                slice.startAngle +
                                (
                                    slice.endAngle -
                                    slice.startAngle
                                ) /
                                    2;

                            return middleAngle <
                                Math.PI
                                ? "start"
                                : "end";
                        }
                    )
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        tickSize
                    )
                    .style(
                        "fill",
                        "#333"
                    )
                    .text(
                        function (slice) {
                            const value =
                                slice.data[
                                    valueKeys[0]
                                ] || 0;

                            const percentage =
                                totalSum > 0
                                    ? (
                                          (
                                              value /
                                              totalSum
                                          ) *
                                          100
                                      ).toFixed(
                                          1
                                      )
                                    : 0;

                            return `${
                                slice.data[
                                    categoryKey
                                ]
                            } (${percentage}%)`;
                        }
                    );

                // Hide pie labels that overlap.
                const labelTexts =
                    pieGroup.selectAll(
                        "text"
                    );

                const renderedBounds =
                    [];

                labelTexts.each(
                    function () {
                        const currentLabel =
                            d3.select(this);

                        let box =
                            this.getBoundingClientRect();

                        if (
                            box.width === 0 &&
                            box.height === 0 &&
                            this.getBBox
                        ) {
                            const svgBox =
                                this.getBBox();

                            box = {
                                left:
                                    svgBox.x,
                                top:
                                    svgBox.y,
                                right:
                                    svgBox.x +
                                    svgBox.width,
                                bottom:
                                    svgBox.y +
                                    svgBox.height,
                                width:
                                    svgBox.width,
                                height:
                                    svgBox.height
                            };
                        }

                        let overlaps =
                            false;

                        for (
                            const existingBox
                            of renderedBounds
                        ) {
                            const padding = 2;

                            const separated =
                                box.right +
                                    padding <
                                    existingBox.left -
                                        padding ||
                                box.left -
                                    padding >
                                    existingBox.right +
                                        padding ||
                                box.bottom +
                                    padding <
                                    existingBox.top -
                                        padding ||
                                box.top -
                                    padding >
                                    existingBox.bottom +
                                        padding;

                            if (!separated) {
                                overlaps =
                                    true;
                                break;
                            }
                        }

                        if (overlaps) {
                            currentLabel.style(
                                "display",
                                "none"
                            );
                        } else {
                            renderedBounds.push(
                                box
                            );
                        }
                    }
                );

                // =================================================
                // PIE LEGEND TABLE
                // =================================================

                if (showTable) {
                    applyTableLegendContainerStyles();

                    const targetWidth =
                        Math.max(
                            140,
                            Math.min(
                                220,
                                containerWidth *
                                    0.28
                            )
                        );

                    const targetHeight =
                        Math.min(
                            containerWidth,
                            480
                        );

                    const rowCount =
                        sortedData.length;

                    const rowHeight =
                        targetHeight /
                        Math.max(
                            rowCount,
                            1
                        );

                    const baseFontSize =
                        parseFloat(
                            legendFontSize
                        ) || 12;

                    const maxFontForRow =
                        Math.max(
                            7,
                            rowHeight - 8
                        );

                    const pieLegendFontSize =
                        `${Math.min(
                            baseFontSize,
                            maxFontForRow
                        )}px`;

                    const cellPadding =
                        rowHeight < 24
                            ? "1px 4px"
                            : "4px 6px";

                    tableContainer
                        .style(
                            "height",
                            `${targetHeight}px`
                        )
                        .style(
                            "overflow-y",
                            "auto"
                        )
                        .style(
                            "overflow-x",
                            "hidden"
                        )
                        .style(
                            "scrollbar-width",
                            "thin"
                        )
                        .style(
                            "direction",
                            "rtl"
                        );

                    const table =
                        tableContainer
                            .append(
                                "table"
                            )
                            .style(
                                "direction",
                                "ltr"
                            )
                            .style(
                                "border-collapse",
                                "collapse"
                            )
                            .style(
                                "font-family",
                                activeFont
                            )
                            .style(
                                "table-layout",
                                "fixed"
                            );

                    applyTableLegendScale(
                        table
                    );

                    const rows =
                        table
                            .selectAll(
                                "tr"
                            )
                            .data(
                                sortedData
                            )
                            .enter()
                            .append("tr")
                            .style(
                                "height",
                                `${rowHeight}px`
                            )
                            .style(
                                "box-sizing",
                                "border-box"
                            );

                    rows.each(
                        function (
                            row,
                            index
                        ) {
                            if (
                                index <
                                sortedData.length -
                                    1
                            ) {
                                d3.select(
                                    this
                                ).style(
                                    "border-bottom",
                                    `${borderThickness}px solid #858585`
                                );
                            }
                        }
                    );

                    let colorColumnWidth =
                        customCol1Width !==
                        null
                            ? customCol1Width
                            : rowHeight;

                    let nameColumnWidth =
                        customCol2Width !==
                        null
                            ? customCol2Width
                            : colorColumnWidth;

                    let descriptionColumnWidth =
                        Math.max(
                            10,
                            targetWidth -
                                colorColumnWidth -
                                nameColumnWidth
                        );

                    const colorCells = [];
                    const nameCells = [];
                    const descriptionCells =
                        [];

                    rows.each(
                        function (row) {
                            const tableRow =
                                d3.select(
                                    this
                                );

                            const colorCell =
                                tableRow
                                    .append(
                                        "td"
                                    )
                                    .style(
                                        "width",
                                        `${colorColumnWidth}px`
                                    )
                                    .style(
                                        "min-width",
                                        `${colorColumnWidth}px`
                                    )
                                    .style(
                                        "padding",
                                        "0"
                                    )
                                    .style(
                                        "vertical-align",
                                        "middle"
                                    )
                                    .style(
                                        "position",
                                        "relative"
                                    )
                                    .style(
                                        "background-color",
                                        colorMap.get(
                                            row[
                                                categoryKey
                                            ]
                                        )
                                    );

                            colorCells.push(
                                colorCell
                            );

                            const nameCell =
                                tableRow
                                    .append(
                                        "td"
                                    )
                                    .style(
                                        "width",
                                        `${nameColumnWidth}px`
                                    )
                                    .style(
                                        "padding",
                                        cellPadding
                                    )
                                    .style(
                                        "vertical-align",
                                        "middle"
                                    )
                                    .style(
                                        "font-size",
                                        pieLegendFontSize
                                    )
                                    .style(
                                        "word-break",
                                        "break-word"
                                    )
                                    .style(
                                        "position",
                                        "relative"
                                    )
                                    .text(
                                        row[
                                            categoryKey
                                        ]
                                    );

                            nameCells.push(
                                nameCell
                            );

                            const descriptionCell =
                                tableRow
                                    .append(
                                        "td"
                                    )
                                    .style(
                                        "width",
                                        `${descriptionColumnWidth}px`
                                    )
                                    .style(
                                        "padding",
                                        cellPadding
                                    )
                                    .style(
                                        "vertical-align",
                                        "middle"
                                    )
                                    .style(
                                        "font-size",
                                        pieLegendFontSize
                                    )
                                    .style(
                                        "position",
                                        "relative"
                                    );

                            descriptionCells.push(
                                descriptionCell
                            );

                            descriptionCell
                                .append(
                                    "div"
                                )
                                .style(
                                    "min-height",
                                    "1.2em"
                                )
                                .style(
                                    "word-break",
                                    "break-word"
                                )
                                .text(
                                    descriptionKey
                                        ? String(
                                              row[
                                                  descriptionKey
                                              ] ||
                                                  ""
                                          )
                                        : ""
                                );

                            const firstResizer =
                                colorCell
                                    .append(
                                        "div"
                                    )
                                    .style(
                                        "position",
                                        "absolute"
                                    )
                                    .style(
                                        "top",
                                        "0"
                                    )
                                    .style(
                                        "right",
                                        "0"
                                    )
                                    .style(
                                        "width",
                                        "6px"
                                    )
                                    .style(
                                        "height",
                                        "100%"
                                    )
                                    .style(
                                        "cursor",
                                        "col-resize"
                                    )
                                    .style(
                                        "z-index",
                                        "10"
                                    );

                            firstResizer.on(
                                "mousedown",
                                function (
                                    event
                                ) {
                                    event.preventDefault();

                                    const startX =
                                        event.clientX;

                                    const startWidth =
                                        colorColumnWidth;

                                    d3.select(
                                        window
                                    ).on(
                                        `mousemove.resizer1-${uid}`,
                                        function (
                                            moveEvent
                                        ) {
                                            const delta =
                                                moveEvent.clientX -
                                                startX;

                                            colorColumnWidth =
                                                Math.max(
                                                    10,
                                                    startWidth +
                                                        delta
                                                );

                                            customCol1Width =
                                                colorColumnWidth;

                                            descriptionColumnWidth =
                                                Math.max(
                                                    10,
                                                    targetWidth -
                                                        colorColumnWidth -
                                                        nameColumnWidth
                                                );

                                            colorCells.forEach(
                                                function (
                                                    cell
                                                ) {
                                                    cell.style(
                                                        "width",
                                                        `${colorColumnWidth}px`
                                                    ).style(
                                                        "min-width",
                                                        `${colorColumnWidth}px`
                                                    );
                                                }
                                            );

                                            descriptionCells.forEach(
                                                function (
                                                    cell
                                                ) {
                                                    cell.style(
                                                        "width",
                                                        `${descriptionColumnWidth}px`
                                                    );
                                                }
                                            );
                                        }
                                    );

                                    d3.select(
                                        window
                                    ).on(
                                        `mouseup.resizer1-${uid}`,
                                        function () {
                                            d3.select(
                                                window
                                            ).on(
                                                `mousemove.resizer1-${uid}`,
                                                null
                                            );

                                            d3.select(
                                                window
                                            ).on(
                                                `mouseup.resizer1-${uid}`,
                                                null
                                            );

                                            if (
                                                currentData.length >
                                                0
                                            ) {
                                                renderChart(
                                                    currentData
                                                );
                                            }
                                        }
                                    );
                                }
                            );

                            const secondResizer =
                                nameCell
                                    .append(
                                        "div"
                                    )
                                    .style(
                                        "position",
                                        "absolute"
                                    )
                                    .style(
                                        "top",
                                        "0"
                                    )
                                    .style(
                                        "right",
                                        "0"
                                    )
                                    .style(
                                        "width",
                                        "6px"
                                    )
                                    .style(
                                        "height",
                                        "100%"
                                    )
                                    .style(
                                        "cursor",
                                        "col-resize"
                                    )
                                    .style(
                                        "z-index",
                                        "10"
                                    );

                            secondResizer.on(
                                "mousedown",
                                function (
                                    event
                                ) {
                                    event.preventDefault();

                                    const startX =
                                        event.clientX;

                                    const startWidth =
                                        nameColumnWidth;

                                    d3.select(
                                        window
                                    ).on(
                                        `mousemove.resizer2-${uid}`,
                                        function (
                                            moveEvent
                                        ) {
                                            const delta =
                                                moveEvent.clientX -
                                                startX;

                                            nameColumnWidth =
                                                Math.max(
                                                    10,
                                                    startWidth +
                                                        delta
                                                );

                                            customCol2Width =
                                                nameColumnWidth;

                                            descriptionColumnWidth =
                                                Math.max(
                                                    10,
                                                    targetWidth -
                                                        colorColumnWidth -
                                                        nameColumnWidth
                                                );

                                            nameCells.forEach(
                                                function (
                                                    cell
                                                ) {
                                                    cell.style(
                                                        "width",
                                                        `${nameColumnWidth}px`
                                                    );
                                                }
                                            );

                                            descriptionCells.forEach(
                                                function (
                                                    cell
                                                ) {
                                                    cell.style(
                                                        "width",
                                                        `${descriptionColumnWidth}px`
                                                    );
                                                }
                                            );
                                        }
                                    );

                                    d3.select(
                                        window
                                    ).on(
                                        `mouseup.resizer2-${uid}`,
                                        function () {
                                            d3.select(
                                                window
                                            ).on(
                                                `mousemove.resizer2-${uid}`,
                                                null
                                            );

                                            d3.select(
                                                window
                                            ).on(
                                                `mouseup.resizer2-${uid}`,
                                                null
                                            );

                                            if (
                                                currentData.length >
                                                0
                                            ) {
                                                renderChart(
                                                    currentData
                                                );
                                            }
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            }
                        // =====================================================
            // LINE CHART
            // =====================================================

            else if (activeType === "line") {
                xAxisGroup.style("display", null);
                yAxisGroup.style("display", null);

                const xScale = d3
                    .scaleBand()
                    .domain(
                        data.map(function (row) {
                            return row[categoryKey];
                        })
                    )
                    .range([0, activeWidth])
                    .padding(0.3);

                const maximumValue =
                    d3.max(data, function (row) {
                        return row[valueKeys[0]] || 0;
                    }) || 0;

                const yScale = d3
                    .scaleLinear()
                    .domain([
                        0,
                        maximumValue > 0
                            ? maximumValue * 1.1
                            : 1
                    ])
                    .range([activeHeight, 0]);

                xAxisGroup
                    .call(d3.axisBottom(xScale))
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                yAxisGroup
                    .call(d3.axisLeft(yScale))
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                const lineGenerator = d3
                    .line()
                    .x(function (row) {
                        return (
                            xScale(row[categoryKey]) +
                            xScale.bandwidth() / 2
                        );
                    })
                    .y(function (row) {
                        return yScale(
                            row[valueKeys[0]] || 0
                        );
                    });

                const linePath = svg
                    .selectAll(".chart-line")
                    .data([data]);

                linePath
                    .exit()
                    .remove();

                linePath
                    .enter()
                    .append("path")
                    .attr("class", "chart-line")
                    .merge(linePath)
                    .attr("d", lineGenerator)
                    .attr("fill", "none")
                    .attr("stroke", "#1ea0af")
                    .attr("stroke-width", 3);

                const dots = svg
                    .selectAll(".chart-dot")
                    .data(data);

                dots.exit().remove();

                dots
                    .enter()
                    .append("circle")
                    .attr("class", "chart-dot")
                    .merge(dots)
                    .attr("cx", function (row) {
                        return (
                            xScale(row[categoryKey]) +
                            xScale.bandwidth() / 2
                        );
                    })
                    .attr("cy", function (row) {
                        return yScale(
                            row[valueKeys[0]] || 0
                        );
                    })
                    .attr("r", 6)
                    .attr("fill", "#1ea0af")
                    .style("cursor", "pointer")
                    .on("mouseover", function () {
                        d3.select(this)
                            .attr(
                                "fill",
                                d3.rgb("#1ea0af").darker(0.5)
                            )
                            .attr("r", 8);

                        tooltip.style(
                            "visibility",
                            "visible"
                        );
                    })
                    .on(
                        "mousemove",
                        function (event, row) {
                            tooltip
                                .html(
                                    `<strong>${categoryKey}:</strong> ${
                                        row[categoryKey]
                                    }<br><strong>${valueKeys[0]}:</strong> ${
                                        row[valueKeys[0]]
                                    }`
                                )
                                .style(
                                    "top",
                                    `${event.pageY + 10}px`
                                )
                                .style(
                                    "left",
                                    `${event.pageX + 10}px`
                                );
                        }
                    )
                    .on("mouseout", function () {
                        d3.select(this)
                            .attr("fill", "#1ea0af")
                            .attr("r", 6);

                        tooltip.style(
                            "visibility",
                            "hidden"
                        );
                    });
            }

            // =====================================================
            // STANDARD VERTICAL BAR CHART
            // =====================================================

            else if (activeType === "bar") {
                xAxisGroup.style("display", null);
                yAxisGroup.style("display", null);

                const xScale = d3
                    .scaleBand()
                    .domain(
                        data.map(function (row) {
                            return row[categoryKey];
                        })
                    )
                    .range([0, activeWidth])
                    .padding(0.3);

                const maximumValue =
                    d3.max(data, function (row) {
                        return row[valueKeys[0]] || 0;
                    }) || 0;

                const yScale = d3
                    .scaleLinear()
                    .domain([
                        0,
                        maximumValue > 0
                            ? maximumValue * 1.1
                            : 1
                    ])
                    .range([activeHeight, 0]);

                xAxisGroup
                    .call(d3.axisBottom(xScale))
                    .call(function (group) {
                        group
                            .select(".domain")
                            .remove();
                    })
                    .call(function (group) {
                        group
                            .selectAll(".tick line")
                            .remove();
                    })
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                yAxisGroup.selectAll("*").remove();

                const bars = svg
                    .selectAll("rect")
                    .data(data);

                bars.exit().remove();

                bars
                    .enter()
                    .append("rect")
                    .merge(bars)
                    .attr("x", function (row) {
                        return xScale(
                            row[categoryKey]
                        );
                    })
                    .attr("y", function (row) {
                        return yScale(
                            row[valueKeys[0]] || 0
                        );
                    })
                    .attr(
                        "width",
                        xScale.bandwidth()
                    )
                    .attr("height", function (row) {
                        return (
                            activeHeight -
                            yScale(
                                row[valueKeys[0]] || 0
                            )
                        );
                    })
                    .attr("fill", "#1ea0af")
                    .style("cursor", "pointer")
                    .on("mouseover", function () {
                        d3.select(this).attr(
                            "fill",
                            d3.rgb("#1ea0af").darker(0.5)
                        );

                        tooltip.style(
                            "visibility",
                            "visible"
                        );
                    })
                    .on(
                        "mousemove",
                        function (event, row) {
                            tooltip
                                .html(
                                    `<strong>${categoryKey}:</strong> ${
                                        row[categoryKey]
                                    }<br><strong>${valueKeys[0]}:</strong> ${
                                        row[valueKeys[0]]
                                    }`
                                )
                                .style(
                                    "top",
                                    `${event.pageY + 10}px`
                                )
                                .style(
                                    "left",
                                    `${event.pageX + 10}px`
                                );
                        }
                    )
                    .on("mouseout", function () {
                        d3.select(this).attr(
                            "fill",
                            "#1ea0af"
                        );

                        tooltip.style(
                            "visibility",
                            "hidden"
                        );
                    });

                svg.selectAll(".bar-label")
                    .data(data)
                    .enter()
                    .append("text")
                    .attr(
                        "class",
                        "bar-label"
                    )
                    .attr("x", function (row) {
                        return (
                            xScale(
                                row[categoryKey]
                            ) +
                            xScale.bandwidth() / 2
                        );
                    })
                    .attr("y", function (row) {
                        return (
                            yScale(
                                row[valueKeys[0]] || 0
                            ) + 15
                        );
                    })
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .attr("fill", "#ffffff")
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-weight",
                        "bold"
                    )
                    .style(
                        "font-size",
                        `${Math.max(
                            10,
                            parseFloat(tickSize)
                        )}px`
                    )
                    .text(function (row) {
                        return row[valueKeys[0]] || 0;
                    });
            }

            // =====================================================
            // HORIZONTAL BAR CHART
            // =====================================================

            else if (
                activeType === "horizontal-bar"
            ) {
                xAxisGroup.style("display", null);
                yAxisGroup.style("display", null);

                const yScale = d3
                    .scaleBand()
                    .domain(
                        data.map(function (row) {
                            return row[categoryKey];
                        })
                    )
                    .range([0, activeHeight])
                    .padding(0.3);

                const maximumValue =
                    d3.max(data, function (row) {
                        return row[valueKeys[0]] || 0;
                    }) || 0;

                const xScale = d3
                    .scaleLinear()
                    .domain([
                        0,
                        maximumValue > 0
                            ? maximumValue * 1.1
                            : 1
                    ])
                    .range([0, activeWidth]);

                xAxisGroup.selectAll("*").remove();

                yAxisGroup
                    .call(d3.axisLeft(yScale))
                    .call(function (group) {
                        group
                            .select(".domain")
                            .remove();
                    })
                    .call(function (group) {
                        group
                            .selectAll(".tick line")
                            .remove();
                    })
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                const bars = svg
                    .selectAll("rect")
                    .data(data);

                bars.exit().remove();

                bars
                    .enter()
                    .append("rect")
                    .merge(bars)
                    .attr("x", 0)
                    .attr("y", function (row) {
                        return yScale(
                            row[categoryKey]
                        );
                    })
                    .attr("width", function (row) {
                        return xScale(
                            row[valueKeys[0]] || 0
                        );
                    })
                    .attr(
                        "height",
                        yScale.bandwidth()
                    )
                    .attr("fill", "#1ea0af")
                    .style("cursor", "pointer")
                    .on("mouseover", function () {
                        d3.select(this).attr(
                            "fill",
                            d3.rgb("#1ea0af").darker(0.5)
                        );

                        tooltip.style(
                            "visibility",
                            "visible"
                        );
                    })
                    .on(
                        "mousemove",
                        function (event, row) {
                            tooltip
                                .html(
                                    `<strong>${categoryKey}:</strong> ${
                                        row[categoryKey]
                                    }<br><strong>${valueKeys[0]}:</strong> ${
                                        row[valueKeys[0]]
                                    }`
                                )
                                .style(
                                    "top",
                                    `${event.pageY + 10}px`
                                )
                                .style(
                                    "left",
                                    `${event.pageX + 10}px`
                                );
                        }
                    )
                    .on("mouseout", function () {
                        d3.select(this).attr(
                            "fill",
                            "#1ea0af"
                        );

                        tooltip.style(
                            "visibility",
                            "hidden"
                        );
                    });

                if (showTable) {
                    renderHorizontalBarLegendTable(
                        data,
                        categoryKey,
                        activeFont,
                        tickSize,
                        borderThickness,
                        yScale,
                        margin.top
                    );
                }
            }

            // =====================================================
            // VERTICAL STACKED BAR CHART
            // =====================================================

            else if (
                activeType === "stacked-bar"
            ) {
                xAxisGroup.style("display", null);
                yAxisGroup.style("display", null);

                const xScale = d3
                    .scaleBand()
                    .domain(
                        data.map(function (row) {
                            return row[categoryKey];
                        })
                    )
                    .range([0, activeWidth])
                    .padding(0.3);

                const maximumStack =
                    d3.max(data, function (row) {
                        return d3.sum(
                            valueKeys,
                            function (key) {
                                return row[key] || 0;
                            }
                        );
                    }) || 10;

                const yScale = d3
                    .scaleLinear()
                    .domain([
                        0,
                        maximumStack * 1.1
                    ])
                    .range([activeHeight, 0]);

                xAxisGroup
                    .call(d3.axisBottom(xScale))
                    .call(function (group) {
                        group
                            .select(".domain")
                            .remove();
                    })
                    .call(function (group) {
                        group
                            .selectAll(".tick line")
                            .remove();
                    })
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                yAxisGroup.selectAll("*").remove();

                const stackedData = d3
                    .stack()
                    .keys(valueKeys)(data);

                const stackedColors = [
                    "#063137",
                    "#16a1b5"
                ];

                const colorScale = d3
                    .scaleOrdinal()
                    .domain(valueKeys)
                    .range(
                        valueKeys.map(
                            function (_, index) {
                                return stackedColors[
                                    index %
                                        stackedColors.length
                                ];
                            }
                        )
                    );

                const layers = svg
                    .selectAll(".stack-layer")
                    .data(stackedData);

                layers.exit().remove();

                const enteredLayers =
                    layers
                        .enter()
                        .append("g")
                        .attr(
                            "class",
                            "stack-layer"
                        );

                const mergedLayers =
                    enteredLayers
                        .merge(layers)
                        .attr(
                            "fill",
                            function (layer) {
                                return colorScale(
                                    layer.key
                                );
                            }
                        );

                const segments =
                    mergedLayers
                        .selectAll("rect")
                        .data(function (layer) {
                            return layer;
                        });

                segments.exit().remove();

                segments
                    .enter()
                    .append("rect")
                    .merge(segments)
                    .attr("x", function (segment) {
                        return xScale(
                            segment.data[
                                categoryKey
                            ]
                        );
                    })
                    .attr("y", function (segment) {
                        return yScale(
                            segment[1]
                        );
                    })
                    .attr(
                        "width",
                        xScale.bandwidth()
                    )
                    .attr("height", function (segment) {
                        return (
                            yScale(segment[0]) -
                            yScale(segment[1])
                        );
                    })
                    .style("cursor", "pointer")
                    .on("mouseover", function () {
                        d3.select(this).attr(
                            "opacity",
                            0.85
                        );

                        tooltip.style(
                            "visibility",
                            "visible"
                        );
                    })
                    .on(
                        "mousemove",
                        function (event, segment) {
                            const layerKey =
                                d3.select(
                                    this.parentNode
                                ).datum().key;

                            const segmentValue =
                                segment[1] -
                                segment[0];

                            tooltip
                                .html(
                                    `<strong>${categoryKey}:</strong> ${
                                        segment.data[
                                            categoryKey
                                        ]
                                    }<br><strong>${layerKey}:</strong> ${segmentValue}`
                                )
                                .style(
                                    "top",
                                    `${event.pageY + 10}px`
                                )
                                .style(
                                    "left",
                                    `${event.pageX + 10}px`
                                );
                        }
                    )
                    .on("mouseout", function () {
                        d3.select(this).attr(
                            "opacity",
                            1
                        );

                        tooltip.style(
                            "visibility",
                            "hidden"
                        );
                    });

                mergedLayers
                    .selectAll(".stack-label")
                    .data(function (layer) {
                        return layer;
                    })
                    .enter()
                    .append("text")
                    .attr(
                        "class",
                        "stack-label"
                    )
                    .attr("x", function (segment) {
                        return (
                            xScale(
                                segment.data[
                                    categoryKey
                                ]
                            ) +
                            xScale.bandwidth() / 2
                        );
                    })
                    .attr("y", function (segment) {
                        return (
                            yScale(segment[1]) +
                            12
                        );
                    })
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .attr("fill", "#ffffff")
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        `${Math.max(
                            9,
                            parseFloat(tickSize) - 2
                        )}px`
                    )
                    .text(function (segment) {
                        const value =
                            segment[1] -
                            segment[0];

                        return value > 0
                            ? value
                            : "";
                    });
                                    // Hide stack labels that do not fit their segment.
                svg.selectAll(".stack-label").each(
                    function (segment) {
                        const label =
                            d3.select(this);

                        const value =
                            segment[1] -
                            segment[0];

                        if (value <= 0) {
                            label.style(
                                "display",
                                "none"
                            );

                            return;
                        }

                        const boundingBox =
                            this.getBBox();

                        const textWidth =
                            boundingBox.width;

                        const textHeight =
                            boundingBox.height ||
                            parseFloat(
                                label.style(
                                    "font-size"
                                )
                            ) ||
                            10;

                        const segmentWidth =
                            xScale.bandwidth();

                        const segmentHeight =
                            yScale(segment[0]) -
                            yScale(segment[1]);

                        if (
                            segmentHeight <
                                textHeight ||
                            segmentWidth <
                                textWidth
                        ) {
                            label.style(
                                "display",
                                "none"
                            );
                        }
                    }
                );

                // Remove overlapping labels within each stacked column.
                const columnGroups = {};

                svg.selectAll(".stack-label").each(
                    function (segment) {
                        const label =
                            d3.select(this);

                        if (
                            label.style(
                                "display"
                            ) === "none"
                        ) {
                            return;
                        }

                        const category =
                            segment.data[
                                categoryKey
                            ];

                        if (
                            !columnGroups[
                                category
                            ]
                        ) {
                            columnGroups[
                                category
                            ] = [];
                        }

                        columnGroups[
                            category
                        ].push({
                            node: label,
                            rect:
                                this.getBoundingClientRect(),
                            value:
                                segment[1] -
                                segment[0]
                        });
                    }
                );

                Object.keys(
                    columnGroups
                ).forEach(
                    function (category) {
                        const items =
                            columnGroups[
                                category
                            ];

                        items.sort(
                            function (a, b) {
                                return (
                                    b.value -
                                    a.value
                                );
                            }
                        );

                        const kept = [];

                        items.forEach(
                            function (item) {
                                let overlaps =
                                    false;

                                for (
                                    const existing
                                    of kept
                                ) {
                                    const padding =
                                        1;

                                    const separated =
                                        item.rect
                                            .right +
                                            padding <
                                            existing
                                                .rect
                                                .left -
                                                padding ||
                                        item.rect
                                            .left -
                                            padding >
                                            existing
                                                .rect
                                                .right +
                                                padding ||
                                        item.rect
                                            .bottom +
                                            padding <
                                            existing
                                                .rect
                                                .top -
                                                padding ||
                                        item.rect
                                            .top -
                                            padding >
                                            existing
                                                .rect
                                                .bottom +
                                                padding;

                                    if (
                                        !separated
                                    ) {
                                        overlaps =
                                            true;

                                        break;
                                    }
                                }

                                if (
                                    overlaps
                                ) {
                                    item.node.style(
                                        "display",
                                        "none"
                                    );
                                } else {
                                    kept.push(
                                        item
                                    );
                                }
                            }
                        );
                    }
                );

                // Total labels above stacked columns.
                svg.selectAll(
                    ".total-label"
                )
                    .data(data)
                    .enter()
                    .append("text")
                    .attr(
                        "class",
                        "total-label"
                    )
                    .attr(
                        "x",
                        function (row) {
                            return (
                                xScale(
                                    row[
                                        categoryKey
                                    ]
                                ) +
                                xScale.bandwidth() /
                                    2
                            );
                        }
                    )
                    .attr(
                        "y",
                        function (row) {
                            const total =
                                d3.sum(
                                    valueKeys,
                                    function (
                                        key
                                    ) {
                                        return (
                                            row[
                                                key
                                            ] ||
                                            0
                                        );
                                    }
                                );

                            return (
                                yScale(
                                    total
                                ) - 5
                            );
                        }
                    )
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .attr(
                        "fill",
                        "#333"
                    )
                    .style(
                        "font-weight",
                        "bold"
                    )
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        tickSize
                    )
                    .text(
                        function (row) {
                            return d3.sum(
                                valueKeys,
                                function (
                                    key
                                ) {
                                    return (
                                        row[
                                            key
                                        ] ||
                                        0
                                    );
                                }
                            );
                        }
                    );
            }

            // =====================================================
            // HORIZONTAL STACKED BAR CHART
            // =====================================================

            else if (
                activeType ===
                "horizontal-stacked-bar"
            ) {
                xAxisGroup.style(
                    "display",
                    null
                );

                yAxisGroup.style(
                    "display",
                    null
                );

                const yScale =
                    d3.scaleBand()
                        .domain(
                            data.map(
                                function (
                                    row
                                ) {
                                    return row[
                                        categoryKey
                                    ];
                                }
                            )
                        )
                        .range([
                            0,
                            activeHeight
                        ])
                        .padding(0.3);

                const maximumStack =
                    d3.max(
                        data,
                        function (row) {
                            return d3.sum(
                                valueKeys,
                                function (
                                    key
                                ) {
                                    return (
                                        row[
                                            key
                                        ] ||
                                        0
                                    );
                                }
                            );
                        }
                    ) || 10;

                const xScale =
                    d3.scaleLinear()
                        .domain([
                            0,
                            maximumStack *
                                1.1
                        ])
                        .range([
                            0,
                            activeWidth
                        ]);

                xAxisGroup
                    .selectAll("*")
                    .remove();

                yAxisGroup
                    .call(
                        d3.axisLeft(
                            yScale
                        )
                    )
                    .call(
                        function (
                            group
                        ) {
                            group
                                .select(
                                    ".domain"
                                )
                                .remove();
                        }
                    )
                    .call(
                        function (
                            group
                        ) {
                            group
                                .selectAll(
                                    ".tick line"
                                )
                                .remove();
                        }
                    )
                    .selectAll(
                        "text"
                    )
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        tickSize
                    );

                const stackedData =
                    d3.stack()
                        .keys(
                            valueKeys
                        )(data);

                const stackedColors =
                    [
                        "#063137",
                        "#16a1b5"
                    ];

                const colorScale =
                    d3.scaleOrdinal()
                        .domain(
                            valueKeys
                        )
                        .range(
                            valueKeys.map(
                                function (
                                    _,
                                    index
                                ) {
                                    return stackedColors[
                                        index %
                                            stackedColors.length
                                    ];
                                }
                            )
                        );

                const layers =
                    svg.selectAll(
                        ".stack-layer"
                    )
                        .data(
                            stackedData
                        );

                layers
                    .exit()
                    .remove();

                const enteredLayers =
                    layers
                        .enter()
                        .append("g")
                        .attr(
                            "class",
                            "stack-layer"
                        );

                const mergedLayers =
                    enteredLayers
                        .merge(
                            layers
                        )
                        .attr(
                            "fill",
                            function (
                                layer
                            ) {
                                return colorScale(
                                    layer.key
                                );
                            }
                        );

                const segments =
                    mergedLayers
                        .selectAll(
                            "rect"
                        )
                        .data(
                            function (
                                layer
                            ) {
                                return layer;
                            }
                        );

                segments
                    .exit()
                    .remove();

                segments
                    .enter()
                    .append("rect")
                    .merge(
                        segments
                    )
                    .attr(
                        "x",
                        function (
                            segment
                        ) {
                            return xScale(
                                segment[0]
                            );
                        }
                    )
                    .attr(
                        "y",
                        function (
                            segment
                        ) {
                            return yScale(
                                segment
                                    .data[
                                    categoryKey
                                ]
                            );
                        }
                    )
                    .attr(
                        "width",
                        function (
                            segment
                        ) {
                            return (
                                xScale(
                                    segment[1]
                                ) -
                                xScale(
                                    segment[0]
                                )
                            );
                        }
                    )
                    .attr(
                        "height",
                        yScale.bandwidth()
                    )
                    .style(
                        "cursor",
                        "pointer"
                    )
                    .on(
                        "mouseover",
                        function () {
                            d3.select(
                                this
                            ).attr(
                                "opacity",
                                0.85
                            );

                            tooltip.style(
                                "visibility",
                                "visible"
                            );
                        }
                    )
                    .on(
                        "mousemove",
                        function (
                            event,
                            segment
                        ) {
                            const layerKey =
                                d3.select(
                                    this
                                        .parentNode
                                ).datum()
                                    .key;

                            const value =
                                segment[1] -
                                segment[0];

                            tooltip
                                .html(
                                    `<strong>${categoryKey}:</strong> ${
                                        segment
                                            .data[
                                            categoryKey
                                        ]
                                    }<br><strong>${layerKey}:</strong> ${value}`
                                )
                                .style(
                                    "top",
                                    `${
                                        event.pageY +
                                        10
                                    }px`
                                )
                                .style(
                                    "left",
                                    `${
                                        event.pageX +
                                        10
                                    }px`
                                );
                        }
                    )
                    .on(
                        "mouseout",
                        function () {
                            d3.select(
                                this
                            ).attr(
                                "opacity",
                                1
                            );

                            tooltip.style(
                                "visibility",
                                "hidden"
                            );
                        }
                    );

                mergedLayers
                    .selectAll(
                        ".stack-label"
                    )
                    .data(
                        function (
                            layer
                        ) {
                            return layer;
                        }
                    )
                    .enter()
                    .append("text")
                    .attr(
                        "class",
                        "stack-label"
                    )
                    .attr(
                        "x",
                        function (
                            segment
                        ) {
                            return (
                                xScale(
                                    segment[1]
                                ) - 5
                            );
                        }
                    )
                    .attr(
                        "y",
                        function (
                            segment
                        ) {
                            return (
                                yScale(
                                    segment
                                        .data[
                                        categoryKey
                                    ]
                                ) +
                                yScale.bandwidth() /
                                    2
                            );
                        }
                    )
                    .attr(
                        "dy",
                        "0.35em"
                    )
                    .attr(
                        "text-anchor",
                        "end"
                    )
                    .attr(
                        "fill",
                        "#ffffff"
                    )
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        `${Math.max(
                            9,
                            parseFloat(
                                tickSize
                            ) - 2
                        )}px`
                    )
                    .text(
                        function (
                            segment
                        ) {
                            const value =
                                segment[1] -
                                segment[0];

                            return value >
                                0
                                ? value
                                : "";
                        }
                    );

                // Hide labels that cannot fit inside the segment.
                svg.selectAll(
                    ".stack-label"
                ).each(
                    function (
                        segment
                    ) {
                        const label =
                            d3.select(
                                this
                            );

                        const value =
                            segment[1] -
                            segment[0];

                        if (
                            value <= 0
                        ) {
                            label.style(
                                "display",
                                "none"
                            );

                            return;
                        }

                        const boundingBox =
                            this.getBBox();

                        const textWidth =
                            boundingBox.width;

                        const textHeight =
                            boundingBox.height ||
                            parseFloat(
                                label.style(
                                    "font-size"
                                )
                            ) ||
                            10;

                        const segmentWidth =
                            xScale(
                                segment[1]
                            ) -
                            xScale(
                                segment[0]
                            );

                        const segmentHeight =
                            yScale.bandwidth();

                        if (
                            segmentWidth <
                                textWidth ||
                            segmentHeight <
                                textHeight
                        ) {
                            label.style(
                                "display",
                                "none"
                            );
                        }
                    }
                );

                const rowGroups = {};

                svg.selectAll(
                    ".stack-label"
                ).each(
                    function (
                        segment
                    ) {
                        const label =
                            d3.select(
                                this
                            );

                        if (
                            label.style(
                                "display"
                            ) === "none"
                        ) {
                            return;
                        }

                        const category =
                            segment.data[
                                categoryKey
                            ];

                        if (
                            !rowGroups[
                                category
                            ]
                        ) {
                            rowGroups[
                                category
                            ] = [];
                        }

                        rowGroups[
                            category
                        ].push({
                            node: label,
                            rect:
                                this.getBoundingClientRect(),
                            value:
                                segment[1] -
                                segment[0]
                        });
                    }
                );

                Object.keys(
                    rowGroups
                ).forEach(
                    function (
                        category
                    ) {
                        const items =
                            rowGroups[
                                category
                            ];

                        items.sort(
                            function (
                                a,
                                b
                            ) {
                                return (
                                    b.value -
                                    a.value
                                );
                            }
                        );

                        const kept =
                            [];

                        items.forEach(
                            function (
                                item
                            ) {
                                let overlaps =
                                    false;

                                for (
                                    const existing
                                    of kept
                                ) {
                                    const padding =
                                        1;

                                    const separated =
                                        item.rect
                                            .right +
                                            padding <
                                            existing
                                                .rect
                                                .left -
                                                padding ||
                                        item.rect
                                            .left -
                                            padding >
                                            existing
                                                .rect
                                                .right +
                                                padding ||
                                        item.rect
                                            .bottom +
                                            padding <
                                            existing
                                                .rect
                                                .top -
                                                padding ||
                                        item.rect
                                            .top -
                                            padding >
                                            existing
                                                .rect
                                                .bottom +
                                                padding;

                                    if (
                                        !separated
                                    ) {
                                        overlaps =
                                            true;

                                        break;
                                    }
                                }

                                if (
                                    overlaps
                                ) {
                                    item.node.style(
                                        "display",
                                        "none"
                                    );
                                } else {
                                    kept.push(
                                        item
                                    );
                                }
                            }
                        );
                    }
                );

                // Totals displayed to the right of each row.
                svg.selectAll(
                    ".total-label"
                )
                    .data(data)
                    .enter()
                    .append("text")
                    .attr(
                        "class",
                        "total-label"
                    )
                    .attr(
                        "x",
                        function (row) {
                            const total =
                                d3.sum(
                                    valueKeys,
                                    function (
                                        key
                                    ) {
                                        return (
                                            row[
                                                key
                                            ] ||
                                            0
                                        );
                                    }
                                );

                            return (
                                xScale(
                                    total
                                ) + 5
                            );
                        }
                    )
                    .attr(
                        "y",
                        function (row) {
                            return (
                                yScale(
                                    row[
                                        categoryKey
                                    ]
                                ) +
                                yScale.bandwidth() /
                                    2
                            );
                        }
                    )
                    .attr(
                        "alignment-baseline",
                        "middle"
                    )
                    .attr(
                        "fill",
                        "#333"
                    )
                    .style(
                        "font-weight",
                        "bold"
                    )
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        tickSize
                    )
                    .text(
                        function (row) {
                            return d3.sum(
                                valueKeys,
                                function (
                                    key
                                ) {
                                    return (
                                        row[
                                            key
                                        ] ||
                                        0
                                    );
                                }
                            );
                        }
                    );

                if (showTable) {
                    renderHorizontalBarLegendTable(
                        data,
                        categoryKey,
                        activeFont,
                        tickSize,
                        borderThickness,
                        yScale,
                        margin.top
                    );
                }
            }

            // =====================================================
            // LOGO
            // =====================================================

            logoRow
                .selectAll("*")
                .remove();

            const selectedLogo =
                logoPicker.property(
                    "value"
                );

            if (selectedLogo) {
                const logoWidth =
                    Math.max(
                        40,
                        Math.min(
                            80,
                            containerWidth *
                                0.12
                        )
                    );

                let logoHeight =
                    logoWidth;

                if (
                    selectedLogo.includes(
                        "with text"
                    ) ||
                    selectedLogo.includes(
                        "all white"
                    )
                ) {
                    logoHeight =
                        logoWidth *
                        0.35;
                }

                logoRow
                    .append("img")
                    .attr(
                        "src",
                        themeJsUrl +
                            encodeURIComponent(
                                selectedLogo
                            )
                    )
                    .attr(
                        "alt",
                        "Parola logo"
                    )
                    .style(
                        "width",
                        `${logoWidth}px`
                    )
                    .style(
                        "height",
                        `${logoHeight}px`
                    )
                    .style(
                        "object-fit",
                        "contain"
                    );
            }

            updateChartWrapperLayout();
            scheduleResponsiveScale();
        }
                // =========================================================
        // CONTROL EVENT LISTENERS
        // =========================================================

        const dynamicInputs = [
            fontPicker,
            typePicker,
            logoPicker,
            tableToggle
        ];

        dynamicInputs.forEach(function (inputSelector) {
            inputSelector.on(
                "input",
                function () {
                    if (
                        currentData.length >
                        0
                    ) {
                        renderChart(
                            currentData
                        );
                    }
                }
            );

            inputSelector.on(
                "change",
                function () {
                    if (
                        currentData.length >
                        0
                    ) {
                        renderChart(
                            currentData
                        );
                    }
                }
            );
        });

        typePicker.on(
            `change.table-visibility-${uid}`,
            function () {
                updateTableControlsVisibility();

                if (
                    currentData.length >
                    0
                ) {
                    renderChart(
                        currentData
                    );
                }
            }
        );

        tableToggle.on(
            `change.table-toggle-${uid}`,
            function () {
                if (
                    currentData.length >
                    0
                ) {
                    renderChart(
                        currentData
                    );
                }
            }
        );

        // Each chart instance responds independently
        // while sharing the browser resize event.
        function handleWindowResize() {
            applyResponsiveScale();
        }

        window.addEventListener(
            "resize",
            handleWindowResize
        );

        // =========================================================
        // ERROR DISPLAY
        // =========================================================

        function displayErrorState(
            message =
                "Tracking metrics update pending"
        ) {
            chartWrapperContainer.style(
                "display",
                "none"
            );

            let errorDiv =
                canvas.select(
                    `#chart-error-message-${uid}`
                );

            if (errorDiv.empty()) {
                errorDiv =
                    canvas
                        .append("div")
                        .attr(
                            "id",
                            `chart-error-message-${uid}`
                        );
            }

            errorDiv
                .style(
                    "display",
                    "block"
                )
                .style(
                    "padding",
                    "30px"
                )
                .style(
                    "margin",
                    "20px 0"
                )
                .style(
                    "text-align",
                    "center"
                )
                .style(
                    "font-family",
                    fontPicker.property(
                        "value"
                    ) ||
                        "sans-serif"
                )
                .style(
                    "font-size",
                    "16px"
                )
                .style(
                    "color",
                    "#666"
                )
                .style(
                    "background-color",
                    "#f9f9f9"
                )
                .style(
                    "border",
                    "1px dashed #ccc"
                )
                .style(
                    "border-radius",
                    "6px"
                )
                .text(message);
        }

        function hideErrorState() {
            const errorDiv =
                canvas.select(
                    `#chart-error-message-${uid}`
                );

            if (!errorDiv.empty()) {
                errorDiv.style(
                    "display",
                    "none"
                );
            }

            chartWrapperContainer.style(
                "display",
                "block"
            );
        }

        // =========================================================
        // CSV PARSING
        // =========================================================

        function parseCellValue(
            value
        ) {
            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            if (
                typeof value ===
                "number"
            ) {
                return value;
            }

            const trimmedValue =
                String(value).trim();

            if (
                trimmedValue === ""
            ) {
                return "";
            }

            // Remove commas, currency symbols and other
            // non-numeric characters before checking.
            const numericCandidate =
                trimmedValue.replace(
                    /[^0-9.\-]/g,
                    ""
                );

            if (
                numericCandidate !==
                    "" &&
                numericCandidate !==
                    "-" &&
                numericCandidate !==
                    "." &&
                !isNaN(
                    Number(
                        numericCandidate
                    )
                )
            ) {
                return Number(
                    numericCandidate
                );
            }

            return trimmedValue;
        }

        function removeEmptyRows(
            rows
        ) {
            return rows.filter(
                function (row) {
                    if (
                        !Array.isArray(
                            row
                        )
                    ) {
                        return false;
                    }

                    return row.some(
                        function (cell) {
                            return (
                                cell !==
                                    null &&
                                cell !==
                                    undefined &&
                                String(
                                    cell
                                ).trim() !==
                                    ""
                            );
                        }
                    );
                }
            );
        }

        function parseCSVAndRender(
            rawCsvText
        ) {
            try {
                if (
                    !rawCsvText ||
                    rawCsvText.trim() ===
                        ""
                ) {
                    throw new Error(
                        "CSV data is empty."
                    );
                }

                Papa.parse(
                    rawCsvText,
                    {
                        header: false,
                        dynamicTyping: false,
                        skipEmptyLines: true,

                        complete:
                            function (
                                results
                            ) {
                                try {
                                    const rawData =
                                        removeEmptyRows(
                                            results.data ||
                                                []
                                        );

                                    if (
                                        rawData.length ===
                                        0
                                    ) {
                                        throw new Error(
                                            "No CSV rows were found."
                                        );
                                    }

                                    const firstCell =
                                        String(
                                            rawData[0][0] ||
                                                ""
                                        )
                                            .trim()
                                            .toLowerCase();

                                    let parsedData =
                                        [];

                                    // Custom CSV structure:
                                    //
                                    // Title,My Chart Title
                                    // Subtitle,My Subtitle
                                    // Category,Value,Description
                                    // Item 1,10,Description here
                                    if (
                                        firstCell ===
                                        "title"
                                    ) {
                                        currentTitle =
                                            String(
                                                rawData[0][1] ||
                                                    ""
                                            ).trim();

                                        let headerRowIndex =
                                            1;

                                        if (
                                            rawData[1] &&
                                            String(
                                                rawData[1][0] ||
                                                    ""
                                            )
                                                .trim()
                                                .toLowerCase() ===
                                                "subtitle"
                                        ) {
                                            currentSubtitle =
                                                String(
                                                    rawData[1][1] ||
                                                        ""
                                                ).trim();

                                            headerRowIndex =
                                                2;
                                        } else {
                                            currentSubtitle =
                                                "";
                                        }

                                        if (
                                            !rawData[
                                                headerRowIndex
                                            ]
                                        ) {
                                            throw new Error(
                                                "CSV header row is missing."
                                            );
                                        }

                                        const keys =
                                            rawData[
                                                headerRowIndex
                                            ].map(
                                                function (
                                                    key,
                                                    index
                                                ) {
                                                    const cleanedKey =
                                                        String(
                                                            key ||
                                                                ""
                                                        ).trim();

                                                    return (
                                                        cleanedKey ||
                                                        `Column ${
                                                            index +
                                                            1
                                                        }`
                                                    );
                                                }
                                            );

                                        for (
                                            let rowIndex =
                                                headerRowIndex +
                                                1;
                                            rowIndex <
                                            rawData.length;
                                            rowIndex++
                                        ) {
                                            const sourceRow =
                                                rawData[
                                                    rowIndex
                                                ];

                                            if (
                                                !sourceRow
                                            ) {
                                                continue;
                                            }

                                            const rowObject =
                                                {};

                                            keys.forEach(
                                                function (
                                                    key,
                                                    columnIndex
                                                ) {
                                                    rowObject[
                                                        key
                                                    ] =
                                                        parseCellValue(
                                                            sourceRow[
                                                                columnIndex
                                                            ]
                                                        );
                                                }
                                            );

                                            parsedData.push(
                                                rowObject
                                            );
                                        }
                                    } else {
                                        // Standard CSV:
                                        //
                                        // Category,Value,Description
                                        // Item 1,10,Description here

                                        currentTitle =
                                            "";

                                        currentSubtitle =
                                            "";

                                        const keys =
                                            rawData[0].map(
                                                function (
                                                    key,
                                                    index
                                                ) {
                                                    const cleanedKey =
                                                        String(
                                                            key ||
                                                                ""
                                                        ).trim();

                                                    return (
                                                        cleanedKey ||
                                                        `Column ${
                                                            index +
                                                            1
                                                        }`
                                                    );
                                                }
                                            );

                                        for (
                                            let rowIndex =
                                                1;
                                            rowIndex <
                                            rawData.length;
                                            rowIndex++
                                        ) {
                                            const sourceRow =
                                                rawData[
                                                    rowIndex
                                                ];

                                            if (
                                                !sourceRow
                                            ) {
                                                continue;
                                            }

                                            const rowObject =
                                                {};

                                            keys.forEach(
                                                function (
                                                    key,
                                                    columnIndex
                                                ) {
                                                    rowObject[
                                                        key
                                                    ] =
                                                        parseCellValue(
                                                            sourceRow[
                                                                columnIndex
                                                            ]
                                                        );
                                                }
                                            );

                                            parsedData.push(
                                                rowObject
                                            );
                                        }
                                    }

                                    // Remove rows without a category value.
                                    if (
                                        parsedData.length >
                                        0
                                    ) {
                                        const firstKey =
                                            Object.keys(
                                                parsedData[0]
                                            )[0];

                                        parsedData =
                                            parsedData.filter(
                                                function (
                                                    row
                                                ) {
                                                    return (
                                                        firstKey &&
                                                        row[
                                                            firstKey
                                                        ] !==
                                                            null &&
                                                        row[
                                                            firstKey
                                                        ] !==
                                                            undefined &&
                                                        String(
                                                            row[
                                                                firstKey
                                                            ]
                                                        ).trim() !==
                                                            ""
                                                    );
                                                }
                                            );
                                    }

                                    if (
                                        parsedData.length ===
                                        0
                                    ) {
                                        throw new Error(
                                            "No valid data records were found."
                                        );
                                    }

                                    hideErrorState();

                                    renderChart(
                                        parsedData
                                    );
                                } catch (
                                    parsingError
                                ) {
                                    console.error(
                                        `Parola chart ${uid}:`,
                                        parsingError
                                    );

                                    displayErrorState(
                                        "Tracking metrics update pending"
                                    );
                                }
                            },

                        error:
                            function (
                                parseError
                            ) {
                                console.error(
                                    `Parola chart ${uid}:`,
                                    parseError
                                );

                                displayErrorState(
                                    "Tracking metrics update pending"
                                );
                            }
                    }
                );
            } catch (
                csvError
            ) {
                console.error(
                    `Parola chart ${uid}:`,
                    csvError
                );

                displayErrorState(
                    "Tracking metrics update pending"
                );
            }
        }

        // =========================================================
// CSV FILE INPUT
// =========================================================

let csvHasLoaded = false;

fileInput.on("change", function (event) {
    const inputElement = event.currentTarget || event.target;
    const file = inputElement.files && inputElement.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function (loadEvent) {
        csvHasLoaded = true;

        parseCSVAndRender(
            loadEvent.target.result
        );
    };

    reader.onerror = function (error) {
        console.error(
            `Parola chart ${uid}: Unable to read CSV file.`,
            error
        );

        displayErrorState(
            "Tracking metrics update pending"
        );
    };

    reader.readAsText(file);
});

// =========================================================
// BACKEND CSV FALLBACK
// =========================================================

const backendCsvUrl =
    canvas.attr("data-csv-url") ||
    canvas.attr("data-source-file") ||
    "";

const backendCsvFilename =
    canvas.attr("data-csv-filename") ||
    "chart.csv";

/**
 * The functions.php script normally places the backend CSV into
 * the generated file input. This fallback performs the same process
 * if the PHP bridge has not assigned the file yet.
 */
function loadBackendCsv() {
    if (
        csvHasLoaded ||
        !backendCsvUrl
    ) {
        return;
    }

    fetch(backendCsvUrl, {
        credentials: "same-origin",
        cache: "no-store"
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error(
                    `CSV request failed with status ${response.status}.`
                );
            }

            return response.blob();
        })
        .then(function (blob) {
            if (csvHasLoaded) {
                return;
            }

            const csvFile = new File(
                [blob],
                backendCsvFilename,
                {
                    type:
                        blob.type ||
                        "text/csv"
                }
            );

            // Use the same input path as a manual or PHP-injected upload.
            if (
                typeof DataTransfer !==
                "undefined"
            ) {
                const transfer =
                    new DataTransfer();

                transfer.items.add(
                    csvFile
                );

                const inputNode =
                    fileInput.node();

                inputNode.files =
                    transfer.files;

                inputNode.dispatchEvent(
                    new Event(
                        "change",
                        {
                            bubbles: true
                        }
                    )
                );

                return;
            }

            // Fallback for browsers where DataTransfer cannot be created.
            const reader =
                new FileReader();

            reader.onload =
                function (
                    loadEvent
                ) {
                    csvHasLoaded =
                        true;

                    parseCSVAndRender(
                        loadEvent
                            .target
                            .result
                    );
                };

            reader.readAsText(
                csvFile
            );
        })
        .catch(function (error) {
            console.error(
                `Parola chart ${uid}: Backend CSV could not be loaded.`,
                error
            );

            if (!csvHasLoaded) {
                displayErrorState(
                    "Tracking metrics update pending"
                );
            }
        });
}

/*
 * Allow the functions.php bridge to assign the CSV first.
 * The fallback only runs if nothing has loaded afterward.
 */
window.setTimeout(
    loadBackendCsv,
    500
);
    }
});
