/**
 * Parola Bulk Dataset Extractor & Interactive Dashboard
 * Version 1.1.0
 *
 * Provides both programmatic API (window.parolaExtractBulkDataset) and an
 * interactive visual dashboard for any element matching ".d3-extract".
 *
 * Dashboard Features:
 *   1. Lists all CSV and Excel files available in "wp-content/chart/".
 *   2. Selects a source dataset and parses all available entity rows (row 4+).
 *   3. Interactive entity multi-selector with instant search, Select All / Deselect All.
 *   4. Overwrite prompt & safety check for existing files in "wp-content/chart/".
 *   5. Real-time animated progress bar & extraction activity log.
 *   6. Generates multi-sheet Excel workbooks and saves directly to "wp-content/chart/".
 *
 * Dependencies (loaded by functions.php via WordPress):
 *   - ExcelJS  4.4.0  (https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js)
 *   - PapaParse 5.x   (https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js)
 */

(function () {
    "use strict";

    /* ------------------------------------------------------------------
     * 0. Configuration & Path Resolution
     * ------------------------------------------------------------------ */
    function getScriptDir() {
        if (document.currentScript && document.currentScript.src) {
            return document.currentScript.src.substring(0, document.currentScript.src.lastIndexOf("/") + 1);
        }
        var scripts = document.getElementsByTagName("script");
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.indexOf("parola-extract") !== -1) {
                return scripts[i].src.substring(0, scripts[i].src.lastIndexOf("/") + 1);
            }
        }
        return "/wp-content/themes/bricks-child/js/";
    }

    var SCRIPT_DIR = getScriptDir();

    function getConfig() {
        var wpConfig = window.parolaExtractConfig || {};
        return {
            ajaxUrl: wpConfig.ajaxUrl || "/wp-admin/admin-ajax.php",
            chartDirUrl: wpConfig.chartDirUrl || "/wp-content/chart/",
            defaultCsvUrl: wpConfig.defaultCsvUrl || "/wp-content/chart/Sample Bulk Dataset - Jenny version.csv",
            defaultXlsxUrl: wpConfig.defaultXlsxUrl || "/wp-content/chart/Sample Bulk Dataset - Jenny version.xlsx",
            nonce: wpConfig.nonce || "",
            cpcUrl: SCRIPT_DIR + "cpc_descriptions.csv",
            tcUrl: SCRIPT_DIR + "TC%20Definitions.csv"
        };
    }

    /* ------------------------------------------------------------------
     * 1. Data loading helpers (CSV + Excel)
     * ------------------------------------------------------------------ */

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

    function fetchDataset(url) {
        if (/\.xlsx?$/i.test(url)) {
            return fetchExcelAsRows(url);
        }
        return fetchRawCsv(url).catch(function () {
            return fetchExcelAsRows(url);
        });
    }

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

    function stripTC(key) {
        return key.replace(/^TC/i, "").trim();
    }

    function safeFilename(name) {
        return String(name)
            .replace(/[\/\\?%*:|"<>]/g, "-")
            .replace(/\s+/g, " ")
            .trim();
    }

    function sanitizeSheetName(name) {
        return String(name)
            .replace(/[\/\\?*\[\]:]/g, "")
            .substring(0, 31)
            .trim();
    }

    /* ------------------------------------------------------------------
     * 2. ExcelJS style constants & Sheet Builders
     * ------------------------------------------------------------------ */
    var HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    var HEADER_BORDER = { bottom: { style: "medium", color: { argb: "FFE2E8F0" } } };
    var CELL_BORDER_BOTTOM = { bottom: { style: "thin", color: { argb: "FFE5E5E5" } } };
    var HEADER_FONT = { bold: true, color: { argb: "FF475569" }, size: 11 };
    var TITLE_FONT = { bold: true, size: 13 };

    function addTitleRows(ws, title, subtitle) {
        var titleRow = ws.addRow(["Title", title || ""]);
        titleRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        titleRow.getCell(2).font = TITLE_FONT;
        var subRow = ws.addRow(["Subtitle", subtitle || ""]);
        subRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
    }

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
     * 3. Server Storage & Download Helpers
     * ------------------------------------------------------------------ */

    function saveWorkbookToServer(wb, filename) {
        return wb.xlsx.writeBuffer().then(function (buffer) {
            var cfg = getConfig();
            var binary = "";
            var bytes = new Uint8Array(buffer);
            for (var i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            var base64Data = window.btoa(binary);

            var formData = new FormData();
            formData.append("action", "parola_save_chart_file");
            formData.append("filename", filename + ".xlsx");
            formData.append("filedata", base64Data);
            if (cfg.nonce) formData.append("nonce", cfg.nonce);

            return fetch(cfg.ajaxUrl, {
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
     * 4. AJAX helper: List Chart Files from Server
     * ------------------------------------------------------------------ */
    function listServerChartFiles() {
        var cfg = getConfig();
        var formData = new FormData();
        formData.append("action", "parola_list_chart_files");
        if (cfg.nonce) formData.append("nonce", cfg.nonce);

        return fetch(cfg.ajaxUrl, {
            method: "POST",
            body: formData
        }).then(function (res) {
            return res.json();
        }).then(function (json) {
            if (json && json.success && json.data && Array.isArray(json.data.files)) {
                return json.data.files;
            }
            return [];
        }).catch(function (err) {
            console.warn("[parola-extract] listServerChartFiles failed:", err);
            return [];
        });
    }

    /* ------------------------------------------------------------------
     * 5. AJAX helper: Check Existing Files on Server
     * ------------------------------------------------------------------ */
    function checkExistingFilesOnServer(filenames) {
        var cfg = getConfig();
        var formData = new FormData();
        formData.append("action", "parola_check_existing_files");
        filenames.forEach(function (fn) {
            formData.append("filenames[]", fn);
        });
        if (cfg.nonce) formData.append("nonce", cfg.nonce);

        return fetch(cfg.ajaxUrl, {
            method: "POST",
            body: formData
        }).then(function (res) {
            return res.json();
        }).then(function (json) {
            if (json && json.success && json.data && Array.isArray(json.data.existing)) {
                return json.data.existing;
            }
            return [];
        }).catch(function (err) {
            console.warn("[parola-extract] checkExistingFilesOnServer failed:", err);
            return [];
        });
    }

    /* ------------------------------------------------------------------
     * 6. Core Extraction Engine (Build Workbook for a Single Entity)
     * ------------------------------------------------------------------ */
    function buildEntityWorkbook(entityRow, markerRow, industryRow, headerRow, statCols, chartCols, industryCols, cpcDescMap, tcDescMap) {
        var entityName = (entityRow[0] || "").trim();
        if (!entityName) return null;

        var wb = new ExcelJS.Workbook();
        wb.creator = "Parola Extract";
        wb.created = new Date();

        // 1. Stat A-F -> Data Block sheets
        var statMarkersSorted = Object.keys(statCols).sort(function (a, b) {
            var lA = a.replace(/^Stat\s+/i, "");
            var lB = b.replace(/^Stat\s+/i, "");
            return lA.localeCompare(lB);
        });
        statMarkersSorted.forEach(function (marker) {
            var colIdx = statCols[marker];
            var label = (headerRow[colIdx] || "").trim().replace(/\n/g, " ");
            var value = entityRow[colIdx] !== undefined ? String(entityRow[colIdx]).trim() : "";
            if (!label && !value) return;
            addDataBlockSheet(wb, sanitizeSheetName(marker), label, value);
        });

        // 2. Chart A -> Frequency Table
        if (chartCols["Chart A"] !== undefined) {
            var aIdx = chartCols["Chart A"];
            var aTitle = (headerRow[aIdx] || "Technology Breakdown (CPC)").trim();
            var aPairs = parseKeyValuePairs((entityRow[aIdx] || "").trim());
            if (aPairs.length > 0) {
                addFrequencySheet(wb, "Chart A", aTitle, aPairs, cpcDescMap);
            }
        }

        // 3. Chart B + Chart D -> Count-Percentage (Tech Center)
        if (chartCols["Chart B"] !== undefined && chartCols["Chart D"] !== undefined) {
            var bIdx = chartCols["Chart B"];
            var dIdx = chartCols["Chart D"];
            var bPairs = parseKeyValuePairs((entityRow[bIdx] || "").trim());
            var dPairs = parseKeyValuePairs((entityRow[dIdx] || "").trim());
            if (bPairs.length > 0) {
                addCountPercentageSheet(wb, "Tech Center", bPairs, dPairs, tcDescMap);
            }
        }

        // 4. Chart E -> Pie/Bar (Top Clients)
        if (chartCols["Chart E"] !== undefined) {
            var eIdx = chartCols["Chart E"];
            var eTitle = (headerRow[eIdx] || "Top Clients").trim();
            var ePairs = parseKeyValuePairs((entityRow[eIdx] || "").trim());
            if (ePairs.length > 0) {
                addPieBarSheet(wb, "Chart E", eTitle, ePairs);
            }
        }

        // 5. Industry A-E -> Firm Ranking
        var industryMarkersSorted = Object.keys(industryCols).sort(function (a, b) {
            return industryCols[a] - industryCols[b];
        });
        if (industryMarkersSorted.length > 0) {
            var industries = industryMarkersSorted.map(function (marker) {
                var startCol = industryCols[marker];
                var industryName = (industryRow[startCol] || marker).trim();
                var rankVal = "", posVal = "", patVal = "", effVal = "";

                for (var sub = 0; sub < 4; sub++) {
                    var c = startCol + sub;
                    var hdr = (headerRow[c] || "").trim().toLowerCase();
                    var val = entityRow[c] !== undefined ? String(entityRow[c]).trim() : "";
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

        return {
            entityName: entityName,
            filename: safeFilename(entityName),
            workbook: wb
        };
    }

    /* ------------------------------------------------------------------
     * 7. Interactive Dashboard UI Renderer for ".d3-extract" Elements
     * ------------------------------------------------------------------ */
    function renderExtractDashboard(container) {
        var cfg = getConfig();
        var cpcDescMap = null;
        var tcDescMap = null;
        var currentRawRows = null;
        var availableEntities = []; // [{ name: string, index: number, row: Array }]
        var selectedEntityIndices = new Set();
        var isExtracting = false;

        // Build container DOM
        container.innerHTML = "";
        container.style.fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        container.style.color = "#1e293b";
        container.style.backgroundColor = "#ffffff";
        container.style.borderRadius = "12px";
        container.style.border = "1px solid #e2e8f0";
        container.style.boxShadow = "0 4px 20px -2px rgba(0, 0, 0, 0.05)";
        container.style.padding = "24px";
        container.style.margin = "16px 0";
        container.style.boxSizing = "border-box";

        // HTML Layout
        container.innerHTML = [
            '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:20px;">',
            '  <div>',
            '    <div style="font-size:18px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">',
            '      <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:rgb(28, 167, 166);"></span>',
            '      Parola Bulk Dataset Extractor',
            '    </div>',
            '    <div style="font-size:13px;color:#64748b;margin-top:2px;">Extract multi-sheet Excel workbooks for individual entities into <code>/wp-content/chart/</code></div>',
            '  </div>',
            '  <div id="parola-badge-status" style="font-size:12px;font-weight:600;padding:4px 10px;border-radius:9999px;background:#f1f5f9;color:#475569;">Ready</div>',
            '</div>',

            // Step 1: Source Dataset
            '<div style="margin-bottom:20px;">',
            '  <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;">1. Select Source Bulk Dataset (from <code>wp-content/chart/</code>)</label>',
            '  <div style="display:flex;gap:10px;align-items:center;">',
            '    <select id="parola-dataset-select" style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;background:#fff;color:#0f172a;outline:none;cursor:pointer;">',
            '      <option value="">Loading files from /wp-content/chart/ ...</option>',
            '    </select>',
            '    <button id="parola-btn-refresh-files" title="Refresh available files in wp-content/chart/" style="padding:9px 14px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;display:flex;align-items:center;gap:4px;">',
            '      🔄 Refresh',
            '    </button>',
            '  </div>',
            '  <div id="parola-dataset-info" style="font-size:12px;color:#64748b;margin-top:5px;display:none;"></div>',
            '</div>',

            // Step 2: Entity Selection (Initially hidden until dataset loaded)
            '<div id="parola-entity-section" style="margin-bottom:20px;display:none;">',
            '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">',
            '    <label style="font-size:13px;font-weight:600;color:#334155;">2. Select Entities to Extract (<span id="parola-selected-count">0</span> of <span id="parola-total-entities-count">0</span> selected)</label>',
            '    <div style="display:flex;gap:8px;">',
            '      <button id="parola-btn-select-all" style="background:none;border:none;color:#0ea5e9;font-size:12px;font-weight:600;cursor:pointer;padding:0;">Select All</button>',
            '      <span style="color:#cbd5e1;">•</span>',
            '      <button id="parola-btn-deselect-all" style="background:none;border:none;color:#64748b;font-size:12px;font-weight:600;cursor:pointer;padding:0;">Deselect All</button>',
            '    </div>',
            '  </div>',
            '  <div style="position:relative;margin-bottom:8px;">',
            '    <input id="parola-entity-search" type="text" placeholder="🔍 Search entities..." style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;" />',
            '  </div>',
            '  <div id="parola-entity-list-container" style="max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#f8fafc;">',
            '    <!-- Entity Checkboxes inserted dynamically -->',
            '  </div>',
            '</div>',

            // Step 3: Options & Action Button
            '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid #e2e8f0;">',
            '  <div style="display:flex;flex-direction:column;gap:6px;">',
            '    <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#334155;cursor:pointer;">',
            '      <input id="parola-chk-overwrite" type="checkbox" checked style="accent-color:rgb(28, 167, 166);cursor:pointer;" />',
            '      Overwrite existing files in <code>wp-content/chart/</code>',
            '    </label>',
            '    <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#334155;cursor:pointer;">',
            '      <input id="parola-chk-download" type="checkbox" style="accent-color:rgb(28, 167, 166);cursor:pointer;" />',
            '      Also download copy to browser',
            '    </label>',
            '  </div>',
            '  <button id="parola-btn-extract-action" disabled style="padding:11px 24px;background:#94a3b8;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:not-allowed;transition:all 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.08);">',
            '    ⚡ Extract Selected Entities',
            '  </button>',
            '</div>',

            // Progress & Activity Log Area
            '<div id="parola-progress-container" style="margin-top:20px;display:none;">',
            '  <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px;">',
            '    <span id="parola-progress-label">Processing...</span>',
            '    <span id="parola-progress-pct">0%</span>',
            '  </div>',
            '  <div style="width:100%;height:8px;background:#e2e8f0;border-radius:9999px;overflow:hidden;margin-bottom:12px;">',
            '    <div id="parola-progress-bar" style="width:0%;height:100%;background:rgb(28, 167, 166);border-radius:9999px;transition:width 0.2s ease;"></div>',
            '  </div>',
            '  <div id="parola-log-box" style="font-family:monospace;font-size:12px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;max-height:160px;overflow-y:auto;line-height:1.5;">',
            '    <div>[Ready] Awaiting extraction start.</div>',
            '  </div>',
            '</div>',

            // Overwrite Modal Popup Container
            '<div id="parola-overwrite-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);z-index:99999;align-items:center;justify-content:center;">',
            '  <div style="background:#fff;border-radius:12px;padding:24px;max-width:480px;width:90%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);">',
            '    <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px;">⚠️ Confirm Overwrite</div>',
            '    <div id="parola-overwrite-msg" style="font-size:13px;color:#475569;margin-bottom:12px;line-height:1.4;">Existing files were found in <code>wp-content/chart/</code>. Would you like to overwrite them?</div>',
            '    <div id="parola-overwrite-list" style="font-family:monospace;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:6px;max-height:100px;overflow-y:auto;margin-bottom:16px;color:#334155;"></div>',
            '    <div style="display:flex;justify-content:flex-end;gap:10px;">',
            '      <button id="parola-btn-cancel-overwrite" style="padding:8px 16px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;">Cancel</button>',
            '      <button id="parola-btn-confirm-overwrite" style="padding:8px 16px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Yes, Overwrite & Continue</button>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join("\n");

        // DOM Element references
        var selectEl = container.querySelector("#parola-dataset-select");
        var btnRefresh = container.querySelector("#parola-btn-refresh-files");
        var datasetInfoEl = container.querySelector("#parola-dataset-info");
        var entitySectionEl = container.querySelector("#parola-entity-section");
        var entityListContainer = container.querySelector("#parola-entity-list-container");
        var searchInput = container.querySelector("#parola-entity-search");
        var btnSelectAll = container.querySelector("#parola-btn-select-all");
        var btnDeselectAll = container.querySelector("#parola-btn-deselect-all");
        var selectedCountEl = container.querySelector("#parola-selected-count");
        var totalEntitiesCountEl = container.querySelector("#parola-total-entities-count");
        var chkOverwrite = container.querySelector("#parola-chk-overwrite");
        var chkDownload = container.querySelector("#parola-chk-download");
        var btnExtract = container.querySelector("#parola-btn-extract-action");
        var progressContainer = container.querySelector("#parola-progress-container");
        var progressLabel = container.querySelector("#parola-progress-label");
        var progressPct = container.querySelector("#parola-progress-pct");
        var progressBar = container.querySelector("#parola-progress-bar");
        var logBox = container.querySelector("#parola-log-box");
        var badgeStatus = container.querySelector("#parola-badge-status");

        var overwriteModal = container.querySelector("#parola-overwrite-modal");
        var overwriteList = container.querySelector("#parola-overwrite-list");
        var btnCancelOverwrite = container.querySelector("#parola-btn-cancel-overwrite");
        var btnConfirmOverwrite = container.querySelector("#parola-btn-confirm-overwrite");

        function log(msg, type) {
            var time = new Date().toLocaleTimeString();
            var line = document.createElement("div");
            line.style.marginTop = "2px";
            if (type === "error") line.style.color = "#f87171";
            else if (type === "success") line.style.color = "#4ade80";
            else if (type === "warn") line.style.color = "#facc15";
            line.textContent = "[" + time + "] " + msg;
            logBox.appendChild(line);
            logBox.scrollTop = logBox.scrollHeight;
        }

        function setStatusBadge(text, color, bg) {
            badgeStatus.textContent = text;
            badgeStatus.style.color = color || "#475569";
            badgeStatus.style.background = bg || "#f1f5f9";
        }

        // 1. Load Reference Definitions (CPC & TC)
        function loadReferences() {
            var p1 = cpcDescMap ? Promise.resolve(cpcDescMap) : fetchCsvAsObjects(cfg.cpcUrl).then(function (rows) {
                var map = {};
                rows.forEach(function (r) {
                    var s = (r["symbol"] || r["Symbol"] || "").trim();
                    var t = (r["title"] || r["Title"] || r["description"] || "").trim();
                    if (s) map[s] = t;
                });
                cpcDescMap = map;
                return map;
            }).catch(function (err) {
                log("Notice: CPC reference map load notice (" + err.message + ")", "warn");
                return {};
            });

            var p2 = tcDescMap ? Promise.resolve(tcDescMap) : fetchCsvAsObjects(cfg.tcUrl).catch(function () {
                return fetchCsvAsObjects(SCRIPT_DIR + "TC Definitions.csv");
            }).then(function (rows) {
                var map = {};
                rows.forEach(function (r) {
                    var tc = String(r["TC"] || r["tc"] || "").trim();
                    var d = (r["Description"] || r["description"] || "").trim();
                    if (tc) map[tc] = d;
                });
                tcDescMap = map;
                return map;
            }).catch(function (err) {
                log("Notice: TC reference map load notice (" + err.message + ")", "warn");
                return {};
            });

            return Promise.all([p1, p2]);
        }

        // 2. Populate Dataset Dropdown
        function populateDatasetDropdown() {
            selectEl.innerHTML = '<option value="">Scanning wp-content/chart/ ...</option>';
            listServerChartFiles().then(function (files) {
                selectEl.innerHTML = "";
                var defaultFound = false;

                if (files.length === 0) {
                    // Fallback to default CSV
                    var opt = document.createElement("option");
                    opt.value = cfg.defaultCsvUrl;
                    opt.textContent = "Sample Bulk Dataset - Jenny version.csv (Default)";
                    selectEl.appendChild(opt);
                    defaultFound = true;
                } else {
                    var optPlaceholder = document.createElement("option");
                    optPlaceholder.value = "";
                    optPlaceholder.textContent = "-- Select a dataset to extract --";
                    selectEl.appendChild(optPlaceholder);

                    files.forEach(function (f) {
                        var opt = document.createElement("option");
                        opt.value = f.url;
                        opt.textContent = f.name + (f.size ? " (" + Math.round(f.size / 1024) + " KB)" : "");
                        if (f.name.toLowerCase().indexOf("sample bulk dataset") !== -1 || f.name === "Sample Bulk Dataset - Jenny version.csv") {
                            opt.selected = true;
                            defaultFound = true;
                        }
                        selectEl.appendChild(opt);
                    });
                }

                if (defaultFound && selectEl.value) {
                    loadSelectedDataset(selectEl.value);
                }
            });
        }

        // 3. Load & Parse Selected Dataset
        function loadSelectedDataset(url) {
            if (!url) {
                entitySectionEl.style.display = "none";
                updateExtractButtonState();
                return;
            }

            setStatusBadge("Loading Dataset...", "#d97706", "#fef3c7");
            datasetInfoEl.style.display = "block";
            datasetInfoEl.textContent = "Loading and validating rows from " + url + " ...";

            Promise.all([loadReferences(), fetchDataset(url)])
                .then(function (res) {
                    var rawRows = res[1];
                    currentRawRows = rawRows;

                    if (!rawRows || rawRows.length < 4) {
                        datasetInfoEl.textContent = "❌ Dataset error: Must have at least 4 rows (Markers, Industry, Headers, Entities).";
                        datasetInfoEl.style.color = "#dc2626";
                        setStatusBadge("Invalid Format", "#dc2626", "#fee2e2");
                        entitySectionEl.style.display = "none";
                        return;
                    }

                    // Extract entities from Row 4+
                    availableEntities = [];
                    selectedEntityIndices.clear();

                    for (var r = 3; r < rawRows.length; r++) {
                        var name = (rawRows[r][0] || "").trim();
                        if (name) {
                            availableEntities.push({
                                index: r,
                                name: name,
                                row: rawRows[r]
                            });
                            selectedEntityIndices.add(r); // default select all
                        }
                    }

                    datasetInfoEl.innerHTML = "✓ Successfully loaded <strong>" + availableEntities.length + " entities</strong> from dataset.";
                    datasetInfoEl.style.color = "#16a34a";
                    setStatusBadge("Dataset Ready", "#16a34a", "#dcfce7");

                    renderEntityList();
                    entitySectionEl.style.display = "block";
                    updateExtractButtonState();
                })
                .catch(function (err) {
                    datasetInfoEl.textContent = "❌ Failed to load dataset: " + (err.message || err);
                    datasetInfoEl.style.color = "#dc2626";
                    setStatusBadge("Error", "#dc2626", "#fee2e2");
                    entitySectionEl.style.display = "none";
                });
        }

        // 4. Render Entity Selection Checkbox List
        function renderEntityList() {
            var query = (searchInput.value || "").trim().toLowerCase();
            entityListContainer.innerHTML = "";

            var visibleCount = 0;
            availableEntities.forEach(function (entity) {
                if (query && entity.name.toLowerCase().indexOf(query) === -1) {
                    return;
                }
                visibleCount++;

                var label = document.createElement("label");
                label.style.display = "flex";
                label.style.alignItems = "center";
                label.style.gap = "8px";
                label.style.padding = "6px 8px";
                label.style.borderRadius = "4px";
                label.style.fontSize = "13px";
                label.style.color = "#1e293b";
                label.style.cursor = "pointer";
                label.style.transition = "background 0.1s";

                label.onmouseover = function () { label.style.background = "#e2e8f0"; };
                label.onmouseout = function () { label.style.background = "transparent"; };

                var chk = document.createElement("input");
                chk.type = "checkbox";
                chk.checked = selectedEntityIndices.has(entity.index);
                chk.style.accentColor = "rgb(28, 167, 166)";
                chk.style.cursor = "pointer";

                chk.onchange = function () {
                    if (chk.checked) {
                        selectedEntityIndices.add(entity.index);
                    } else {
                        selectedEntityIndices.delete(entity.index);
                    }
                    updateSelectedCount();
                    updateExtractButtonState();
                };

                var span = document.createElement("span");
                span.textContent = entity.name;
                span.style.fontWeight = "500";

                label.appendChild(chk);
                label.appendChild(span);
                entityListContainer.appendChild(label);
            });

            if (visibleCount === 0) {
                var empty = document.createElement("div");
                empty.style.padding = "12px";
                empty.style.color = "#94a3b8";
                empty.style.fontSize = "13px";
                empty.style.textAlign = "center";
                empty.textContent = "No matching entities found.";
                entityListContainer.appendChild(empty);
            }

            updateSelectedCount();
        }

        function updateSelectedCount() {
            selectedCountEl.textContent = selectedEntityIndices.size;
            totalEntitiesCountEl.textContent = availableEntities.length;
        }

        function updateExtractButtonState() {
            var count = selectedEntityIndices.size;
            if (count > 0 && !isExtracting) {
                btnExtract.disabled = false;
                btnExtract.style.background = "rgb(28, 167, 166)";
                btnExtract.style.cursor = "pointer";
                btnExtract.innerHTML = "⚡ Extract " + count + " Selected " + (count === 1 ? "Entity" : "Entities");
            } else {
                btnExtract.disabled = true;
                btnExtract.style.background = "#94a3b8";
                btnExtract.style.cursor = "not-allowed";
                btnExtract.innerHTML = isExtracting ? "⏳ Extracting..." : "⚡ Extract Selected Entities";
            }
        }

        // Search Input Filter
        searchInput.oninput = function () {
            renderEntityList();
        };

        // Select All / Deselect All
        btnSelectAll.onclick = function () {
            var query = (searchInput.value || "").trim().toLowerCase();
            availableEntities.forEach(function (e) {
                if (!query || e.name.toLowerCase().indexOf(query) !== -1) {
                    selectedEntityIndices.add(e.index);
                }
            });
            renderEntityList();
            updateExtractButtonState();
        };

        btnDeselectAll.onclick = function () {
            var query = (searchInput.value || "").trim().toLowerCase();
            availableEntities.forEach(function (e) {
                if (!query || e.name.toLowerCase().indexOf(query) !== -1) {
                    selectedEntityIndices.delete(e.index);
                }
            });
            renderEntityList();
            updateExtractButtonState();
        };

        // Refresh Files button
        btnRefresh.onclick = function () {
            populateDatasetDropdown();
        };

        selectEl.onchange = function () {
            loadSelectedDataset(selectEl.value);
        };

        // 5. Extraction Flow Execution
        function startExtractionProcess() {
            var selectedEntities = availableEntities.filter(function (e) {
                return selectedEntityIndices.has(e.index);
            });

            if (selectedEntities.length === 0) return;

            var markerRow = currentRawRows[0];
            var industryRow = currentRawRows[1];
            var headerRow = currentRawRows[2];

            var statCols = {};
            var chartCols = {};
            var industryCols = {};

            markerRow.forEach(function (cell, idx) {
                var marker = (cell || "").trim();
                if (!marker) return;
                if (/^Stat\s+[A-Z]$/i.test(marker)) statCols[marker] = idx;
                else if (/^Chart\s+[A-Z]$/i.test(marker)) chartCols[marker] = idx;
                else if (/^Industry\s+[A-Z]$/i.test(marker)) industryCols[marker] = idx;
            });

            isExtracting = true;
            updateExtractButtonState();
            setStatusBadge("Extracting...", "#0284c7", "#e0f2fe");

            progressContainer.style.display = "block";
            progressBar.style.width = "0%";
            progressPct.textContent = "0%";
            logBox.innerHTML = "";
            log("Starting extraction for " + selectedEntities.length + " entities...", "info");

            var total = selectedEntities.length;
            var processed = 0;
            var successCount = 0;
            var alsoDownload = chkDownload.checked;

            function processNext(i) {
                if (i >= selectedEntities.length) {
                    isExtracting = false;
                    updateExtractButtonState();
                    setStatusBadge("Completed", "#16a34a", "#dcfce7");
                    progressBar.style.width = "100%";
                    progressPct.textContent = "100%";
                    progressLabel.textContent = "Done!";
                    log("✓ Finished! Successfully extracted " + successCount + " / " + total + " files into /wp-content/chart/.", "success");
                    return;
                }

                var entity = selectedEntities[i];
                var entityName = entity.name;
                var filename = safeFilename(entityName);

                progressLabel.textContent = "Extracting (" + (i + 1) + "/" + total + "): " + entityName;
                var pct = Math.round(((i) / total) * 100);
                progressBar.style.width = pct + "%";
                progressPct.textContent = pct + "%";

                try {
                    var built = buildEntityWorkbook(
                        entity.row,
                        markerRow,
                        industryRow,
                        headerRow,
                        statCols,
                        chartCols,
                        industryCols,
                        cpcDescMap,
                        tcDescMap
                    );

                    if (!built) {
                        processNext(i + 1);
                        return;
                    }

                    var savePromise = saveWorkbookToServer(built.workbook, filename);

                    if (alsoDownload) {
                        savePromise = savePromise.then(function (res) {
                            return downloadWorkbook(built.workbook, filename).then(function () { return res; });
                        });
                    }

                    savePromise
                        .then(function (res) {
                            successCount++;
                            var savedPath = res && res.path ? res.path : ("/wp-content/chart/" + filename + ".xlsx");
                            log("✓ Saved " + filename + ".xlsx -> " + savedPath, "success");
                            setTimeout(function () { processNext(i + 1); }, 60);
                        })
                        .catch(function (err) {
                            log("⚠ Server save error for " + entityName + " (" + err.message + "). Fallback downloading...", "warn");
                            downloadWorkbook(built.workbook, filename)
                                .then(function () {
                                    successCount++;
                                    log("✓ Downloaded fallback for " + entityName, "success");
                                    setTimeout(function () { processNext(i + 1); }, 60);
                                })
                                .catch(function (dErr) {
                                    log("❌ Failed to save/download " + entityName + ": " + dErr.message, "error");
                                    setTimeout(function () { processNext(i + 1); }, 60);
                                });
                        });

                } catch (ex) {
                    log("❌ Error building workbook for " + entityName + ": " + ex.message, "error");
                    setTimeout(function () { processNext(i + 1); }, 60);
                }
            }

            processNext(0);
        }

        // Button Extract Click with Overwrite Check
        btnExtract.onclick = function () {
            if (isExtracting || selectedEntityIndices.size === 0) return;

            var selectedEntities = availableEntities.filter(function (e) {
                return selectedEntityIndices.has(e.index);
            });

            var filenamesToCheck = selectedEntities.map(function (e) {
                return safeFilename(e.name) + ".xlsx";
            });

            // If overwrite checkbox is already checked, proceed directly
            if (chkOverwrite.checked) {
                startExtractionProcess();
                return;
            }

            // Otherwise check which files already exist on the server
            btnExtract.disabled = true;
            btnExtract.textContent = "Checking existing files...";

            checkExistingFilesOnServer(filenamesToCheck).then(function (existing) {
                btnExtract.disabled = false;
                updateExtractButtonState();

                if (existing && existing.length > 0) {
                    // Show overwrite confirmation modal
                    overwriteList.innerHTML = existing.map(function (f) {
                        return "• " + f;
                    }).join("<br>");
                    overwriteModal.style.display = "flex";
                } else {
                    startExtractionProcess();
                }
            });
        };

        btnCancelOverwrite.onclick = function () {
            overwriteModal.style.display = "none";
        };

        btnConfirmOverwrite.onclick = function () {
            overwriteModal.style.display = "none";
            chkOverwrite.checked = true;
            startExtractionProcess();
        };

        // Initialize dataset list
        populateDatasetDropdown();
    }

    /* ------------------------------------------------------------------
     * 8. Root & Element Scanner for ".d3-extract"
     * ------------------------------------------------------------------ */
    function initializeParolaExtractor(rootNode) {
        var root = rootNode || document;
        var elements = [];

        if (root.nodeType === 1 && root.matches && root.matches(".d3-extract")) {
            elements.push(root);
        }

        if (root.querySelectorAll) {
            root.querySelectorAll(".d3-extract").forEach(function (el) {
                elements.push(el);
            });
        }

        elements.forEach(function (el) {
            if (el.dataset.parolaExtractInitialized === "1") return;
            el.dataset.parolaExtractInitialized = "1";
            renderExtractDashboard(el);
        });
    }

    // Expose Global functions
    window.parolaInitializeExtractor = initializeParolaExtractor;

    /**
     * Legacy & CLI programmatic extraction function
     */
    window.parolaExtractBulkDataset = function (options) {
        var cfg = getConfig();
        var sourceUrl = cfg.defaultCsvUrl;
        var alsoDownload = false;
        var saveToServer = true;

        if (typeof options === "string") {
            sourceUrl = options;
        } else if (options && typeof options === "object") {
            if (options.sourceUrl) sourceUrl = options.sourceUrl;
            if (options.download !== undefined) alsoDownload = !!options.download;
            if (options.saveToServer !== undefined) saveToServer = !!options.saveToServer;
        }

        console.log("[parola-extract] Starting extraction on " + sourceUrl);

        return Promise.all([
            fetchDataset(sourceUrl),
            fetchCsvAsObjects(cfg.cpcUrl),
            fetchCsvAsObjects(cfg.tcUrl).catch(function () { return fetchCsvAsObjects(SCRIPT_DIR + "TC Definitions.csv"); })
        ]).then(function (res) {
            var rawRows = res[0];
            var cpcRows = res[1];
            var tcRows = res[2];

            var cpcDescMap = {};
            cpcRows.forEach(function (r) {
                var s = (r["symbol"] || r["Symbol"] || "").trim();
                var t = (r["title"] || r["Title"] || r["description"] || "").trim();
                if (s) cpcDescMap[s] = t;
            });

            var tcDescMap = {};
            tcRows.forEach(function (r) {
                var tc = String(r["TC"] || r["tc"] || "").trim();
                var d = (r["Description"] || r["description"] || "").trim();
                if (tc) tcDescMap[tc] = d;
            });

            var markerRow = rawRows[0];
            var industryRow = rawRows[1];
            var headerRow = rawRows[2];

            var statCols = {};
            var chartCols = {};
            var industryCols = {};

            markerRow.forEach(function (cell, idx) {
                var marker = (cell || "").trim();
                if (!marker) return;
                if (/^Stat\s+[A-Z]$/i.test(marker)) statCols[marker] = idx;
                else if (/^Chart\s+[A-Z]$/i.test(marker)) chartCols[marker] = idx;
                else if (/^Industry\s+[A-Z]$/i.test(marker)) industryCols[marker] = idx;
            });

            var dataRows = rawRows.slice(3);
            var results = [];

            for (var i = 0; i < dataRows.length; i++) {
                var built = buildEntityWorkbook(dataRows[i], markerRow, industryRow, headerRow, statCols, chartCols, industryCols, cpcDescMap, tcDescMap);
                if (built) {
                    results.push(built);
                }
            }

            console.log("[parola-extract] Extracted " + results.length + " entity workbooks.");
            return results;
        });
    };

    // Auto-init on page load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initializeParolaExtractor(document);
        });
    } else {
        initializeParolaExtractor(document);
    }

    console.log("[parola-extract] Dashboard Engine 1.1.0 loaded. Targets: '.d3-extract'");

})();
