/**
 * Health Tracker — Google Apps Script Backend
 *
 * Deploy this script attached to your Health Tracker spreadsheet.
 *
 * SETUP:
 *   1. Open your Google Sheet → Extensions → Apps Script
 *   2. Paste this entire file into Code.gs (replace any existing code)
 *   3. Click Deploy → New deployment → Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. Copy the deployment URL and paste it into src/lib/sheets.ts
 *
 * The spreadsheet should have these tabs:
 *   metabolic, blood, cardiovascular, hormones, micronutrients,
 *   inflammatory, advanced, cancer_markers, gut,
 *   PROFILES, SCHEDULES, REFERENCE_RANGES
 *
 * Each domain tab header row:
 *   date | user_id | test_name | value | unit | source | domain | lab_name | notes
 *
 * PROFILES header:
 *   user_id | name | dob | sex | is_admin
 *
 * SCHEDULES header:
 *   test_name | interval_days | domain | applies_to | notes
 *
 * REFERENCE_RANGES header:
 *   test_name | sex | optimal_lo | optimal_hi | lab_lo | lab_hi | unit | higher_is_better
 */

// Allow cross-origin requests from GitHub Pages / localhost
function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    if (action === 'readTab') {
      result = readTab(e.parameter.tab);
    } else if (action === 'readAll') {
      result = readAllTabs();
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action, payload;

  try {
    payload = JSON.parse(e.postData.contents);
    action = payload.action;
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid JSON: ' + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var result;

  try {
    if (action === 'appendRow') {
      result = appendRow(payload.tab, payload.row);
    } else if (action === 'deleteRow') {
      result = deleteRow(payload.tab, payload.row);
    } else {
      result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Read a single tab ────────────────────────────────────────────────
function readTab(tabName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    return { tab: tabName, values: [] };
  }

  var data = sheet.getDataRange().getValues();
  // Convert all values to strings for consistency
  var stringData = data.map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      return String(cell);
    });
  });

  return { tab: tabName, values: stringData };
}

// ── Read ALL tabs in one round-trip ──────────────────────────────────
function readAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var result = {};
  
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var tabName = sheet.getName();
    var data = readTab(tabName);
    result[tabName] = data.values;
  }

  return result;
}

// ── Append a row to a tab ────────────────────────────────────────────
function appendRow(tabName, rowArray) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    // Create the tab if it doesn't exist
    sheet = ss.insertSheet(tabName);
  }

  sheet.appendRow(rowArray);
  return { success: true, tab: tabName };
}

// ── Delete a row from a tab ──────────────────────────────────────────
function deleteRow(tabName, rowArray) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    return { error: 'Tab not found' };
  }

  var data = sheet.getDataRange().getValues();
  // Reverse search to delete the latest matching row if there are duplicates
  for (var i = data.length - 1; i >= 1; i--) { // Skipping header row i=0
    var isMatch = true;
    for (var j = 0; j < rowArray.length; j++) {
       // Compare as strings to handle dates safely
       var cellVal = (data[i][j] instanceof Date) ? Utilities.formatDate(data[i][j], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(data[i][j]);
       if (cellVal !== String(rowArray[j])) {
          isMatch = false;
          break;
       }
    }
    if (isMatch) {
       sheet.deleteRow(i + 1); // 1-indexed
       return { success: true, deletedRow: i + 1 };
    }
  }
  return { error: 'Row not found' };
}
