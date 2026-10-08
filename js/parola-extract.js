/**
 * Parola Bulk Dataset Extractor
 *
 * Reads the bulk dataset ("Sample Bulk Dataset - Jenny version.csv" or .xlsx)
 * from wp-content/charts/ and generates one Excel workbook per data row
 * (starting from row 4). Each workbook is named after the entity name
 * and saved/outputted directly into "wp-content/charts/" (overwriting any
 * duplicate file).
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
 * CPC descriptions  -> cpc_descriptions.csv (same dir as this script)
 * TC definitions    -> TC Definitions.csv (same dir as this script)
 * Output Target     -> Server "wp-content/charts/{entityName}.xlsx"
 *
 * Usage:
 *   window.parolaExtractBulkDataset(); // Processes wp-content/charts/Sample Bulk Dataset - Jenny version
 *   window.parolaExtractBulkDataset({ download: true }); // Also triggers browser download
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
        return "/wp-content/themes/parola-child-theme/js/";
    }

    var SCRIPT_DIR = getScriptDir();

    /* ------------------------------------------------------------------
     * 1. Data loading helpers (CSV + Excel)
     * ------------------------------------------------------------------ */

    /** Fetch and parse a CSV into a 2-D array of raw strings (no header mapping). */
    function fetchRawCsv(url) {
        return new Promise(function (resolve, reject) {
            Papa.parse(url, {
                download: true,
                skipEmptyLines: false,
                complete: function (results) {
                    if (results.errors && results.errors.length > 0 && (!results.data || results.data.length === 0)) {
                        reject(new Error("PapaParse error: " + JSON.stringify(results.errors)));
                    } else {
                        resolve(results.data);
                    }
                },
                error: function (err) { reject(err); }
            });
        });
    }

    /** Fetch and parse an Excel .xlsx into a 2-D array of strings. */
    function fetchExcelAsRows(url) {
        return fetch(url)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
                return res.arrayBuffer();
            })
            .then(function (buffer) {
                var wb = new ExcelJS.Workbook();
                return wb.xlsx.load(buffer).then(function () {
                    var ws = wb.worksheets[0];
                    if (!ws) throw new Error("No worksheets found in " + url);
                    var rows = [];
                    var maxCols = ws.columnCount || 50;
                    ws.eachRow({ includeEmpty: true }, function (row) {
                        var rowValues = [];
                        for (var c = 1; c <= maxCols; c++) {
                            var cell = row.getCell(c);
                            var val = cell.value;
                            if (val === null || val === undefined) val = "";
                            else if (typeof val === "object") {
                                if (val.text !== undefined) val = val.text;
                                else if (val.result !== undefined) val = val.result;
                                else val = JSON.stringify(val);
                            }
                            rowValues.push(String(val));
                        }
                        rows.push(rowValues);
                    });
                    return rows;
                });
            });
    }

    /** Load raw dataset (supports both CSV and XLSX). */
    function fetchDataset(url) {
        if (/\.xlsx?$/i.test(url)) {
            return fetchExcelAsRows(url);
        }
        return fetchRawCsv(url).catch(function () {
            return fetchExcelAsRows(url);
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
        var r1 = ws.addRow(["Label", label || ""]);
        var r2 = ws.addRow(["Value", value !== undefined ? String(value) : ""]);
        r1.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        r2.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        r2.getCell(2).font = { bold: true, size: 14 };
        ws.getColumn(1).width = 16;
        ws.getColumn(2).width = 40;
    }

    /**
     * Frequency Table sheet (Chart A)
     * Row 1: Title | Technology Breakdown (CPC)
     * Row 2: Subtitle |
     * Row 3: CPC Section | Description | Frequency
     */
    function addFrequencySheet(wb, sheetName, title, pairs, cpcDescMap) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, title || "Technology Breakdown (CPC)", "");
        var headRow = ws.addRow(["CPC Section", "Description", "Frequency"]);
        headRow.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        pairs.forEach(function (pair) {
            var desc = cpcDescMap[pair.key] || "";
            var freq = parseFloat(pair.value) || pair.value;
            var row = ws.addRow([pair.key, desc, freq]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 16;
        ws.getColumn(2).width = 45;
        ws.getColumn(3).width = 16;
    }

    /**
     * Count-Percentage sheet (Tech Center / Chart B + Chart D)
     * Row 1: Title | Tech Center
     * Row 2: Subtitle |
     * Row 3: TC | TC Description | Count | Percentage
     */
    function addCountPercentageSheet(wb, sheetName, countPairs, pctPairs, tcDescMap) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, "Tech Center Breakdown", "");

        var pctMap = {};
        pctPairs.forEach(function (p) {
            pctMap[p.key] = p.value;
            pctMap[stripTC(p.key)] = p.value;
        });

        var headRow = ws.addRow(["TC", "TC Description", "Count", "Percentage"]);
        headRow.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });

        countPairs.forEach(function (cp) {
            var rawTC = cp.key;
            var numTC = stripTC(rawTC);
            var desc = tcDescMap[numTC] || tcDescMap[rawTC] || "";
            var countVal = parseFloat(cp.value) || cp.value;
            var pctVal = pctMap[rawTC] || pctMap[numTC] || "";
            var row = ws.addRow([rawTC, desc, countVal, pctVal]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });

        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 45;
        ws.getColumn(3).width = 14;
        ws.getColumn(4).width = 16;
    }

    /**
     * Pie/Bar Chart sheet (Chart E / Top Clients)
     * Row 1: Title | Top Clients
     * Row 2: Subtitle |
     * Row 3: Client | Patents
     */
    function addPieBarSheet(wb, sheetName, title, pairs) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, title || "Top Clients", "");
        var headRow = ws.addRow(["Client", "Patents"]);
        headRow.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        pairs.forEach(function (pair) {
            var val = parseFloat(pair.value) || pair.value;
            var row = ws.addRow([pair.key, val]);
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 35;
        ws.getColumn(2).width = 16;
    }

    /**
     * Firm Ranking Table sheet (Industry A...E)
     * Row 1: Entity Name | <firm name>
     * Row 2: Industry | Industry Position | Number of Granted Patents | Efficiency Rate
     */
    function addFirmRankingSheet(wb, sheetName, entityName, industries) {
        var ws = wb.addWorksheet(sheetName);
        var r1 = ws.addRow(["Entity Name", entityName]);
        r1.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        r1.getCell(2).font = TITLE_FONT;

        var headRow = ws.addRow([
            "Industry",
            "Industry Position",
            "Number of Granted Patents",
            "Efficiency Rate"
        ]);
        headRow.eachCell(function (cell) {
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
     * 7. Save to server / Browser download helpers
     * ------------------------------------------------------------------ */

    /** Save Excel workbook directly to server "wp-content/charts/" (overwrites). */
    function saveWorkbookToServer(wb, filename) {
        return wb.xlsx.writeBuffer().then(function (buffer) {
            var config = window.parolaExtractConfig || {};
            var ajaxUrl = config.ajaxUrl || "/wp-admin/admin-ajax.php";
            var nonce = config.nonce || "";

            var binary = "";
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            var base64Data = window.btoa(binary);

            var formData = new FormData();
            formData.append("action", "parola_save_chart_file");
            formData.append("filename", filename + ".xlsx");
            formData.append("filedata", base64Data);
            if (nonce) formData.append("nonce", nonce);

            return fetch(ajaxUrl, {
                method: "POST",
                body: formData
            }).then(function (res) {
                return res.json();
            }).then(function (json) {
                if (json && json.success) {
                    return json.data;
                } else {
                    throw new Error((json && json.data && json.data.message) || "Failed to save file on server.");
                }
            });
        });
    }

    /** Trigger a client-side browser download for the workbook. */
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
     * window.parolaExtractBulkDataset(options)
     *
     * Fetches the source bulk dataset ("Sample Bulk Dataset - Jenny version"),
     * cpc_descriptions.csv, and TC Definitions.csv.
     * Generates one Excel workbook per data row (starting from row 4),
     * named after the entity name in column 0, and writes/overwrites it
     * into "wp-content/charts/".
     *
     * @param {string|object} [options]
     *   If string: path/URL override for the bulk dataset.
     *   If object: {
     *       sourceUrl: string,      // Custom path/URL
     *       download: boolean,       // Trigger browser download in addition to saving (default: false)
     *       saveToServer: boolean   // Save to wp-content/charts/ (default: true)
     *   }
     */
    window.parolaExtractBulkDataset = function (options) {
        var config = window.parolaExtractConfig || {};
        var sourceUrl = "/wp-content/charts/Sample Bulk Dataset - Jenny version.csv";
        var alsoDownload = false;
        var saveToServer = true;

        if (typeof options === "string") {
            sourceUrl = options;
        } else if (options && typeof options === "object") {
            if (options.sourceUrl) sourceUrl = options.sourceUrl;
            if (options.download !== undefined) alsoDownload = !!options.download;
            if (options.saveToServer !== undefined) saveToServer = !!options.saveToServer;
        } else if (config.defaultCsvUrl) {
            sourceUrl = config.defaultCsvUrl;
        }

        var cpcUrl = SCRIPT_DIR + "cpc_descriptions.csv";
        var tcUrl  = SCRIPT_DIR + "TC Definitions.csv";

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

        setStatus("Loading reference data and bulk dataset from " + sourceUrl + "...");

        Promise.all([
            fetchDataset(sourceUrl),
            fetchCsvAsObjects(cpcUrl),
            fetchCsvAsObjects(tcUrl)
        ]).then(function (results) {
            var rawRows = results[0];
            var cpcRows = results[1];
            var tcRows  = results[2];

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

            var industryMarkersSorted = Object.keys(industryCols).sort(function (a, b) {
                return industryCols[a] - industryCols[b];
            });

            /* --- Process data rows (Row 4+) --- */
            var dataRows = rawRows.slice(3);
            var totalRows = dataRows.length;
            var processedCount = 0;

            setStatus("Found " + totalRows + " entity rows. Processing into wp-content/charts/...");

            function processNext(idx) {
                if (idx >= dataRows.length) {
                    setStatus("Extraction complete! Successfully processed " + processedCount + " files to wp-content/charts/.");
                    return;
                }

                var dataRow = dataRows[idx];
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
                    var bIdx   = chartCols["Chart B"];
                    var dIdx   = chartCols["Chart D"];
                    var bPairs = parseKeyValuePairs((dataRow[bIdx] || "").trim());
                    var dPairs = parseKeyValuePairs((dataRow[dIdx] || "").trim());
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

                /* ---- Output workbook to wp-content/charts/ (and optional download) ---- */
                var filename = safeFilename(entityName);
                var savePromise = saveToServer
                    ? saveWorkbookToServer(wb, filename)
                    : Promise.resolve();

                savePromise
                    .then(function (result) {
                        if (alsoDownload) {
                            return downloadWorkbook(wb, filename).then(function () { return result; });
                        }
                        return result;
                    })
                    .then(function (res) {
                        processedCount++;
                        var savedMsg = res && res.path ? res.path : ("wp-content/charts/" + filename + ".xlsx");
                        setStatus("Saved " + processedCount + " / " + totalRows + ": " + savedMsg);
                        setTimeout(function () { processNext(idx + 1); }, 100);
                    })
                    .catch(function (err) {
                        console.warn("[parola-extract] Server save notice for " + entityName + ":", err);
                        // Fallback to browser download if server save failed
                        downloadWorkbook(wb, filename)
                            .then(function () {
                                processedCount++;
                                setStatus("Downloaded (fallback) " + processedCount + " / " + totalRows + ": " + entityName);
                                setTimeout(function () { processNext(idx + 1); }, 200);
                            })
                            .catch(function (downErr) {
                                setStatus("Error on: " + entityName + " - " + (downErr.message || downErr));
                                setTimeout(function () { processNext(idx + 1); }, 200);
                            });
                    });
            }

            processNext(0);

        }).catch(function (err) {
            console.error("[parola-extract] Failed to load source data:", err);
            setStatus("Error loading source dataset: " + (err.message || err));
        });
    };

    console.log("[parola-extract] Loaded. Call window.parolaExtractBulkDataset() to start.");

})();
