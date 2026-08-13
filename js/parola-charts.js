/**
 * Parola Visualization Engine - Multi-instance Customization Dashboard
 *
 * Supports any number of .d3-test-canvas elements on the same page.
 * 
 * 1.0.59 - "Heatmap changed to percentage values"
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

		let currentTitle = "";
		let currentSubtitle = "";
		let currentDescriptions = {};
		let cpcSortMode = "original"; // "original", "asc" (A-Z), "desc" (Z-A)

		// Read configuration from each individual chart container.
		const defaultCsv =
			canvas.attr("data-csv-url") ||
			canvas.attr("data-source-file") ||
			"";
		const defaultChartType = canvas.attr("chart-type") || "bar";
		const activeFont = "Inter";
		const selectedLogo = "parola logo with text.png";

		canvas
			.style("position", "relative")
			.style("overflow", "visible");

		// Clear only this chart instance.
		canvas.selectAll("*").remove();

		// =========================================================
		// CONTROLS (Only Data Source File and Chart Type)
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

		// Locate the JavaScript asset directory for logo files.
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

		// =========================================================
		// CHART STRUCTURE
		// =========================================================

		const margin = {
			top: 65,
			right: 30,
			bottom: 60,
			left: 100
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
			.style("padding-top", "2px")
			.style("padding-bottom", "5px");

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
				});
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
			mainTitleSize,
			activeType,
			valueKeys,
			tickSize,
			seriesColorMap
		) {
			const isHeaderType =
				activeType === "stacked-bar" ||
				activeType === "horizontal-stacked-bar" ||
				activeType === "multi-line" ||
				activeType === "stacked-area" ||
				activeType === "heatmap";

			if (!isHeaderType) {
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

			const subtitleSize = "16px";

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

			if (activeType === "heatmap") {
				headerLegend.style(
					"display",
					"none"
				);
				return;
			}

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
				if (seriesColorMap && seriesColorMap.has(key)) {
					return seriesColorMap.get(key);
				}
				return fallbackColorScale(key);
			};

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
				);

			valueKeys.forEach(
				function (key) {
					const item =
						headerLegend
							.append("div")
							.datum(key)
							.attr("class", `legend-item-${uid}`)
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
							)
							.style(
								"cursor",
								(activeType === "multi-line" || activeType === "stacked-area") ? "pointer" : "default"
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
							getColor(key)
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
		}

		// Helper function to check if label fits inside SVG bounding box
		function checkAndFilterOverlappingLabels(labelsSelection) {
			labelsSelection.each(function () {
				const label = d3.select(this);
				if (label.style("display") === "none") return;

				const boundingBox = this.getBBox();
				const parentBox = this.parentNode ? this.parentNode.getBBox() : null;

				if (parentBox) {
					if (
						boundingBox.width > parentBox.width ||
						boundingBox.height > parentBox.height
					) {
						label.style("display", "none");
					}
				}
			});
		}

		// Helper: draw a rect with rounded top-left and top-right corners only (for vertical bars)
		function roundedTopRect(x, y, w, h, r) {
			if (h <= 0 || w <= 0) return "";
			const cr = Math.min(r, w / 2, h);
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

		// Helper: draw a rect with rounded top-right and bottom-right corners only (for horizontal bars)
		function roundedRightRect(x, y, w, h, r) {
			if (w <= 0 || h <= 0) return "";
			const cr = Math.min(r, h / 2, w);
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

		// =========================================================
		// MAIN CHART RENDERER
		// =========================================================

		function renderChart(data) {
			if (!data || data.length === 0) {
				return;
			}

			currentData = data;

			const activeType =
				typePicker.property("value");

			const containerWidth =
				canvas
					.node()
					.getBoundingClientRect()
					.width || 550;

			let chartWidth = containerWidth;
			let chartHeight = Math.max(
				320,
				containerWidth * 0.65
			);

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

			// Readable standard font sizes (Title: 22px, Subtitle: 16px, Axis: 13px, Shape: 14px, Pie Shape: 12px)
			const mainTitleSize = "22px";
			const subtitleSize = "16px";
			const tickSize = "13px";
			const shapeTextSize = "14px";
			const pieShapeTextSize = "12px";

			mainTitleText
				.text(mainTitleValue)
				.attr("x", -margin.left)
				.attr("y", -40)
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
				.attr("y", -18)
				.style(
					"font-family",
					activeFont
				)
				.style(
					"font-size",
					subtitleSize
				);

			// Detect category, description and numeric columns.
			const keys =
				Object.keys(data[0]);

			// Find category column dynamically or use first key
			const categoryKey =
				keys.find(k => k.toLowerCase() === 'company' || k.toLowerCase() === 'category') ||
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
					.filter(key => key !== categoryKey && key !== descriptionKey)
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

			if (
				activeType === "stacked-bar" ||
				activeType === "horizontal-stacked-bar" ||
				activeType === "multi-line" ||
				activeType === "stacked-area" ||
				activeType === "heatmap"
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
				mainTitleSize,
				activeType,
				valueKeys,
				tickSize
			);

			applyChartContainerStyles();

			// Clear visual elements from the previous chart type.
			contentRow.selectAll(`.heatmap-container-${uid}`).remove();

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

			svg.selectAll(".bar-path").remove();
			svg.selectAll(".hbar-path").remove();
			svg.selectAll(".hbar-label").remove();
			svg.selectAll(".multi-line-path").remove();
			svg.selectAll(".multi-line-dot").remove();
			svg.selectAll(".stacked-area-path").remove();
			svg.selectAll(".hover-overlay-group").remove();

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

				const outerMargin = 35;
				const radiusX = Math.max(20, activeWidth / 2 - outerMargin);
				const radiusY = Math.max(20, activeHeight / 2 - outerMargin);
				const radius = Math.min(radiusX, radiusY);
				const baseRadius = radius;
				const scaleX = 1;
				const scaleY = 1;

				const pieGroup =
					svg.append("g")
						.attr(
							"class",
							"pie-group"
						)
						.attr(
							"transform",
							`translate(${activeWidth / 2
							},${activeHeight / 2 + 12
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

				const pieSlicePaths = arcs.append("path")
					.attr("d", arc)
					.attr(
						"transform",
						`scale(${scaleX},${scaleY})`
					)
					.attr(
						"fill",
						function (slice) {
							return colorMap.get(
								slice.data[categoryKey]
							);
						}
					)
					.attr("stroke", "none")
					.style("cursor", "pointer")
					.on(
						"mouseover",
						function () {
							// Dim all slices, brighten hovered
							pieGroup.selectAll("path").attr("opacity", 0.3);
							d3.select(this).attr("opacity", 1);
							tooltip.style("visibility", "visible");
						}
					)
					.on(
						"mousemove",
						function (event, slice) {
							const desc = descriptionKey ? slice.data[descriptionKey] : null;
							const mainTxt = `<strong>${categoryKey}:</strong> ${slice.data[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${slice.data[valueKeys[0]]}`;
							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						}
					)
					.on(
						"mouseout",
						function () {
							pieGroup.selectAll("path").attr("opacity", 1);
							tooltip.style("visibility", "hidden");
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
						pieShapeTextSize
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
							const desc = descriptionKey ? row[descriptionKey] : null;
							const mainTxt = `<strong>${categoryKey}:</strong> ${row[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${row[valueKeys[0]]}`;
							tooltip
								.html(formatTooltipContent(mainTxt, desc))
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

				const barPaths = svg
					.selectAll(".bar-path")
					.data(data);

				barPaths.exit().remove();

				const barCornerRadius = 4;

				const mergedBarPaths = barPaths
					.enter()
					.append("path")
					.attr("class", "bar-path")
					.merge(barPaths)
					.attr("d", function (row) {
						const bx = xScale(row[categoryKey]);
						const by = yScale(row[valueKeys[0]] || 0);
						const bw = xScale.bandwidth();
						const bh = activeHeight - by;
						return roundedTopRect(bx, by, bw, bh, barCornerRadius);
					})
					.attr("fill", "#1ea0af")
					.style("cursor", "pointer")
					.on("mouseover", function () {
						// Dim all bars, highlight hovered
						svg.selectAll(".bar-path").attr("opacity", 0.3);
						svg.selectAll(".bar-label").attr("opacity", 0.3);
						d3.select(this).attr("opacity", 1);
						// Keep its label bright
						const idx = mergedBarPaths.nodes().indexOf(this);
						d3.select(svg.selectAll(".bar-label").nodes()[idx]).attr("opacity", 1);

						tooltip.style("visibility", "visible");
					})
					.on(
						"mousemove",
						function (event, row) {
							const desc = descriptionKey ? row[descriptionKey] : null;
							const mainTxt = `<strong>${categoryKey}:</strong> ${row[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${row[valueKeys[0]]}`;
							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						}
					)
					.on("mouseout", function () {
						svg.selectAll(".bar-path").attr("opacity", 1);
						svg.selectAll(".bar-label").attr("opacity", 1);
						tooltip.style("visibility", "hidden");
					});

				// Labels outside bar on top, black, not bold
				svg.selectAll(".bar-label")
					.data(data)
					.enter()
					.append("text")
					.attr("class", "bar-label")
					.attr("x", function (row) {
						return xScale(row[categoryKey]) + xScale.bandwidth() / 2;
					})
					.attr("y", function (row) {
						return yScale(row[valueKeys[0]] || 0) - 5;
					})
					.attr("text-anchor", "middle")
					.attr("fill", "#000000")
					.style("font-family", activeFont)
					.style("font-weight", "normal")
					.style("font-size", shapeTextSize)
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

				// Measure y-axis label width and dynamically adjust layout if needed
				let maxYLabelWidth = 0;
				yAxisGroup.selectAll("text").each(function () {
					const bbox = this.getBBox();
					if (bbox.width > maxYLabelWidth) {
						maxYLabelWidth = bbox.width;
					}
				});

				const extraLeftMargin = Math.max(margin.left, maxYLabelWidth + 15);
				const dynamicActiveWidth = chartWidth - extraLeftMargin - margin.right;

				svg.attr("transform", `translate(${extraLeftMargin},${margin.top})`);
				mainTitleText.attr("x", -extraLeftMargin);
				subtitleText.attr("x", -extraLeftMargin);

				xScale.range([0, dynamicActiveWidth]);
				const currentActiveWidth = dynamicActiveWidth;

				const hBarPaths = svg
					.selectAll(".hbar-path")
					.data(data);

				hBarPaths.exit().remove();

				const hBarCornerRadius = 4;

				const mergedHBarPaths = hBarPaths
					.enter()
					.append("path")
					.attr("class", "hbar-path")
					.merge(hBarPaths)
					.attr("d", function (row) {
						const bx = 0;
						const by = yScale(row[categoryKey]);
						const bw = xScale(row[valueKeys[0]] || 0);
						const bh = yScale.bandwidth();
						return roundedRightRect(bx, by, bw, bh, hBarCornerRadius);
					})
					.attr("fill", "#1ea0af")
					.style("cursor", "pointer")
					.on("mouseover", function () {
						svg.selectAll(".hbar-path").attr("opacity", 0.3);
						svg.selectAll(".hbar-label").attr("opacity", 0.3);
						d3.select(this).attr("opacity", 1);
						const idx = mergedHBarPaths.nodes().indexOf(this);
						d3.select(svg.selectAll(".hbar-label").nodes()[idx]).attr("opacity", 1);
						tooltip.style("visibility", "visible");
					})
					.on(
						"mousemove",
						function (event, row) {
							const desc = descriptionKey ? row[descriptionKey] : null;
							const mainTxt = `<strong>${categoryKey}:</strong> ${row[categoryKey]}<br><strong>${valueKeys[0]}:</strong> ${row[valueKeys[0]]}`;
							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						}
					)
					.on("mouseout", function () {
						svg.selectAll(".hbar-path").attr("opacity", 1);
						svg.selectAll(".hbar-label").attr("opacity", 1);
						tooltip.style("visibility", "hidden");
					});

				// Labels outside bar to the right, black, not bold, clipped to chart width
				svg.selectAll(".hbar-label")
					.data(data)
					.enter()
					.append("text")
					.attr("class", "hbar-label")
					.attr("x", function (row) {
						return xScale(row[valueKeys[0]] || 0) + 6;
					})
					.attr("y", function (row) {
						return yScale(row[categoryKey]) + yScale.bandwidth() / 2;
					})
					.attr("dy", "0.35em")
					.attr("text-anchor", "start")
					.attr("fill", "#000000")
					.style("font-family", activeFont)
					.style("font-weight", "normal")
					.style("font-size", shapeTextSize)
					.text(function (row) {
						return row[valueKeys[0]] || 0;
					})
					.each(function () {
						// Hide label if it spills beyond the chart right edge
						const bbox = this.getBBox();
						if (bbox.x + bbox.width > activeWidth) {
							d3.select(this).style("display", "none");
						}
					});
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

				const stackCornerRadius = 4;

				segments
					.enter()
					.append("path")
					.merge(segments)
					.attr("d", function (segment) {
						const bx = xScale(segment.data[categoryKey]);
						const by = yScale(segment[1]);
						const bw = xScale.bandwidth();
						const bh = yScale(segment[0]) - yScale(segment[1]);
						// Only round top corners for the topmost segment (segment[0] == 0 means bottom-most stack, skip; round always for visual consistency)
						return roundedTopRect(bx, by, bw, bh, stackCornerRadius);
					})
					.style("cursor", "pointer")
					.on("mouseover", function () {
						// Dim all stack rects
						svg.selectAll(".stack-layer path").attr("opacity", 0.3);
						d3.select(this).attr("opacity", 1);

						tooltip.style("visibility", "visible");
					})
					.on(
						"mousemove",
						function (event, segment) {
							const layerKey =
								d3.select(this.parentNode).datum().key;

							const segmentValue =
								segment[1] - segment[0];

							const desc = descriptionKey ? segment.data[descriptionKey] : null;
							const mainTxt = `<strong>${categoryKey}:</strong> ${segment.data[categoryKey]}<br><strong>${layerKey}:</strong> ${segmentValue}`;

							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						}
					)
					.on("mouseout", function () {
						svg.selectAll(".stack-layer path").attr("opacity", 1);
						tooltip.style("visibility", "hidden");
					});

				const stackLabels = mergedLayers
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
							yScale(segment[1]) + 15
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
						shapeTextSize
					)
					.text(function (segment) {
						const value =
							segment[1] -
							segment[0];

						return value > 0
							? value
							: "";
					});

				// Filter out labels if the text size exceeds the inner shape segment dimensions
				stackLabels.each(function (segment) {
					const label = d3.select(this);
					const segHeight = yScale(segment[0]) - yScale(segment[1]);
					const segWidth = xScale.bandwidth();
					const bbox = this.getBBox();

					if (bbox.height > segHeight || bbox.width > segWidth) {
						label.style("display", "none");
					}
				});

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

				// Measure y-axis label width and dynamically adjust layout if needed
				let maxYLabelWidth = 0;
				yAxisGroup.selectAll("text").each(function () {
					const bbox = this.getBBox();
					if (bbox.width > maxYLabelWidth) {
						maxYLabelWidth = bbox.width;
					}
				});

				const extraLeftMargin = Math.max(margin.left, maxYLabelWidth + 15);
				const dynamicActiveWidth = chartWidth - extraLeftMargin - margin.right;

				svg.attr("transform", `translate(${extraLeftMargin},${margin.top})`);
				mainTitleText.attr("x", -extraLeftMargin);
				subtitleText.attr("x", -extraLeftMargin);

				xScale.range([0, dynamicActiveWidth]);
				const currentActiveWidth = dynamicActiveWidth;

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

				const hStackCornerRadius = 4;

				segments
					.enter()
					.append("path")
					.merge(segments)
					.attr("d", function (segment) {
						const bx = xScale(segment[0]);
						const by = yScale(segment.data[categoryKey]);
						const bw = xScale(segment[1]) - xScale(segment[0]);
						const bh = yScale.bandwidth();
						return roundedRightRect(bx, by, bw, bh, hStackCornerRadius);
					})
					.style("cursor", "pointer")
					.on(
						"mouseover",
						function () {
							svg.selectAll(".stack-layer path").attr("opacity", 0.3);
							d3.select(this).attr("opacity", 1);
							tooltip.style("visibility", "visible");
						}
					)
					.on(
						"mousemove",
						function (event, segment) {
							const layerKey =
								d3.select(this.parentNode).datum().key;

							const value =
								segment[1] - segment[0];

							const desc = descriptionKey ? segment.data[descriptionKey] : null;
							const mainTxt = `<strong>${categoryKey}:</strong> ${segment.data[categoryKey]}<br><strong>${layerKey}:</strong> ${value}`;

							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						}
					)
					.on(
						"mouseout",
						function () {
							svg.selectAll(".stack-layer path").attr("opacity", 1);
							tooltip.style("visibility", "hidden");
						}
					);

				const horizStackLabels = mergedLayers
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
								xScale(segment[1]) - 8
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
						shapeTextSize
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

				// Filter out labels if text size exceeds shape dimensions
				horizStackLabels.each(function (segment) {
					const label = d3.select(this);
					const segWidth = xScale(segment[1]) - xScale(segment[0]);
					const segHeight = yScale.bandwidth();
					const bbox = this.getBBox();

					if (bbox.width > segWidth || bbox.height > segHeight) {
						label.style("display", "none");
					}
				});

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
			}

			// =====================================================
			// MULTI-LINE & STACKED AREA SHARED SETUP
			// =====================================================

			else if (activeType === "multi-line" || activeType === "stacked-area") {
				xAxisGroup.style("display", null);
				yAxisGroup.style("display", null);

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

				// Calculate total per valueKey across all rows for color hierarchy
				const totalsMap = new Map();
				valueKeys.forEach(function (key) {
					const total = d3.sum(data, function (row) {
						return row[key] || 0;
					});
					totalsMap.set(key, total);
				});

				// Sort series descending by total value (matching pie chart color ranking)
				const sortedKeys = [...valueKeys].sort(function (a, b) {
					return (totalsMap.get(b) || 0) - (totalsMap.get(a) || 0);
				});

				const seriesColorMap = new Map();
				sortedKeys.forEach(function (key, index) {
					seriesColorMap.set(key, PIE_COLORS[index % PIE_COLORS.length]);
				});

				// Re-render HTML Header Legend with exact color mapping
				renderHTMLHeader(
					mainTitleValue,
					subtitleValue,
					mainTitleSize,
					activeType,
					sortedKeys,
					tickSize,
					seriesColorMap
				);

				const categories = data.map(function (row) {
					return String(row[categoryKey]);
				});

				const xScale = d3
					.scalePoint()
					.domain(categories)
					.range([0, activeWidth])
					.padding(0.1);

				// =====================================================
				// MULTIPLE LINE CHART
				// =====================================================

				if (activeType === "multi-line") {
					let maxVal = 0;
					data.forEach(function (row) {
						sortedKeys.forEach(function (key) {
							const val = row[key] || 0;
							if (val > maxVal) maxVal = val;
						});
					});
					if (maxVal === 0) maxVal = 10;

					const yScale = d3
						.scaleLinear()
						.domain([0, maxVal * 1.08])
						.nice()
						.range([activeHeight, 0]);

					// Y-axis with horizontal light gray gridlines, hidden vertical Y axis line
					const yAxis = d3
						.axisLeft(yScale)
						.ticks(6)
						.tickSize(-activeWidth);

					yAxisGroup
						.call(yAxis)
						.call(function (g) {
							g.select(".domain").remove(); // No vertical line for Y axis
							g.selectAll(".tick line")
								.attr("stroke", "#e5e5e5")
								.attr("stroke-dasharray", null);
							g.selectAll(".tick text")
								.style("font-family", activeFont)
								.style("font-size", tickSize)
								.style("fill", "#545454");
						});

					// X-axis with horizontal line, no vertical gridlines
					const xAxis = d3.axisBottom(xScale);

					xAxisGroup
						.call(xAxis)
						.call(function (g) {
							g.select(".domain")
								.attr("stroke", "#ccc")
								.attr("stroke-width", 1);
							g.selectAll(".tick line").remove(); // No vertical gridlines for X axis
							g.selectAll(".tick text")
								.style("font-family", activeFont)
								.style("font-size", tickSize)
								.style("fill", "#545454");
						});

					const lineGenerator = d3
						.line()
						.x(function (d) {
							return xScale(String(d[categoryKey]));
						})
						.y(function (d, i, nodes) {
							const key = d3.select(nodes[i].parentNode).datum();
							return yScale(d[key] || 0);
						})
						.curve(d3.curveLinear);

					const seriesGroups = svg
						.selectAll(".multi-line-group")
						.data(sortedKeys)
						.enter()
						.append("g")
						.attr("class", "multi-line-group")
						.datum(function (key) {
							return key;
						});

					const linePaths = seriesGroups
						.append("path")
						.attr("class", "multi-line-path")
						.attr("d", function (key) {
							return lineGenerator.y(function (d) {
								return yScale(d[key] || 0);
							})(data);
						})
						.attr("fill", "none")
						.attr("stroke", function (key) {
							return seriesColorMap.get(key);
						})
						.attr("stroke-width", 2.5)
						.style("cursor", "pointer")
						.style("transition", "opacity 0.2s ease, stroke-width 0.2s ease");

					// Interactive Line state
					let selectedKey = null;

					function highlightLine(targetKey) {
						linePaths.each(function (key) {
							const path = d3.select(this);
							if (targetKey === null || key === targetKey) {
								path.style("opacity", 1)
									.attr("stroke-width", key === targetKey ? 4 : 2.5);
							} else {
								path.style("opacity", 0.15)
									.attr("stroke-width", 2.5);
							}
						});

						headerLegend.selectAll(`.legend-item-${uid}`).each(function (key) {
							const item = d3.select(this);
							if (targetKey === null || key === targetKey) {
								item.style("opacity", 1);
							} else {
								item.style("opacity", 0.3);
							}
						});
					}

					// Legend hover & click interactions (shows description tooltip)
					headerLegend.selectAll(`.legend-item-${uid}`)
						.on("mouseover", function (event, key) {
							if (selectedKey === null) {
								highlightLine(key);
							}
							const desc = currentDescriptions[key] || null;
							const mainTxt = `<strong>Label:</strong> ${key}`;
							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("visibility", "visible");
						})
						.on("mousemove", function (event) {
							tooltip
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						})
						.on("mouseout", function () {
							if (selectedKey === null) {
								highlightLine(null);
								tooltip.style("visibility", "hidden");
							}
						})
						.on("click", function (event, key) {
							event.stopPropagation();
							if (selectedKey === key) {
								selectedKey = null;
								highlightLine(null);
								tooltip.style("visibility", "hidden");
							} else {
								selectedKey = key;
								highlightLine(key);
								const desc = currentDescriptions[key] || null;
								const mainTxt = `<strong>Label:</strong> ${key}`;
								tooltip
									.html(formatTooltipContent(mainTxt, desc))
									.style("visibility", "visible")
									.style("top", `${event.pageY + 10}px`)
									.style("left", `${event.pageX + 10}px`);
							}
						});

					// Reset selection on document / body click
					d3.select("body").on(`click.multi-line-${uid}`, function (event) {
						const isLegend = event.target.closest && event.target.closest(`#chart-header-legend-${uid}`);
						if (!isLegend) {
							selectedKey = null;
							highlightLine(null);
							tooltip.style("visibility", "hidden");
						}
					});

					// Vertical hover line overlay for X-axis data inspection
					const hoverOverlayGroup = svg
						.append("g")
						.attr("class", "hover-overlay-group");

					const verticalHoverLine = hoverOverlayGroup
						.append("line")
						.attr("y1", 0)
						.attr("y2", activeHeight)
						.attr("stroke", "#888")
						.attr("stroke-width", 1.5)
						.attr("stroke-dasharray", "4 4")
						.style("pointer-events", "none")
						.style("visibility", "hidden");

					const hoverDots = hoverOverlayGroup
						.selectAll(".hover-dot")
						.data(sortedKeys)
						.enter()
						.append("circle")
						.attr("class", "hover-dot")
						.attr("r", 4.5)
						.attr("fill", function (key) {
							return seriesColorMap.get(key);
						})
						.attr("stroke", "#fff")
						.attr("stroke-width", 1.5)
						.style("pointer-events", "none")
						.style("visibility", "hidden");

					const overlayRect = hoverOverlayGroup
						.append("rect")
						.attr("width", activeWidth)
						.attr("height", activeHeight)
						.attr("fill", "transparent")
						.style("cursor", "crosshair");

					overlayRect
						.on("mousemove", function (event) {
							if (selectedKey !== null) return; // Prioritize individual selected line

							const [mouseX] = d3.pointer(event, this);
							// Find closest category x position
							let closestRow = data[0];
							let minDistance = Infinity;

							data.forEach(function (row) {
								const cx = xScale(String(row[categoryKey]));
								const dist = Math.abs(mouseX - cx);
								if (dist < minDistance) {
									minDistance = dist;
									closestRow = row;
								}
							});

							const cx = xScale(String(closestRow[categoryKey]));
							verticalHoverLine
								.attr("x1", cx)
								.attr("x2", cx)
								.style("visibility", "visible");

							hoverDots
								.attr("cx", cx)
								.attr("cy", function (key) {
									return yScale(closestRow[key] || 0);
								})
								.style("visibility", "visible");

							let listItems = sortedKeys.map(function (key) {
								const color = seriesColorMap.get(key);
								const val = closestRow[key] !== undefined ? closestRow[key] : 0;
								return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:3px;">
                                    <span style="display:flex; align-items:center; gap:6px;">
                                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color};"></span>
                                        <span>${key}</span>
                                    </span>
                                    <strong>${val}</strong>
                                </div>`;
							}).join("");

							const mainTxt = `<div style="font-weight:bold; margin-bottom:6px; border-bottom:1px solid #555; padding-bottom:4px;">${closestRow[categoryKey]}</div>${listItems}`;

							tooltip
								.html(formatTooltipContent(mainTxt, null))
								.style("visibility", "visible")
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						})
						.on("mouseout", function () {
							if (selectedKey !== null) return;
							verticalHoverLine.style("visibility", "hidden");
							hoverDots.style("visibility", "hidden");
							tooltip.style("visibility", "hidden");
						});
				}

				// =====================================================
				// STACKED AREA CHART
				// =====================================================

				else if (activeType === "stacked-area") {
					const stack = d3
						.stack()
						.keys(sortedKeys)
						.order(d3.stackOrderNone)
						.offset(d3.stackOffsetNone);

					const seriesData = stack(data);

					const maxStackedVal = d3.max(seriesData, function (layer) {
						return d3.max(layer, function (d) {
							return d[1];
						});
					}) || 10;

					const yScale = d3
						.scaleLinear()
						.domain([0, maxStackedVal * 1.05])
						.nice()
						.range([activeHeight, 0]);

					// Y-axis gridlines
					const yAxis = d3
						.axisLeft(yScale)
						.ticks(6)
						.tickSize(-activeWidth);

					yAxisGroup
						.call(yAxis)
						.call(function (g) {
							g.select(".domain").remove();
							g.selectAll(".tick line")
								.attr("stroke", "#e5e5e5")
								.attr("stroke-dasharray", null);
							g.selectAll(".tick text")
								.style("font-family", activeFont)
								.style("font-size", tickSize)
								.style("fill", "#545454");
						});

					// X-axis line
					const xAxis = d3.axisBottom(xScale);

					xAxisGroup
						.call(xAxis)
						.call(function (g) {
							g.select(".domain")
								.attr("stroke", "#ccc")
								.attr("stroke-width", 1);
							g.selectAll(".tick line").remove();
							g.selectAll(".tick text")
								.style("font-family", activeFont)
								.style("font-size", tickSize)
								.style("fill", "#545454");
						});

					const areaGenerator = d3
						.area()
						.x(function (d) {
							return xScale(String(d.data[categoryKey]));
						})
						.y0(function (d) {
							return yScale(d[0]);
						})
						.y1(function (d) {
							return yScale(d[1]);
						})
						.curve(d3.curveLinear);

					const areaPaths = svg
						.selectAll(".stacked-area-path")
						.data(seriesData)
						.enter()
						.append("path")
						.attr("class", "stacked-area-path")
						.attr("d", areaGenerator)
						.attr("fill", function (layer) {
							return seriesColorMap.get(layer.key);
						})
						.attr("opacity", 0.85)
						.style("cursor", "pointer")
						.style("transition", "opacity 0.2s ease");

					// Interactive Area State
					let selectedAreaKey = null;

					function highlightArea(targetKey) {
						areaPaths.each(function (layer) {
							const path = d3.select(this);
							if (targetKey === null || layer.key === targetKey) {
								path.style("opacity", layer.key === targetKey ? 0.95 : 0.85);
							} else {
								path.style("opacity", 0.25);
							}
						});

						headerLegend.selectAll(`.legend-item-${uid}`).each(function (key) {
							const item = d3.select(this);
							if (targetKey === null || key === targetKey) {
								item.style("opacity", 1);
							} else {
								item.style("opacity", 0.3);
							}
						});
					}

					// Legend hover & click interactions (shows description tooltip)
					headerLegend.selectAll(`.legend-item-${uid}`)
						.on("mouseover", function (event, key) {
							if (selectedAreaKey === null) {
								highlightArea(key);
							}
							const desc = currentDescriptions[key] || null;
							const mainTxt = `<strong>Label:</strong> ${key}`;
							tooltip
								.html(formatTooltipContent(mainTxt, desc))
								.style("visibility", "visible");
						})
						.on("mousemove", function (event) {
							tooltip
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						})
						.on("mouseout", function () {
							if (selectedAreaKey === null) {
								highlightArea(null);
								tooltip.style("visibility", "hidden");
							}
						})
						.on("click", function (event, key) {
							event.stopPropagation();
							if (selectedAreaKey === key) {
								selectedAreaKey = null;
								highlightArea(null);
								tooltip.style("visibility", "hidden");
							} else {
								selectedAreaKey = key;
								highlightArea(key);
								const desc = currentDescriptions[key] || null;
								const mainTxt = `<strong>Label:</strong> ${key}`;
								tooltip
									.html(formatTooltipContent(mainTxt, desc))
									.style("visibility", "visible")
									.style("top", `${event.pageY + 10}px`)
									.style("left", `${event.pageX + 10}px`);
							}
						});

					// Reset selection on document / body click
					d3.select("body").on(`click.stacked-area-${uid}`, function (event) {
						const isLegend = event.target.closest && event.target.closest(`#chart-header-legend-${uid}`);
						if (!isLegend) {
							selectedAreaKey = null;
							highlightArea(null);
							tooltip.style("visibility", "hidden");
						}
					});

					// Vertical hover line overlay for X-axis data inspection
					const hoverOverlayGroup = svg
						.append("g")
						.attr("class", "hover-overlay-group");

					const verticalHoverLine = hoverOverlayGroup
						.append("line")
						.attr("y1", 0)
						.attr("y2", activeHeight)
						.attr("stroke", "#888")
						.attr("stroke-width", 1.5)
						.attr("stroke-dasharray", "4 4")
						.style("pointer-events", "none")
						.style("visibility", "hidden");

					const overlayRect = hoverOverlayGroup
						.append("rect")
						.attr("width", activeWidth)
						.attr("height", activeHeight)
						.attr("fill", "transparent")
						.style("cursor", "crosshair");

					overlayRect
						.on("mousemove", function (event) {
							if (selectedAreaKey !== null) return;

							const [mouseX] = d3.pointer(event, this);
							let closestRow = data[0];
							let minDistance = Infinity;

							data.forEach(function (row) {
								const cx = xScale(String(row[categoryKey]));
								const dist = Math.abs(mouseX - cx);
								if (dist < minDistance) {
									minDistance = dist;
									closestRow = row;
								}
							});

							const cx = xScale(String(closestRow[categoryKey]));
							verticalHoverLine
								.attr("x1", cx)
								.attr("x2", cx)
								.style("visibility", "visible");

							let listItems = sortedKeys.map(function (key) {
								const color = seriesColorMap.get(key);
								const val = closestRow[key] !== undefined ? closestRow[key] : 0;
								return `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:3px;">
                                    <span style="display:flex; align-items:center; gap:6px;">
                                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${color};"></span>
                                        <span>${key}</span>
                                    </span>
                                    <strong>${val}</strong>
                                </div>`;
							}).join("");

							const mainTxt = `<div style="font-weight:bold; margin-bottom:6px; border-bottom:1px solid #555; padding-bottom:4px;">${closestRow[categoryKey]}</div>${listItems}`;

							tooltip
								.html(formatTooltipContent(mainTxt, null))
								.style("visibility", "visible")
								.style("top", `${event.pageY + 10}px`)
								.style("left", `${event.pageX + 10}px`);
						})
						.on("mouseout", function () {
							if (selectedAreaKey !== null) return;
							verticalHoverLine.style("visibility", "hidden");
							tooltip.style("visibility", "hidden");
						});
				}
			}

			// =====================================================
			// HEATMAP CHART
			// =====================================================

			// =====================================================
			// HEATMAP CHART
			// =====================================================

			if (activeType === "heatmap") {
				svgOuter.style("display", "none");

				const heatmapWrapper = contentRow
					.append("div")
					.attr("class", `heatmap-container-${uid}`)
					.style("width", "100%")
					.style("display", "flex")
					.style("flex-direction", "column")
					.style("font-family", activeFont)
					.style("box-sizing", "border-box");

				// Identify Heatmap Columns
				// The CSV header row uses: description (full text), CPC (short code), ...companies..., TOTAL
				// - descriptionColKey: the categoryKey / first col (full description text, shown only in tooltip)
				// - cpcDisplayKey: the column named "CPC" (short code, shown in first table column)
				// - companyColKeys: numeric value columns between CPC and TOTAL
				// - totalColKey: column named TOTAL (last numeric col)
				const descriptionColKey = categoryKey; // "description" column — tooltip only, not shown in table
				const cpcDisplayKey = keys.find(k => k.toUpperCase() === "CPC") || keys[1] || keys[0];
				const totalColKey = keys.find(k => k.toUpperCase() === "TOTAL") || valueKeys[valueKeys.length - 1] || "TOTAL";
				// Company cols: numeric value keys, excluding Total, and excluding the CPC display column itself
				const companyColKeys = valueKeys.filter(k => k !== totalColKey && k.toUpperCase() !== "CPC");

				// Prepare row data according to cpcSortMode ("original", "asc", "desc")
				let heatmapData = data.slice();
				if (cpcSortMode === "asc") {
					heatmapData.sort((a, b) => {
						const valA = String(a[cpcDisplayKey] || "");
						const valB = String(b[cpcDisplayKey] || "");
						return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
					});
				} else if (cpcSortMode === "desc") {
					heatmapData.sort((a, b) => {
						const valA = String(a[cpcDisplayKey] || "");
						const valB = String(b[cpcDisplayKey] || "");
						return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
					});
				}

				// Calculate Color Interpolation scale & min/max for Companies
				let maxCompanyVal = 0;
				heatmapData.forEach(row => {
					companyColKeys.forEach(ck => {
						const val = parseFloat(row[ck]) || 0;
						if (val > maxCompanyVal) maxCompanyVal = val;
					});
				});

				// Blue color scale from light #ebf8ff (0/min) to dark blue #0c4a6e (max)
				const minColor = d3.rgb("#ebf8ff");
				const maxColor = d3.rgb("#0c4a6e");
				const colorInterpolator = d3.interpolateRgb(minColor, maxColor);

				function getCompanyCellColor(val) {
					if (!maxCompanyVal || maxCompanyVal <= 0) return "#ebf8ff";
					const ratio = Math.max(0, Math.min(1, val / maxCompanyVal));
					return colorInterpolator(ratio);
				}

				// Max value for Total Column to scale horizontal bars
				let maxTotalVal = 0;
				heatmapData.forEach(row => {
					const tot = parseFloat(row[totalColKey]) || 0;
					if (tot > maxTotalVal) maxTotalVal = tot;
				});

				// Container for table — if > 10 rows, make scrollable with scrollbar on left
				const tableScrollContainer = heatmapWrapper.append("div")
					.attr("class", `heatmap-table-scroll-${uid}`)
					.style("width", "100%");

				if (heatmapData.length > 10) {
					tableScrollContainer
						.style("max-height", "380px")
						.style("overflow-y", "auto")
						.style("direction", "rtl"); // Moves scrollbar to left side
				}

				// Table element
				const table = tableScrollContainer
					.append("table")
					.style("width", "100%")
					.style("border-collapse", "collapse")
					.style("table-layout", "auto")
					.style("font-size", "13px")
					.style("color", "#333")
					.style("direction", "ltr"); // Resets text content direction to normal LTR inside table

				// Header Row
				const thead = table.append("thead");
				const headerTr = thead.append("tr");

				// Sticky table header when container is scrollable
				if (heatmapData.length > 10) {
					thead.style("position", "sticky")
						.style("top", "0")
						.style("z-index", "2")
						.style("background-color", "#ffffff");
				}

				// Collect display header columns: [CPC code col, ...companyColKeys, Total]
				const headerColumns = [cpcDisplayKey, ...companyColKeys, totalColKey];

				headerColumns.forEach((colName, colIdx) => {
					const th = headerTr.append("th")
						.style("font-weight", "bold")
						.style("padding", "10px 12px")
						.style("text-align", colIdx === 0 ? "left" : (colIdx === headerColumns.length - 1 ? "left" : "center"))
						.style("border-left", "2px solid #063137")
						.style("border-right", "2px solid #063137")
						.style("border-bottom", "2px solid #063137")
						.style("border-top", "none")
						.style("background-color", "#ffffff");

					if (colIdx === 0) {
						// CPC Header with label & sort button
						const thContainer = th.append("div")
							.style("display", "flex")
							.style("align-items", "center")
							.style("gap", "6px");

						thContainer.append("span").text(colName);

						let sortIcon = "↕";
						let sortTooltip = "Sort: Original order (Click to sort A-Z)";
						if (cpcSortMode === "asc") {
							sortIcon = "↑";
							sortTooltip = "Sort: Alphabetical (A-Z) (Click to sort Z-A)";
						} else if (cpcSortMode === "desc") {
							sortIcon = "↓";
							sortTooltip = "Sort: Alphabetical (Z-A) (Click to reset to Original)";
						}

						const sortBtn = thContainer.append("button")
							.attr("type", "button")
							.attr("title", sortTooltip)
							.text(sortIcon)
							.style("cursor", "pointer")
							.style("background", "#f0f0f0")
							.style("border", "1px solid #ccc")
							.style("border-radius", "3px")
							.style("padding", "1px 5px")
							.style("font-size", "11px")
							.style("line-height", "1")
							.style("margin-left", "4px");

						sortBtn.on("click", function (event) {
							event.stopPropagation();
							if (cpcSortMode === "original") {
								cpcSortMode = "asc";
							} else if (cpcSortMode === "asc") {
								cpcSortMode = "desc";
							} else {
								cpcSortMode = "original";
							}
							renderChart(currentData);
						});
					} else {
						th.text(colName);
					}
				});

				// Table Body Rows
				const tbody = table.append("tbody");

				heatmapData.forEach((row, rowIdx) => {
					const tr = tbody.append("tr");
					const isLastRow = (rowIdx === heatmapData.length - 1);
					const rowBorderBottom = isLastRow ? "2px solid #063137" : "none";

					// 1. CPC Cell — shows the short CPC code; description shown only in tooltip
					const cpcCode = row[cpcDisplayKey] !== undefined ? String(row[cpcDisplayKey]) : "";
					const cpcDescText = row[descriptionColKey] !== undefined ? String(row[descriptionColKey]) : "";
					const cpcCell = tr.append("td")
						.text(cpcCode)
						.style("padding", "8px 12px")
						.style("text-align", "left")
						.style("border", "none")
						.style("border-bottom", rowBorderBottom)
						.style("font-weight", "normal")
						.style("white-space", "nowrap")
						.style("cursor", cpcDescText ? "help" : "default");

					// CPC Tooltip Popup hover — show full description text
					cpcCell
						.on("mouseover", function (event) {
							if (cpcDescText) {
								tooltip
									.html(formatTooltipContent(`<strong style="font-size:14px;">${cpcCode}</strong>`, cpcDescText))
									.style("visibility", "visible");
							}
						})
						.on("mousemove", function (event) {
							if (cpcDescText) {
								tooltip
									.style("top", `${event.pageY + 10}px`)
									.style("left", `${event.pageX + 10}px`);
							}
						})
						.on("mouseout", function () {
							tooltip.style("visibility", "hidden");
						});

					// 2. Company Cells
					companyColKeys.forEach(colKey => {
						const cellVal = row[colKey] !== undefined ? parseFloat(row[colKey]) : 0;
						const cpcLabel = cpcCode;
						const bgColor = getCompanyCellColor(cellVal);

						const companyCell = tr.append("td")
							.style("background-color", bgColor)
							.style("padding", "8px 12px")
							.style("text-align", "center")
							.style("border", "none")
							.style("border-bottom", rowBorderBottom);

						// Company Cell Tooltip Popup hover showing value as percentage
						companyCell
							.on("mouseover", function (event) {
								const formattedVal = cellVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%";
								const mainContent = `<div style="font-weight:bold; font-size:13px;">${cpcLabel} — ${colKey}</div>
                                    <div style="margin-top:2px;">Value: <strong>${formattedVal}</strong></div>`;
								tooltip
									.html(formatTooltipContent(mainContent, null))
									.style("visibility", "visible");
							})
							.on("mousemove", function (event) {
								tooltip
									.style("top", `${event.pageY + 10}px`)
									.style("left", `${event.pageX + 10}px`);
							})
							.on("mouseout", function () {
								tooltip.style("visibility", "hidden");
							});
					});

					// 3. Total Cell with Horizontal Bar & Integer text to the right
					const totalVal = row[totalColKey] !== undefined ? parseFloat(row[totalColKey]) : 0;
					const totalCell = tr.append("td")
						.style("padding", "8px 12px")
						.style("text-align", "left")
						.style("border", "none")
						.style("border-bottom", rowBorderBottom)
						.style("vertical-align", "middle");

					const barContainer = totalCell.append("div")
						.style("display", "flex")
						.style("align-items", "center")
						.style("gap", "8px")
						.style("width", "100%");

					// Bar length proportional to totalVal / maxTotalVal
					const barWidthPercent = maxTotalVal > 0 ? Math.max(1.5, Math.min(80, (totalVal / maxTotalVal) * 85)) : 0;

					barContainer.append("div")
						.style("height", "14px")
						.style("width", `${barWidthPercent}%`)
						.style("background-color", "#063137")
						.style("border-radius", "2px")
						.style("flex-shrink", "0");

					barContainer.append("span")
						.text(Math.round(totalVal).toLocaleString())
						.style("font-weight", "normal")
						.style("font-size", "12px")
						.style("color", "#333")
						.style("white-space", "nowrap");
				});

				// Gradient Bar Legend below the table
				const maxPctVal = maxCompanyVal <= 1 && maxCompanyVal > 0 ? maxCompanyVal * 100 : maxCompanyVal;
				const maxPctText = `${Number(maxPctVal.toFixed(2))}%`;
				const minPctText = "0%";

				const legendWrapper = heatmapWrapper.append("div")
					.style("display", "flex")
					.style("flex-direction", "column")
					.style("align-items", "center")
					.style("margin-top", "25px")
					.style("margin-bottom", "15px")
					.style("width", "100%");

				const gradientContainer = legendWrapper.append("div")
					.style("display", "flex")
					.style("flex-direction", "column")
					.style("align-items", "stretch")
					.style("width", "260px");

				// Gradient Bar with left/right vertical lines — using the same blue scale as cells
				const gradientBar = gradientContainer.append("div")
					.style("height", "18px")
					.style("width", "100%")
					.style("background", "linear-gradient(to right, #ebf8ff, #0c4a6e)")
					.style("border-left", "2px solid #0c4a6e")
					.style("border-right", "2px solid #0c4a6e")
					.style("box-sizing", "border-box");

				// Percentage text below gradient bar
				const percentRow = gradientContainer.append("div")
					.style("display", "flex")
					.style("justify-content", "space-between")
					.style("margin-top", "4px")
					.style("font-size", "12px")
					.style("color", "#333")
					.style("font-weight", "normal");

				percentRow.append("span").text(minPctText);
				percentRow.append("span").text(maxPctText);
			} else {
				svgOuter.style("display", "block");
			}

			logoRow
				.selectAll("*")
				.remove();

			if (selectedLogo) {
				const logoWidth =
					Math.max(
						50,
						Math.min(
							100,
							containerWidth *
							0.14
						)
					);

				const logoHeight = logoWidth * 0.35;

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

			if (!isNaN(Number(trimmedValue))) {
				return Number(trimmedValue);
			}

			const cleanedNumeric = trimmedValue.replace(/,/g, "").replace(/%/g, "");
			if (!isNaN(Number(cleanedNumeric)) && cleanedNumeric !== "") {
				return Number(cleanedNumeric);
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

									currentTitle = "";
									currentSubtitle = "";
									currentDescriptions = {};

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

											const rowTag = String(sourceRow[0] || "").trim().toLowerCase();
											if (rowTag === "description") {
												keys.forEach(function (key, columnIndex) {
													if (columnIndex > 0 && sourceRow[columnIndex]) {
														currentDescriptions[key] = String(sourceRow[columnIndex]).trim();
													}
												});
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

											const rowTag = String(sourceRow[0] || "").trim().toLowerCase();
											if (rowTag === "description") {
												keys.forEach(function (key, columnIndex) {
													if (columnIndex > 0 && sourceRow[columnIndex]) {
														currentDescriptions[key] = String(sourceRow[columnIndex]).trim();
													}
												});
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

		window.setTimeout(
			loadBackendCsv,
			500
		);
	}
});