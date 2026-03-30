const fetch = require('node-fetch');

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUXPymnIQyqrFa9H-mQsHQ7_0Z1WqfHpSP5PwjF2IZlg-UygfKo7Z1eLDs4bcN3diB/exec'\;

async function test_delete() {
    // 1. Fetch data
    console.log("Fetching all data...");
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=readAll`);
    const data = await res.json();
    
    // 2. Find a row to delete (e.g., from metabolic)
    if (!data.metabolic) {
       console.log("No metabolic tab found"); return;
    }
    const metabolicRows = data.metabolic;
    console.log("Metabolic rows count:", metabolicRows.length);
    if (metabolicRows.length < 2) return;
    
    // Pick the last row
    const target = metabolicRows[metabolicRows.length - 1];
    console.log("Target to delete:", target);
    
    // 3. Try to delete it
    // Pop empty strings
    const payloadRow = [...target];
    while (payloadRow.length > 0 && payloadRow[payloadRow.length - 1] === "") {
        payloadRow.pop();
    }
    
    console.log("Payload sent to delete:", payloadRow);
    const delRes = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "deleteRow", tab: "metabolic", row: payloadRow })
    });
    
    const delJson = await delRes.json();
    console.log("Delete result:", delJson);
}

test_delete();
