/**
 * Parola Bulk Dataset Extractor
 *
 * Reads the "Sample Bulk Dataset - Jenny version.csv" from
 * wp-content/chart/ and generates one Excel workbook per data row
 * (starting from row 4). Each workbook is named after the entity name
 * and contains multiple sheets based on the marker row (row 1).
 *
 * Sheet mapping:
 *   Stat A, Stat B, ... Stat F  -> Data Block Template sheets
 *   Chart A                     -> Frequency Table sheet (CPC Breakdown)
 *   Chart B + Chart D           -> Count-Percentage sheet (Tech Center)
 *   Chart E                     -> Pie/Bar sheet (Top Clients)
 *   Industry A ... Industry E   -> Firm Ranking Table sheet
 *
 * Dependencies (loaded by functions.php via WordPress):
 *   - ExcelJS  4.4.0  (https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js)
 *   - PapaParse 5.x
 *
 * CPC descriptions  -> same directory as this file: cpc_descriptions.csv
 * TC definitions    -> same directory as this file: TC Definitions.csv
 * Output            -> browser download (one .xlsx per entity)
 *
 * Usage: Call window.parolaExtractBulkDataset() from the browser console
 *        or a button click after the page has loaded.
 */

(function () {
    "use strict";

    /* ------------------------------------------------------------------
     * 0. Locate script directory (used for side-car CSV references)
     * ------------------------------------------------------------------ */
    function getScriptDir() {
        var scripts = document.getElementsByTagName("script");
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.indexOf("parola-extract") !== -1) {
                return scripts[i].src.substring(0, scripts[i].src.lastIndexOf("/") + 1);
            }
        }
        return "/wp-content/themes/parola-child-theme/additional-charts/";
    }

    var SCRIPT_DIR = getScriptDir();

    /* ------------------------------------------------------------------
     * 1. CSV helpers
     * ------------------------------------------------------------------ */

    /** Fetch and parse a CSV into a 2-D array of raw strings (no header mapping). */
    function fetchRawCsv(url) {
        return new Promise(function (resolve, reject) {
            Papa.parse(url, {
                download: true,
                skipEmptyLines: false,
                complete: function (results) { resolve(results.data); },
                error: function (err) { reject(err); }
            });
        });
    }

    /** Fetch and parse a CSV into [{header: value, ...}, ...] objects. */
    function fetchCsvAsObjects(url) {
        return new Promise(function (resolve, reject) {
            Papa.parse(url, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function (results) { resolve(results.data); },
                error: function (err) { reject(err); }
            });
        });
    }

    /* ------------------------------------------------------------------
     * 2. Parse the "key (value); key (value)" format used by CPC/TC cols
     * ------------------------------------------------------------------ */
    function parseKeyValuePairs(cellStr) {
        if (!cellStr || !cellStr.trim()) return [];
        var results = [];
        var re = /([^;(]+?)\s*\(([^)]+)\)/g;
        var match;
        while ((match = re.exec(cellStr)) !== null) {
            results.push({ key: match[1].trim(), value: match[2].trim() });
        }
        return results;
    }

    /** Strip "TC" prefix from a key like "TC1600" -> "1600". */
    function stripTC(key) {
        return key.replace(/^TC/i, "").trim();
    }

    /* ------------------------------------------------------------------
     * 3. Build a safe filename from an entity name
     * ------------------------------------------------------------------ */
    function safeFilename(name) {
        return String(name)
            .replace(/[\/\\?%*:|"<>]/g, "-")
            .replace(/\s+/g, " ")
            .trim();
    }

    /* ------------------------------------------------------------------
     * 4. Worksheet name sanitizer (Excel: max 31 chars, no special chars)
     * ------------------------------------------------------------------ */
    function sanitizeSheetName(name) {
        return String(name)
            .replace(/[\/\\?*\[\]:]/g, "")
            .substring(0, 31)
            .trim();
    }

    /* ------------------------------------------------------------------
     * 5. ExcelJS style constants
     * ------------------------------------------------------------------ */
    var HEADER_FILL = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" }
    };
    var HEADER_BORDER = {
        bottom: { style: "medium", color: { argb: "FFE2E8F0" } }
    };
    var CELL_BORDER_BOTTOM = {
        bottom: { style: "thin", color: { argb: "FFE5E5E5" } }
    };
    var HEADER_FONT = { bold: true, color: { argb: "FF475569" }, size: 11 };
    var TITLE_FONT = { bold: true, size: 13 };

    /** Add Title and Subtitle rows to a worksheet. */
    function addTitleRows(ws, title, subtitle) {
        var titleRow = ws.addRow(["Title", title || ""]);
        titleRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        titleRow.getCell(2).font = TITLE_FONT;
        var subRow = ws.addRow(["Subtitle", subtitle || ""]);
        subRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
    }

    /* ------------------------------------------------------------------
     * 6. Sheet builders
     * ------------------------------------------------------------------ */

    /**
     * Data Block sheet (Stat A/B/C/...)
     * Row 1: Label | <column header from row 3>
     * Row 2: Value | <cell value>
     */
    function addDataBlockSheet(wb, sheetName, label, value) {
        var ws = wb.addWorksheet(sheetName);
        var labelRow = ws.addRow(["Label", label]);
        labelRow.getCell(1).font = HEADER_FONT;
        var valueRow = ws.addRow(["Value", value]);
        valueRow.getCell(2).font = { bold: true, size: 14 };
        ws.getColumn(1).width = 12;
        ws.getColumn(2).width = 40;
    }

    /**
     * Frequency Table sheet (Chart A - CPC Breakdown)
     * Row 1: Title | <header from row 3>
     * Row 2: Subtitle | (blank)
     * Row 3: CPC | Count | description  <- column headers
     * Row 4+: data rows
     */
    function addFrequencySheet(wb, sheetName, title, pairs, cpcDescMap) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, title, "");
        var hdr = ws.addRow(["CPC", "Count", "description"]);
        hdr.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        pairs.forEach(function (pair) {
            var desc = cpcDescMap[pair.key] || "";
            var numVal = Number(pair.value);
            var row = ws.addRow([pair.key, isNaN(numVal) ? pair.value : numVal, desc]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 12;
        ws.getColumn(3).width = 60;
    }

    /**
     * Count-Percentage sheet (Chart B + Chart D - Tech Center)
     * Row 1: Title | "Tech Center"
     * Row 2: Subtitle | (blank)
     * Row 3: Technology Center | description | Patents | Efficiency Rate  <- headers
     * Row 4+: data
     */
    function addCountPercentageSheet(wb, sheetName, chartBPairs, chartDPairs, tcDescMap) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, "Tech Center", "");
        var hdr = ws.addRow(["Technology Center", "description", "Patents", "Efficiency Rate"]);
        hdr.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        // Build efficiency lookup from Chart D
        var effMap = {};
        chartDPairs.forEach(function (p) { effMap[stripTC(p.key)] = p.value; });

        chartBPairs.forEach(function (pair) {
            var tc = stripTC(pair.key);
            var desc = tcDescMap[tc] || "";
            var eff = effMap[tc] !== undefined ? effMap[tc] : "";
            var numVal = Number(pair.value);
            var row = ws.addRow([tc, desc, isNaN(numVal) ? pair.value : numVal, eff]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 22;
        ws.getColumn(2).width = 60;
        ws.getColumn(3).width = 14;
        ws.getColumn(4).width = 18;
    }

    /**
     * Pie/Bar sheet (Chart E - Top Clients)
     * Row 1: Title | <header from row 3>
     * Row 2: Subtitle | (blank)
     * Row 3: Client | Count | description  <- headers
     * Row 4+: data (description left blank)
     */
    function addPieBarSheet(wb, sheetName, title, pairs) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, title, "");
        var hdr = ws.addRow(["Client", "Count", "description"]);
        hdr.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        pairs.forEach(function (pair) {
            var numVal = Number(pair.value);
            var row = ws.addRow([pair.key, isNaN(numVal) ? pair.value : numVal, ""]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 50;
        ws.getColumn(2).width = 12;
        ws.getColumn(3).width = 30;
    }

    /**
     * Firm Ranking sheet (Industry A...E columns combined)
     * Row 1: Entity name
     * Row 2: (spacer)
     * Row 3: Industry | Position among Firms | Granted Patents | Efficiency Rate  <- headers
     * Row 4+: one row per industry
     */
    function addFirmRankingSheet(wb, sheetName, entityName, industries) {
        var ws = wb.addWorksheet(sheetName);
        var nameRow = ws.addRow([entityName]);
        nameRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF1E293B" } };
        ws.addRow([]); // spacer
        var hdr = ws.addRow(["Industry", "Position among Firms", "Granted Patents", "Efficiency Rate"]);
        hdr.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        industries.forEach(function (ind) {
            var row = ws.addRow([ind.industry, ind.position, ind.patents, ind.efficiencyRate]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 28;
        ws.getColumn(2).width = 26;
        ws.getColumn(3).width = 18;
        ws.getColumn(4).width = 18;
    }

    /* ------------------------------------------------------------------
     * 7. Browser download helper
     * ------------------------------------------------------------------ */
    function downloadWorkbook(wb, filename) {
        return wb.xlsx.writeBuffer().then(function (buffer) {
            var blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = filename + ".xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    /* ------------------------------------------------------------------
     * 8. Main extraction entry point
     * ------------------------------------------------------------------ */
    /**
     * window.parolaExtractBulkDataset([bulkCsvUrl])
     *
     * Fetches the bulk dataset, cpc_descriptions.csv, and TC Definitions.csv,
     * then for each data row (row 4+) generates and downloads one Excel file.
     * Files are named after the entity name in column 0.
     *
     * @param {string} [bulkCsvUrl] - Override path for the bulk CSV.
     *                                Defaults to /wp-content/chart/Sample Bulk Dataset - Jenny version.csv
     */
    window.parolaExtractBulkDataset = function (bulkCsvUrl) {
        var csvUrl = bulkCsvUrl || "/wp-content/chart/Sample Bulk Dataset - Jenny version.csv";
        var cpcUrl = SCRIPT_DIR + "cpc_descriptions.csv";
        var tcUrl = SCRIPT_DIR + "TC Definitions.csv";

        // Optional status element for showing progress on the page
        var statusEl = document.getElementById("parola-extract-status");
        function setStatus(msg) {
            console.log("[parola-extract] " + msg);
            if (statusEl) statusEl.textContent = msg;
        }

        if (typeof ExcelJS === "undefined") {
            setStatus("ERROR: ExcelJS library not loaded. Check that the CDN script is enqueued.");
            return;
        }
        if (typeof Papa === "undefined") {
            setStatus("ERROR: PapaParse library not loaded.");
            return;
        }

        setStatus("Loading reference data...");

        Promise.all([
            fetchRawCsv(csvUrl),
            fetchCsvAsObjects(cpcUrl),
            fetchCsvAsObjects(tcUrl)
        ]).then(function (results) {
            var rawRows  = results[0];
            var cpcRows  = results[1];
            var tcRows   = results[2];

            /* --- Build lookup maps --- */
            var cpcDescMap = {};
            cpcRows.forEach(function (row) {
                var sym   = (row["symbol"] || row["Symbol"] || "").trim();
                var title = (row["title"]  || row["Title"]  || row["description"] || "").trim();
                if (sym) cpcDescMap[sym] = title;
            });

            var tcDescMap = {};
            tcRows.forEach(function (row) {
                var tc   = String(row["TC"] || row["tc"] || "").trim();
                var desc = (row["Description"] || row["description"] || "").trim();
                if (tc) tcDescMap[tc] = desc;
            });

            /* --- Validate dataset --- */
            if (!rawRows || rawRows.length < 4) {
                setStatus("Error: Bulk dataset has fewer than 4 rows.");
                return;
            }

            var markerRow   = rawRows[0]; // Row 1: Stat A / Chart A / Industry A ...
            var industryRow = rawRows[1]; // Row 2: Medical Devices / Software and AI ...
            var headerRow   = rawRows[2]; // Row 3: column titles

            /* --- Map markers to column indices --- */
            var statCols     = {}; // { "Stat A": colIdx, ... }
            var chartCols    = {}; // { "Chart A": colIdx, ... }
            var industryCols = {}; // { "Industry A": colIdx, ... }

            markerRow.forEach(function (cell, idx) {
                var marker = (cell || "").trim();
                if (!marker) return;
                if (/^Stat\s+[A-Z]$/i.test(marker))     { statCols[marker]     = idx; }
                else if (/^Chart\s+[A-Z]$/i.test(marker)) { chartCols[marker]    = idx; }
                else if (/^Industry\s+[A-Z]$/i.test(marker)) { industryCols[marker] = idx; }
            });

            // Sort industry markers by column order
            var industryMarkersSorted = Object.keys(industryCols).sort(function (a, b) {
                return industryCols[a] - industryCols[b];
            });

            /* --- Process each data row (index 3 onward) --- */
            var dataRows = rawRows.slice(3);
            var totalRows = 0;
            dataRows.forEach(function (r) {
                if (r && r.length > 0 && (r[0] || "").trim()) totalRows++;
            });

            setStatus("Processing " + totalRows + " entities...");
            var processedCount = 0;

            function processNext(idx) {
                if (idx >= dataRows.length) {
                    setStatus("Done! " + processedCount + " Excel files downloaded.");
                    return;
                }

                var dataRow    = dataRows[idx];
                var entityName = (dataRow[0] || "").trim();

                if (!entityName) {
                    processNext(idx + 1);
                    return;
                }

                var wb = new ExcelJS.Workbook();
                wb.creator = "Parola Extract";
                wb.created = new Date();

                /* ---- Stat A/B/C/D/E/F --> Data Block sheets ---- */
                var statMarkersSorted = Object.keys(statCols).sort(function (a, b) {
                    var lA = a.replace(/^Stat\s+/i, "");
                    var lB = b.replace(/^Stat\s+/i, "");
                    return lA.localeCompare(lB);
                });
                statMarkersSorted.forEach(function (marker) {
                    var colIdx = statCols[marker];
                    var label  = (headerRow[colIdx] || "").trim().replace(/\n/g, " ");
                    var value  = dataRow[colIdx] !== undefined ? String(dataRow[colIdx]).trim() : "";
                    if (!label && !value) return;
                    addDataBlockSheet(wb, sanitizeSheetName(marker), label, value);
                });

                /* ---- Chart A --> Frequency Table (CPC) ---- */
                if (chartCols["Chart A"] !== undefined) {
                    var aIdx   = chartCols["Chart A"];
                    var aTitle = (headerRow[aIdx] || "Technology Breakdown (CPC)").trim();
                    var aPairs = parseKeyValuePairs((dataRow[aIdx] || "").trim());
                    if (aPairs.length > 0) {
                        addFrequencySheet(wb, "Chart A", aTitle, aPairs, cpcDescMap);
                    }
                }

                /* ---- Chart B + Chart D --> Count-Percentage (Tech Center) ---- */
                if (chartCols["Chart B"] !== undefined && chartCols["Chart D"] !== undefined) {
                    var bIdx    = chartCols["Chart B"];
                    var dIdx    = chartCols["Chart D"];
                    var bPairs  = parseKeyValuePairs((dataRow[bIdx] || "").trim());
                    var dPairs  = parseKeyValuePairs((dataRow[dIdx] || "").trim());
                    if (bPairs.length > 0) {
                        addCountPercentageSheet(wb, "Tech Center", bPairs, dPairs, tcDescMap);
                    }
                }

                /* ---- Chart E --> Pie/Bar (Top Clients) ---- */
                if (chartCols["Chart E"] !== undefined) {
                    var eIdx   = chartCols["Chart E"];
                    var eTitle = (headerRow[eIdx] || "Top Clients").trim();
                    var ePairs = parseKeyValuePairs((dataRow[eIdx] || "").trim());
                    if (ePairs.length > 0) {
                        addPieBarSheet(wb, "Chart E", eTitle, ePairs);
                    }
                }

                /* ---- Industry A...E --> Firm Ranking sheet ---- */
                if (industryMarkersSorted.length > 0) {
                    var industries = industryMarkersSorted.map(function (marker) {
                        var startCol     = industryCols[marker];
                        var industryName = (industryRow[startCol] || marker).trim();
                        var rankVal = "", posVal = "", patVal = "", effVal = "";

                        for (var sub = 0; sub < 4; sub++) {
                            var c   = startCol + sub;
                            var hdr = (headerRow[c] || "").trim().toLowerCase();
                            var val = dataRow[c] !== undefined ? String(dataRow[c]).trim() : "";
                            if (hdr.indexOf("efficiency rate") !== -1 || hdr.indexOf("grant rate") !== -1) {
                                effVal = val;
                            } else if (hdr.indexOf("position") !== -1) {
                                posVal = val;
                            } else if (hdr.indexOf("granted patents") !== -1 || hdr.indexOf("patents") !== -1) {
                                patVal = val;
                            } else if (hdr.indexOf("volume rank") !== -1 || hdr.indexOf("rank") !== -1) {
                                rankVal = val;
                            }
                        }
                        return {
                            industry: industryName,
                            rank: rankVal,
                            position: posVal,
                            patents: patVal,
                            efficiencyRate: effVal
                        };
                    });
                    addFirmRankingSheet(wb, "Industry Ranking", entityName, industries);
                }

                /* ---- Download workbook ---- */
                downloadWorkbook(wb, safeFilename(entityName))
                    .then(function () {
                        processedCount++;
                        setStatus("Downloaded " + processedCount + " / " + totalRows + ": " + entityName);
                        setTimeout(function () { processNext(idx + 1); }, 300);
                    })
                    .catch(function (err) {
                        console.error("[parola-extract] Error for " + entityName, err);
                        setStatus("Error on: " + entityName + " - " + (err.message || err));
                        setTimeout(function () { processNext(idx + 1); }, 300);
                    });
            }

            processNext(0);

        }).catch(function (err) {
            console.error("[parola-extract] Failed to load source data:", err);
            setStatus("Error loading data: " + (err.message || err));
        });
    };

    console.log("[parola-extract] Loaded. Call window.parolaExtractBulkDataset() to start.");

})();
