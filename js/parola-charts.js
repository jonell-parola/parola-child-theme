/**
 * Parola Visualization Engine - Multi-instance Customization Dashboard
 *
 * Supports any number of .d3-test-canvas elements on the same page.
 * 
 * 1.0.91 - Firm Ranking Table - Reformatted Industry and Industry Position Column headers to not be so close together
 * 1.0.90 - Added Description & Hover Popup for Percentage & Frequency Table
 * 1.0.89 - Firm Ranking Table - First entity name now only shows once and not in every row
 * 1.0.88 - Added table headers for Count-Percentage Table
 * 1.0.87 - Added Data Block, Count-Percentage Table, Modified Column to just be Short and not Thick, Removed Rank Column from Firm Ranking Table
 */
(function () {

    console.log(
        "🚀 Parola Engine: Visual scripting pipeline initializing..."
    );

    let parolaInstanceCounter = 0;


    // =========================================================
    // INITIALIZE CHARTS
    // Supports frontend + dynamically inserted Gutenberg previews
    // =========================================================

    function initializeParolaCharts(rootNode) {
        const root = rootNode || document;
        const canvases = [];

        // Root itself may be a chart.
        if (
            root.nodeType === 1 &&
            root.matches &&
            root.matches(".d3-test-canvas")
        ) {
            canvases.push(root);
        }

        // Find charts inside root.
        if (root.querySelectorAll) {
            root
                .querySelectorAll(".d3-test-canvas")
                .forEach(function (canvasNode) {
                    canvases.push(canvasNode);
                });
        }

        canvases.forEach(function (canvasNode) {
            // Prevent the same DOM element from initializing twice.
            if (canvasNode.dataset.parolaInitialized === "1") {
                return;
            }

            canvasNode.dataset.parolaInitialized = "1";

            initChart(
                canvasNode,
                parolaInstanceCounter++
            );
        });
    }

    function initChart(canvasNode, instanceIndex) {
        const canvas = d3.select(canvasNode);
        const uid = `p${instanceIndex}`;

        let currentTitle = "";
        let currentSubtitle = "";
        let currentDescriptions = {};
        let currentRawRows = [];
        let cpcSortMode = "original"; // "original", "asc" (A-Z), "desc" (Z-A)

        function parseBoolAttr(val, defaultVal) {
            if (val === undefined || val === null || val === "") return defaultVal;
            const s = String(val).trim().toLowerCase();
            if (s === "false" || s === "0" || s === "no" || s === "off" || s === "none") return false;
            if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
            return defaultVal;
        }

        // Read configuration from each individual chart container.
        const defaultCsv =
            canvas.attr("data-csv-url") ||
            canvas.attr("data-source-file") ||
            canvas.attr("data-csv-filename") ||
            canvas.attr("data-csv") ||
            "";

        const defaultChartType =
            canvas.attr("chart-type") ||
            canvas.attr("data-chart-type") ||
            "bar";

        const defaultLogoStyle =
            canvas.attr("logo-style") ||
            canvas.attr("data-logo-style") ||
            "parola logo with text.png";

        const defaultShowLogo = parseBoolAttr(
            canvas.attr("data-show-logo") || canvas.attr("show-logo"),
            true
        );

        const defaultShowTitle = parseBoolAttr(
            canvas.attr("data-show-title") || canvas.attr("show-title"),
            true
        );

        const defaultShowSubtitle = parseBoolAttr(
            canvas.attr("data-show-subtitle") || canvas.attr("show-subtitle"),
            true
        );

        const defaultShowStackTotals = parseBoolAttr(
            canvas.attr("data-show-stack-totals") ||
            canvas.attr("show-stack-totals") ||
            canvas.attr("data-stack-totals") ||
            canvas.attr("stack-totals"),
            true
        );

        const defaultShowDataLabels = parseBoolAttr(
            canvas.attr("data-show-data-labels") ||
            canvas.attr("show-data-labels") ||
            canvas.attr("data-data-labels") ||
            canvas.attr("data-labels"),
            false
        );

        const defaultShowAxisLabels = parseBoolAttr(
            canvas.attr("data-show-axis-labels") ||
            canvas.attr("show-axis-labels") ||
            canvas.attr("data-axis-labels") ||
            canvas.attr("axis-labels"),
            true
        );

        const defaultShowPercentage = parseBoolAttr(
            canvas.attr("data-show-percentage") ||
            canvas.attr("show-percentage") ||
            canvas.attr("data-frequency-table-percentage") ||
            canvas.attr("frequency-table-percentage") ||
            canvas.attr("data-percentage") ||
            canvas.attr("percentage"),
            false
        );

        const defaultThickColumns = parseBoolAttr(
            canvas.attr("data-short-columns") ||
            canvas.attr("data-thick-columns") ||
            canvas.attr("data-compact-columns") ||
            canvas.attr("data-thick-short-columns") ||
            canvas.attr("short-columns") ||
            canvas.attr("thick-short-columns") ||
            canvas.attr("thick-columns"),
            false
        );

        const activeFont = "Inter";

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
            .style("font-family", activeFont)
            .style("font-size", "14px")
            .style("display", "grid")
            .style(
                "grid-template-columns",
                "repeat(auto-fit, minmax(220px, 1fr))"
            )
            .style("gap", "15px");

        // Gutenberg already has its own block controls.
        // Hide the generated D3 settings when a CSV is supplied by Bricks/Gutenberg.
        if (
            canvasNode.classList.contains("d3-gutenberg-preview") ||
            canvasNode.classList.contains("d3-bricks-preview") ||
            defaultCsv
        ) {
            controls.style("display", "none");
        }

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

        // =========================================================
        // CHART TYPE DROPDOWN
        // =========================================================

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
                label: "Column"
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
                label: "Stacked Column Chart"
            },
            {
                value: "horizontal-bar",
                label: "Bar"
            },
            {
                value: "horizontal-stacked-bar",
                label: "Stacked Bar Chart"
            },
            {
                value: "multi-line",
                label: "Multiple Line Chart"
            },
            {
                value: "stacked-area",
                label: "Stacked Area Chart"
            },
            {
                value: "heatmap",
                label: "Heatmaps"
            },
            {
                value: "frequency-table",
                label: "Frequency Table"
            },
            {
                value: "percentage-table",
                label: "Percentage Table"
            },
            {
                value: "count-percentage",
                label: "Count-Percentage"
            },
            {
                value: "firm-ranking-table",
                label: "Firm Ranking Table"
            },
            {
                value: "data-block",
                label: "Data Block"
            }
        ].forEach(function (item) {
            const option = typePicker
                .append("option")
                .attr("value", item.value)
                .text(item.label);

            const normalizedDefault = String(defaultChartType).trim().toLowerCase().replace(/[\s_]+/g, "-");
            if (
                item.value === defaultChartType ||
                item.value === normalizedDefault ||
                (item.value === "frequency-table" && (normalizedDefault === "frequencytable" || normalizedDefault === "frequency-table")) ||
                (item.value === "percentage-table" && (normalizedDefault === "percentagetable" || normalizedDefault === "percentage-table" || normalizedDefault === "percentage")) ||
                (item.value === "count-percentage" && (normalizedDefault === "countpercentage" || normalizedDefault === "count-percentage" || normalizedDefault === "count-percentage-table")) ||
                (item.value === "firm-ranking-table" && (normalizedDefault === "firmrankingtable" || normalizedDefault === "firm-ranking-table" || normalizedDefault === "industry-ranking-table" || normalizedDefault === "bulk-dataset-table" || normalizedDefault === "bulk-table" || normalizedDefault === "firm-ranking")) ||
                (item.value === "data-block" && (normalizedDefault === "datablock" || normalizedDefault === "data-block" || normalizedDefault === "parola-data-block" || normalizedDefault === "parola-data-blocks" || normalizedDefault === "data-blocks"))
            ) {
                option.property("selected", true);
            }
        });

        // =========================================================
        // LOGO STYLE DROPDOWN
        // =========================================================

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
                value: "parola logo with text.png",
                label: "Logo with Text"
            },
            {
                value: "parola logo only.png",
                label: "Logo Only"
            },
            {
                value: "parola logo all white.png",
                label: "All White"
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

        // =========================================================
        // DISPLAY & STACKED TOGGLES
        // =========================================================

        function createCheckboxControl(parent, labelText, id, defaultChecked) {
            const label = parent
                .append("label")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "8px")
                .style("font-weight", "500")
                .style("color", "#444")
                .style("cursor", "pointer")
                .style("user-select", "none");

            const input = label
                .append("input")
                .attr("type", "checkbox")
                .attr("id", id)
                .property("checked", defaultChecked)
                .style("cursor", "pointer")
                .style("width", "16px")
                .style("height", "16px")
                .style("margin", "0");

            label.append("span").text(labelText);

            return input;
        }

        const displayOptionsWrapper = controls
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "8px");

        displayOptionsWrapper
            .append("label")
            .text("Display Options:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const showLogoCheckbox = createCheckboxControl(
            displayOptionsWrapper,
            "Show Logo",
            `show-logo-${uid}`,
            defaultShowLogo
        );

        const showTitleCheckbox = createCheckboxControl(
            displayOptionsWrapper,
            "Show Title",
            `show-title-${uid}`,
            defaultShowTitle
        );

        const showSubtitleCheckbox = createCheckboxControl(
            displayOptionsWrapper,
            "Show Subtitle",
            `show-subtitle-${uid}`,
            defaultShowSubtitle
        );

        const showAxisLabelsCheckbox = createCheckboxControl(
            displayOptionsWrapper,
            "Show Axis Labels",
            `show-axis-labels-${uid}`,
            defaultShowAxisLabels
        );

        const showPercentageCheckbox = createCheckboxControl(
            displayOptionsWrapper,
            "Show Percentage",
            `show-percentage-${uid}`,
            defaultShowPercentage
        );

        const stackedOptionsWrapper = controls
            .append("div")
            .attr("id", `stacked-options-wrapper-${uid}`)
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "8px");

        stackedOptionsWrapper
            .append("label")
            .text("Stacked Chart Options:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const showStackTotalsCheckbox = createCheckboxControl(
            stackedOptionsWrapper,
            "Show Stack Totals",
            `show-stack-totals-${uid}`,
            defaultShowStackTotals
        );

        const showDataLabelsCheckbox = createCheckboxControl(
            stackedOptionsWrapper,
            "Show Data Labels",
            `show-data-labels-${uid}`,
            defaultShowDataLabels
        );

        const columnOptionsWrapper = controls
            .append("div")
            .attr("id", `column-options-wrapper-${uid}`)
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("gap", "8px");

        columnOptionsWrapper
            .append("label")
            .text("Column Chart Options:")
            .style("font-weight", "bold")
            .style("color", "#444");

        const thickShortColumnsCheckbox = createCheckboxControl(
            columnOptionsWrapper,
            "Shorter Columns",
            `thick-short-columns-${uid}`,
            defaultThickColumns
        );

        // Locate the JavaScript asset directory for logo files.
        let themeJsUrl = "";

        const scripts = document.getElementsByTagName("script");

        for (const script of scripts) {
            if (
                script.src &&
                (
                    script.src.includes("parola-charts") ||
                    script.src.includes("parola")
                )
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

        // =========================================================
        // CHART STRUCTURE
        // =========================================================

        const margin = {
            top: 20,
            right: 30,
            bottom: 28,
            left: 100
        };

        d3.select(`body > .parola-chart-tooltip-${uid}`).remove();

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
            .style("border-radius", "6px")
            .style("font-family", activeFont)
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style(
                "box-shadow",
                "0 4px 10px rgba(0,0,0,0.25)"
            )
            .style("z-index", "99999");

        function formatTooltipContent(mainContent, descriptionText) {
            let html = `<div>${mainContent}</div>`;

            if (descriptionText) {
                html += `<div style="margin-top: 6px; padding: 6px 8px; background-color: #1e40af; color: #ffffff; border-radius: 4px; font-size: 12px; line-height: 1.3;">
                    <strong>Description:</strong> ${descriptionText}
                </div>`;
            }

            return html;
        }

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
            .style("margin-bottom", "15px")
            .style("position", "relative")
            .style("z-index", "10");

        const headerTitle = headerRow
            .append("div")
            .attr("id", `chart-header-title-${uid}`)
            .style("font-weight", "bold")
            .style("color", "#333")
            .style("line-height", "1.2")
            .style("word-wrap", "break-word")
            .style("overflow-wrap", "break-word")
            .style("white-space", "normal")
            .style("width", "100%");

        const headerSubtitle = headerRow
            .append("div")
            .attr(
                "id",
                `chart-header-subtitle-${uid}`
            )
            .style("color", "#545454")
            .style("line-height", "1.2")
            .style("margin-top", "4px")
            .style("word-wrap", "break-word")
            .style("overflow-wrap", "break-word")
            .style("white-space", "normal")
            .style("width", "100%");

        const headerLegend = headerRow
            .append("div")
            .attr("id", `chart-header-legend-${uid}`)
            .style("display", "none")
            .style("width", "100%")
            .style("justify-content", "center")
            .style("gap", "20px")
            .style("margin-top", "16px")
            .style("position", "relative")
            .style("z-index", "10");

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
            .style("padding-top", "2px")
            .style("padding-bottom", "0px");

        const svgOuter = contentRow
            .append("svg")
            .attr("class", `parola-chart-svg-${uid}`)
            .style("overflow", "visible")
            .style("width", "100%");

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
            .attr("x", -margin.left)
            .attr("y", -40)
            .attr("text-anchor", "start")
            .style("font-weight", "bold");

        const subtitleText = svg
            .append("text")
            .attr("x", -margin.left)
            .attr("y", -18)
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
                    `${Math.ceil(scaledHeight)}px`
                );

            canvas
                .style("padding-bottom", null)
                .style("margin-bottom", "12px");
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
                .style("margin-bottom", "12px");

            requestAnimationFrame(function () {
                if (!chartWrapper.node()) {
                    return;
                }

                const svgWidth =
                    parseFloat(
                        svgOuter.attr("width")
                    ) || 0;

                naturalWrapperWidth = svgWidth;

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
            function applyLayout() {
                const wrapperNode =
                    chartWrapper.node();

                if (!wrapperNode) {
                    return;
                }

                const contentNode =
                    contentRow.node();

                if (!contentNode) {
                    return;
                }

                const contentRect =
                    contentNode.getBoundingClientRect();

                let maxContentRight = 0;

                if (svgOuter.node()) {
                    const chartRect =
                        svgOuter
                            .node()
                            .getBoundingClientRect();

                    maxContentRight = Math.max(
                        maxContentRight,
                        chartRect.right -
                        contentRect.left
                    );
                }

                contentRow
                    .style(
                        "min-height",
                        null
                    )
                    .style(
                        "min-width",
                        `${Math.ceil(
                            maxContentRight
                        )}px`
                    );

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

                    const wrapperRect =
                        wrapperNode.getBoundingClientRect();

                    maxRight = Math.max(
                        maxRight,
                        logoRect.right -
                        wrapperRect.left
                    );
                }

                chartWrapper
                    .style(
                        "min-height",
                        null
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
                        "0px"
                    )
                    .style(
                        "margin-bottom",
                        "12px"
                    );
            }

            requestAnimationFrame(applyLayout);
        }

        function renderHTMLHeader(
            mainTitleValue,
            subtitleValue,
            mainTitleSize,
            activeType,
            valueKeys,
            tickSize,
            seriesColorMap,
            fontScale,
            showTitle = true,
            showSubtitle = true
        ) {
            const currentFontScale = fontScale || 1;
            const subtitleSize = `${Math.round(parseInt(mainTitleSize, 10) * (16 / 22))}px`;

            if (showTitle) {
                headerTitle
                    .style("display", "block")
                    .text(mainTitleValue)
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        mainTitleSize
                    )
                    .style("word-wrap", "break-word")
                    .style("overflow-wrap", "break-word")
                    .style("white-space", "normal")
                    .style("width", "100%");
            } else {
                headerTitle.style("display", "none").text("");
            }

            if (showSubtitle) {
                headerSubtitle
                    .style("display", "block")
                    .text(subtitleValue)
                    .style(
                        "font-family",
                        activeFont
                    )
                    .style(
                        "font-size",
                        subtitleSize
                    )
                    .style("word-wrap", "break-word")
                    .style("overflow-wrap", "break-word")
                    .style("white-space", "normal")
                    .style("width", "100%")
                    .style(
                        "margin-top",
                        showTitle
                            ? `${Math.max(2, Math.round(4 * currentFontScale))}px`
                            : "0px"
                    )
                    .style("margin-bottom", "0px");
            } else {
                headerSubtitle
                    .style("display", "none")
                    .text("")
                    .style("margin-top", "0px")
                    .style("margin-bottom", "0px");
            }

            const isMultiSeriesLegendType =
                activeType === "stacked-bar" ||
                activeType === "horizontal-stacked-bar" ||
                activeType === "multi-line" ||
                activeType === "stacked-area";

            const hasAnyTitle = showTitle || showSubtitle;

            if (!isMultiSeriesLegendType) {
                headerLegend
                    .style("display", "none")
                    .style("margin-top", "0px")
                    .style("margin-bottom", "0px");

                if (!hasAnyTitle) {
                    headerRow.style("display", "none");
                    headerRow.style("margin-bottom", "0px");
                } else {
                    headerRow.style("display", "flex");
                    headerRow.style(
                        "margin-bottom",
                        `${Math.max(6, Math.round(14 * currentFontScale))}px`
                    );
                }

                return;
            }

            headerRow.style("display", "flex");
            headerRow.style(
                "margin-bottom",
                `${Math.max(8, Math.round(14 * currentFontScale))}px`
            );

            headerLegend
                .selectAll("*")
                .remove();

            const stackedColors = [
                "#063137",
                "#16a1b5"
            ];

            const fallbackColorScale =
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

            const getColor = function (key) {
                if (
                    seriesColorMap &&
                    seriesColorMap.has(key)
                ) {
                    return seriesColorMap.get(key);
                }

                return fallbackColorScale(key);
            };

            const marginTop = hasAnyTitle
                ? Math.max(4, Math.round(10 * currentFontScale))
                : 0;
            headerLegend
                .style("margin-top", `${marginTop}px`)
                .style("margin-bottom", "0px");

            const legendGap = Math.max(8, Math.round(20 * currentFontScale));
            const dotSize = Math.max(6, Math.round(12 * currentFontScale));
            const itemGap = Math.max(4, Math.round(6 * currentFontScale));

            headerLegend
                .style(
                    "display",
                    "flex"
                )
                .style(
                    "justify-content",
                    "center"
                )
                .style(
                    "flex-wrap",
                    "wrap"
                )
                .style(
                    "gap",
                    `${legendGap}px`
                );

            valueKeys.forEach(
                function (key) {
                    const item =
                        headerLegend
                            .append("div")
                            .datum(key)
                            .attr(
                                "class",
                                `legend-item-${uid}`
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
                                "gap",
                                `${itemGap}px`
                            )
                            .style(
                                "cursor",
                                (
                                    activeType === "multi-line" ||
                                    activeType === "stacked-area"
                                )
                                    ? "pointer"
                                    : "default"
                            );

                    item
                        .append("div")
                        .style(
                            "width",
                            `${dotSize}px`
                        )
                        .style(
                            "height",
                            `${dotSize}px`
                        )
                        .style(
                            "min-width",
                            `${dotSize}px`
                        )
                        .style(
                            "min-height",
                            `${dotSize}px`
                        )
                        .style(
                            "border-radius",
                            "50%"
                        )
                        .style(
                            "background-color",
                            getColor(key)
                        );

                    item
                        .append("span")
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
        }

        // Helper: draw a rect with rounded top-left and top-right corners only.
        function roundedTopRect(x, y, w, h, r) {
            if (h <= 0 || w <= 0) {
                return "";
            }

            const cr = Math.min(
                r,
                w / 2,
                h
            );

            return [
                `M ${x + cr} ${y}`,
                `H ${x + w - cr}`,
                `Q ${x + w} ${y} ${x + w} ${y + cr}`,
                `V ${y + h}`,
                `H ${x}`,
                `V ${y + cr}`,
                `Q ${x} ${y} ${x + cr} ${y}`,
                "Z"
            ].join(" ");
        }

        // Helper: draw a rect with rounded top-right and bottom-right corners only.
        function roundedRightRect(x, y, w, h, r) {
            if (w <= 0 || h <= 0) {
                return "";
            }

            const cr = Math.min(
                r,
                h / 2,
                w
            );

            return [
                `M ${x} ${y}`,
                `H ${x + w - cr}`,
                `Q ${x + w} ${y} ${x + w} ${y + cr}`,
                `V ${y + h - cr}`,
                `Q ${x + w} ${y + h} ${x + w - cr} ${y + h}`,
                `H ${x}`,
                "Z"
            ].join(" ");
        }

        // Helper: parse multi-row bulk dataset or single CSV for firm ranking table
        function extractFirmRankingData(rawRows, fallbackData) {
            if (!rawRows || rawRows.length < 2) {
                return {
                    entities: [{
                        entityName: "Entity",
                        records: (fallbackData || []).map(function (row) {
                            const keys = Object.keys(row);
                            return {
                                industry: row.Industry || row.industry || row[keys[0]] || "",
                                position: row["Industry Position"] || row["Position among firms"] || row.Position || row[keys[1]] || "",
                                patents: row["Number of Granted Patents"] || row["Number of Granted"] || row.Patents || row.patents || row[keys[2]] || "",
                                grantRate: row["Efficiency Rate"] || row["Grant rate"] || row.grantRate || row[keys[3]] || ""
                            };
                        })
                    }]
                };
            }

            let entityName = "";
            let startRow = 0;

            // Check if first row is Entity Name row: e.g. ["Entity Name", "2 SPL PATENT ATTORNEYS PARTG MBB", "", ""]
            const firstCell = String(rawRows[0][0] || '').trim().toLowerCase();
            if (firstCell === 'entity name' || firstCell === 'entity') {
                entityName = String(rawRows[0][1] || '').trim();
                startRow = 1;
            }

            // Find header row starting from startRow
            let headerRowIdx = -1;
            for (let r = startRow; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (row && row.some(function (cell) {
                    const c = String(cell || '').toLowerCase().trim();
                    return c.includes('industry') || c.includes('position') || c.includes('granted') || c.includes('efficiency') || c.includes('patent');
                })) {
                    headerRowIdx = r;
                    break;
                }
            }

            if (headerRowIdx === -1) {
                headerRowIdx = startRow;
            }

            const headerRow = rawRows[headerRowIdx] || [];
            let colIndustry = -1;
            let colPosition = -1;
            let colPatents = -1;
            let colGrantRate = -1;

            headerRow.forEach((cell, idx) => {
                const h = String(cell || '').toLowerCase().trim();
                if (h.includes('industry') && !h.includes('position')) {
                    colIndustry = idx;
                } else if (h.includes('position')) {
                    colPosition = idx;
                } else if (h.includes('granted') || h.includes('patents') || h.includes('count')) {
                    colPatents = idx;
                } else if (h.includes('efficiency') || h.includes('rate') || h.includes('grant')) {
                    colGrantRate = idx;
                }
            });

            // Default fallback column indices (0: Industry, 1: Position, 2: Patents, 3: Efficiency Rate)
            if (colIndustry === -1) colIndustry = 0;
            if (colPosition === -1) colPosition = 1;
            if (colPatents === -1) colPatents = 2;
            if (colGrantRate === -1) colGrantRate = 3;

            const records = [];
            for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
                const dataRow = rawRows[r];
                if (!dataRow || dataRow.length === 0) continue;
                const ind = dataRow[colIndustry] !== undefined ? String(dataRow[colIndustry]).trim() : '';
                if (!ind) continue;

                // Stop if another entity or header row is encountered
                if (ind.toLowerCase() === 'entity name' || ind.toLowerCase() === 'entity') {
                    break;
                }

                records.push({
                    industry: ind,
                    position: dataRow[colPosition] !== undefined ? dataRow[colPosition] : '',
                    patents: dataRow[colPatents] !== undefined ? dataRow[colPatents] : '',
                    grantRate: dataRow[colGrantRate] !== undefined ? dataRow[colGrantRate] : ''
                });
            }

            return {
                entities: [{
                    entityName: entityName || "Entity",
                    records: records
                }]
            };
        }

        // Helper: parse data block items from CSV
        function extractDataBlockItems(rawRows, fallbackData) {
            const items = [];

            if (rawRows && rawRows.length >= 2) {
                let labelRow = null;
                let valueRow = null;

                for (let r = 0; r < rawRows.length; r++) {
                    const firstCell = String(rawRows[r][0] || "").trim().toLowerCase();
                    if (firstCell === "label" && !labelRow) {
                        labelRow = rawRows[r];
                    } else if (firstCell === "value" && !valueRow) {
                        valueRow = rawRows[r];
                    }
                }

                if (labelRow && valueRow) {
                    const maxCols = Math.max(labelRow.length, valueRow.length);
                    for (let c = 1; c < maxCols; c++) {
                        const lbl = String(labelRow[c] !== undefined ? labelRow[c] : "").trim();
                        const val = valueRow[c] !== undefined ? String(valueRow[c]).trim() : "";
                        if (lbl !== "" || val !== "") {
                            items.push({ label: lbl, value: val });
                        }
                    }
                    if (items.length > 0) {
                        return items;
                    }
                }
            }

            if (fallbackData && fallbackData.length > 0) {
                const firstRow = fallbackData[0];
                const rowKeys = Object.keys(firstRow);

                const labelKey = rowKeys.find(function (k) {
                    return k.toLowerCase() === "label";
                });
                const valueKey = rowKeys.find(function (k) {
                    return k.toLowerCase() === "value";
                });

                if (labelKey && valueKey) {
                    fallbackData.forEach(function (row) {
                        const lbl = String(row[labelKey] !== undefined ? row[labelKey] : "").trim();
                        const val = row[valueKey] !== undefined ? String(row[valueKey]).trim() : "";
                        if (lbl !== "" || val !== "") {
                            items.push({ label: lbl, value: val });
                        }
                    });
                    if (items.length > 0) return items;
                }

                if (fallbackData.length === 1 && rowKeys.length > 0 && !labelKey && !valueKey) {
                    rowKeys.forEach(function (k) {
                        if (
                            k.toLowerCase() !== "description" &&
                            k.toLowerCase() !== "title" &&
                            k.toLowerCase() !== "subtitle"
                        ) {
                            items.push({
                                label: k,
                                value: String(firstRow[k] !== undefined ? firstRow[k] : "").trim()
                            });
                        }
                    });
                    if (items.length > 0) return items;
                }

                if (rowKeys.length >= 2) {
                    const k0 = rowKeys[0];
                    const k1 = rowKeys[1];
                    fallbackData.forEach(function (row) {
                        const lbl = String(row[k0] !== undefined ? row[k0] : "").trim();
                        const val = row[k1] !== undefined ? String(row[k1]).trim() : "";
                        if (lbl !== "" || val !== "") {
                            items.push({ label: lbl, value: val });
                        }
                    });
                    if (items.length > 0) return items;
                }
            }

            return items;
        }

        function formatDataBlockValue(val) {
            if (val === null || val === undefined) return "";
            const str = String(val).trim();
            if (str === "") return "";
            if (str.includes(",") || str.endsWith("%") || isNaN(Number(str))) {
                return str;
            }
            const num = Number(str);
            if (!isNaN(num)) {
                return num.toLocaleString();
            }
            return str;
        }

        // =========================================================
        // MAIN CHART RENDERER
        // =========================================================

        function renderChart(data) {
            d3.select("body").on(
                `click.multi-line-${uid}`,
                null
            );

            d3.select("body").on(
                `click.stacked-area-${uid}`,
                null
            );

            if (
                !data ||
                data.length === 0
            ) {
                return;
            }

            currentData = data;

            let hasRotatedXLabels = false;

            const activeType =
                typePicker.property("value");

            const isThickShort =
                thickShortColumnsCheckbox.property("checked");

            const selectedLogo =
                logoPicker.property("value") ||
                defaultLogoStyle;

            const containerWidth =
                canvas
                    .node()
                    .getBoundingClientRect()
                    .width || 550;

            let chartWidth =
                containerWidth;

            let chartHeight =
                Math.max(
                    320,
                    containerWidth * 0.65
                );

            if (activeType === "bar" && isThickShort) {
                chartHeight = Math.max(
                    180,
                    containerWidth * 0.35
                );
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

            const fontScale = Math.min(1, Math.max(0.55, containerWidth / 550));
            const mainTitleSize = `${Math.round(22 * fontScale)}px`;
            const subtitleSize = `${Math.round(16 * fontScale)}px`;
            const tickSize = `${Math.round(13 * fontScale)}px`;
            const shapeTextSize = `${Math.round(14 * fontScale)}px`;
            const pieShapeTextSize = `${Math.round(12 * fontScale)}px`;

            const svgTitleY = activeType === "line" ? -50 * fontScale : -40 * fontScale;
            const svgSubtitleY = activeType === "line" ? -26 * fontScale : -18 * fontScale;

            mainTitleText
                .text(mainTitleValue)
                .attr("x", -margin.left)
                .attr("y", svgTitleY)
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
                .attr("x", -margin.left)
                .attr("y", svgSubtitleY)
                .style(
                    "font-family",
                    activeFont
                )
                .style(
                    "font-size",
                    subtitleSize
                );

            const keys =
                Object.keys(data[0]);

            const categoryKey =
                keys.find(
                    function (k) {
                        return (
                            k.toLowerCase() === "company" ||
                            k.toLowerCase() === "category"
                        );
                    }
                ) ||
                keys[0] ||
                "Company";

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
                    .filter(
                        function (key) {
                            return (
                                key !== categoryKey &&
                                key !== descriptionKey
                            );
                        }
                    )
                    .filter(
                        function (key) {
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
                valueKeys = [
                    "Patents"
                ];
            }

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

            mainTitleText.style(
                "display",
                "none"
            );

            subtitleText.style(
                "display",
                "none"
            );

            const showLogo =
                showLogoCheckbox.property("checked");

            const showTitle =
                showTitleCheckbox.property("checked");

            const showSubtitle =
                showSubtitleCheckbox.property("checked");

            const showStackTotals =
                showStackTotalsCheckbox.property("checked");

            const showDataLabels =
                showDataLabelsCheckbox.property("checked");

            const showAxisLabels =
                showAxisLabelsCheckbox.property("checked");

            const showPercentage =
                showPercentageCheckbox.property("checked");

            if (activeType === "bar") {
                columnOptionsWrapper.style("display", "flex");
            } else {
                columnOptionsWrapper.style("display", "none");
            }

            if (
                activeType === "frequency-table" ||
                activeType === "percentage-table" ||
                activeType === "count-percentage" ||
                activeType === "firm-ranking-table" ||
                activeType === "data-block"
            ) {
                svgOuter.style("display", "none");
            } else {
                svgOuter.style("display", null);
            }

            renderHTMLHeader(
                mainTitleValue,
                subtitleValue,
                mainTitleSize,
                activeType,
                valueKeys,
                tickSize,
                undefined,
                fontScale,
                showTitle,
                showSubtitle
            );

            applyChartContainerStyles();

            contentRow
                .selectAll(
                    `.heatmap-container-${uid}`
                )
                .remove();

            contentRow
                .selectAll(
                    `.frequency-table-container-${uid}`
                )
                .remove();

            contentRow
                .selectAll(
                    `.percentage-table-container-${uid}`
                )
                .remove();

            contentRow
                .selectAll(
                    `.count-percentage-container-${uid}`
                )
                .remove();

            contentRow
                .selectAll(
                    `.firm-ranking-table-container-${uid}`
                )
                .remove();

            contentRow
                .selectAll(
                    `.data-block-container-${uid}`
                )
                .remove();

            svg.selectAll(
                ".bar-label"
            ).remove();

            svg.selectAll(
                "rect"
            ).remove();

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

            svg.selectAll(
                ".bar-path"
            ).remove();

            svg.selectAll(
                ".hbar-path"
            ).remove();

            svg.selectAll(
                ".hbar-label"
            ).remove();

            svg.selectAll(
                ".multi-line-path"
            ).remove();

            svg.selectAll(
                ".multi-line-dot"
            ).remove();

            svg.selectAll(
                ".stacked-area-path"
            ).remove();

            svg.selectAll(
                ".hover-overlay-group"
            ).remove();

            svg.selectAll(
                ".multi-line-group"
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

                const outerMargin =
                    30;

                const radiusX =
                    Math.max(
                        20,
                        activeWidth / 2 -
                        outerMargin
                    );

                const radiusY =
                    Math.max(
                        20,
                        activeHeight / 2 -
                        outerMargin
                    );

                const radius =
                    Math.min(
                        radiusX,
                        radiusY
                    );

                const baseRadius =
                    radius;

                const scaleX = 1;
                const scaleY = 1;

                const pieGroup =
                    svg
                        .append("g")
                        .attr(
                            "class",
                            "pie-group"
                        )
                        .attr(
                            "transform",
                            `translate(${activeWidth / 2},${activeHeight / 2 + 12})`
                        );

                const pie =
                    d3
                        .pie()
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
                    d3
                        .arc()
                        .innerRadius(0)
                        .outerRadius(
                            baseRadius
                        );

                const labelArc =
                    d3
                        .arc()
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
                        .data(
                            pieData
                        )
                        .enter()
                        .append("g")
                        .attr(
                            "class",
                            "arc"
                        );

                arcs
                    .append("path")
                    .attr(
                        "d",
                        arc
                    )
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
                            pieGroup
                                .selectAll(
                                    "path"
                                )
                                .attr(
                                    "opacity",
                                    0.3
                                );

                            d3
                                .select(this)
                                .attr(
                                    "opacity",
                                    1
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
                            const desc =
                                descriptionKey
                                    ? slice.data[
                                    descriptionKey
                                    ]
                                    : null;

                            const mainTxt =
                                `<strong>${categoryKey}:</strong> ${slice.data[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${slice.data[valueKeys[0]]}`;

                            tooltip
                                .html(
                                    formatTooltipContent(
                                        mainTxt,
                                        desc
                                    )
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
                    .on(
                        "mouseout",
                        function () {
                            pieGroup
                                .selectAll(
                                    "path"
                                )
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

                arcs
                    .append("text")
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
                        "font-weight",
                        "bold"
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

                            return `${slice.data[categoryKey]} (${percentage}%)`;
                        }
                    );

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
                            const padding =
                                2;

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
            }

            // =====================================================
            // LINE CHART
            // =====================================================

            else if (
                activeType === "line"
            ) {
                xAxisGroup.style(
                    "display",
                    null
                );

                yAxisGroup.style(
                    "display",
                    null
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

                const categories =
                    data.map(
                        function (row) {
                            return String(
                                row[
                                categoryKey
                                ]
                            );
                        }
                    );

                const xScale =
                    d3
                        .scalePoint()
                        .domain(
                            categories
                        )
                        .range([
                            0,
                            activeWidth
                        ])
                        .padding(
                            0.1
                        );

                const maximumValue =
                    d3.max(
                        data,
                        function (row) {
                            return (
                                row[
                                valueKeys[0]
                                ] || 0
                            );
                        }
                    ) || 0;

                const maxVal =
                    maximumValue === 0
                        ? 10
                        : maximumValue;

                const yScale =
                    d3
                        .scaleLinear()
                        .domain([
                            0,
                            maxVal *
                            1.08
                        ])
                        .nice()
                        .range([
                            activeHeight,
                            0
                        ]);

                const yAxis =
                    d3
                        .axisLeft(
                            yScale
                        )
                        .ticks(
                            6
                        )
                        .tickSize(
                            -activeWidth
                        );

                yAxisGroup
                    .call(
                        yAxis
                    )
                    .call(
                        function (g) {
                            g
                                .select(
                                    ".domain"
                                )
                                .remove();

                            g
                                .selectAll(
                                    ".tick line"
                                )
                                .attr(
                                    "stroke",
                                    "#e5e5e5"
                                )
                                .attr(
                                    "stroke-dasharray",
                                    null
                                );

                            g
                                .selectAll(
                                    ".tick text"
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
                                    "#545454"
                                );
                        }
                    );

                const xAxis =
                    d3.axisBottom(
                        xScale
                    );

                xAxisGroup
                    .call(
                        xAxis
                    )
                    .call(
                        function (g) {
                            g
                                .select(
                                    ".domain"
                                )
                                .attr(
                                    "stroke",
                                    "#ccc"
                                )
                                .attr(
                                    "stroke-width",
                                    1
                                );

                            g
                                .selectAll(
                                    ".tick line"
                                )
                                .remove();

                            g
                                .selectAll(
                                    ".tick text"
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
                                    "#545454"
                                );
                        }
                    );

                const lineGenerator =
                    d3
                        .line()
                        .x(
                            function (d) {
                                return xScale(
                                    String(
                                        d[
                                        categoryKey
                                        ]
                                    )
                                );
                            }
                        )
                        .y(
                            function (d) {
                                return yScale(
                                    d[
                                    valueKeys[0]
                                    ] || 0
                                );
                            }
                        )
                        .curve(
                            d3.curveLinear
                        );

                const linePath =
                    svg
                        .selectAll(
                            ".chart-line"
                        )
                        .data([
                            data
                        ]);

                linePath
                    .exit()
                    .remove();

                linePath
                    .enter()
                    .append(
                        "path"
                    )
                    .attr(
                        "class",
                        "chart-line"
                    )
                    .merge(
                        linePath
                    )
                    .attr(
                        "d",
                        lineGenerator
                    )
                    .attr(
                        "fill",
                        "none"
                    )
                    .attr(
                        "stroke",
                        PIE_COLORS[0]
                    )
                    .attr(
                        "stroke-width",
                        2.5
                    );

                const hoverOverlayGroup =
                    svg
                        .append("g")
                        .attr(
                            "class",
                            "hover-overlay-group"
                        );

                const verticalHoverLine =
                    hoverOverlayGroup
                        .append(
                            "line"
                        )
                        .attr(
                            "y1",
                            0
                        )
                        .attr(
                            "y2",
                            activeHeight
                        )
                        .attr(
                            "stroke",
                            "#888"
                        )
                        .attr(
                            "stroke-width",
                            1.5
                        )
                        .attr(
                            "stroke-dasharray",
                            "4 4"
                        )
                        .style(
                            "pointer-events",
                            "none"
                        )
                        .style(
                            "visibility",
                            "hidden"
                        );

                const hoverDot =
                    hoverOverlayGroup
                        .append(
                            "circle"
                        )
                        .attr(
                            "class",
                            "hover-dot"
                        )
                        .attr(
                            "r",
                            4.5
                        )
                        .attr(
                            "fill",
                            PIE_COLORS[0]
                        )
                        .attr(
                            "stroke",
                            "#fff"
                        )
                        .attr(
                            "stroke-width",
                            1.5
                        )
                        .style(
                            "pointer-events",
                            "none"
                        )
                        .style(
                            "visibility",
                            "hidden"
                        );

                const overlayRect =
                    hoverOverlayGroup
                        .append(
                            "rect"
                        )
                        .attr(
                            "width",
                            activeWidth
                        )
                        .attr(
                            "height",
                            activeHeight
                        )
                        .attr(
                            "fill",
                            "transparent"
                        )
                        .style(
                            "cursor",
                            "crosshair"
                        );

                overlayRect
                    .on(
                        "mousemove",
                        function (event) {
                            const [
                                mouseX
                            ] =
                                d3.pointer(
                                    event,
                                    this
                                );

                            let closestRow =
                                data[0];

                            let minDistance =
                                Infinity;

                            data.forEach(
                                function (row) {
                                    const cx =
                                        xScale(
                                            String(
                                                row[
                                                categoryKey
                                                ]
                                            )
                                        );

                                    const dist =
                                        Math.abs(
                                            mouseX -
                                            cx
                                        );

                                    if (
                                        dist <
                                        minDistance
                                    ) {
                                        minDistance =
                                            dist;

                                        closestRow =
                                            row;
                                    }
                                }
                            );

                            const cx =
                                xScale(
                                    String(
                                        closestRow[
                                        categoryKey
                                        ]
                                    )
                                );

                            const cy =
                                yScale(
                                    closestRow[
                                    valueKeys[0]
                                    ] || 0
                                );

                            verticalHoverLine
                                .attr(
                                    "x1",
                                    cx
                                )
                                .attr(
                                    "x2",
                                    cx
                                )
                                .style(
                                    "visibility",
                                    "visible"
                                );

                            hoverDot
                                .attr(
                                    "cx",
                                    cx
                                )
                                .attr(
                                    "cy",
                                    cy
                                )
                                .style(
                                    "visibility",
                                    "visible"
                                );

                            const val =
                                closestRow[
                                    valueKeys[0]
                                ] !== undefined
                                    ? closestRow[
                                    valueKeys[0]
                                    ]
                                    : 0;

                            const desc =
                                descriptionKey
                                    ? closestRow[
                                    descriptionKey
                                    ]
                                    : null;

                            const mainTxt =
                                `<div style="font-weight:bold; margin-bottom:4px;">${closestRow[categoryKey]}</div>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <strong>${valueKeys[0]}:</strong> ${val}
                                </div>`;

                            tooltip
                                .html(
                                    formatTooltipContent(
                                        mainTxt,
                                        desc
                                    )
                                )
                                .style(
                                    "visibility",
                                    "visible"
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
                    .on(
                        "mouseout",
                        function () {
                            verticalHoverLine.style(
                                "visibility",
                                "hidden"
                            );

                            hoverDot.style(
                                "visibility",
                                "hidden"
                            );

                            tooltip.style(
                                "visibility",
                                "hidden"
                            );
                        }
                    );
            }

            // =====================================================
            // STANDARD VERTICAL BAR CHART
            // =====================================================

            else if (
                activeType === "bar"
            ) {
                xAxisGroup.style(
                    "display",
                    null
                );

                yAxisGroup.style(
                    "display",
                    null
                );

                const columnPadding = 0.3;
                const columnDomainMultiplier = 1.1;

                const xScale =
                    d3
                        .scaleBand()
                        .domain(
                            data.map(
                                function (row) {
                                    return row[
                                        categoryKey
                                    ];
                                }
                            )
                        )
                        .range([
                            0,
                            activeWidth
                        ])
                        .padding(
                            columnPadding
                        );

                const maximumValue =
                    d3.max(
                        data,
                        function (row) {
                            return (
                                row[
                                valueKeys[0]
                                ] || 0
                            );
                        }
                    ) || 0;

                const yScale =
                    d3
                        .scaleLinear()
                        .domain([
                            0,
                            maximumValue > 0
                                ? maximumValue *
                                columnDomainMultiplier
                                : 1
                        ])
                        .range([
                            activeHeight,
                            0
                        ]);

                // Render y-axis first to measure label widths, then remove it
                yAxisGroup
                    .call(
                        d3.axisLeft(yScale)
                            .ticks(5)
                    )
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                let maxYLabelWidth = 0;
                yAxisGroup.selectAll("text").each(function () {
                    const bbox = this.getBBox();
                    if (bbox.width > maxYLabelWidth) {
                        maxYLabelWidth = bbox.width;
                    }
                });

                yAxisGroup.selectAll("*").remove();

                // Compute left offset from y-label widths, then update xScale range
                const colExtraLeft = maxYLabelWidth > 0 ? maxYLabelWidth + 6 : 25;
                const colActiveWidth = chartWidth - colExtraLeft - margin.right;

                xScale.range([0, colActiveWidth]);

                svg.attr("transform", `translate(${colExtraLeft},${margin.top})`);

                // Align title/subtitle left edge with the first bar
                const firstBarX = xScale(data[0][categoryKey]) || 0;
                mainTitleText.attr("x", firstBarX);
                subtitleText.attr("x", firstBarX);

                // Now call x-axis AFTER xScale range is finalised so labels align with bars
                xAxisGroup
                    .call(
                        d3.axisBottom(
                            xScale
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

                // Rotate x-axis labels -45deg counterclockwise if they overlap
                hasRotatedXLabels = (function checkAndRotateXAxisLabels() {
                    const tickTexts = xAxisGroup.selectAll(".tick text").nodes();
                    if (tickTexts.length <= 1) {
                        return false;
                    }

                    let hasOverlap = false;
                    for (let i = 0; i < tickTexts.length - 1; i++) {
                        const nodeA = tickTexts[i];
                        const nodeB = tickTexts[i + 1];

                        const rectA = nodeA.getBoundingClientRect();
                        const rectB = nodeB.getBoundingClientRect();

                        if (rectA && rectB && rectA.width > 0 && rectB.width > 0) {
                            if (rectA.right > rectB.left - 2) {
                                hasOverlap = true;
                                break;
                            }
                        } else if (nodeA.getBBox && nodeB.getBBox) {
                            const bboxA = nodeA.getBBox();
                            const bboxB = nodeB.getBBox();
                            const tickA = d3.select(nodeA.parentNode).datum();
                            const tickB = d3.select(nodeB.parentNode).datum();
                            const centerA = (xScale(tickA) || 0) + xScale.bandwidth() / 2;
                            const centerB = (xScale(tickB) || 0) + xScale.bandwidth() / 2;
                            const rightA = centerA + bboxA.width / 2;
                            const leftB = centerB - bboxB.width / 2;
                            if (rightA > leftB - 2) {
                                hasOverlap = true;
                                break;
                            }
                        }
                    }

                    if (hasOverlap) {
                        xAxisGroup
                            .selectAll("text")
                            .attr("text-anchor", "end")
                            .attr("transform", "rotate(-45)")
                            .attr("dx", "-0.6em")
                            .attr("dy", "0.2em");
                        return true;
                    }
                    return false;
                })();


                const barPaths =
                    svg
                        .selectAll(
                            ".bar-path"
                        )
                        .data(
                            data
                        );

                barPaths
                    .exit()
                    .remove();

                const barCornerRadius = 4;

                const mergedBarPaths =
                    barPaths
                        .enter()
                        .append(
                            "path"
                        )
                        .attr(
                            "class",
                            "bar-path"
                        )
                        .merge(
                            barPaths
                        )
                        .attr(
                            "d",
                            function (row) {
                                const bx =
                                    xScale(
                                        row[
                                        categoryKey
                                        ]
                                    );

                                const by =
                                    yScale(
                                        row[
                                        valueKeys[0]
                                        ] || 0
                                    );

                                const bw =
                                    xScale.bandwidth();

                                const bh =
                                    activeHeight -
                                    by;

                                return roundedTopRect(
                                    bx,
                                    by,
                                    bw,
                                    bh,
                                    barCornerRadius
                                );
                            }
                        )
                        .attr(
                            "fill",
                            "#1ea0af"
                        )
                        .style(
                            "cursor",
                            "pointer"
                        )
                        .on(
                            "mouseover",
                            function () {
                                svg
                                    .selectAll(
                                        ".bar-path"
                                    )
                                    .attr(
                                        "opacity",
                                        0.3
                                    );

                                svg
                                    .selectAll(
                                        ".bar-label"
                                    )
                                    .attr(
                                        "opacity",
                                        0.3
                                    );

                                d3
                                    .select(this)
                                    .attr(
                                        "opacity",
                                        1
                                    );

                                const idx =
                                    mergedBarPaths
                                        .nodes()
                                        .indexOf(
                                            this
                                        );

                                if (showDataLabels) {
                                    const labelNodes = svg
                                        .selectAll(
                                            ".bar-label"
                                        )
                                        .nodes();
                                    if (labelNodes[idx]) {
                                        d3.select(labelNodes[idx]).attr("opacity", 1);
                                    }
                                }

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
                                row
                            ) {
                                const desc =
                                    descriptionKey
                                        ? row[
                                        descriptionKey
                                        ]
                                        : null;

                                const mainTxt =
                                    `<strong>${categoryKey}:</strong> ${row[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${row[valueKeys[0]]}`;

                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            mainTxt,
                                            desc
                                        )
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
                        .on(
                            "mouseout",
                            function () {
                                svg
                                    .selectAll(
                                        ".bar-path"
                                    )
                                    .attr(
                                        "opacity",
                                        1
                                    );

                                if (showDataLabels) {
                                    svg
                                        .selectAll(
                                            ".bar-label"
                                        )
                                        .attr(
                                            "opacity",
                                            1
                                        );
                                }

                                tooltip.style(
                                    "visibility",
                                    "hidden"
                                );
                            }
                        );

                if (showDataLabels) {
                    svg
                        .selectAll(
                            ".bar-label"
                        )
                        .data(
                            data
                        )
                        .enter()
                        .append(
                            "text"
                        )
                        .attr(
                            "class",
                            "bar-label"
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
                                return (
                                    yScale(
                                        row[
                                        valueKeys[0]
                                        ] || 0
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
                            "#000000"
                        )
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
                            tickSize
                        )
                        .text(
                            function (row) {
                                return (
                                    row[
                                    valueKeys[0]
                                    ] || 0
                                );
                            }
                        );
                }
            }

            // =====================================================
            // HORIZONTAL BAR CHART
            // =====================================================

            else if (
                activeType === "horizontal-bar"
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
                    d3
                        .scaleBand()
                        .domain(
                            data.map(
                                function (row) {
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
                        .padding(
                            0.3
                        );

                const maximumValue =
                    d3.max(
                        data,
                        function (row) {
                            return (
                                row[
                                valueKeys[0]
                                ] || 0
                            );
                        }
                    ) || 0;

                const xScale =
                    d3
                        .scaleLinear()
                        .domain([
                            0,
                            maximumValue > 0
                                ? maximumValue *
                                1.1
                                : 1
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

                let maxYLabelWidth =
                    0;

                yAxisGroup
                    .selectAll(
                        "text"
                    )
                    .each(
                        function () {
                            const bbox =
                                this.getBBox();

                            if (
                                bbox.width >
                                maxYLabelWidth
                            ) {
                                maxYLabelWidth =
                                    bbox.width;
                            }
                        }
                    );

                const hBarExtraLeft =
                    maxYLabelWidth > 0
                        ? maxYLabelWidth + 6
                        : 25;

                const dynamicActiveWidth =
                    chartWidth -
                    hBarExtraLeft -
                    margin.right;

                svg.attr(
                    "transform",
                    `translate(${hBarExtraLeft},${margin.top})`
                );

                // Align title/subtitle left edge with the leftmost y-axis label edge
                mainTitleText.attr("x", -hBarExtraLeft);
                subtitleText.attr("x", -hBarExtraLeft);

                xScale.range([
                    0,
                    dynamicActiveWidth
                ]);

                const hBarPaths =
                    svg
                        .selectAll(
                            ".hbar-path"
                        )
                        .data(
                            data
                        );

                hBarPaths
                    .exit()
                    .remove();

                const hBarCornerRadius =
                    4;

                const mergedHBarPaths =
                    hBarPaths
                        .enter()
                        .append(
                            "path"
                        )
                        .attr(
                            "class",
                            "hbar-path"
                        )
                        .merge(
                            hBarPaths
                        )
                        .attr(
                            "d",
                            function (row) {
                                const bx =
                                    0;

                                const by =
                                    yScale(
                                        row[
                                        categoryKey
                                        ]
                                    );

                                const bw =
                                    xScale(
                                        row[
                                        valueKeys[0]
                                        ] || 0
                                    );

                                const bh =
                                    yScale.bandwidth();

                                return roundedRightRect(
                                    bx,
                                    by,
                                    bw,
                                    bh,
                                    hBarCornerRadius
                                );
                            }
                        )
                        .attr(
                            "fill",
                            "#1ea0af"
                        )
                        .style(
                            "cursor",
                            "pointer"
                        )
                        .on(
                            "mouseover",
                            function () {
                                svg
                                    .selectAll(
                                        ".hbar-path"
                                    )
                                    .attr(
                                        "opacity",
                                        0.3
                                    );

                                svg
                                    .selectAll(
                                        ".hbar-label"
                                    )
                                    .attr(
                                        "opacity",
                                        0.3
                                    );

                                d3
                                    .select(this)
                                    .attr(
                                        "opacity",
                                        1
                                    );

                                const idx =
                                    mergedHBarPaths
                                        .nodes()
                                        .indexOf(
                                            this
                                        );

                                d3
                                    .select(
                                        svg
                                            .selectAll(
                                                ".hbar-label"
                                            )
                                            .nodes()[
                                        idx
                                        ]
                                    )
                                    .attr(
                                        "opacity",
                                        1
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
                                row
                            ) {
                                const desc =
                                    descriptionKey
                                        ? row[
                                        descriptionKey
                                        ]
                                        : null;

                                const mainTxt =
                                    `<strong>${categoryKey}:</strong> ${row[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${row[valueKeys[0]]}`;

                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            mainTxt,
                                            desc
                                        )
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
                        .on(
                            "mouseout",
                            function () {
                                svg
                                    .selectAll(
                                        ".hbar-path"
                                    )
                                    .attr(
                                        "opacity",
                                        1
                                    );

                                if (showDataLabels) {
                                    svg
                                        .selectAll(
                                            ".hbar-label"
                                        )
                                        .attr(
                                            "opacity",
                                            1
                                        );
                                }

                                tooltip.style(
                                    "visibility",
                                    "hidden"
                                );
                            }
                        );

                if (showDataLabels) {
                    svg
                        .selectAll(
                            ".hbar-label"
                        )
                        .data(
                            data
                        )
                        .enter()
                        .append(
                            "text"
                        )
                        .attr(
                            "class",
                            "hbar-label"
                        )
                        .attr(
                            "x",
                            function (row) {
                                return (
                                    xScale(
                                        row[
                                        valueKeys[0]
                                        ] || 0
                                    ) + 6
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
                            "dy",
                            "0.35em"
                        )
                        .attr(
                            "text-anchor",
                            "start"
                        )
                        .attr(
                            "fill",
                            "#000000"
                        )
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
                            tickSize
                        )
                        .text(
                            function (row) {
                                return (
                                    row[
                                    valueKeys[0]
                                    ] || 0
                                );
                            }
                        )
                        .each(
                            function () {
                                const bbox =
                                    this.getBBox();

                                if (
                                    bbox.x +
                                    bbox.width >
                                    dynamicActiveWidth
                                ) {
                                    d3
                                        .select(
                                            this
                                        )
                                        .style(
                                            "display",
                                            "none"
                                        );
                                }
                            }
                        );
                }
            }

            // =====================================================
            // VERTICAL STACKED BAR CHART
            // =====================================================

            else if (
                activeType === "stacked-bar"
            ) {
                xAxisGroup.style(
                    "display",
                    null
                );

                yAxisGroup.style(
                    "display",
                    null
                );

                const xScale =
                    d3
                        .scaleBand()
                        .domain(
                            data.map(
                                function (row) {
                                    return row[
                                        categoryKey
                                    ];
                                }
                            )
                        )
                        .range([
                            0,
                            activeWidth
                        ])
                        .padding(
                            0.3
                        );

                const maximumStack =
                    d3.max(
                        data,
                        function (row) {
                            return d3.sum(
                                valueKeys,
                                function (key) {
                                    return (
                                        row[
                                        key
                                        ] || 0
                                    );
                                }
                            );
                        }
                    ) || 10;

                const yScale =
                    d3
                        .scaleLinear()
                        .domain([
                            0,
                            maximumStack *
                            1.1
                        ])
                        .range([
                            activeHeight,
                            0
                        ]);

                xAxisGroup
                    .call(
                        d3.axisBottom(
                            xScale
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

                yAxisGroup
                    .selectAll("*")
                    .remove();

                yAxisGroup
                    .call(
                        d3.axisLeft(yScale)
                            .ticks(5)
                            .tickSize(-activeWidth)
                    )
                    .call(function (g) {
                        g.select(".domain").remove();
                        g.selectAll(".tick line")
                            .attr("stroke", "#e5e7eb")
                            .attr("stroke-dasharray", "3 3");
                    })
                    .selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                let maxYLabelWidth = 0;
                yAxisGroup.selectAll("text").each(function () {
                    const bbox = this.getBBox();
                    if (bbox.width > maxYLabelWidth) {
                        maxYLabelWidth = bbox.width;
                    }
                });

                const extraLeftMargin = maxYLabelWidth > 0 ? maxYLabelWidth + 6 : 25;
                const dynamicActiveWidth = chartWidth - extraLeftMargin - margin.right;

                svg.attr(
                    "transform",
                    `translate(${extraLeftMargin},${margin.top})`
                );

                xScale.range([0, dynamicActiveWidth]);

                xAxisGroup
                    .call(
                        d3.axisBottom(
                            xScale
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

                // Rotate x-axis labels -45deg counterclockwise if they overlap
                hasRotatedXLabels = (function checkAndRotateXAxisLabels() {
                    const tickTexts = xAxisGroup.selectAll(".tick text").nodes();
                    if (tickTexts.length <= 1) {
                        return false;
                    }

                    let hasOverlap = false;
                    for (let i = 0; i < tickTexts.length - 1; i++) {
                        const nodeA = tickTexts[i];
                        const nodeB = tickTexts[i + 1];

                        const rectA = nodeA.getBoundingClientRect();
                        const rectB = nodeB.getBoundingClientRect();

                        if (rectA && rectB && rectA.width > 0 && rectB.width > 0) {
                            if (rectA.right > rectB.left - 2) {
                                hasOverlap = true;
                                break;
                            }
                        } else if (nodeA.getBBox && nodeB.getBBox) {
                            const bboxA = nodeA.getBBox();
                            const bboxB = nodeB.getBBox();
                            const tickA = d3.select(nodeA.parentNode).datum();
                            const tickB = d3.select(nodeB.parentNode).datum();
                            const centerA = (xScale(tickA) || 0) + xScale.bandwidth() / 2;
                            const centerB = (xScale(tickB) || 0) + xScale.bandwidth() / 2;
                            const rightA = centerA + bboxA.width / 2;
                            const leftB = centerB - bboxB.width / 2;
                            if (rightA > leftB - 2) {
                                hasOverlap = true;
                                break;
                            }
                        }
                    }

                    if (hasOverlap) {
                        xAxisGroup
                            .selectAll("text")
                            .attr("text-anchor", "end")
                            .attr("transform", "rotate(-45)")
                            .attr("dx", "-0.6em")
                            .attr("dy", "0.2em");
                        return true;
                    }
                    return false;
                })();

                yAxisGroup.call(
                    d3.axisLeft(yScale)
                        .ticks(5)
                        .tickSize(-dynamicActiveWidth)
                ).call(function (g) {
                    g.select(".domain").remove();
                    g.selectAll(".tick line")
                        .attr("stroke", "#e5e7eb")
                        .attr("stroke-dasharray", "3 3");
                }).selectAll("text")
                    .style("font-family", activeFont)
                    .style("font-size", tickSize);

                const stackedData =
                    d3
                        .stack()
                        .keys(
                            valueKeys
                        )(
                            data
                        );

                const stackedColors = [
                    "#063137",
                    "#16a1b5"
                ];

                const colorScale =
                    d3
                        .scaleOrdinal()
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
                    svg
                        .selectAll(
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
                            "path"
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

                const stackCornerRadius =
                    4;

                segments
                    .enter()
                    .append(
                        "path"
                    )
                    .merge(
                        segments
                    )
                    .attr(
                        "d",
                        function (
                            segment
                        ) {
                            const bx =
                                xScale(
                                    segment
                                        .data[
                                    categoryKey
                                    ]
                                );

                            const by =
                                yScale(
                                    segment[1]
                                );

                            const bw =
                                xScale.bandwidth();

                            const bh =
                                yScale(
                                    segment[0]
                                ) -
                                yScale(
                                    segment[1]
                                );

                            if (
                                bh <= 0 ||
                                bw <= 0
                            ) {
                                return "";
                            }

                            return roundedTopRect(
                                bx,
                                by,
                                bw,
                                bh,
                                stackCornerRadius
                            );
                        }
                    )
                    .style(
                        "cursor",
                        "pointer"
                    )
                    .on(
                        "mouseover",
                        function () {
                            svg
                                .selectAll(
                                    ".stack-layer path"
                                )
                                .attr(
                                    "opacity",
                                    0.3
                                );

                            d3
                                .select(
                                    this
                                )
                                .attr(
                                    "opacity",
                                    1
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
                                d3
                                    .select(
                                        this.parentNode
                                    )
                                    .datum()
                                    .key;

                            const segmentValue =
                                segment[1] -
                                segment[0];

                            const desc =
                                descriptionKey
                                    ? segment
                                        .data[
                                    descriptionKey
                                    ]
                                    : null;

                            const mainTxt =
                                `<strong>${categoryKey}:</strong> ${segment.data[categoryKey]}<br><strong>${layerKey}:</strong> ${segmentValue}`;

                            tooltip
                                .html(
                                    formatTooltipContent(
                                        mainTxt,
                                        desc
                                    )
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
                    .on(
                        "mouseout",
                        function () {
                            svg
                                .selectAll(
                                    ".stack-layer path"
                                )
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

                svg
                    .selectAll(
                        ".total-label"
                    )
                    .remove();

                if (showStackTotals) {
                    svg
                        .selectAll(
                            ".total-label"
                        )
                        .data(
                            data
                        )
                        .enter()
                        .append(
                            "text"
                        )
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
                                                ] || 0
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
                                            ] || 0
                                        );
                                    }
                                );
                            }
                        );
                }

                svg
                    .selectAll(
                        ".stack-label"
                    )
                    .remove();

                if (showDataLabels) {
                    stackedData.forEach(function (layer) {
                        layer.forEach(function (segment) {
                            const segmentValue =
                                segment[1] - segment[0];

                            if (segmentValue <= 0) {
                                return;
                            }

                            const bx =
                                xScale(
                                    segment.data[
                                    categoryKey
                                    ]
                                );

                            const by =
                                yScale(
                                    segment[1]
                                );

                            const bw =
                                xScale.bandwidth();

                            const bh =
                                yScale(
                                    segment[0]
                                ) -
                                yScale(
                                    segment[1]
                                );

                            if (
                                bh >= 14 * fontScale &&
                                bw >= 16
                            ) {
                                svg.append("text")
                                    .attr(
                                        "class",
                                        "stack-label"
                                    )
                                    .attr(
                                        "x",
                                        bx + bw / 2
                                    )
                                    .attr(
                                        "y",
                                        by + bh / 2
                                    )
                                    .attr(
                                        "text-anchor",
                                        "middle"
                                    )
                                    .attr(
                                        "alignment-baseline",
                                        "middle"
                                    )
                                    .attr(
                                        "dominant-baseline",
                                        "central"
                                    )
                                    .attr(
                                        "fill",
                                        "#ffffff"
                                    )
                                    .style(
                                        "font-weight",
                                        "600"
                                    )
                                    .style(
                                        "font-family",
                                        activeFont
                                    )
                                    .style(
                                        "font-size",
                                        `${Math.max(10, Math.round(12 * fontScale))}px`
                                    )
                                    .style(
                                        "pointer-events",
                                        "none"
                                    )
                                    .text(
                                        segmentValue
                                    );
                            }
                        });
                    });
                }
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
                    d3
                        .scaleBand()
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
                        .padding(
                            0.3
                        );

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
                                        ] || 0
                                    );
                                }
                            );
                        }
                    ) || 10;

                const xScale =
                    d3
                        .scaleLinear()
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

                let maxYLabelWidth =
                    0;

                yAxisGroup
                    .selectAll(
                        "text"
                    )
                    .each(
                        function () {
                            const bbox =
                                this.getBBox();

                            if (
                                bbox.width >
                                maxYLabelWidth
                            ) {
                                maxYLabelWidth =
                                    bbox.width;
                            }
                        }
                    );

                const extraLeftMargin =
                    maxYLabelWidth > 0
                        ? maxYLabelWidth + 6
                        : 25;

                const dynamicActiveWidth =
                    chartWidth -
                    extraLeftMargin -
                    margin.right;

                svg.attr(
                    "transform",
                    `translate(${extraLeftMargin},${margin.top})`
                );

                xScale.range([
                    0,
                    dynamicActiveWidth
                ]);

                const stackedData =
                    d3
                        .stack()
                        .keys(
                            valueKeys
                        )(
                            data
                        );

                const stackedColors = [
                    "#063137",
                    "#16a1b5"
                ];

                const colorScale =
                    d3
                        .scaleOrdinal()
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
                    svg
                        .selectAll(
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
                        .append(
                            "g"
                        )
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
                            "path"
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

                const hStackCornerRadius =
                    4;

                segments
                    .enter()
                    .append(
                        "path"
                    )
                    .merge(
                        segments
                    )
                    .attr(
                        "d",
                        function (
                            segment
                        ) {
                            const bx =
                                xScale(
                                    segment[0]
                                );

                            const by =
                                yScale(
                                    segment
                                        .data[
                                    categoryKey
                                    ]
                                );

                            const bw =
                                xScale(
                                    segment[1]
                                ) -
                                xScale(
                                    segment[0]
                                );

                            const bh =
                                yScale.bandwidth();

                            return roundedRightRect(
                                bx,
                                by,
                                bw,
                                bh,
                                hStackCornerRadius
                            );
                        }
                    )
                    .style(
                        "cursor",
                        "pointer"
                    )
                    .on(
                        "mouseover",
                        function () {
                            svg
                                .selectAll(
                                    ".stack-layer path"
                                )
                                .attr(
                                    "opacity",
                                    0.3
                                );

                            d3
                                .select(
                                    this
                                )
                                .attr(
                                    "opacity",
                                    1
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
                                d3
                                    .select(
                                        this.parentNode
                                    )
                                    .datum()
                                    .key;

                            const value =
                                segment[1] -
                                segment[0];

                            const desc =
                                descriptionKey
                                    ? segment
                                        .data[
                                    descriptionKey
                                    ]
                                    : null;

                            const mainTxt =
                                `<strong>${categoryKey}:</strong> ${segment.data[categoryKey]}<br><strong>${layerKey}:</strong> ${value}`;

                            tooltip
                                .html(
                                    formatTooltipContent(
                                        mainTxt,
                                        desc
                                    )
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
                    .on(
                        "mouseout",
                        function () {
                            svg
                                .selectAll(
                                    ".stack-layer path"
                                )
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

                svg
                    .selectAll(
                        ".total-label"
                    )
                    .remove();

                if (showStackTotals) {
                    svg
                        .selectAll(
                            ".total-label"
                        )
                        .data(
                            data
                        )
                        .enter()
                        .append(
                            "text"
                        )
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
                                                ] || 0
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
                            "dominant-baseline",
                            "central"
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
                                            ] || 0
                                        );
                                    }
                                );
                            }
                        )
                        .each(
                            function () {
                                const bbox =
                                    this.getBBox();

                                if (
                                    bbox.x +
                                    bbox.width >
                                    dynamicActiveWidth
                                ) {
                                    d3
                                        .select(
                                            this
                                        )
                                        .style(
                                            "display",
                                            "none"
                                        );
                                }
                            }
                        );
                }

                svg
                    .selectAll(
                        ".stack-label"
                    )
                    .remove();

                if (showDataLabels) {
                    stackedData.forEach(function (layer) {
                        layer.forEach(function (segment) {
                            const segmentValue =
                                segment[1] - segment[0];

                            if (segmentValue <= 0) {
                                return;
                            }

                            const bx =
                                xScale(
                                    segment[0]
                                );

                            const by =
                                yScale(
                                    segment.data[
                                    categoryKey
                                    ]
                                );

                            const bw =
                                xScale(
                                    segment[1]
                                ) -
                                xScale(
                                    segment[0]
                                );

                            const bh =
                                yScale.bandwidth();

                            if (
                                bw >= 18 * fontScale &&
                                bh >= 10
                            ) {
                                svg.append("text")
                                    .attr(
                                        "class",
                                        "stack-label"
                                    )
                                    .attr(
                                        "x",
                                        bx + bw / 2
                                    )
                                    .attr(
                                        "y",
                                        by + bh / 2
                                    )
                                    .attr(
                                        "text-anchor",
                                        "middle"
                                    )
                                    .attr(
                                        "alignment-baseline",
                                        "middle"
                                    )
                                    .attr(
                                        "dominant-baseline",
                                        "central"
                                    )
                                    .attr(
                                        "fill",
                                        "#ffffff"
                                    )
                                    .style(
                                        "font-weight",
                                        "600"
                                    )
                                    .style(
                                        "font-family",
                                        activeFont
                                    )
                                    .style(
                                        "font-size",
                                        `${Math.max(10, Math.round(12 * fontScale))}px`
                                    )
                                    .style(
                                        "pointer-events",
                                        "none"
                                    )
                                    .text(
                                        segmentValue
                                    );
                            }
                        });
                    });
                }
            }

            // =====================================================
            // MULTI-LINE & STACKED AREA SHARED SETUP
            // =====================================================

            else if (
                activeType === "multi-line" ||
                activeType === "stacked-area"
            ) {
                xAxisGroup.style(
                    "display",
                    null
                );

                yAxisGroup.style(
                    "display",
                    null
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

                const totalsMap =
                    new Map();

                valueKeys.forEach(
                    function (key) {
                        const total =
                            d3.sum(
                                data,
                                function (row) {
                                    return (
                                        row[
                                        key
                                        ] || 0
                                    );
                                }
                            );

                        totalsMap.set(
                            key,
                            total
                        );
                    }
                );

                const sortedKeys =
                    [...valueKeys].sort(
                        function (
                            a,
                            b
                        ) {
                            return (
                                (
                                    totalsMap.get(
                                        b
                                    ) || 0
                                ) -
                                (
                                    totalsMap.get(
                                        a
                                    ) || 0
                                )
                            );
                        }
                    );

                const seriesColorMap =
                    new Map();

                sortedKeys.forEach(
                    function (
                        key,
                        index
                    ) {
                        seriesColorMap.set(
                            key,
                            PIE_COLORS[
                            index %
                            PIE_COLORS.length
                            ]
                        );
                    }
                );

                renderHTMLHeader(
                    mainTitleValue,
                    subtitleValue,
                    mainTitleSize,
                    activeType,
                    sortedKeys,
                    tickSize,
                    seriesColorMap,
                    fontScale,
                    showTitle,
                    showSubtitle
                );

                const categories =
                    data.map(
                        function (row) {
                            return String(
                                row[
                                categoryKey
                                ]
                            );
                        }
                    );

                const xScale =
                    d3
                        .scalePoint()
                        .domain(
                            categories
                        )
                        .range([
                            0,
                            activeWidth
                        ])
                        .padding(
                            0.1
                        );

                // =====================================================
                // MULTIPLE LINE CHART
                // =====================================================

                if (
                    activeType === "multi-line"
                ) {
                    let maxVal =
                        0;

                    data.forEach(
                        function (row) {
                            sortedKeys.forEach(
                                function (
                                    key
                                ) {
                                    const val =
                                        row[
                                        key
                                        ] || 0;

                                    if (
                                        val >
                                        maxVal
                                    ) {
                                        maxVal =
                                            val;
                                    }
                                }
                            );
                        }
                    );

                    if (
                        maxVal === 0
                    ) {
                        maxVal =
                            10;
                    }

                    const yScale =
                        d3
                            .scaleLinear()
                            .domain([
                                0,
                                maxVal *
                                1.08
                            ])
                            .nice()
                            .range([
                                activeHeight,
                                0
                            ]);

                    const yAxis =
                        d3
                            .axisLeft(
                                yScale
                            )
                            .ticks(
                                6
                            )
                            .tickSize(
                                -activeWidth
                            );

                    yAxisGroup
                        .call(
                            yAxis
                        )
                        .call(
                            function (
                                g
                            ) {
                                g
                                    .select(
                                        ".domain"
                                    )
                                    .remove();

                                g
                                    .selectAll(
                                        ".tick line"
                                    )
                                    .attr(
                                        "stroke",
                                        "#e5e5e5"
                                    )
                                    .attr(
                                        "stroke-dasharray",
                                        null
                                    );

                                g
                                    .selectAll(
                                        ".tick text"
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
                                        "#545454"
                                    );
                            }
                        );

                    const xAxis =
                        d3.axisBottom(
                            xScale
                        );

                    xAxisGroup
                        .call(
                            xAxis
                        )
                        .call(
                            function (
                                g
                            ) {
                                g
                                    .select(
                                        ".domain"
                                    )
                                    .attr(
                                        "stroke",
                                        "#ccc"
                                    )
                                    .attr(
                                        "stroke-width",
                                        1
                                    );

                                g
                                    .selectAll(
                                        ".tick line"
                                    )
                                    .remove();

                                g
                                    .selectAll(
                                        ".tick text"
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
                                        "#545454"
                                    );
                            }
                        );

                    const seriesGroups =
                        svg
                            .selectAll(
                                ".multi-line-group"
                            )
                            .data(
                                sortedKeys
                            )
                            .enter()
                            .append(
                                "g"
                            )
                            .attr(
                                "class",
                                "multi-line-group"
                            )
                            .datum(
                                function (
                                    key
                                ) {
                                    return key;
                                }
                            );

                    const linePaths =
                        seriesGroups
                            .append(
                                "path"
                            )
                            .attr(
                                "class",
                                "multi-line-path"
                            )
                            .attr(
                                "d",
                                function (
                                    key
                                ) {
                                    const generator =
                                        d3
                                            .line()
                                            .x(
                                                function (
                                                    d
                                                ) {
                                                    return xScale(
                                                        String(
                                                            d[
                                                            categoryKey
                                                            ]
                                                        )
                                                    );
                                                }
                                            )
                                            .y(
                                                function (
                                                    d
                                                ) {
                                                    return yScale(
                                                        d[
                                                        key
                                                        ] || 0
                                                    );
                                                }
                                            )
                                            .curve(
                                                d3.curveLinear
                                            );

                                    return generator(
                                        data
                                    );
                                }
                            )
                            .attr(
                                "fill",
                                "none"
                            )
                            .attr(
                                "stroke",
                                function (
                                    key
                                ) {
                                    return seriesColorMap.get(
                                        key
                                    );
                                }
                            )
                            .attr(
                                "stroke-width",
                                2.5
                            )
                            .style(
                                "cursor",
                                "pointer"
                            )
                            .style(
                                "transition",
                                "opacity 0.2s ease, stroke-width 0.2s ease"
                            );

                    let selectedKey =
                        null;

                    function highlightLine(
                        targetKey
                    ) {
                        linePaths.each(
                            function (
                                key
                            ) {
                                const path =
                                    d3.select(
                                        this
                                    );

                                if (
                                    targetKey === null ||
                                    key === targetKey
                                ) {
                                    path
                                        .style(
                                            "opacity",
                                            1
                                        )
                                        .attr(
                                            "stroke-width",
                                            key ===
                                                targetKey
                                                ? 4
                                                : 2.5
                                        );
                                } else {
                                    path
                                        .style(
                                            "opacity",
                                            0.15
                                        )
                                        .attr(
                                            "stroke-width",
                                            2.5
                                        );
                                }
                            }
                        );

                        headerLegend
                            .selectAll(
                                `.legend-item-${uid}`
                            )
                            .each(
                                function (
                                    key
                                ) {
                                    const item =
                                        d3.select(
                                            this
                                        );

                                    if (
                                        targetKey ===
                                        null ||
                                        key ===
                                        targetKey
                                    ) {
                                        item.style(
                                            "opacity",
                                            1
                                        );
                                    } else {
                                        item.style(
                                            "opacity",
                                            0.3
                                        );
                                    }
                                }
                            );
                    }

                    headerLegend
                        .selectAll(
                            `.legend-item-${uid}`
                        )
                        .on(
                            "mouseover",
                            function (
                                event,
                                key
                            ) {
                                if (
                                    selectedKey ===
                                    null
                                ) {
                                    highlightLine(
                                        key
                                    );
                                }

                                const desc =
                                    currentDescriptions[
                                    key
                                    ] || null;

                                const mainTxt =
                                    `<strong>Label:</strong> ${key}`;

                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            mainTxt,
                                            desc
                                        )
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
                                    );
                            }
                        )
                        .on(
                            "mousemove",
                            function (
                                event
                            ) {
                                tooltip
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
                        .on(
                            "mouseout",
                            function () {
                                if (
                                    selectedKey ===
                                    null
                                ) {
                                    highlightLine(
                                        null
                                    );

                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                }
                            }
                        )
                        .on(
                            "click",
                            function (
                                event,
                                key
                            ) {
                                event.stopPropagation();

                                if (
                                    selectedKey ===
                                    key
                                ) {
                                    selectedKey =
                                        null;

                                    highlightLine(
                                        null
                                    );

                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                } else {
                                    selectedKey =
                                        key;

                                    highlightLine(
                                        key
                                    );

                                    const desc =
                                        currentDescriptions[
                                        key
                                        ] || null;

                                    const mainTxt =
                                        `<strong>Label:</strong> ${key}`;

                                    tooltip
                                        .html(
                                            formatTooltipContent(
                                                mainTxt,
                                                desc
                                            )
                                        )
                                        .style(
                                            "visibility",
                                            "visible"
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
                            }
                        );

                    d3
                        .select(
                            "body"
                        )
                        .on(
                            `click.multi-line-${uid}`,
                            function (
                                event
                            ) {
                                const isLegend =
                                    event.target
                                        .closest &&
                                    event.target.closest(
                                        `#chart-header-legend-${uid}`
                                    );

                                if (
                                    !isLegend
                                ) {
                                    selectedKey =
                                        null;

                                    highlightLine(
                                        null
                                    );

                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                }
                            }
                        );

                    const hoverOverlayGroup =
                        svg
                            .append(
                                "g"
                            )
                            .attr(
                                "class",
                                "hover-overlay-group"
                            );

                    const verticalHoverLine =
                        hoverOverlayGroup
                            .append(
                                "line"
                            )
                            .attr(
                                "y1",
                                0
                            )
                            .attr(
                                "y2",
                                activeHeight
                            )
                            .attr(
                                "stroke",
                                "#888"
                            )
                            .attr(
                                "stroke-width",
                                1.5
                            )
                            .attr(
                                "stroke-dasharray",
                                "4 4"
                            )
                            .style(
                                "pointer-events",
                                "none"
                            )
                            .style(
                                "visibility",
                                "hidden"
                            );

                    const hoverDots =
                        hoverOverlayGroup
                            .selectAll(
                                ".hover-dot"
                            )
                            .data(
                                sortedKeys
                            )
                            .enter()
                            .append(
                                "circle"
                            )
                            .attr(
                                "class",
                                "hover-dot"
                            )
                            .attr(
                                "r",
                                4.5
                            )
                            .attr(
                                "fill",
                                function (
                                    key
                                ) {
                                    return seriesColorMap.get(
                                        key
                                    );
                                }
                            )
                            .attr(
                                "stroke",
                                "#fff"
                            )
                            .attr(
                                "stroke-width",
                                1.5
                            )
                            .style(
                                "pointer-events",
                                "none"
                            )
                            .style(
                                "visibility",
                                "hidden"
                            );

                    const overlayRect =
                        hoverOverlayGroup
                            .append(
                                "rect"
                            )
                            .attr(
                                "width",
                                activeWidth
                            )
                            .attr(
                                "height",
                                activeHeight
                            )
                            .attr(
                                "fill",
                                "transparent"
                            )
                            .style(
                                "cursor",
                                "crosshair"
                            );

                    overlayRect
                        .on(
                            "mousemove",
                            function (
                                event
                            ) {
                                if (
                                    selectedKey !==
                                    null
                                ) {
                                    return;
                                }

                                const [
                                    mouseX
                                ] =
                                    d3.pointer(
                                        event,
                                        this
                                    );

                                let closestRow =
                                    data[0];

                                let minDistance =
                                    Infinity;

                                data.forEach(
                                    function (
                                        row
                                    ) {
                                        const cx =
                                            xScale(
                                                String(
                                                    row[
                                                    categoryKey
                                                    ]
                                                )
                                            );

                                        const dist =
                                            Math.abs(
                                                mouseX -
                                                cx
                                            );

                                        if (
                                            dist <
                                            minDistance
                                        ) {
                                            minDistance =
                                                dist;

                                            closestRow =
                                                row;
                                        }
                                    }
                                );

                                const cx =
                                    xScale(
                                        String(
                                            closestRow[
                                            categoryKey
                                            ]
                                        )
                                    );

                                verticalHoverLine
                                    .attr(
                                        "x1",
                                        cx
                                    )
                                    .attr(
                                        "x2",
                                        cx
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
                                    );

                                hoverDots
                                    .attr(
                                        "cx",
                                        cx
                                    )
                                    .attr(
                                        "cy",
                                        function (
                                            key
                                        ) {
                                            return yScale(
                                                closestRow[
                                                key
                                                ] || 0
                                            );
                                        }
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
                                    );

                                const listItems =
                                    sortedKeys
                                        .map(
                                            function (
                                                key
                                            ) {
                                                const color =
                                                    seriesColorMap.get(
                                                        key
                                                    );

                                                const val =
                                                    closestRow[
                                                        key
                                                    ] !==
                                                        undefined
                                                        ? closestRow[
                                                        key
                                                        ]
                                                        : 0;

                                                return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:3px;">
                                                    <span style="display:flex; align-items:center; gap:6px;">
                                                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color};"></span>
                                                        <span>${key}</span>
                                                    </span>
                                                    <strong>${val}</strong>
                                                </div>`;
                                            }
                                        )
                                        .join(
                                            ""
                                        );

                                const mainTxt =
                                    `<div style="font-weight:bold; margin-bottom:6px; border-bottom:1px solid #555; padding-bottom:4px;">${closestRow[categoryKey]}</div>${listItems}`;

                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            mainTxt,
                                            null
                                        )
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
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
                        .on(
                            "mouseout",
                            function () {
                                if (
                                    selectedKey !==
                                    null
                                ) {
                                    return;
                                }

                                verticalHoverLine.style(
                                    "visibility",
                                    "hidden"
                                );

                                hoverDots.style(
                                    "visibility",
                                    "hidden"
                                );

                                tooltip.style(
                                    "visibility",
                                    "hidden"
                                );
                            }
                        );
                }

                // =====================================================
                // STACKED AREA CHART
                // =====================================================

                else if (
                    activeType ===
                    "stacked-area"
                ) {
                    const stack =
                        d3
                            .stack()
                            .keys(
                                sortedKeys
                            )
                            .order(
                                d3.stackOrderNone
                            )
                            .offset(
                                d3.stackOffsetNone
                            );

                    const seriesData =
                        stack(
                            data
                        );

                    const maxStackedVal =
                        d3.max(
                            seriesData,
                            function (
                                layer
                            ) {
                                return d3.max(
                                    layer,
                                    function (
                                        d
                                    ) {
                                        return d[1];
                                    }
                                );
                            }
                        ) || 10;

                    const yScale =
                        d3
                            .scaleLinear()
                            .domain([
                                0,
                                maxStackedVal *
                                1.05
                            ])
                            .nice()
                            .range([
                                activeHeight,
                                0
                            ]);

                    const yAxis =
                        d3
                            .axisLeft(
                                yScale
                            )
                            .ticks(
                                6
                            )
                            .tickSize(
                                -activeWidth
                            );

                    yAxisGroup
                        .call(
                            yAxis
                        )
                        .call(
                            function (
                                g
                            ) {
                                g
                                    .select(
                                        ".domain"
                                    )
                                    .remove();

                                g
                                    .selectAll(
                                        ".tick line"
                                    )
                                    .attr(
                                        "stroke",
                                        "#e5e5e5"
                                    )
                                    .attr(
                                        "stroke-dasharray",
                                        null
                                    );

                                g
                                    .selectAll(
                                        ".tick text"
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
                                        "#545454"
                                    );
                            }
                        );

                    const xAxis =
                        d3.axisBottom(
                            xScale
                        );

                    xAxisGroup
                        .call(
                            xAxis
                        )
                        .call(
                            function (
                                g
                            ) {
                                g
                                    .select(
                                        ".domain"
                                    )
                                    .attr(
                                        "stroke",
                                        "#ccc"
                                    )
                                    .attr(
                                        "stroke-width",
                                        1
                                    );

                                g
                                    .selectAll(
                                        ".tick line"
                                    )
                                    .remove();

                                g
                                    .selectAll(
                                        ".tick text"
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
                                        "#545454"
                                    );
                            }
                        );

                    const areaGenerator =
                        d3
                            .area()
                            .x(
                                function (
                                    d
                                ) {
                                    return xScale(
                                        String(
                                            d
                                                .data[
                                            categoryKey
                                            ]
                                        )
                                    );
                                }
                            )
                            .y0(
                                function (
                                    d
                                ) {
                                    return yScale(
                                        d[0]
                                    );
                                }
                            )
                            .y1(
                                function (
                                    d
                                ) {
                                    return yScale(
                                        d[1]
                                    );
                                }
                            )
                            .curve(
                                d3.curveLinear
                            );

                    const areaPaths =
                        svg
                            .selectAll(
                                ".stacked-area-path"
                            )
                            .data(
                                seriesData
                            )
                            .enter()
                            .append(
                                "path"
                            )
                            .attr(
                                "class",
                                "stacked-area-path"
                            )
                            .attr(
                                "d",
                                areaGenerator
                            )
                            .attr(
                                "fill",
                                function (
                                    layer
                                ) {
                                    return seriesColorMap.get(
                                        layer.key
                                    );
                                }
                            )
                            .attr(
                                "opacity",
                                0.85
                            )
                            .style(
                                "cursor",
                                "pointer"
                            )
                            .style(
                                "transition",
                                "opacity 0.2s ease"
                            );

                    let selectedAreaKey =
                        null;

                    function highlightArea(
                        targetKey
                    ) {
                        areaPaths.each(
                            function (
                                layer
                            ) {
                                const path =
                                    d3.select(
                                        this
                                    );

                                if (
                                    targetKey ===
                                    null ||
                                    layer.key ===
                                    targetKey
                                ) {
                                    path.style(
                                        "opacity",
                                        layer.key ===
                                            targetKey
                                            ? 0.95
                                            : 0.85
                                    );
                                } else {
                                    path.style(
                                        "opacity",
                                        0.25
                                    );
                                }
                            }
                        );

                        headerLegend
                            .selectAll(
                                `.legend-item-${uid}`
                            )
                            .each(
                                function (
                                    key
                                ) {
                                    const item =
                                        d3.select(
                                            this
                                        );

                                    if (
                                        targetKey ===
                                        null ||
                                        key ===
                                        targetKey
                                    ) {
                                        item.style(
                                            "opacity",
                                            1
                                        );
                                    } else {
                                        item.style(
                                            "opacity",
                                            0.3
                                        );
                                    }
                                }
                            );
                    }

                    headerLegend
                        .selectAll(
                            `.legend-item-${uid}`
                        )
                        .on(
                            "mouseover",
                            function (
                                event,
                                key
                            ) {
                                if (
                                    selectedAreaKey ===
                                    null
                                ) {
                                    highlightArea(
                                        key
                                    );
                                }

                                const desc =
                                    currentDescriptions[
                                    key
                                    ] || null;

                                const mainTxt =
                                    `<strong>Label:</strong> ${key}`;

                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            mainTxt,
                                            desc
                                        )
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
                                    );
                            }
                        )
                        .on(
                            "mousemove",
                            function (
                                event
                            ) {
                                tooltip
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
                        .on(
                            "mouseout",
                            function () {
                                if (
                                    selectedAreaKey ===
                                    null
                                ) {
                                    highlightArea(
                                        null
                                    );

                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                }
                            }
                        )
                        .on(
                            "click",
                            function (
                                event,
                                key
                            ) {
                                event.stopPropagation();

                                if (
                                    selectedAreaKey ===
                                    key
                                ) {
                                    selectedAreaKey =
                                        null;

                                    highlightArea(
                                        null
                                    );

                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                } else {
                                    selectedAreaKey =
                                        key;

                                    highlightArea(
                                        key
                                    );

                                    const desc =
                                        currentDescriptions[
                                        key
                                        ] || null;

                                    const mainTxt =
                                        `<strong>Label:</strong> ${key}`;

                                    tooltip
                                        .html(
                                            formatTooltipContent(
                                                mainTxt,
                                                desc
                                            )
                                        )
                                        .style(
                                            "visibility",
                                            "visible"
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
                            }
                        );

                    d3
                        .select(
                            "body"
                        )
                        .on(
                            `click.stacked-area-${uid}`,
                            function (
                                event
                            ) {
                                const isLegend =
                                    event.target
                                        .closest &&
                                    event.target.closest(
                                        `#chart-header-legend-${uid}`
                                    );

                                if (
                                    !isLegend
                                ) {
                                    selectedAreaKey =
                                        null;

                                    highlightArea(
                                        null
                                    );

                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                }
                            }
                        );

                    const hoverOverlayGroup =
                        svg
                            .append(
                                "g"
                            )
                            .attr(
                                "class",
                                "hover-overlay-group"
                            );

                    const verticalHoverLine =
                        hoverOverlayGroup
                            .append(
                                "line"
                            )
                            .attr(
                                "y1",
                                0
                            )
                            .attr(
                                "y2",
                                activeHeight
                            )
                            .attr(
                                "stroke",
                                "#888"
                            )
                            .attr(
                                "stroke-width",
                                1.5
                            )
                            .attr(
                                "stroke-dasharray",
                                "4 4"
                            )
                            .style(
                                "pointer-events",
                                "none"
                            )
                            .style(
                                "visibility",
                                "hidden"
                            );

                    const overlayRect =
                        hoverOverlayGroup
                            .append(
                                "rect"
                            )
                            .attr(
                                "width",
                                activeWidth
                            )
                            .attr(
                                "height",
                                activeHeight
                            )
                            .attr(
                                "fill",
                                "transparent"
                            )
                            .style(
                                "cursor",
                                "crosshair"
                            );

                    overlayRect
                        .on(
                            "mousemove",
                            function (
                                event
                            ) {
                                if (
                                    selectedAreaKey !==
                                    null
                                ) {
                                    return;
                                }

                                const [
                                    mouseX
                                ] =
                                    d3.pointer(
                                        event,
                                        this
                                    );

                                let closestRow =
                                    data[0];

                                let minDistance =
                                    Infinity;

                                data.forEach(
                                    function (
                                        row
                                    ) {
                                        const cx =
                                            xScale(
                                                String(
                                                    row[
                                                    categoryKey
                                                    ]
                                                )
                                            );

                                        const dist =
                                            Math.abs(
                                                mouseX -
                                                cx
                                            );

                                        if (
                                            dist <
                                            minDistance
                                        ) {
                                            minDistance =
                                                dist;

                                            closestRow =
                                                row;
                                        }
                                    }
                                );

                                const cx =
                                    xScale(
                                        String(
                                            closestRow[
                                            categoryKey
                                            ]
                                        )
                                    );

                                verticalHoverLine
                                    .attr(
                                        "x1",
                                        cx
                                    )
                                    .attr(
                                        "x2",
                                        cx
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
                                    );

                                const listItems =
                                    sortedKeys
                                        .map(
                                            function (
                                                key
                                            ) {
                                                const color =
                                                    seriesColorMap.get(
                                                        key
                                                    );

                                                const val =
                                                    closestRow[
                                                        key
                                                    ] !==
                                                        undefined
                                                        ? closestRow[
                                                        key
                                                        ]
                                                        : 0;

                                                return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:3px;">
                                                    <span style="display:flex; align-items:center; gap:6px;">
                                                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color};"></span>
                                                        <span>${key}</span>
                                                    </span>
                                                    <strong>${val}</strong>
                                                </div>`;
                                            }
                                        )
                                        .join(
                                            ""
                                        );

                                const mainTxt =
                                    `<div style="font-weight:bold; margin-bottom:6px; border-bottom:1px solid #555; padding-bottom:4px;">${closestRow[categoryKey]}</div>${listItems}`;

                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            mainTxt,
                                            null
                                        )
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
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
                        .on(
                            "mouseout",
                            function () {
                                if (
                                    selectedAreaKey !==
                                    null
                                ) {
                                    return;
                                }

                                verticalHoverLine.style(
                                    "visibility",
                                    "hidden"
                                );

                                tooltip.style(
                                    "visibility",
                                    "hidden"
                                );
                            }
                        );
                }
            }

            // =====================================================
            // HEATMAP CHART
            // =====================================================

            if (
                activeType ===
                "heatmap"
            ) {
                svgOuter.style(
                    "display",
                    "none"
                );

                const heatmapWrapper =
                    contentRow
                        .append(
                            "div"
                        )
                        .attr(
                            "class",
                            `heatmap-container-${uid}`
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "flex-direction",
                            "column"
                        )
                        .style(
                            "font-family",
                            activeFont
                        )
                        .style(
                            "box-sizing",
                            "border-box"
                        );

                const descriptionColKey =
                    categoryKey;

                const cpcDisplayKey =
                    keys.find(
                        function (
                            k
                        ) {
                            return (
                                k.toUpperCase() ===
                                "CPC"
                            );
                        }
                    ) ||
                    keys[1] ||
                    keys[0];

                const totalColKey =
                    keys.find(
                        function (
                            k
                        ) {
                            return (
                                k.toUpperCase() ===
                                "TOTAL"
                            );
                        }
                    ) ||
                    valueKeys[
                    valueKeys.length -
                    1
                    ] ||
                    "TOTAL";

                const companyColKeys =
                    valueKeys.filter(
                        function (
                            k
                        ) {
                            return (
                                k !==
                                totalColKey &&
                                k.toUpperCase() !==
                                "CPC"
                            );
                        }
                    );

                let heatmapData =
                    data.slice();

                if (
                    cpcSortMode ===
                    "asc"
                ) {
                    heatmapData.sort(
                        function (
                            a,
                            b
                        ) {
                            const valA =
                                String(
                                    a[
                                    cpcDisplayKey
                                    ] || ""
                                );

                            const valB =
                                String(
                                    b[
                                    cpcDisplayKey
                                    ] || ""
                                );

                            return valA.localeCompare(
                                valB,
                                undefined,
                                {
                                    numeric:
                                        true,
                                    sensitivity:
                                        "base"
                                }
                            );
                        }
                    );
                } else if (
                    cpcSortMode ===
                    "desc"
                ) {
                    heatmapData.sort(
                        function (
                            a,
                            b
                        ) {
                            const valA =
                                String(
                                    a[
                                    cpcDisplayKey
                                    ] || ""
                                );

                            const valB =
                                String(
                                    b[
                                    cpcDisplayKey
                                    ] || ""
                                );

                            return valB.localeCompare(
                                valA,
                                undefined,
                                {
                                    numeric:
                                        true,
                                    sensitivity:
                                        "base"
                                }
                            );
                        }
                    );
                }

                let maxCompanyVal =
                    0;

                heatmapData.forEach(
                    function (
                        row
                    ) {
                        companyColKeys.forEach(
                            function (
                                ck
                            ) {
                                const val =
                                    parseFloat(
                                        row[
                                        ck
                                        ]
                                    ) || 0;

                                if (
                                    val >
                                    maxCompanyVal
                                ) {
                                    maxCompanyVal =
                                        val;
                                }
                            }
                        );
                    }
                );

                const minColor =
                    d3.rgb(
                        "#ebf8ff"
                    );

                const maxColor =
                    d3.rgb(
                        "#0c4a6e"
                    );

                const colorInterpolator =
                    d3.interpolateRgb(
                        minColor,
                        maxColor
                    );

                function getCompanyCellColor(
                    val
                ) {
                    if (
                        !maxCompanyVal ||
                        maxCompanyVal <= 0
                    ) {
                        return "#ebf8ff";
                    }

                    const ratio =
                        Math.max(
                            0,
                            Math.min(
                                1,
                                val /
                                maxCompanyVal
                            )
                        );

                    return colorInterpolator(
                        ratio
                    );
                }

                let maxTotalVal =
                    0;

                heatmapData.forEach(
                    function (
                        row
                    ) {
                        const tot =
                            parseFloat(
                                row[
                                totalColKey
                                ]
                            ) || 0;

                        if (
                            tot >
                            maxTotalVal
                        ) {
                            maxTotalVal =
                                tot;
                        }
                    }
                );

                const tableScrollContainer =
                    heatmapWrapper
                        .append(
                            "div"
                        )
                        .attr(
                            "class",
                            `heatmap-table-scroll-${uid}`
                        )
                        .style(
                            "width",
                            "100%"
                        );

                if (
                    heatmapData.length >
                    10
                ) {
                    tableScrollContainer
                        .style(
                            "max-height",
                            "380px"
                        )
                        .style(
                            "overflow-y",
                            "auto"
                        )
                        .style(
                            "direction",
                            "rtl"
                        );
                }

                const table =
                    tableScrollContainer
                        .append(
                            "table"
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "border-collapse",
                            "collapse"
                        )
                        .style(
                            "table-layout",
                            "auto"
                        )
                        .style(
                            "font-size",
                            tickSize
                        )
                        .style(
                            "color",
                            "#333"
                        )
                        .style(
                            "direction",
                            "ltr"
                        );

                const thead =
                    table.append(
                        "thead"
                    );

                const headerTr =
                    thead.append(
                        "tr"
                    );

                if (
                    heatmapData.length >
                    10
                ) {
                    thead
                        .style(
                            "position",
                            "sticky"
                        )
                        .style(
                            "top",
                            "0"
                        )
                        .style(
                            "z-index",
                            "2"
                        )
                        .style(
                            "background-color",
                            "#ffffff"
                        );
                }

                const headerColumns = [
                    cpcDisplayKey,
                    ...companyColKeys,
                    totalColKey
                ];

                headerColumns.forEach(
                    function (
                        colName,
                        colIdx
                    ) {
                        const th =
                            headerTr
                                .append(
                                    "th"
                                )
                                .style(
                                    "font-weight",
                                    "bold"
                                )
                                .style(
                                    "padding",
                                    "10px 12px"
                                )
                                .style(
                                    "text-align",
                                    colIdx === 0
                                        ? "left"
                                        : (
                                            colIdx ===
                                                headerColumns.length -
                                                1
                                                ? "left"
                                                : "center"
                                        )
                                )
                                .style(
                                    "border-left",
                                    "2px solid #063137"
                                )
                                .style(
                                    "border-right",
                                    "2px solid #063137"
                                )
                                .style(
                                    "border-bottom",
                                    "2px solid #063137"
                                )
                                .style(
                                    "border-top",
                                    "none"
                                )
                                .style(
                                    "background-color",
                                    "#ffffff"
                                );

                        if (
                            colIdx === 0
                        ) {
                            const thContainer =
                                th
                                    .append(
                                        "div"
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
                                        "gap",
                                        "6px"
                                    );

                            thContainer
                                .append(
                                    "span"
                                )
                                .text(
                                    colName
                                );

                            let sortIcon =
                                "↕";

                            let sortTooltip =
                                "Sort: Original order (Click to sort A-Z)";

                            if (
                                cpcSortMode ===
                                "asc"
                            ) {
                                sortIcon =
                                    "↑";

                                sortTooltip =
                                    "Sort: Alphabetical (A-Z) (Click to sort Z-A)";
                            } else if (
                                cpcSortMode ===
                                "desc"
                            ) {
                                sortIcon =
                                    "↓";

                                sortTooltip =
                                    "Sort: Alphabetical (Z-A) (Click to reset to Original)";
                            }

                            const sortBtn =
                                thContainer
                                    .append(
                                        "button"
                                    )
                                    .attr(
                                        "type",
                                        "button"
                                    )
                                    .attr(
                                        "title",
                                        sortTooltip
                                    )
                                    .text(
                                        sortIcon
                                    )
                                    .style(
                                        "cursor",
                                        "pointer"
                                    )
                                    .style(
                                        "background",
                                        "#f0f0f0"
                                    )
                                    .style(
                                        "border",
                                        "1px solid #ccc"
                                    )
                                    .style(
                                        "border-radius",
                                        "3px"
                                    )
                                    .style(
                                        "padding",
                                        "1px 5px"
                                    )
                                    .style(
                                        "font-size",
                                        "11px"
                                    )
                                    .style(
                                        "line-height",
                                        "1"
                                    )
                                    .style(
                                        "margin-left",
                                        "4px"
                                    );

                            sortBtn.on(
                                "click",
                                function (
                                    event
                                ) {
                                    event.stopPropagation();

                                    if (
                                        cpcSortMode ===
                                        "original"
                                    ) {
                                        cpcSortMode =
                                            "asc";
                                    } else if (
                                        cpcSortMode ===
                                        "asc"
                                    ) {
                                        cpcSortMode =
                                            "desc";
                                    } else {
                                        cpcSortMode =
                                            "original";
                                    }

                                    renderChart(
                                        currentData
                                    );
                                }
                            );
                        } else {
                            th.text(
                                colName
                            );
                        }
                    }
                );

                const tbody =
                    table.append(
                        "tbody"
                    );

                heatmapData.forEach(
                    function (
                        row,
                        rowIdx
                    ) {
                        const tr =
                            tbody.append(
                                "tr"
                            );

                        const isLastRow =
                            rowIdx ===
                            heatmapData.length -
                            1;

                        const rowBorderBottom =
                            isLastRow
                                ? "2px solid #063137"
                                : "none";

                        const cpcCode =
                            row[
                                cpcDisplayKey
                            ] !== undefined
                                ? String(
                                    row[
                                    cpcDisplayKey
                                    ]
                                )
                                : "";

                        const cpcDescText =
                            row[
                                descriptionColKey
                            ] !== undefined
                                ? String(
                                    row[
                                    descriptionColKey
                                    ]
                                )
                                : "";

                        const cpcCell =
                            tr
                                .append(
                                    "td"
                                )
                                .text(
                                    cpcCode
                                )
                                .style(
                                    "padding",
                                    "8px 12px"
                                )
                                .style(
                                    "text-align",
                                    "left"
                                )
                                .style(
                                    "border",
                                    "none"
                                )
                                .style(
                                    "border-bottom",
                                    rowBorderBottom
                                )
                                .style(
                                    "font-weight",
                                    "normal"
                                )
                                .style(
                                    "white-space",
                                    "nowrap"
                                )
                                .style(
                                    "cursor",
                                    cpcDescText
                                        ? "help"
                                        : "default"
                                );

                        cpcCell
                            .on(
                                "mouseover",
                                function () {
                                    if (
                                        cpcDescText
                                    ) {
                                        tooltip
                                            .html(
                                                formatTooltipContent(
                                                    `<strong style="font-size:14px;">${cpcCode}</strong>`,
                                                    cpcDescText
                                                )
                                            )
                                            .style(
                                                "visibility",
                                                "visible"
                                            );
                                    }
                                }
                            )
                            .on(
                                "mousemove",
                                function (
                                    event
                                ) {
                                    if (
                                        cpcDescText
                                    ) {
                                        tooltip
                                            .style(
                                                "top",
                                                `${event.pageY + 10}px`
                                            )
                                            .style(
                                                "left",
                                                `${event.pageX + 10}px`
                                            );
                                    }
                                }
                            )
                            .on(
                                "mouseout",
                                function () {
                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                }
                            );

                        companyColKeys.forEach(
                            function (
                                colKey
                            ) {
                                const cellVal =
                                    row[
                                        colKey
                                    ] !== undefined
                                        ? parseFloat(
                                            row[
                                            colKey
                                            ]
                                        )
                                        : 0;

                                const cpcLabel =
                                    cpcCode;

                                const bgColor =
                                    getCompanyCellColor(
                                        cellVal
                                    );

                                const companyCell =
                                    tr
                                        .append(
                                            "td"
                                        )
                                        .style(
                                            "background-color",
                                            bgColor
                                        )
                                        .style(
                                            "padding",
                                            "8px 12px"
                                        )
                                        .style(
                                            "text-align",
                                            "center"
                                        )
                                        .style(
                                            "border",
                                            "none"
                                        )
                                        .style(
                                            "border-bottom",
                                            rowBorderBottom
                                        );

                                companyCell
                                    .on(
                                        "mouseover",
                                        function () {
                                            const displayVal =
                                                cellVal <=
                                                    1 &&
                                                    cellVal >
                                                    0
                                                    ? cellVal *
                                                    100
                                                    : cellVal;

                                            const formattedVal =
                                                displayVal.toLocaleString(
                                                    undefined,
                                                    {
                                                        maximumFractionDigits:
                                                            2
                                                    }
                                                ) +
                                                "%";

                                            const mainContent =
                                                `<div style="font-weight:bold; font-size:13px;">${cpcLabel} — ${colKey}</div>
                                                <div style="margin-top:2px;">Value: <strong>${formattedVal}</strong></div>`;

                                            tooltip
                                                .html(
                                                    formatTooltipContent(
                                                        mainContent,
                                                        null
                                                    )
                                                )
                                                .style(
                                                    "visibility",
                                                    "visible"
                                                );
                                        }
                                    )
                                    .on(
                                        "mousemove",
                                        function (
                                            event
                                        ) {
                                            tooltip
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
                                    .on(
                                        "mouseout",
                                        function () {
                                            tooltip.style(
                                                "visibility",
                                                "hidden"
                                            );
                                        }
                                    );
                            }
                        );

                        const totalVal =
                            row[
                                totalColKey
                            ] !== undefined
                                ? parseFloat(
                                    row[
                                    totalColKey
                                    ]
                                )
                                : 0;

                        const totalCell =
                            tr
                                .append(
                                    "td"
                                )
                                .style(
                                    "padding",
                                    "8px 12px"
                                )
                                .style(
                                    "text-align",
                                    "left"
                                )
                                .style(
                                    "border",
                                    "none"
                                )
                                .style(
                                    "border-bottom",
                                    rowBorderBottom
                                )
                                .style(
                                    "vertical-align",
                                    "middle"
                                );

                        const barContainer =
                            totalCell
                                .append(
                                    "div"
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
                                    "gap",
                                    "8px"
                                )
                                .style(
                                    "width",
                                    "100%"
                                );

                        const barWidthPercent =
                            maxTotalVal > 0
                                ? Math.max(
                                    1.5,
                                    Math.min(
                                        80,
                                        (
                                            totalVal /
                                            maxTotalVal
                                        ) *
                                        85
                                    )
                                )
                                : 0;

                        barContainer
                            .append(
                                "div"
                            )
                            .style(
                                "height",
                                "14px"
                            )
                            .style(
                                "width",
                                `${barWidthPercent}%`
                            )
                            .style(
                                "background-color",
                                "#063137"
                            )
                            .style(
                                "border-radius",
                                "2px"
                            )
                            .style(
                                "flex-shrink",
                                "0"
                            );

                        barContainer
                            .append(
                                "span"
                            )
                            .text(
                                Math.round(
                                    totalVal
                                ).toLocaleString()
                            )
                            .style(
                                "font-weight",
                                "normal"
                            )
                            .style(
                                "font-size",
                                "12px"
                            )
                            .style(
                                "color",
                                "#333"
                            )
                            .style(
                                "white-space",
                                "nowrap"
                            );
                    }
                );

                const maxPctVal =
                    maxCompanyVal <= 1 &&
                        maxCompanyVal > 0
                        ? maxCompanyVal *
                        100
                        : maxCompanyVal;

                const maxPctText =
                    `${Number(
                        maxPctVal.toFixed(
                            2
                        )
                    )}%`;

                const minPctText =
                    "0%";

                const legendWrapper =
                    heatmapWrapper
                        .append(
                            "div"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "flex-direction",
                            "column"
                        )
                        .style(
                            "align-items",
                            "center"
                        )
                        .style(
                            "margin-top",
                            "25px"
                        )
                        .style(
                            "margin-bottom",
                            "15px"
                        )
                        .style(
                            "width",
                            "100%"
                        );

                const gradientContainer =
                    legendWrapper
                        .append(
                            "div"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "flex-direction",
                            "column"
                        )
                        .style(
                            "align-items",
                            "stretch"
                        )
                        .style(
                            "width",
                            "260px"
                        );

                gradientContainer
                    .append(
                        "div"
                    )
                    .style(
                        "height",
                        "18px"
                    )
                    .style(
                        "width",
                        "100%"
                    )
                    .style(
                        "background",
                        "linear-gradient(to right, #ebf8ff, #0c4a6e)"
                    )
                    .style(
                        "border-left",
                        "2px solid #0c4a6e"
                    )
                    .style(
                        "border-right",
                        "2px solid #0c4a6e"
                    )
                    .style(
                        "box-sizing",
                        "border-box"
                    );

                const percentRow =
                    gradientContainer
                        .append(
                            "div"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "justify-content",
                            "space-between"
                        )
                        .style(
                            "margin-top",
                            "4px"
                        )
                        .style(
                            "font-size",
                            "12px"
                        )
                        .style(
                            "color",
                            "#333"
                        )
                        .style(
                            "font-weight",
                            "normal"
                        );

                percentRow
                    .append(
                        "span"
                    )
                    .text(
                        minPctText
                    );

                percentRow
                    .append(
                        "span"
                    )
                    .text(
                        maxPctText
                    );
            }

            // =====================================================
            // FREQUENCY TABLE
            // =====================================================

            else if (
                activeType ===
                "frequency-table"
            ) {
                svgOuter.style(
                    "display",
                    "none"
                );

                const tableWrapper =
                    contentRow
                        .append(
                            "div"
                        )
                        .attr(
                            "class",
                            `frequency-table-container-${uid}`
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "flex-direction",
                            "column"
                        )
                        .style(
                            "font-family",
                            activeFont
                        )
                        .style(
                            "box-sizing",
                            "border-box"
                        );

                const firstColKey =
                    categoryKey;

                const secondColKey =
                    (valueKeys.length > 0 ? valueKeys[0] : keys[1]) ||
                    keys[0];

                // Resolve description key for frequency table
                const freqDescKey = keys.find(function (k) {
                    return k.toLowerCase() === "description";
                });

                let totalVal = 0;
                let maxVal = 0;
                data.forEach(
                    function (row) {
                        const v =
                            parseFloat(
                                row[secondColKey]
                            ) || 0;
                        totalVal += v;
                        if (v > maxVal) {
                            maxVal = v;
                        }
                    }
                );

                const table =
                    tableWrapper
                        .append(
                            "table"
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "border-collapse",
                            "collapse"
                        )
                        .style(
                            "border",
                            "none"
                        )
                        .style(
                            "table-layout",
                            "auto"
                        )
                        .style(
                            "font-size",
                            `${Math.max(12, Math.round(14 * fontScale))}px`
                        )
                        .style(
                            "color",
                            "#333"
                        );

                // Table header row
                const freqThead = table.append("thead");
                const freqHeaderTr = freqThead.append("tr")
                    .style("border-bottom", "2px solid #e2e8f0")
                    .style("background-color", "#f8fafc");
                const freqHeadPaddingV = `${Math.max(8, Math.round(11 * fontScale))}px`;
                [
                    { label: firstColKey, align: "left" },
                    { label: "", align: "left" },
                    { label: secondColKey, align: "right" },
                    { label: "description", align: "left" }
                ].forEach(function (col) {
                    freqHeaderTr.append("th")
                        .style("padding", `${freqHeadPaddingV} 16px`)
                        .style("text-align", col.align)
                        .style("font-weight", "600")
                        .style("color", "#475569")
                        .style("font-size", `${Math.max(11, Math.round(13 * fontScale))}px`)
                        .style("white-space", "nowrap")
                        .text(col.label);
                });

                const tbody =
                    table.append(
                        "tbody"
                    );

                const rowPaddingV =
                    `${Math.max(8, Math.round(10 * fontScale))}px`;
                const barThickness =
                    `${Math.max(8, Math.round(10 * fontScale))}px`;

                data.forEach(
                    function (row) {
                        const tr =
                            tbody
                                .append(
                                    "tr"
                                )
                                .style(
                                    "border-bottom",
                                    "1px solid #e5e5e5"
                                )
                                .style(
                                    "transition",
                                    "background-color 0.15s ease"
                                );

                        const firstColVal =
                            row[firstColKey] !== undefined
                                ? row[firstColKey]
                                : "";

                        const rawVal =
                            row[secondColKey] !== undefined
                                ? row[secondColKey]
                                : "";

                        const numericVal =
                            parseFloat(rawVal) || 0;

                        const fillPercent =
                            maxVal > 0
                                ? Math.max(
                                    0,
                                    Math.min(
                                        100,
                                        (numericVal / maxVal) * 100
                                    )
                                )
                                : 0;

                        // Column 1: First column data from CSV
                        tr.append(
                            "td"
                        )
                            .style(
                                "padding",
                                `${rowPaddingV} 16px`
                            )
                            .style(
                                "text-align",
                                "left"
                            )
                            .style(
                                "vertical-align",
                                "middle"
                            )
                            .style(
                                "border",
                                "none"
                            )
                            .style(
                                "border-bottom",
                                "1px solid #e5e5e5"
                            )
                            .style(
                                "white-space",
                                "nowrap"
                            )
                            .style(
                                "font-weight",
                                "500"
                            )
                            .style(
                                "color",
                                "#333"
                            )
                            .text(
                                firstColVal
                            );

                        // Column 2: Loading bar shape
                        const barTd =
                            tr.append(
                                "td"
                            )
                                .style(
                                    "padding",
                                    `${rowPaddingV} 16px`
                                )
                                .style(
                                    "vertical-align",
                                    "middle"
                                )
                                .style(
                                    "border",
                                    "none"
                                )
                                .style(
                                    "border-bottom",
                                    "1px solid #e5e5e5"
                                )
                                .style(
                                    "width",
                                    "100%"
                                );

                        const barTrack =
                            barTd.append(
                                "div"
                            )
                                .style(
                                    "width",
                                    "100%"
                                )
                                .style(
                                    "height",
                                    barThickness
                                )
                                .style(
                                    "background-color",
                                    "#e5e7eb"
                                )
                                .style(
                                    "border-radius",
                                    "9999px"
                                )
                                .style(
                                    "overflow",
                                    "hidden"
                                )
                                .style(
                                    "position",
                                    "relative"
                                )
                                .style(
                                    "box-sizing",
                                    "border-box"
                                );

                        barTrack
                            .append(
                                "div"
                            )
                            .style(
                                "width",
                                `${fillPercent}%`
                            )
                            .style(
                                "height",
                                "100%"
                            )
                            .style(
                                "background-color",
                                "rgb(28, 167, 166)"
                            )
                            .style(
                                "border-radius",
                                "9999px"
                            )
                            .style(
                                "transition",
                                "width 0.3s ease"
                            );

                        // Column 3: Second column data from CSV (number or percentage)
                        let displayCount;
                        if (showPercentage) {
                            if (typeof rawVal === "string" && rawVal.trim().endsWith("%")) {
                                displayCount = rawVal;
                            } else {
                                const pct = totalVal > 0 ? (numericVal / totalVal) * 100 : 0;
                                displayCount = `${parseFloat(pct.toFixed(1))}%`;
                            }
                        } else {
                            displayCount =
                                typeof rawVal === "number"
                                    ? rawVal.toLocaleString()
                                    : String(rawVal);
                        }

                        tr.append(
                            "td"
                        )
                            .style(
                                "padding",
                                `${rowPaddingV} 16px`
                            )
                            .style(
                                "text-align",
                                "right"
                            )
                            .style(
                                "vertical-align",
                                "middle"
                            )
                            .style(
                                "border",
                                "none"
                            )
                            .style(
                                "border-bottom",
                                "1px solid #e5e5e5"
                            )
                            .style(
                                "white-space",
                                "nowrap"
                            )
                            .style(
                                "font-weight",
                                "600"
                            )
                            .style(
                                "color",
                                "#333"
                            )
                            .text(
                                displayCount
                            );

                        // Column 4: Description
                        const desc =
                            freqDescKey
                                ? (row[freqDescKey] || "")
                                : (currentDescriptions[firstColVal] || "");

                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "left")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("color", "#555")
                            .style("font-size", `${Math.max(11, Math.round(12 * fontScale))}px`)
                            .text(desc);

                        // Tooltip and hover interaction
                        const tooltipContent =
                            `<strong>${firstColKey}:</strong> ${firstColVal}<br><strong>${secondColKey}:</strong> ${displayCount}`;

                        tr.on(
                            "mouseover",
                            function () {
                                d3.select(this).style(
                                    "background-color",
                                    "#f9fafb"
                                );
                                tooltip
                                    .html(
                                        formatTooltipContent(
                                            tooltipContent,
                                            desc || null
                                        )
                                    )
                                    .style(
                                        "visibility",
                                        "visible"
                                    );
                            }
                        )
                            .on(
                                "mousemove",
                                function (event) {
                                    tooltip
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
                            .on(
                                "mouseout",
                                function () {
                                    d3.select(this).style(
                                        "background-color",
                                        "transparent"
                                    );
                                    tooltip.style(
                                        "visibility",
                                        "hidden"
                                    );
                                }
                            );
                    }
                );
            }

            // =====================================================
            // PERCENTAGE TABLE
            // =====================================================

            else if (
                activeType === "percentage-table"
            ) {
                svgOuter.style(
                    "display",
                    "none"
                );

                const tableWrapper =
                    contentRow
                        .append(
                            "div"
                        )
                        .attr(
                            "class",
                            `percentage-table-container-${uid}`
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "flex-direction",
                            "column"
                        )
                        .style(
                            "font-family",
                            activeFont
                        )
                        .style(
                            "box-sizing",
                            "border-box"
                        );

                const firstColKey =
                    categoryKey;

                const secondColKey =
                    (valueKeys.length > 0 ? valueKeys[0] : keys[1]) ||
                    keys[0];

                // Resolve description key for percentage table
                const pctDescKey = keys.find(function (k) {
                    return k.toLowerCase() === "description";
                });

                const table =
                    tableWrapper
                        .append(
                            "table"
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "border-collapse",
                            "collapse"
                        )
                        .style(
                            "border",
                            "none"
                        )
                        .style(
                            "table-layout",
                            "auto"
                        )
                        .style(
                            "font-size",
                            `${Math.max(12, Math.round(14 * fontScale))}px`
                        )
                        .style(
                            "color",
                            "#333"
                        );

                // Table header row
                const pctThead = table.append("thead");
                const pctHeaderTr = pctThead.append("tr")
                    .style("border-bottom", "2px solid #e2e8f0")
                    .style("background-color", "#f8fafc");
                const pctHeadPaddingV = `${Math.max(8, Math.round(11 * fontScale))}px`;
                [
                    { label: firstColKey, align: "left" },
                    { label: "", align: "left" },
                    { label: secondColKey, align: "right" },
                    { label: "description", align: "left" }
                ].forEach(function (col) {
                    pctHeaderTr.append("th")
                        .style("padding", `${pctHeadPaddingV} 16px`)
                        .style("text-align", col.align)
                        .style("font-weight", "600")
                        .style("color", "#475569")
                        .style("font-size", `${Math.max(11, Math.round(13 * fontScale))}px`)
                        .style("white-space", "nowrap")
                        .text(col.label);
                });

                const tbody =
                    table.append(
                        "tbody"
                    );

                const rowPaddingV =
                    `${Math.max(8, Math.round(10 * fontScale))}px`;
                const barThickness =
                    `${Math.max(8, Math.round(10 * fontScale))}px`;

                data.forEach(
                    function (row) {
                        const tr =
                            tbody
                                .append(
                                    "tr"
                                )
                                .style(
                                    "border-bottom",
                                    "1px solid #e5e5e5"
                                )
                                .style(
                                    "transition",
                                    "background-color 0.15s ease"
                                );

                        const firstColVal =
                            row[firstColKey] !== undefined
                                ? row[firstColKey]
                                : "";

                        const rawVal =
                            row[secondColKey] !== undefined
                                ? row[secondColKey]
                                : "";

                        let numericVal = 0;
                        let displayCount = "";
                        let fillPercent = 0;

                        if (typeof rawVal === "string") {
                            const trimmed = rawVal.trim();
                            if (trimmed.endsWith("%")) {
                                numericVal = parseFloat(trimmed.replace(/%/g, "")) || 0;
                                fillPercent = Math.max(0, Math.min(100, numericVal));
                                displayCount = trimmed;
                            } else {
                                numericVal = parseFloat(trimmed) || 0;
                                if (numericVal > 0 && numericVal <= 1) {
                                    fillPercent = numericVal * 100;
                                    displayCount = `${Math.round(fillPercent * 10) / 10}%`;
                                } else {
                                    fillPercent = Math.max(0, Math.min(100, numericVal));
                                    displayCount = `${Math.round(fillPercent * 10) / 10}%`;
                                }
                            }
                        } else if (typeof rawVal === "number") {
                            numericVal = rawVal;
                            if (numericVal > 0 && numericVal <= 1) {
                                fillPercent = numericVal * 100;
                                displayCount = `${Math.round(fillPercent * 10) / 10}%`;
                            } else {
                                fillPercent = Math.max(0, Math.min(100, numericVal));
                                displayCount = `${Math.round(fillPercent * 10) / 10}%`;
                            }
                        } else {
                            displayCount = String(rawVal);
                        }

                        // Column 1: First column data from CSV
                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "left")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("white-space", "nowrap")
                            .style("font-weight", "500")
                            .style("color", "#333")
                            .text(firstColVal);

                        // Column 2: Loading bar shape
                        const barTd = tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("width", "100%");

                        const barTrack = barTd.append("div")
                            .style("width", "100%")
                            .style("height", barThickness)
                            .style("background-color", "#e5e7eb")
                            .style("border-radius", "9999px")
                            .style("overflow", "hidden")
                            .style("position", "relative")
                            .style("box-sizing", "border-box");

                        barTrack.append("div")
                            .style("width", `${fillPercent}%`)
                            .style("height", "100%")
                            .style("background-color", "rgb(28, 167, 166)")
                            .style("border-radius", "9999px")
                            .style("transition", "width 0.3s ease");

                        // Column 3: Percentage value
                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "right")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("white-space", "nowrap")
                            .style("font-weight", "600")
                            .style("color", "#333")
                            .text(displayCount);

                        // Column 4: Description
                        const pctDesc =
                            pctDescKey
                                ? (row[pctDescKey] || "")
                                : (currentDescriptions[firstColVal] || "");

                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "left")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("color", "#555")
                            .style("font-size", `${Math.max(11, Math.round(12 * fontScale))}px`)
                            .text(pctDesc);

                        // Tooltip and hover interaction
                        const tooltipContent =
                            `<strong>${firstColKey}:</strong> ${firstColVal}<br><strong>${secondColKey}:</strong> ${displayCount}`;

                        tr.on("mouseover", function () {
                            d3.select(this).style("background-color", "#f9fafb");
                            tooltip.html(formatTooltipContent(tooltipContent, pctDesc || null)).style("visibility", "visible");
                        })
                            .on("mousemove", function (event) {
                                tooltip.style("top", `${event.pageY + 10}px`).style("left", `${event.pageX + 10}px`);
                            })
                            .on("mouseout", function () {
                                d3.select(this).style("background-color", "transparent");
                                tooltip.style("visibility", "hidden");
                            });
                    }
                );
            }

            // =====================================================
            // COUNT-PERCENTAGE TABLE
            // =====================================================

            else if (
                activeType === "count-percentage"
            ) {
                svgOuter.style(
                    "display",
                    "none"
                );

                const tableWrapper =
                    contentRow
                        .append(
                            "div"
                        )
                        .attr(
                            "class",
                            `count-percentage-container-${uid}`
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "display",
                            "flex"
                        )
                        .style(
                            "flex-direction",
                            "column"
                        )
                        .style(
                            "font-family",
                            activeFont
                        )
                        .style(
                            "box-sizing",
                            "border-box"
                        );

                const descKey = keys.find(function (k) {
                    return k.toLowerCase() === "description";
                });

                const firstColKey = categoryKey;

                const remainingKeys = keys.filter(function (k) {
                    return k !== firstColKey && k !== descKey;
                });

                const secondColKey = remainingKeys.find(function (k) {
                    return k.toLowerCase() === "patents" || k.toLowerCase() === "count" || k.toLowerCase() === "value";
                }) || remainingKeys[0] || keys[1] || keys[0];

                const thirdColKey = remainingKeys.find(function (k) {
                    return (
                        k !== secondColKey &&
                        (k.toLowerCase().includes("rate") ||
                            k.toLowerCase().includes("percent") ||
                            k.toLowerCase().includes("efficiency"))
                    );
                }) || remainingKeys.find(function (k) {
                    return k !== secondColKey;
                }) || remainingKeys[1] || secondColKey;

                const table =
                    tableWrapper
                        .append(
                            "table"
                        )
                        .style(
                            "width",
                            "100%"
                        )
                        .style(
                            "border-collapse",
                            "collapse"
                        )
                        .style(
                            "border",
                            "none"
                        )
                        .style(
                            "table-layout",
                            "auto"
                        )
                        .style(
                            "font-size",
                            `${Math.max(12, Math.round(14 * fontScale))}px`
                        )
                        .style(
                            "color",
                            "#333"
                        );

                const thead = table.append("thead");
                const headerTr = thead.append("tr")
                    .style("border-bottom", "2px solid #e2e8f0")
                    .style("background-color", "#f8fafc");

                const headerCols = [
                    { label: firstColKey, align: "left" },
                    { label: secondColKey, align: "right" },
                    { label: thirdColKey, align: "right" },
                    { label: "", align: "left" }
                ];

                const headPaddingV = `${Math.max(8, Math.round(11 * fontScale))}px`;
                const cellPaddingH = "16px";

                headerCols.forEach(function (col) {
                    headerTr.append("th")
                        .style("padding", `${headPaddingV} ${cellPaddingH}`)
                        .style("text-align", col.align)
                        .style("font-weight", "600")
                        .style("color", "#475569")
                        .style("font-size", `${Math.max(11, Math.round(13 * fontScale))}px`)
                        .style("white-space", "nowrap")
                        .text(col.label);
                });

                const tbody =
                    table.append(
                        "tbody"
                    );

                const rowPaddingV =
                    `${Math.max(8, Math.round(10 * fontScale))}px`;
                const barThickness =
                    `${Math.max(8, Math.round(10 * fontScale))}px`;

                data.forEach(
                    function (row) {
                        const tr =
                            tbody
                                .append(
                                    "tr"
                                )
                                .style(
                                    "border-bottom",
                                    "1px solid #e5e5e5"
                                )
                                .style(
                                    "transition",
                                    "background-color 0.15s ease"
                                );

                        const firstColVal =
                            row[firstColKey] !== undefined
                                ? row[firstColKey]
                                : "";

                        const secondColVal =
                            row[secondColKey] !== undefined
                                ? row[secondColKey]
                                : "";

                        const rawThirdVal =
                            row[thirdColKey] !== undefined
                                ? row[thirdColKey]
                                : "";

                        let numericPercent = 0;
                        let displayPercent = "";
                        let fillPercent = 0;

                        if (typeof rawThirdVal === "string") {
                            const trimmed = rawThirdVal.trim();
                            if (trimmed.endsWith("%")) {
                                numericPercent = parseFloat(trimmed.replace(/%/g, "")) || 0;
                                fillPercent = Math.max(0, Math.min(100, numericPercent));
                                displayPercent = trimmed;
                            } else {
                                numericPercent = parseFloat(trimmed) || 0;
                                if (numericPercent > 0 && numericPercent <= 1) {
                                    fillPercent = numericPercent * 100;
                                    displayPercent = `${Math.round(fillPercent * 10) / 10}%`;
                                } else {
                                    fillPercent = Math.max(0, Math.min(100, numericPercent));
                                    displayPercent = `${Math.round(fillPercent * 10) / 10}%`;
                                }
                            }
                        } else if (typeof rawThirdVal === "number") {
                            numericPercent = rawThirdVal;
                            if (numericPercent > 0 && numericPercent <= 1) {
                                fillPercent = numericPercent * 100;
                                displayPercent = `${Math.round(fillPercent * 10) / 10}%`;
                            } else {
                                fillPercent = Math.max(0, Math.min(100, numericPercent));
                                displayPercent = `${Math.round(fillPercent * 10) / 10}%`;
                            }
                        } else {
                            displayPercent = String(rawThirdVal);
                        }

                        const displaySecondVal = typeof secondColVal === "number"
                            ? secondColVal.toLocaleString()
                            : String(secondColVal !== undefined ? secondColVal : "");

                        // Column 1: Technology Center
                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "left")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("white-space", "nowrap")
                            .style("font-weight", "500")
                            .style("color", "#333")
                            .text(firstColVal);

                        // Column 2: Patents (Count)
                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "right")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("white-space", "nowrap")
                            .style("font-weight", "500")
                            .style("color", "#333")
                            .text(displaySecondVal);

                        // Column 3: Efficiency Rate (Percentage)
                        tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("text-align", "right")
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("white-space", "nowrap")
                            .style("font-weight", "600")
                            .style("color", "#333")
                            .text(displayPercent);

                        // Column 4 (To the right of third column): Percentage Bar
                        const barTd = tr.append("td")
                            .style("padding", `${rowPaddingV} 16px`)
                            .style("vertical-align", "middle")
                            .style("border", "none")
                            .style("border-bottom", "1px solid #e5e5e5")
                            .style("width", "100%")
                            .style("min-width", "80px");

                        const barTrack = barTd.append("div")
                            .style("width", "100%")
                            .style("height", barThickness)
                            .style("background-color", "#e5e7eb")
                            .style("border-radius", "9999px")
                            .style("overflow", "hidden")
                            .style("position", "relative")
                            .style("box-sizing", "border-box");

                        barTrack.append("div")
                            .style("width", `${fillPercent}%`)
                            .style("height", "100%")
                            .style("background-color", "rgb(28, 167, 166)")
                            .style("border-radius", "9999px")
                            .style("transition", "width 0.3s ease");

                        // Tooltip and hover interaction
                        const desc = descKey
                            ? row[descKey]
                            : (currentDescriptions[firstColVal] || null);

                        const tooltipContent =
                            `<strong>${firstColKey}:</strong> ${firstColVal}<br><strong>${secondColKey}:</strong> ${displaySecondVal}<br><strong>${thirdColKey}:</strong> ${displayPercent}`;

                        tr.on("mouseover", function () {
                            d3.select(this).style("background-color", "#f9fafb");
                            tooltip.html(formatTooltipContent(tooltipContent, desc)).style("visibility", "visible");
                        })
                            .on("mousemove", function (event) {
                                tooltip.style("top", `${event.pageY + 10}px`).style("left", `${event.pageX + 10}px`);
                            })
                            .on("mouseout", function () {
                                d3.select(this).style("background-color", "transparent");
                                tooltip.style("visibility", "hidden");
                            });
                    }
                );
            }

            // =====================================================
            // FIRM RANKING TABLE (Bulk Dataset Traversal)
            // =====================================================

            else if (
                activeType === "firm-ranking-table" ||
                activeType === "industry-ranking-table"
            ) {
                svgOuter.style(
                    "display",
                    "none"
                );

                const tableContainer = contentRow
                    .append("div")
                    .attr("class", `firm-ranking-table-container-${uid}`)
                    .style("width", "100%")
                    .style("display", "flex")
                    .style("flex-direction", "column")
                    .style("font-family", activeFont)
                    .style("box-sizing", "border-box");

                const rankingData = extractFirmRankingData(currentRawRows, data);
                const entities = rankingData.entities || [];

                // -------------------------------------------------
                // Row 1: First Row Entity Name
                // -------------------------------------------------
                const firstEntityName = (entities[0] && entities[0].entityName) || "";

                if (firstEntityName) {
                    const topRow = tableContainer
                        .append("div")
                        .style("display", "flex")
                        .style("justify-content", "flex-start")
                        .style("align-items", "center")
                        .style("margin-bottom", "14px")
                        .style("width", "100%");

                    topRow
                        .append("div")
                        .attr("class", `firm-ranking-entity-name-${uid}`)
                        .style("font-size", `${Math.max(14, Math.round(16 * fontScale))}px`)
                        .style("font-weight", "700")
                        .style("color", "#1e293b")
                        .style("font-family", activeFont)
                        .text(firstEntityName);
                }

                // -------------------------------------------------
                // Row 2: Table (5 columns without Rank)
                // -------------------------------------------------
                const table = tableContainer
                    .append("table")
                    .style("width", "100%")
                    .style("border-collapse", "collapse")
                    .style("border", "none")
                    .style("font-size", `${Math.max(12, Math.round(14 * fontScale))}px`)
                    .style("color", "#333");

                const thead = table.append("thead");
                const headerTr = thead.append("tr")
                    .style("border-bottom", "2px solid #e2e8f0")
                    .style("background-color", "#f8fafc");

                const columns = [
                    { key: "industry", label: "Industry", align: "left" },
                    { key: "position", label: "Industry Position", align: "left" },
                    { key: "patents", label: "Number of Granted Patents", align: "right" },
                    { key: "grantRate", label: "Efficiency Rate", align: "right" }
                ];

                const cellPaddingV = `${Math.max(8, Math.round(11 * fontScale))}px`;
                const cellPaddingH = `${Math.max(10, Math.round(14 * fontScale))}px`;

                columns.forEach(function (col) {
                    headerTr.append("th")
                        .style("padding", `${cellPaddingV} ${cellPaddingH}`)
                        .style("text-align", col.align)
                        .style("font-weight", "600")
                        .style("color", "#475569")
                        .style("font-size", `${Math.max(11, Math.round(13 * fontScale))}px`)
                        .style("white-space", "nowrap")
                        .text(col.label);
                });

                const tbody = table.append("tbody");

                function formatPercentageValue(val) {
                    if (val === null || val === undefined || val === '') return '';
                    if (typeof val === 'number') {
                        if (val > 0 && val <= 1) {
                            return `${Math.round(val * 100)}%`;
                        }
                        return `${val}%`;
                    }
                    const str = String(val).trim();
                    if (str.endsWith('%')) return str;
                    const num = parseFloat(str);
                    if (!isNaN(num)) {
                        if (num > 0 && num <= 1 && str.includes('.')) {
                            return `${Math.round(num * 100)}%`;
                        }
                        return `${str}%`;
                    }
                    return str;
                }

                function getPositionBadgeInfo(rawPos) {
                    const str = String(rawPos !== null && rawPos !== undefined ? rawPos : '').trim();
                    const lower = str.toLowerCase();
                    let num = parseFloat(str.replace(/%/g, ''));
                    if (!isNaN(num) && num > 0 && num <= 1 && str.includes('.')) {
                        num = num * 100;
                    }
                    const displayStr = formatPercentageValue(rawPos);

                    if (lower.includes('10%') || lower.includes('top 10') || (!isNaN(num) && num > 0 && num <= 10)) {
                        return {
                            color: '#10b981', // green
                            label: displayStr || 'Top 10%'
                        };
                    } else if (lower.includes('40%') || lower.includes('top 40') || (!isNaN(num) && num > 10 && num <= 40)) {
                        return {
                            color: '#3b82f6', // blue
                            label: displayStr || 'Top 40%'
                        };
                    } else {
                        return {
                            color: '#9ca3af', // gray
                            label: displayStr || str || 'Below'
                        };
                    }
                }

                function renderFirmTableRows(entityIdx) {
                    tbody.selectAll("*").remove();

                    const currentEntity = entities[entityIdx] || entities[0] || { records: [] };
                    const records = currentEntity.records || [];

                    records.forEach(function (rec) {
                        const tr = tbody.append("tr")
                            .style("border-bottom", "1px solid #f1f5f9")
                            .style("transition", "background-color 0.15s ease");

                        // 1. Industry
                        tr.append("td")
                            .style("padding", `${cellPaddingV} ${cellPaddingH}`)
                            .style("text-align", "left")
                            .style("font-weight", "500")
                            .style("color", "#1e293b")
                            .style("white-space", "nowrap")
                            .text(rec.industry || "");

                        // 2. Industry Position (colored dot + text)
                        const posTd = tr.append("td")
                            .style("padding", `${cellPaddingV} ${cellPaddingH}`)
                            .style("text-align", "left")
                            .style("white-space", "nowrap");

                        const badgeInfo = getPositionBadgeInfo(rec.position);
                        const posWrapper = posTd.append("span")
                            .style("display", "inline-flex")
                            .style("align-items", "center")
                            .style("gap", "7px")
                            .style("font-weight", "500")
                            .style("color", "#334155");

                        posWrapper.append("span")
                            .style("width", "8px")
                            .style("height", "8px")
                            .style("border-radius", "50%")
                            .style("background-color", badgeInfo.color)
                            .style("display", "inline-block")
                            .style("flex-shrink", "0");

                        posWrapper.append("span")
                            .text(badgeInfo.label);

                        // 3. Number of Granted Patents
                        let formattedPatents = "";
                        if (typeof rec.patents === "number") {
                            formattedPatents = rec.patents.toLocaleString();
                        } else if (rec.patents !== undefined && rec.patents !== null && rec.patents !== "") {
                            const pNum = parseFloat(String(rec.patents).replace(/,/g, ''));
                            formattedPatents = !isNaN(pNum) ? pNum.toLocaleString() : String(rec.patents);
                        }

                        tr.append("td")
                            .style("padding", `${cellPaddingV} ${cellPaddingH}`)
                            .style("text-align", "right")
                            .style("font-weight", "500")
                            .style("color", "#334155")
                            .style("white-space", "nowrap")
                            .text(formattedPatents);

                        // 4. Efficiency Rate
                        const formattedGrantRate = formatPercentageValue(rec.grantRate);

                        tr.append("td")
                            .style("padding", `${cellPaddingV} ${cellPaddingH}`)
                            .style("text-align", "right")
                            .style("font-weight", "500")
                            .style("color", "#334155")
                            .style("white-space", "nowrap")
                            .text(formattedGrantRate);

                        // Tooltip and hover
                        const tooltipContent = `<strong>Industry:</strong> ${rec.industry}<br><strong>Industry Position:</strong> ${badgeInfo.label}<br><strong>Number of Granted Patents:</strong> ${formattedPatents}<br><strong>Efficiency Rate:</strong> ${formattedGrantRate}`;

                        tr.on("mouseover", function () {
                            d3.select(this).style("background-color", "#f8fafc");
                            tooltip.html(formatTooltipContent(tooltipContent)).style("visibility", "visible");
                        })
                            .on("mousemove", function (event) {
                                tooltip.style("top", `${event.pageY + 10}px`).style("left", `${event.pageX + 10}px`);
                            })
                            .on("mouseout", function () {
                                d3.select(this).style("background-color", "transparent");
                                tooltip.style("visibility", "hidden");
                            });
                    });
                }

                renderFirmTableRows(0);

                // -------------------------------------------------
                // Row 3: Table Legend
                // -------------------------------------------------
                const legendRow = tableContainer
                    .append("div")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("gap", "20px")
                    .style("flex-wrap", "wrap")
                    .style("margin-top", "14px")
                    .style("padding-top", "12px")
                    .style("border-top", "1px solid #e2e8f0")
                    .style("font-size", `${Math.max(11, Math.round(12 * fontScale))}px`)
                    .style("color", "#64748b");

                const legendItems = [
                    { color: "#10b981", label: "Top 10%" },
                    { color: "#3b82f6", label: "Top 40%" },
                    { color: "#9ca3af", label: "Below" }
                ];

                legendItems.forEach(function (item) {
                    const itemDiv = legendRow.append("div")
                        .style("display", "inline-flex")
                        .style("align-items", "center")
                        .style("gap", "6px");

                    itemDiv.append("span")
                        .style("width", "8px")
                        .style("height", "8px")
                        .style("border-radius", "50%")
                        .style("background-color", item.color)
                        .style("display", "inline-block")
                        .style("flex-shrink", "0");

                    itemDiv.append("span")
                        .text(item.label);
                });
            }

            // =====================================================
            // DATA BLOCK
            // =====================================================

            else if (
                activeType === "data-block"
            ) {
                svgOuter.style(
                    "display",
                    "none"
                );

                const blockContainer = contentRow
                    .append("div")
                    .attr("class", `data-block-container-${uid} parola-data-blocks`)
                    .style("width", "100%")
                    .style("display", "grid")
                    .style("gap", "0.5px")
                    .style("background-color", "#787a7d")
                    .style("border", "0.5px solid #787a7d")
                    .style("box-sizing", "border-box")
                    .style("font-family", activeFont);

                const items = extractDataBlockItems(currentRawRows, data);

                const numCols = Math.max(1, Math.min(items.length, 6));
                blockContainer.style(
                    "grid-template-columns",
                    `repeat(${numCols}, minmax(0, 1fr))`
                );

                items.forEach(function (item) {
                    const block = blockContainer
                        .append("div")
                        .attr("class", "parola-data-block")
                        .style("display", "flex")
                        .style("flex-direction", "column")
                        .style("gap", "10px")
                        .style("min-width", "0")
                        .style("padding", `${Math.max(12, Math.round(15 * fontScale))}px`)
                        .style("background-color", "#ffffff")
                        .style("box-sizing", "border-box");

                    block.append("div")
                        .attr("class", "parola-data-block__label")
                        .style("color", "#222222")
                        .style("font-size", `${Math.max(11, Math.round(12 * fontScale))}px`)
                        .style("font-weight", "400")
                        .style("line-height", "1.4")
                        .style("text-transform", "uppercase")
                        .style("font-family", activeFont)
                        .text(item.label);

                    block.append("div")
                        .attr("class", "parola-data-block__value")
                        .style("color", "#222222")
                        .style("font-size", `${Math.max(22, Math.round(28 * fontScale))}px`)
                        .style("font-weight", "500")
                        .style("line-height", "1.2")
                        .style("font-family", activeFont)
                        .text(formatDataBlockValue(item.value));
                });
            } else {
                svgOuter.style(
                    "display",
                    "block"
                );
            }

            if (!showAxisLabels) {
                xAxisGroup.selectAll("text").style("display", "none");
                yAxisGroup.selectAll("text").style("display", "none");
            } else {
                xAxisGroup.selectAll("text").style("display", null);
                yAxisGroup.selectAll("text").style("display", null);
            }

            // =====================================================
            // LOGO
            // =====================================================

            logoRow
                .selectAll("*")
                .remove();

            if (showLogo && selectedLogo) {
                logoRow.style("display", "flex");

                let extraLogoTop = 0;
                if (hasRotatedXLabels && showAxisLabels) {
                    let maxLabelBottom = 0;
                    const svgRect = svgOuter.node() ? svgOuter.node().getBoundingClientRect() : null;

                    xAxisGroup.selectAll("text").each(function () {
                        const rect = this.getBoundingClientRect();
                        if (rect && rect.bottom > maxLabelBottom) {
                            maxLabelBottom = rect.bottom;
                        }
                    });

                    if (svgRect && maxLabelBottom > svgRect.bottom) {
                        extraLogoTop = Math.ceil(maxLabelBottom - svgRect.bottom + 8 * fontScale);
                    } else {
                        let maxLabelWidth = 0;
                        xAxisGroup.selectAll("text").each(function () {
                            if (this.getBBox) {
                                const w = this.getBBox().width;
                                if (w > maxLabelWidth) {
                                    maxLabelWidth = w;
                                }
                            }
                        });
                        const verticalDrop = maxLabelWidth * Math.sin(Math.PI / 4) + parseInt(tickSize, 10);
                        if (verticalDrop > margin.bottom) {
                            extraLogoTop = Math.ceil(verticalDrop - margin.bottom + 8 * fontScale);
                        }
                    }
                }

                if (extraLogoTop > 0) {
                    logoRow.style("margin-top", `${extraLogoTop}px`);
                } else {
                    logoRow.style("margin-top", "0px");
                }

                const baseLogoWidth = Math.min(100, Math.max(45, containerWidth * 0.14));
                const logoWidth = Math.round(baseLogoWidth * fontScale);

                let logoHeight;

                if (
                    selectedLogo ===
                    "parola logo only.png"
                ) {
                    logoHeight =
                        logoWidth;
                } else {
                    logoHeight = Math.round(
                        logoWidth *
                        0.35
                    );
                }

                logoRow
                    .style(
                        "padding-top",
                        `${Math.round(2 * fontScale)}px`
                    )
                    .style(
                        "padding-bottom",
                        "0px"
                    )
                    .append(
                        "img"
                    )
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
            } else {
                logoRow.style("display", "none");
                logoRow.style("margin-top", "0px");
            }

            updateChartWrapperLayout();
            scheduleResponsiveScale();
        }

        // =========================================================
        // CONTROL EVENT LISTENERS
        // =========================================================

        typePicker.on(
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

        logoPicker.on(
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

        showLogoCheckbox.on(
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

        showTitleCheckbox.on(
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

        showSubtitleCheckbox.on(
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

        showStackTotalsCheckbox.on(
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

        showDataLabelsCheckbox.on(
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

        showAxisLabelsCheckbox.on(
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

        showPercentageCheckbox.on(
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

        thickShortColumnsCheckbox.on(
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

        let resizeTimer =
            null;

        function handleWindowResize() {
            if (
                resizeTimer
            ) {
                clearTimeout(
                    resizeTimer
                );
            }

            resizeTimer =
                setTimeout(
                    function () {
                        applyResponsiveScale();
                    },
                    100
                );
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

            if (
                errorDiv.empty()
            ) {
                errorDiv =
                    canvas
                        .append(
                            "div"
                        )
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
                    activeFont
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
                .text(
                    message
                );
        }

        function hideErrorState() {
            const errorDiv =
                canvas.select(
                    `#chart-error-message-${uid}`
                );

            if (
                !errorDiv.empty()
            ) {
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
                String(
                    value
                ).trim();

            if (
                trimmedValue ===
                ""
            ) {
                return "";
            }

            if (
                !isNaN(
                    Number(
                        trimmedValue
                    )
                )
            ) {
                return Number(
                    trimmedValue
                );
            }

            const cleanedNumeric =
                trimmedValue
                    .replace(
                        /,/g,
                        ""
                    )
                    .replace(
                        /%/g,
                        ""
                    );

            if (
                !isNaN(
                    Number(
                        cleanedNumeric
                    )
                ) &&
                cleanedNumeric !==
                ""
            ) {
                return Number(
                    cleanedNumeric
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
                        function (
                            cell
                        ) {
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

                                    currentRawRows =
                                        rawData;

                                    currentTitle =
                                        "";

                                    currentSubtitle =
                                        "";

                                    currentDescriptions =
                                        {};

                                    const firstCell =
                                        String(
                                            rawData[0][0] ||
                                            ""
                                        )
                                            .trim()
                                            .toLowerCase();

                                    let parsedData =
                                        [];

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
                                                        `Column ${index +
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

                                            const rowTag =
                                                String(
                                                    sourceRow[0] ||
                                                    ""
                                                )
                                                    .trim()
                                                    .toLowerCase();

                                            if (
                                                rowTag ===
                                                "description"
                                            ) {
                                                keys.forEach(
                                                    function (
                                                        key,
                                                        columnIndex
                                                    ) {
                                                        if (
                                                            columnIndex >
                                                            0 &&
                                                            sourceRow[
                                                            columnIndex
                                                            ]
                                                        ) {
                                                            currentDescriptions[
                                                                key
                                                            ] =
                                                                String(
                                                                    sourceRow[
                                                                    columnIndex
                                                                    ]
                                                                ).trim();
                                                        }
                                                    }
                                                );

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
                                                        `Column ${index +
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

                                            const rowTag =
                                                String(
                                                    sourceRow[0] ||
                                                    ""
                                                )
                                                    .trim()
                                                    .toLowerCase();

                                            if (
                                                rowTag ===
                                                "description"
                                            ) {
                                                keys.forEach(
                                                    function (
                                                        key,
                                                        columnIndex
                                                    ) {
                                                        if (
                                                            columnIndex >
                                                            0 &&
                                                            sourceRow[
                                                            columnIndex
                                                            ]
                                                        ) {
                                                            currentDescriptions[
                                                                key
                                                            ] =
                                                                String(
                                                                    sourceRow[
                                                                    columnIndex
                                                                    ]
                                                                ).trim();
                                                        }
                                                    }
                                                );

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

                                    if (
                                        parsedData.length >
                                        0
                                    ) {
                                        parsedData =
                                            parsedData.filter(
                                                function (
                                                    row
                                                ) {
                                                    const rowKeys =
                                                        Object.keys(
                                                            row
                                                        );

                                                    return rowKeys.some(
                                                        function (
                                                            k
                                                        ) {
                                                            const val =
                                                                row[
                                                                k
                                                                ];

                                                            return (
                                                                val !==
                                                                null &&
                                                                val !==
                                                                undefined &&
                                                                String(
                                                                    val
                                                                ).trim() !==
                                                                ""
                                                            );
                                                        }
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

        let csvHasLoaded =
            false;

        fileInput.on(
            "change",
            function (
                event
            ) {
                const inputElement =
                    event.currentTarget ||
                    event.target;

                const file =
                    inputElement.files &&
                    inputElement.files[0];

                if (
                    !file
                ) {
                    return;
                }

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

                reader.onerror =
                    function (
                        error
                    ) {
                        console.error(
                            `Parola chart ${uid}: Unable to read CSV file.`,
                            error
                        );

                        displayErrorState(
                            "Tracking metrics update pending"
                        );
                    };

                reader.readAsText(
                    file
                );
            }
        );

        // =========================================================
        // BACKEND CSV FALLBACK
        // =========================================================

        const rawBackendCsvUrl =
            canvas.attr(
                "data-csv-url"
            ) ||
            canvas.attr(
                "data-source-file"
            ) ||
            canvas.attr(
                "data-csv-filename"
            ) ||
            canvas.attr(
                "data-csv"
            ) ||
            "";

        const backendCsvFilename =
            canvas.attr(
                "data-csv-filename"
            ) ||
            (rawBackendCsvUrl ? rawBackendCsvUrl.substring(rawBackendCsvUrl.lastIndexOf("/") + 1) : "chart.csv") ||
            "chart.csv";

        function loadBackendCsv() {
            if (
                csvHasLoaded ||
                !rawBackendCsvUrl
            ) {
                return;
            }

            const rawFilename = (
                backendCsvFilename ||
                rawBackendCsvUrl.substring(rawBackendCsvUrl.lastIndexOf("/") + 1)
            ).trim();

            const candidateUrls = [];

            // 1. Direct URL as specified on the element
            if (rawBackendCsvUrl) {
                candidateUrls.push(rawBackendCsvUrl);
            }

            // 2. wp-content/chart/ directory candidates
            if (rawFilename) {
                candidateUrls.push(`/wp-content/chart/${rawFilename}`);
                candidateUrls.push(`wp-content/chart/${rawFilename}`);
            }

            if (
                rawBackendCsvUrl &&
                !rawBackendCsvUrl.startsWith("http://") &&
                !rawBackendCsvUrl.startsWith("https://")
            ) {
                const cleanPath = rawBackendCsvUrl.replace(/^\/+/, "");
                if (!cleanPath.startsWith("wp-content/chart/")) {
                    candidateUrls.push(`/wp-content/chart/${cleanPath}`);
                    candidateUrls.push(`wp-content/chart/${cleanPath}`);
                }
            }

            // Remove duplicate candidate URLs
            const uniqueUrls = candidateUrls.filter(function (url, index, self) {
                return url && self.indexOf(url) === index;
            });

            function tryFetchCandidate(urlIndex) {
                if (urlIndex >= uniqueUrls.length) {
                    console.error(
                        `Parola chart ${uid}: Backend CSV could not be loaded from candidate URLs.`,
                        uniqueUrls
                    );

                    if (!csvHasLoaded) {
                        displayErrorState(
                            "Tracking metrics update pending"
                        );
                    }
                    return;
                }

                const currentUrl = uniqueUrls[urlIndex];

                fetch(
                    currentUrl,
                    {
                        credentials:
                            "same-origin",
                        cache:
                            "no-store"
                    }
                )
                    .then(
                        function (
                            response
                        ) {
                            if (
                                !response.ok
                            ) {
                                throw new Error(
                                    `CSV request failed with status ${response.status}.`
                                );
                            }

                            return response.blob();
                        }
                    )
                    .then(
                        function (
                            blob
                        ) {
                            if (
                                csvHasLoaded
                            ) {
                                return;
                            }

                            if (
                                blob.type &&
                                blob.type.includes("text/html")
                            ) {
                                throw new Error(
                                    `Response from ${currentUrl} was HTML, expected CSV.`
                                );
                            }

                            const csvFile =
                                new File(
                                    [
                                        blob
                                    ],
                                    rawFilename || "chart.csv",
                                    {
                                        type:
                                            blob.type ||
                                            "text/csv"
                                    }
                                );

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
                                            bubbles:
                                                true
                                        }
                                    )
                                );

                                return;
                            }

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
                        }
                    )
                    .catch(
                        function (
                            error
                        ) {
                            // Try next candidate URL (including wp-content/chart/)
                            tryFetchCandidate(urlIndex + 1);
                        }
                    );
            }

            tryFetchCandidate(0);
        }

        window.setTimeout(
            loadBackendCsv,
            500
        );
    }


    // =========================================================
    // PUBLIC INITIALIZER
    // =========================================================

    window.parolaInitializeCharts =
        initializeParolaCharts;


    // =========================================================
    // START ENGINE
    // =========================================================

    function startParolaEngine() {

        // Initialize charts already on the page.
        initializeParolaCharts(
            document
        );


        /*
         * Gutenberg creates and replaces preview nodes dynamically.
         * Observe the page for newly inserted charts.
         */
        const observer =
            new MutationObserver(
                function (mutations) {

                    mutations.forEach(
                        function (mutation) {

                            mutation
                                .addedNodes
                                .forEach(
                                    function (node) {

                                        if (
                                            node.nodeType !==
                                            1
                                        ) {
                                            return;
                                        }

                                        initializeParolaCharts(
                                            node
                                        );
                                    }
                                );
                        }
                    );
                }
            );


        observer.observe(
            document.body,
            {
                childList:
                    true,

                subtree:
                    true
            }
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startParolaEngine
        );

    } else {

        startParolaEngine();
    }

})();