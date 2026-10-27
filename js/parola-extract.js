/**
 * Parola Bulk Dataset Extractor & Interactive Dashboard
 * Version 1.2.0
 * - Firm Rankings tab: Display Name is now preprocessed before being written to the sheet:
 *   title-cased and known firm suffixes (e.g. LLC, PLLC, Inc) are stripped.
 *   The suffix list is maintained in FIRM_SUFFIXES_TO_STRIP (see Section 1a below).
 * - "cpc_descriptions_updated"
 * - Decimal formatting: numbers with decimal places shown to 2 decimal places in all extracted sheets
 * - Firm Rankings tab: Entity Name cell (row 1, col 2) now uses Display Name (col 2 of source) instead of Entity Name
 * - Firm Rankings tab: Rank column now formatted as "#X of Y" using total_positions from industry row of source dataset
 * - Technology Breakdown (CPC) tab: Added "Efficiency Rate" column (4th column) sourced from Chart C data,
 *   matched by CPC code, stored as decimal and formatted as percentage (0.00%)
 * - Normalized Stat A-D extracted tab names and labels to be non-multiline and prevent richText JSON output
 * - Firm Rankings tab: Industry rows with #N/A values display String "Unranked" across Rank, Granted Patents, and 3YR Grant Rate
 * - Enhanced Excel error and cell value extraction in fetchExcelAsRows
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
            cpcUrl: SCRIPT_DIR + "cpc_descriptions_updated.csv",
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

    function extractCellValue(val) {
        if (val === null || val === undefined) return "";
        if (typeof val === "object") {
            if (val.error !== undefined) {
                return String(val.error);
            }
            if (val.result !== undefined) {
                if (typeof val.result === "object" && val.result !== null) {
                    if (val.result.error !== undefined) {
                        return String(val.result.error);
                    }
                    if (val.result.richText && Array.isArray(val.result.richText)) {
                        return val.result.richText.map(function (rt) {
                            return (rt && rt.text !== undefined) ? rt.text : "";
                        }).join("");
                    }
                    if (val.result.text !== undefined) {
                        return typeof val.result.text === "object" ? extractCellValue(val.result.text) : String(val.result.text);
                    }
                    return JSON.stringify(val.result);
                }
                return String(val.result);
            }
            if (val.richText && Array.isArray(val.richText)) {
                return val.richText.map(function (rt) {
                    return (rt && rt.text !== undefined) ? rt.text : "";
                }).join("");
            }
            if (val.text !== undefined) {
                return typeof val.text === "object" ? extractCellValue(val.text) : String(val.text);
            }
            try {
                var s = JSON.stringify(val);
                if (s.indexOf("#N/A") !== -1 || s.indexOf("N/A") !== -1) {
                    return "#N/A";
                }
                return s;
            } catch (e) {
                return "";
            }
        }
        return String(val);
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
                            var val = extractCellValue(cell.value);
                            rowValues.push(val);
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

    function parseTopClients(cellStr) {
        if (!cellStr || !cellStr.trim()) return [];
        var items = cellStr.split(";");
        var results = [];
        items.forEach(function (rawItem) {
            var item = rawItem.trim();
            if (!item) return;

            // Find the parenthesis containing a valid convertible number
            // Standard format: "Leica Instruments (Singapore) Pte Ltd. (1)" -> Name: "Leica Instruments (Singapore) Pte Ltd.", Patents: 1
            var endMatch = item.match(/^(.*?)\s*\(\s*([\d,]+(?:\.\d+)?)\s*\)\s*$/);
            if (endMatch) {
                var clientName = endMatch[1].trim();
                var countNum = parseFloat(endMatch[2].replace(/,/g, ""));
                results.push({ key: clientName, value: isNaN(countNum) ? 0 : countNum });
                return;
            }

            // Fallback: search all parenthesized groups from right to left for a valid number
            var parenRegex = /\(([^)]+)\)/g;
            var pMatch;
            var validNumberMatches = [];
            while ((pMatch = parenRegex.exec(item)) !== null) {
                var cleanInner = pMatch[1].trim().replace(/,/g, "");
                if (cleanInner !== "" && !isNaN(Number(cleanInner))) {
                    validNumberMatches.push({
                        start: pMatch.index,
                        end: pMatch.index + pMatch[0].length,
                        value: parseFloat(cleanInner)
                    });
                }
            }

            if (validNumberMatches.length > 0) {
                var target = validNumberMatches[validNumberMatches.length - 1];
                var name = (item.substring(0, target.start) + item.substring(target.end)).replace(/\s+/g, " ").trim();
                results.push({ key: name, value: target.value });
            } else {
                results.push({ key: item, value: 0 });
            }
        });
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

    /* ------------------------------------------------------------------
     * 1a. Display Name Preprocessing (Firm Rankings sheet)
     * ------------------------------------------------------------------ */

    /**
     * FIRM_SUFFIXES_TO_STRIP
     * ---------------------------------------------------------------
     * List of firm-name suffixes to remove from the Display Name before
     * it is written into the "Firm Rankings" sheet tab.
     *
     * HOW TO EDIT:
     *   - To add a new suffix, append its string to this array.
     *   - To remove a suffix, delete or comment out the relevant line.
     *   - Each entry is matched case-insensitively and may be preceded
     *     by an optional comma or period separator in the source string.
     * ---------------------------------------------------------------
     */
    var FIRM_SUFFIXES_TO_STRIP = [
        "Incorporated",
        "Corporation",
        "Company",
        "PatentPC",
        "RLLP",
        "PLLC",
        "LLP",
        "LLC",
        "PLC",
        "Ltd",
        "Inc",
        "Corp",
        "LPA",
        "Co.",
        "PC",
        "PA",
        "SC",
        "PS",
        "BV",
        "LP",
        "Oy",
        "LLO",
        "Limited",
        "P.C.",
        "P.L.L.C.",
        "L.L.P."
    ];

    /**
     * preprocessDisplayName(raw)
     *
     * Converts a raw firm display name into a clean, title-cased name by:
     *   1. Trimming surrounding whitespace.
     *   2. Stripping any suffix listed in FIRM_SUFFIXES_TO_STRIP (with an
     *      optional preceding comma or period).
     *   3. Converting the result to title case.
     *
     * Example: "HULTQUIST, PLLC" -> "Hultquist"
     *
     * @param  {string} raw  The raw display name from the source dataset.
     * @return {string}      The cleaned, title-cased display name.
     */
    function preprocessDisplayName(raw) {
        var name = String(raw || "").trim();
        if (!name) return name;

        // Sort suffixes longest-first so that more specific suffixes are
        // matched before shorter ones that might be substrings (e.g. "LLC"
        // before "LC").
        var sortedSuffixes = FIRM_SUFFIXES_TO_STRIP.slice().sort(function (a, b) {
            return b.length - a.length;
        });

        // Iteratively strip suffixes until no more are found.
        var changed = true;
        while (changed) {
            changed = false;
            for (var i = 0; i < sortedSuffixes.length; i++) {
                // Build a pattern that matches an optional separator (comma,
                // period, or whitespace) followed by the suffix at the very
                // end of the string, case-insensitively.
                var escapedSuffix = sortedSuffixes[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                var pattern = new RegExp(
                    "[,\\.\\s]*" + escapedSuffix + "\\s*$",
                    "i"
                );
                var trimmed = name.replace(pattern, "").trim();
                if (trimmed !== name) {
                    name = trimmed;
                    changed = true;
                    break; // Restart loop with the shortened name
                }
            }
        }

        // Convert to title case (first letter of each word capitalised).
        name = name.replace(/\S+/g, function (word) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });

        return name;
    }

    function sanitizeSheetName(name) {
        return String(name || "")
            .replace(/[\/\\?*\[\]:]/g, "")
            .replace(/^'+|'+$/g, "")
            .substring(0, 31)
            .trim();
    }

    function getUniqueSheetName(wb, name, fallback) {
        var sanitized = sanitizeSheetName(name) || sanitizeSheetName(fallback) || "Sheet";
        if (!wb.getWorksheet(sanitized)) {
            return sanitized;
        }
        var counter = 2;
        while (true) {
            var suffix = " " + counter;
            var baseLen = Math.max(1, 31 - suffix.length);
            var candidate = sanitizeSheetName(sanitized.substring(0, baseLen)) + suffix;
            if (!wb.getWorksheet(candidate)) {
                return candidate;
            }
            counter++;
        }
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
        // Format value: if numeric with decimal places, show 2dp; if whole number, show as integer
        var displayValue = "";
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            var strVal = String(value).trim();
            var numVal = parseFloat(strVal.replace(/,/g, ""));
            if (!isNaN(numVal) && !strVal.endsWith("%") && strVal.indexOf(",") === -1) {
                if (Number.isInteger(numVal)) {
                    displayValue = String(numVal);
                } else {
                    displayValue = numVal.toFixed(2);
                }
            } else {
                displayValue = strVal;
            }
        }
        var r2 = ws.addRow(["Value", displayValue]);
        r1.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        r2.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        r2.getCell(2).font = { bold: true, size: 14 };
        ws.getColumn(1).width = 16;
        ws.getColumn(2).width = 40;
    }

    function addFrequencySheet(wb, sheetName, title, pairs, cpcDescMap, effRatePairs) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, title || "Technology Breakdown (CPC)", "");
        var headRow = ws.addRow(["CPC Section", "Description", "Frequency", "Efficiency Rate"]);
        headRow.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });

        // Build a lookup map from CPC code -> efficiency rate value
        var effRateMap = {};
        if (effRatePairs && Array.isArray(effRatePairs)) {
            effRatePairs.forEach(function (p) {
                if (p && p.key) {
                    var rateNum = parseFloat(String(p.value).replace(/%/g, ""));
                    effRateMap[p.key.trim()] = isNaN(rateNum) ? null : rateNum / 100;
                }
            });
        }

        // Limit to top 10 entries (ties broken by source data order)
        var topPairs = pairs.map(function (p, idx) {
            var val = typeof p.value === "number" ? p.value : parseFloat(String(p.value).replace(/,/g, ""));
            return { pair: p, val: isNaN(val) ? 0 : val, origIdx: idx };
        }).sort(function (a, b) {
            if (b.val !== a.val) return b.val - a.val;
            return a.origIdx - b.origIdx;
        }).map(function (item) {
            return item.pair;
        }).slice(0, 10);

        topPairs.forEach(function (pair) {
            var desc = cpcDescMap[pair.key] || "";
            var freq = parseFloat(pair.value);
            var effRate = effRateMap.hasOwnProperty(pair.key) ? effRateMap[pair.key] : null;
            var rowData = [pair.key, desc, isNaN(freq) ? pair.value : freq, effRate !== null ? effRate : ""];
            var row = ws.addRow(rowData);
            if (!isNaN(freq)) {
                row.getCell(3).numFmt = '#,##0';
            }
            if (effRate !== null) {
                row.getCell(4).numFmt = '0.00%';
            }
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 16;
        ws.getColumn(2).width = 45;
        ws.getColumn(3).width = 16;
        ws.getColumn(4).width = 18;
    }

    function addCountPercentageSheet(wb, sheetName, countPairs, pctPairs, tcDescMap) {
        var ws = wb.addWorksheet(sheetName);
        addTitleRows(ws, "Tech Center Breakdown", "");

        var pctMap = {};
        pctPairs.forEach(function (p) {
            var cleanVal = parseFloat(String(p.value).replace(/%/g, ""));
            pctMap[p.key] = isNaN(cleanVal) ? p.value : cleanVal;
            pctMap[stripTC(p.key)] = isNaN(cleanVal) ? p.value : cleanVal;
        });

        var headRow = ws.addRow(["TC", "Description", "Count", "Percentage"]);
        headRow.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });

        var excludedTCs = ["3900", "4100", "2900", "UNLISTED"];

        countPairs.forEach(function (cp) {
            var rawTC = (cp.key || "").trim();
            var numTC = stripTC(rawTC); // Remove "TC" characters

            // Exclude rows with TC value of 3900, 4100, UNLISTED
            if (excludedTCs.indexOf(numTC.toUpperCase()) !== -1 || excludedTCs.indexOf(rawTC.toUpperCase()) !== -1) {
                return;
            }

            var desc = tcDescMap[numTC] || tcDescMap[rawTC] || "";

            // Count as Number
            var countVal = parseFloat(cp.value);
            if (isNaN(countVal)) countVal = 0;

            // Percentage as Number
            var pctRaw = pctMap[rawTC] !== undefined ? pctMap[rawTC] : (pctMap[numTC] !== undefined ? pctMap[numTC] : "");
            var pctVal = typeof pctRaw === "number" ? pctRaw : parseFloat(String(pctRaw).replace(/%/g, ""));
            if (isNaN(pctVal)) pctVal = 0;

            var row = ws.addRow([numTC, desc, countVal, pctVal]);
            row.getCell(3).numFmt = '#,##0';
            row.getCell(4).numFmt = '0.00';
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

        // Limit to top 10 entries (ties broken by source data order)
        var topPairs = pairs.map(function (p, idx) {
            var val = typeof p.value === "number" ? p.value : parseFloat(String(p.value).replace(/,/g, ""));
            return { pair: p, val: isNaN(val) ? 0 : val, origIdx: idx };
        }).sort(function (a, b) {
            if (b.val !== a.val) return b.val - a.val;
            return a.origIdx - b.origIdx;
        }).map(function (item) {
            return item.pair;
        }).slice(0, 10);

        topPairs.forEach(function (pair) {
            var valNum = typeof pair.value === "number" ? pair.value : parseFloat(String(pair.value).replace(/,/g, ""));
            var row = ws.addRow([pair.key, isNaN(valNum) ? pair.value : valNum]);
            if (!isNaN(valNum)) {
                row.getCell(2).numFmt = '#,##0';
            }
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 35;
        ws.getColumn(2).width = 16;
    }

    function parsePercentageForExcel(val) {
        if (val === undefined || val === null || String(val).trim() === "") return "";
        var s = String(val).trim();
        var num = parseFloat(s.replace(/%/g, ""));
        if (isNaN(num)) return "";
        if (s.indexOf("%") === -1 && num > 0 && num <= 1) {
            return num;
        }
        return num / 100;
    }

    function cleanRichTextOrMultiline(val) {
        if (val === null || val === undefined) return "";
        var str = "";
        if (typeof val === "object") {
            if (Array.isArray(val.richText)) {
                str = val.richText.map(function (rt) {
                    return (rt && rt.text !== undefined) ? rt.text : "";
                }).join("");
            } else if (val.text !== undefined) {
                str = typeof val.text === "object" ? cleanRichTextOrMultiline(val.text) : String(val.text);
            } else if (val.result !== undefined) {
                str = cleanRichTextOrMultiline(val.result);
            } else {
                try {
                    str = JSON.stringify(val);
                } catch (e) {
                    str = "";
                }
            }
        } else {
            str = String(val);
        }

        if (str.indexOf("richText") !== -1) {
            try {
                var parsed = JSON.parse(str.trim());
                if (parsed && Array.isArray(parsed.richText)) {
                    str = parsed.richText.map(function (rt) {
                        return (rt && rt.text !== undefined) ? rt.text : "";
                    }).join("");
                }
            } catch (e) {
                var matches = [];
                var re = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
                var m;
                while ((m = re.exec(str)) !== null) {
                    try {
                        matches.push(JSON.parse('"' + m[1] + '"'));
                    } catch (err) {
                        matches.push(m[1]);
                    }
                }
                if (matches.length > 0) {
                    str = matches.join("");
                }
            }
        }

        return str;
    }

    function normalizeStatHeader(raw) {
        var plain = cleanRichTextOrMultiline(raw);
        var lines = plain.split(/\r?\n/).map(function (s) {
            return s.trim();
        }).filter(function (s) {
            return s.length > 0;
        });
        return lines.length > 0 ? lines[0] : "";
    }

    function isNA(val) {
        if (val === undefined || val === null) return false;
        if (typeof val === "object") {
            if (val.error !== undefined && String(val.error).toUpperCase().indexOf("N/A") !== -1) return true;
            if (val.result !== undefined) return isNA(val.result);
            try {
                var sObj = JSON.stringify(val).toUpperCase();
                if (sObj.indexOf("#N/A") !== -1 || sObj.indexOf("N/A") !== -1) return true;
            } catch (e) { }
        }
        var s = String(val).trim().toUpperCase();
        if (s === "N/A" || s === "#N/A" || s === "NA" || s === "[OBJECT OBJECT]") return true;
        if (s.indexOf("#N/A") !== -1 || s.indexOf('"ERROR":"#N/A"') !== -1 || s.indexOf('"ERROR": "#N/A"') !== -1) return true;
        return false;
    }

    function addFirmRankingSheet(wb, sheetName, entityName, displayName, industries) {
        var ws = wb.addWorksheet(sheetName);
        var r1 = ws.addRow(["Entity Name", displayName || entityName]);
        r1.getCell(1).font = { bold: true, size: 11, color: { argb: "FF475569" } };
        r1.getCell(2).font = TITLE_FONT;

        var headRow = ws.addRow([
            "Industry",
            "Rank",
            "Granted Patents",
            "3YR Grant rate"
        ]);
        headRow.eachCell(function (cell) {
            cell.font = HEADER_FONT;
            cell.fill = HEADER_FILL;
            cell.border = HEADER_BORDER;
        });
        industries.forEach(function (ind) {
            var rawRank = (ind.rank !== undefined && String(ind.rank).trim() !== "") ? ind.rank : ind.position;
            var isAnyNA = isNA(rawRank) || isNA(ind.patents) || isNA(ind.efficiencyRate) ||
                rawRank === "Unranked" || ind.patents === "Unranked" || ind.efficiencyRate === "Unranked" ||
                String(rawRank).indexOf("[object") !== -1 || String(ind.patents).indexOf("[object") !== -1;

            var rankCellVal, patVal, effVal;

            if (isAnyNA) {
                rankCellVal = "Unranked";
                patVal = "Unranked";
                effVal = "Unranked";
            } else {
                // Use pre-formatted rank string (e.g. "#55 of 128") if available, else fall back to number
                if (ind.formattedRank) {
                    rankCellVal = ind.formattedRank;
                } else {
                    var rankNum = parseInt(String(rawRank).replace(/,/g, ""), 10);
                    rankCellVal = !isNaN(rankNum) ? rankNum : String(rawRank);
                }

                var patNum = parseInt(String(ind.patents).replace(/,/g, ""), 10);
                patVal = !isNaN(patNum) ? patNum : (parseFloat(ind.patents) || 0);

                effVal = parsePercentageForExcel(ind.efficiencyRate);
                if (effVal === "" || isNaN(effVal)) {
                    effVal = "Unranked";
                }
            }

            var row = ws.addRow([ind.industry, rankCellVal, patVal, effVal]);
            // Only apply number format if rankCellVal is a plain number (not a formatted string like "#55 of 128")
            if (typeof rankCellVal === "number") row.getCell(2).numFmt = '#,##0';
            if (typeof patVal === "number") row.getCell(3).numFmt = '#,##0';
            if (typeof effVal === "number") row.getCell(4).numFmt = '0%';
            row.eachCell(function (cell) { cell.border = CELL_BORDER_BOTTOM; });
        });
        ws.getColumn(1).width = 28;
        ws.getColumn(2).width = 20;
        ws.getColumn(3).width = 20;
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

        // 1. Stat A-F -> Data Block sheets (tabs named after source data column header)
        var statMarkersSorted = Object.keys(statCols).sort(function (a, b) {
            var lA = a.replace(/^Stat\s+/i, "");
            var lB = b.replace(/^Stat\s+/i, "");
            return lA.localeCompare(lB);
        });
        statMarkersSorted.forEach(function (marker) {
            var colIdx = statCols[marker];
            var rawHeader = headerRow[colIdx] || "";
            var normalizedHeader = normalizeStatHeader(rawHeader);
            if (!normalizedHeader) return; // If header in row 3 is empty, no need to make a sheet
            var label = normalizedHeader;
            var rawVal = entityRow[colIdx] !== undefined ? entityRow[colIdx] : "";
            var value = extractCellValue(rawVal).trim();
            var sheetTitle = getUniqueSheetName(wb, normalizedHeader, marker);
            addDataBlockSheet(wb, sheetTitle, label, value);
        });

        // 2. Chart A -> Frequency Table ("Technology Breakdown (CPC)") + Chart C -> Efficiency Rate
        if (chartCols["Chart A"] !== undefined) {
            var aIdx = chartCols["Chart A"];
            var aTitle = (headerRow[aIdx] || "Technology Breakdown (CPC)").trim();
            var aPairs = parseKeyValuePairs((entityRow[aIdx] || "").trim());
            var cEffRatePairs = [];
            if (chartCols["Chart C"] !== undefined) {
                cEffRatePairs = parseKeyValuePairs((entityRow[chartCols["Chart C"]] || "").trim());
            }
            if (aPairs.length > 0) {
                addFrequencySheet(wb, "Technology Breakdown (CPC)", aTitle, aPairs, cpcDescMap, cEffRatePairs);
            }
        }

        // 3. Chart B + Chart D -> Count-Percentage ("Technology Center")
        if (chartCols["Chart B"] !== undefined && chartCols["Chart D"] !== undefined) {
            var bIdx = chartCols["Chart B"];
            var dIdx = chartCols["Chart D"];
            var bPairs = parseKeyValuePairs((entityRow[bIdx] || "").trim());
            var dPairs = parseKeyValuePairs((entityRow[dIdx] || "").trim());
            if (bPairs.length > 0) {
                addCountPercentageSheet(wb, "Technology Center", bPairs, dPairs, tcDescMap);
            }
        }

        // 4. Chart E -> Pie/Bar ("Top Clients")
        if (chartCols["Chart E"] !== undefined) {
            var eIdx = chartCols["Chart E"];
            var eTitle = (headerRow[eIdx] || "Top Clients").trim();
            var ePairs = parseTopClients((entityRow[eIdx] || "").trim());
            if (ePairs.length > 0) {
                addPieBarSheet(wb, "Top Clients", eTitle, ePairs);
            }
        }

        // 5. Industry A-E -> Firm Rankings ("Firm Rankings")
        var industryMarkersSorted = Object.keys(industryCols).sort(function (a, b) {
            return industryCols[a] - industryCols[b];
        });
        if (industryMarkersSorted.length > 0) {
            // Preprocess display name: strip known firm suffixes and apply title case
            var displayName = preprocessDisplayName((entityRow[1] || "").trim() || entityName);
            var industries = industryMarkersSorted.map(function (marker) {
                var startCol = industryCols[marker];
                var industryName = (industryRow[startCol] || marker).trim();

                // Extract total_positions from the cell immediately after the industry name in industryRow
                var rawTotalPositions = (industryRow[startCol + 1] || "").toString().trim();
                var totalPositions = parseInt(rawTotalPositions.replace(/,/g, ""), 10);

                var rankVal = "", posVal = "", patVal = "", effVal = "";

                for (var sub = 0; sub < 4; sub++) {
                    var c = startCol + sub;
                    var hdr = (headerRow[c] || "").trim().toLowerCase();
                    var rawVal = entityRow[c] !== undefined ? entityRow[c] : "";
                    var val = extractCellValue(rawVal).trim();
                    if (hdr.indexOf("efficiency rate") !== -1 || hdr.indexOf("grant rate") !== -1 || hdr.indexOf("3yr grant rate") !== -1) {
                        effVal = val;
                    } else if (hdr.indexOf("position") !== -1) {
                        posVal = val;
                    } else if (hdr.indexOf("granted patents") !== -1 || hdr.indexOf("patents") !== -1) {
                        patVal = val;
                    } else if (hdr.indexOf("volume rank") !== -1 || hdr.indexOf("rank") !== -1) {
                        rankVal = val;
                    }
                }
                var industryHasNA = isNA(rankVal) || isNA(posVal) || isNA(patVal) || isNA(effVal) ||
                    rankVal === "Unranked" || posVal === "Unranked" ||
                    String(rankVal).indexOf("[object") !== -1 || String(patVal).indexOf("[object") !== -1;
                if (industryHasNA) {
                    rankVal = "Unranked";
                    posVal = "Unranked";
                    patVal = "Unranked";
                    effVal = "Unranked";
                }

                // Build formatted rank string: "#55 of 128"
                var formattedRank = null;
                if (rankVal !== "Unranked" && rankVal !== "") {
                    var rankNum = parseInt(String(rankVal).replace(/,/g, ""), 10);
                    if (!isNaN(rankNum) && !isNaN(totalPositions)) {
                        formattedRank = "#" + rankNum + " of " + totalPositions;
                    }
                }

                return {
                    industry: industryName,
                    rank: rankVal,
                    formattedRank: formattedRank,
                    position: posVal,
                    patents: patVal,
                    efficiencyRate: effVal
                };
            });
            addFirmRankingSheet(wb, "Firm Rankings", entityName, displayName, industries);
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
            '    <div style="display:flex;align-items:center;gap:8px;">',
            '      <button id="parola-btn-select-all" style="background:none;border:none;color:#0ea5e9;font-size:12px;font-weight:600;cursor:pointer;padding:0;">Select All</button>',
            '      <span style="color:#cbd5e1;">•</span>',
            '      <button id="parola-btn-deselect-all" style="background:none;border:none;color:#64748b;font-size:12px;font-weight:600;cursor:pointer;padding:0;">Deselect All</button>',
            '    </div>',
            '  </div>',
            '  <div style="display:flex;gap:8px;margin-bottom:8px;">',
            '    <input id="parola-entity-search" type="text" placeholder="🔍 Search entities..." style="flex:1;box-sizing:border-box;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;" />',
            '    <button id="parola-btn-toggle-paste" title="Paste a list of firm names to quickly select them" style="padding:8px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;font-weight:600;color:#334155;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;">📋 Paste List</button>',
            '  </div>',
            '  <div id="parola-paste-panel" style="display:none;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:10px;">',
            '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">',
            '      <label style="font-size:12px;font-weight:600;color:#334155;">Enter or paste a list of firm names (e.g. 50+ firms, one per line or separated by semicolons):</label>',
            '      <button id="parola-btn-close-paste" style="background:none;border:none;color:#64748b;font-size:16px;cursor:pointer;line-height:1;padding:0 4px;" title="Close paste box">&times;</button>',
            '    </div>',
            '    <textarea id="parola-paste-input" rows="4" placeholder="Paste list of firm names here...&#10;Intel Corporation&#10;Knobbe Martens&#10;Leica Instruments..." style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;line-height:1.4;outline:none;resize:vertical;background:#ffffff;"></textarea>',
            '    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:8px;">',
            '      <div style="font-size:11px;color:#64748b;">Leading numbers, bullets, and whitespace are automatically cleaned.</div>',
            '      <div style="display:flex;gap:8px;">',
            '        <button id="parola-btn-clear-paste" style="padding:6px 12px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;">Clear</button>',
            '        <button id="parola-btn-submit-paste" style="padding:6px 16px;background:rgb(28, 167, 166);border:none;border-radius:6px;font-size:12px;font-weight:600;color:#ffffff;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.08);">Match &amp; Select</button>',
            '      </div>',
            '    </div>',
            '    <div id="parola-paste-summary" style="display:none;margin-top:10px;padding:10px 12px;border-radius:6px;font-size:12px;line-height:1.4;"></div>',
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
        var btnTogglePaste = container.querySelector("#parola-btn-toggle-paste");
        var pastePanel = container.querySelector("#parola-paste-panel");
        var btnClosePaste = container.querySelector("#parola-btn-close-paste");
        var pasteInput = container.querySelector("#parola-paste-input");
        var btnClearPaste = container.querySelector("#parola-btn-clear-paste");
        var btnSubmitPaste = container.querySelector("#parola-btn-submit-paste");
        var pasteSummary = container.querySelector("#parola-paste-summary");
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

            if (pasteSummary) {
                pasteSummary.style.display = "none";
                pasteSummary.innerHTML = "";
            }
            if (pasteInput) {
                pasteInput.value = "";
            }
            if (pastePanel) {
                pastePanel.style.display = "none";
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

        // ------------------------------------------------------------------
        // Paste Firm List: Parsing, Matching & Actions
        // ------------------------------------------------------------------
        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function cleanFirmName(name) {
            return String(name || "")
                .replace(/^(\d+[\.\)]\s*|[\*\-\•]\s*)/, "")
                .replace(/^["']|["']$/g, "")
                .trim();
        }

        function parsePastedFirmList(text) {
            if (!text || !text.trim()) return [];
            var lines = text.split(/[\r\n]+/);
            var firms = [];
            lines.forEach(function (line) {
                var trimmed = line.trim();
                if (!trimmed) return;
                if (trimmed.indexOf(";") !== -1) {
                    trimmed.split(";").forEach(function (part) {
                        var p = cleanFirmName(part);
                        if (p) firms.push(p);
                    });
                } else {
                    var p = cleanFirmName(trimmed);
                    if (p) firms.push(p);
                }
            });
            return firms;
        }

        function findMatchingEntity(query, entities) {
            if (!query) return null;
            var qNorm = query.trim().toLowerCase().replace(/\s+/g, " ");
            var qClean = qNorm.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");

            // 1. Exact match (case-insensitive)
            for (var i = 0; i < entities.length; i++) {
                var e = entities[i];
                var eNorm = e.name.trim().toLowerCase().replace(/\s+/g, " ");
                if (eNorm === qNorm) return e;
            }

            // 2. Clean match without leading/trailing non-alphanumeric (e.g. handles _ARMSTRONG vs ARMSTRONG)
            for (var i = 0; i < entities.length; i++) {
                var e = entities[i];
                var eNorm = e.name.trim().toLowerCase().replace(/\s+/g, " ");
                var eClean = eNorm.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
                if (eClean && qClean && eClean === qClean) return e;
            }

            // 3. Match without punctuation / special characters
            var qAlphaNum = qNorm.replace(/[^a-z0-9]/g, "");
            if (qAlphaNum.length >= 3) {
                for (var i = 0; i < entities.length; i++) {
                    var e = entities[i];
                    var eAlphaNum = e.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (eAlphaNum === qAlphaNum) return e;
                }
            }

            // 4. Word boundary / unique partial match
            var partials = [];
            for (var i = 0; i < entities.length; i++) {
                var e = entities[i];
                var eNorm = e.name.trim().toLowerCase().replace(/\s+/g, " ");
                if (eNorm.indexOf(qNorm) !== -1 || qNorm.indexOf(eNorm) !== -1) {
                    partials.push(e);
                }
            }
            if (partials.length === 1) {
                return partials[0];
            }

            return null;
        }

        btnTogglePaste.onclick = function () {
            if (pastePanel.style.display === "none") {
                pastePanel.style.display = "block";
                pasteInput.focus();
            } else {
                pastePanel.style.display = "none";
            }
        };

        btnClosePaste.onclick = function () {
            pastePanel.style.display = "none";
        };

        btnClearPaste.onclick = function () {
            pasteInput.value = "";
            pasteSummary.style.display = "none";
            pasteSummary.innerHTML = "";
        };

        btnSubmitPaste.onclick = function () {
            var rawText = (pasteInput.value || "").trim();
            if (!rawText) {
                pasteSummary.style.display = "block";
                pasteSummary.style.background = "#fee2e2";
                pasteSummary.style.border = "1px solid #fca5a5";
                pasteSummary.style.color = "#991b1b";
                pasteSummary.innerHTML = "⚠️ Please enter or paste at least one firm name.";
                return;
            }

            var queries = parsePastedFirmList(rawText);
            if (queries.length === 0) {
                pasteSummary.style.display = "block";
                pasteSummary.style.background = "#fee2e2";
                pasteSummary.style.border = "1px solid #fca5a5";
                pasteSummary.style.color = "#991b1b";
                pasteSummary.innerHTML = "⚠️ No valid firm names found.";
                return;
            }

            var matched = [];
            var unmatched = [];
            var matchedIndices = new Set();

            queries.forEach(function (q) {
                var match = findMatchingEntity(q, availableEntities);
                if (match) {
                    matched.push({ query: q, entity: match });
                    matchedIndices.add(match.index);
                } else {
                    unmatched.push(q);
                }
            });

            // Select only the matched entities
            selectedEntityIndices.clear();
            matchedIndices.forEach(function (idx) {
                selectedEntityIndices.add(idx);
            });

            renderEntityList();
            updateSelectedCount();
            updateExtractButtonState();

            // Display search results summary
            var total = queries.length;
            var foundCount = matched.length;
            var mismatchCount = unmatched.length;

            pasteSummary.style.display = "block";

            if (mismatchCount === 0) {
                pasteSummary.style.background = "#dcfce7";
                pasteSummary.style.border = "1px solid #86efac";
                pasteSummary.style.color = "#15803d";
                pasteSummary.innerHTML = "✓ <strong>" + foundCount + "/" + total + " firms found</strong>. All firms successfully matched and selected.";
            } else {
                pasteSummary.style.background = "#fef3c7";
                pasteSummary.style.border = "1px solid #fcd34d";
                pasteSummary.style.color = "#92400e";

                var mismatchLabel = mismatchCount === 1 ? "1 mismatch" : (mismatchCount + " mismatches");
                var unmatchedHtml = unmatched.map(function (u) {
                    return "<li><code>" + escapeHtml(u) + "</code></li>";
                }).join("");

                pasteSummary.innerHTML = "<strong>" + foundCount + "/" + total + " firms found; " + mismatchLabel + "</strong>" +
                    '<div style="margin-top:6px;font-size:12px;font-weight:600;">Unmatched firm' + (mismatchCount === 1 ? "" : "s") + ':</div>' +
                    '<ul style="margin:4px 0 0 18px;padding:0;max-height:120px;overflow-y:auto;">' + unmatchedHtml + '</ul>';
            }
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
