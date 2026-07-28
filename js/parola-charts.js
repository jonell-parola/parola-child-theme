/**
 * Parola Visualization Engine - Phase 4 Core Customization Dashboard
 *
 * Multi-instance aware: every element carrying the ".d3-test-canvas" class is
 * initialized independently, so any number of D3 Chart blocks can coexist on
 * one page. Each instance keeps its own controls, file input, tooltip, SVG and
 * render state. Control element IDs are suffixed with a unique per-instance
 * index so they never clash. All original behaviour — manual CSV upload, the
 * default baseline CSV fetch, live restyle controls — is preserved.
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Parola Engine: Visual scripting pipeline initializing...");

    const canvases = document.querySelectorAll(".d3-test-canvas");
    if (!canvases.length) {
        console.warn("⚠️ No .d3-test-canvas containers found on this page.");
        return;
    }

    canvases.forEach(function (canvasNode, index) {
        initChart(canvasNode, index);
    });

    // =============================================================
    // PER-INSTANCE INITIALIZER
    // =============================================================
    function initChart(canvasNode, instanceIndex) {

        const canvas = d3.select(canvasNode);

        // Clear any existing default content for THIS instance only.
        canvas.selectAll("*").remove();

        // Unique suffix so control element IDs never collide across instances.
        const uid = 'p' + instanceIndex;

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

        // Row 1: File & Core Theme Styling Controls (IDs unique per instance)
        const fileInput = createInputGroup(controls, "1. Data Source File (.csv):", "file", "csv-file-" + uid, "", {accept: ".csv"});
        const colorPicker = createInputGroup(controls, "2. Bar Theme Color:", "color", "chart-color-" + uid, "#0073aa");

        // Typography Dropdown Picker
        const fontWrapper = controls.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "5px");
        fontWrapper.append("label").text("3. Typography Font Family:").style("font-weight", "bold").style("color", "#444");
        const fontPicker = fontWrapper.append("select").attr("id", "font-picker-" + uid).style("padding", "4px");
        ["sans-serif", "serif", "monospace", "cursive", "system-ui"].forEach(font => {
            fontPicker.append("option").attr("value", font).text(font);
        });

        // Row 2: Custom Text Fields Controls
        const mainTitleInput = createInputGroup(controls, "4. Graph Header Title:", "text", "title-input-" + uid, "Intellectual Property Metrics");
        const xAxisTitleInput = createInputGroup(controls, "5. X-Axis Label Title:", "text", "x-label-input-" + uid, "Assigned Global Organization");
        const yAxisTitleInput = createInputGroup(controls, "6. Y-Axis Label Title:", "text", "y-label-input-" + uid, "Total Registered Patents Issued");

        // Row 3: Sizing Configurations
        const mainTitleSizeInput = createInputGroup(controls, "7. Header Font Size (px):", "number", "title-size-" + uid, "16", {min: "10", max: "32"});
        const axisTitleSizeInput = createInputGroup(controls, "8. Axis Label Size (px):", "number", "axis-size-" + uid, "12", {min: "8", max: "20"});
        const tickSizeInput = createInputGroup(controls, "9. Scale Metric Size (px):", "number", "tick-size-" + uid, "11", {min: "8", max: "16"});

        // ==========================================
        // 2. INITIALIZE CHART CANVAS AND TOOLTIP
        // ==========================================
        const margin = {top: 60, right: 30, bottom: 60, left: 70};
        const width = 550 - margin.left - margin.right;
        const height = 360 - margin.top - margin.bottom;

        const tooltip = canvas.append("div")
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
            .style("z-index", "999");

        const svg = canvas.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("overflow", "visible")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xAxisGroup = svg.append("g").attr("transform", `translate(0,${height})`);
        const yAxisGroup = svg.append("g");

        // Append Persistent Structural Text Element Selectors
        const mainTitleText = svg.append("text").attr("x", width / 2).attr("y", -margin.top / 2).attr("text-anchor", "middle").style("font-weight", "bold");
        const xAxisText = svg.append("text").attr("x", width / 2).attr("y", height + margin.bottom - 15).attr("text-anchor", "middle").style("font-weight", "bold");
        const yAxisText = svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", -margin.left + 25).attr("text-anchor", "middle").style("font-weight", "bold");

        // ==========================================
        // 3. CORE RENDERING ENGINE FUNCTION
        // ==========================================
        let currentData = [];

        // Coerce a cell into a real number, tolerating thousands separators,
        // currency symbols, stray spaces, etc. Returns NaN when not numeric.
        function toNumber(value) {
            if (typeof value === "number") {
                return isFinite(value) ? value : NaN;
            }
            if (value === null || value === undefined) {
                return NaN;
            }
            var cleaned = String(value).replace(/[^0-9.\-]/g, "");
            if (cleaned === "" || cleaned === "-" || cleaned === ".") {
                return NaN;
            }
            return parseFloat(cleaned);
        }

        // Reshape arbitrary parsed CSV rows into the { Company, Patents } shape
        // the chart expects. Prefers columns literally named "Company" and
        // "Patents"; otherwise falls back to the first column (category) and
        // the first numeric-looking column (value). Rows without a valid
        // category and a finite value are dropped, so no NaN can reach the SVG.
        function normalizeRows(rawRows) {
            if (!Array.isArray(rawRows) || rawRows.length === 0) {
                return [];
            }

            var firstRow = rawRows[0] || {};
            var keys = Object.keys(firstRow);
            if (keys.length === 0) {
                return [];
            }

            var categoryKey = keys.indexOf("Company") !== -1 ? "Company" : keys[0];

            var valueKey = keys.indexOf("Patents") !== -1 ? "Patents" : null;
            if (!valueKey) {
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i] === categoryKey) {
                        continue;
                    }
                    var candidate = keys[i];
                    var hasNumeric = rawRows.some(function (row) {
                        return isFinite(toNumber(row[candidate]));
                    });
                    if (hasNumeric) {
                        valueKey = candidate;
                        break;
                    }
                }
            }

            if (!categoryKey || !valueKey) {
                console.warn("⚠️ Parola: could not find a category + numeric column in this CSV.");
                return [];
            }

            return rawRows
                .map(function (row) {
                    return {
                        Company: row[categoryKey],
                        Patents: toNumber(row[valueKey])
                    };
                })
                .filter(function (d) {
                    return d.Company !== null &&
                        d.Company !== undefined &&
                        String(d.Company).trim() !== "" &&
                        isFinite(d.Patents);
                });
        }

        function renderChart(data) {
            currentData = data;

            // Nothing valid to draw — clear any old bars and bail out before
            // any scale can produce NaN.
            if (!Array.isArray(data) || data.length === 0) {
                svg.selectAll("rect").remove();
                return;
            }
            // Pull active custom configuration metrics from the dashboard inputs
            const activeColor = colorPicker.property("value");
            const activeFont = fontPicker.property("value");

            const mainTitleVal = mainTitleInput.property("value");
            const xAxisTitleVal = xAxisTitleInput.property("value");
            const yAxisTitleVal = yAxisTitleInput.property("value");

            const mainTitleSize = mainTitleSizeInput.property("value") + "px";
            const axisTitleSize = axisTitleSizeInput.property("value") + "px";
            const tickSize = tickSizeInput.property("value") + "px";

            // Apply Custom Typographic Text & Font Properties
            mainTitleText.text(mainTitleVal).style("font-family", activeFont).style("font-size", mainTitleSize);
            xAxisText.text(xAxisTitleVal).style("font-family", activeFont).style("font-size", axisTitleSize);
            yAxisText.text(yAxisTitleVal).style("font-family", activeFont).style("font-size", axisTitleSize);

            // Map math scales
            const xScale = d3.scaleBand().domain(data.map(d => d.Company)).range([0, width]).padding(0.3);
            const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.Patents) * 1.1]).range([height, 0]);

            // Draw math axes and apply tick typography styling
            xAxisGroup.call(d3.axisBottom(xScale))
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            yAxisGroup.call(d3.axisLeft(yScale))
                .selectAll("text")
                .style("font-family", activeFont)
                .style("font-size", tickSize);

            // Bind data rows to visual elements (scoped to THIS instance's svg)
            const bars = svg.selectAll("rect").data(data);
            bars.exit().remove();

            bars.enter()
                .append("rect")
                .merge(bars)
                .attr("x", d => xScale(d.Company))
                .attr("y", d => yScale(d.Patents))
                .attr("width", xScale.bandwidth())
                .attr("height", d => height - yScale(d.Patents))
                .attr("fill", activeColor)
                .style("cursor", "pointer")
                .on("mouseover", function() {
                    d3.select(this).attr("fill", d3.rgb(activeColor).darker(0.5));
                    tooltip.style("visibility", "visible");
                })
                .on("mousemove", function(event, d) {
                    tooltip
                        .html(`<strong>Company:</strong> ${d.Company}<br/><strong>Patents:</strong> ${d.Patents}`)
                        .style("top", (event.pageY - 50) + "px")
                        .style("left", (event.pageX + 15) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this).attr("fill", activeColor);
                    tooltip.style("visibility", "hidden");
                });
        }

        // ==========================================
        // 4. REAL-TIME EVENT LISTENER PIPELINES
        // ==========================================
        const dynamicInputs = [
            colorPicker, fontPicker, mainTitleInput, xAxisTitleInput,
            yAxisTitleInput, mainTitleSizeInput, axisTitleSizeInput, tickSizeInput
        ];

        // Trigger instant redraw when any text field or font property shifts
        dynamicInputs.forEach(inputSelector => {
            inputSelector.on("input", () => { if (currentData.length > 0) renderChart(currentData); });
        });

        // Detect file uploading activity (manual upload + block CSV injection)
        fileInput.on("change", function(event) {
            const file = event.target.files[0];
            if (!file) return;

            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                transformHeader: function (h) { return String(h).trim(); },
                complete: function(results) {
                    renderChart(normalizeRows(results.data));
                }
            });
        });

        // ==========================================
        // 5. RUNTIME INITIALIZATION (BASELINE FILE)
        // ==========================================
        const defaultCsvPath = '/wp-content/media/csv/test-data.csv';
        fetch(defaultCsvPath)
            .then(response => { if (!response.ok) throw new Error(); return response.text(); })
            .then(rawCsvText => {
                Papa.parse(rawCsvText, {
                    header: true, dynamicTyping: true, skipEmptyLines: true,
                    transformHeader: function (h) { return String(h).trim(); },
                    complete: function(results) { renderChart(normalizeRows(results.data)); }
                });
            })
            .catch(err => console.log("ℹ️ Waiting for initial CSV upload prompt..."));
    }
});
