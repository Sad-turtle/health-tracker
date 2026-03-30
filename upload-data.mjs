import fs from 'fs';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzYClaLGW7T55vhjyaaN_knhV1Ffdh8z6TDoQYC_-valAN04e9PJJJdKVvYOnpTHkzuVw/exec';

const batch1 = JSON.parse(fs.readFileSync('./parsed_data.json', 'utf8'));
const batch3 = JSON.parse(fs.readFileSync('./batch3.json', 'utf8'));
const batch4 = JSON.parse(fs.readFileSync('./batch4.json', 'utf8'));

const allData = [...batch1, ...batch3, ...batch4];

const DOMAIN_MAP = {
    "TSH": "hormones",
    "FT4": "hormones",
    "anty-TPO": "hormones",
    "anty-TG": "hormones",
    "Glukoza": "metabolic",
    "Sód": "micronutrients",
    "Potas": "micronutrients",
    "Kreatynina": "metabolic",
    "eGFR": "metabolic",
    "Leukocyty": "blood",
    "Neutrofile": "blood",
    "Limfocyty": "blood",
    "Monocyty": "blood",
    "Eozynofile": "blood",
    "Bazofile": "blood",
    "Niedojrzałe granulocyty IG": "blood",
    "Neutrofile %": "blood",
    "Limfocyty %": "blood",
    "Monocyty %": "blood",
    "Eozynofile %": "blood",
    "Bazofile %": "blood",
    "Niedojrzałe granulocyty IG %": "blood",
    "Erytrocyty": "blood",
    "Hemoglobina": "blood",
    "Hematokryt": "blood",
    "MCV": "blood",
    "MCH": "blood",
    "MCHC": "blood",
    "Witamina D metabolit 25(OH)": "micronutrients",
    "Witamina B12": "micronutrients",
    "Kwas foliowy": "micronutrients",
    "Ferrytyna": "micronutrients",
    "ALT": "metabolic",
    "CRP": "inflammatory",
    "Cholesterol całkowity": "cardiovascular",
    "Cholesterol HDL": "cardiovascular",
    "Ciężar właściwy moczu": "metabolic",
    "pH moczu": "metabolic"
};

async function syncAll() {
    try {
        console.log("Fetching profiles...");
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=readAll`);
        const json = await res.json();
        const profiles = json.PROFILES || [];
        // profiles format: user_id | name | dob | sex | is_admin
        // Find KENZHETAYEV YERNAR
        let userId = 'user_1'; // fallback
        for (let i = 1; i < profiles.length; i++) {
            if (profiles[i][1] && profiles[i][1].toUpperCase().includes('YERNAR')) {
                userId = profiles[i][0];
                break;
            }
        }
        console.log("Mapped user to ID:", userId);

        let success = 0;
        for (const item of allData) {
            const domain = DOMAIN_MAP[item.test_name] || "advanced";
            // Check if already exists in tab to prevent duplicates 
            const tabData = json[domain] || [];
            let exists = false;
            for (let i = 1; i < tabData.length; i++) {
                const row = tabData[i];
                if (row[0] === item.date && row[2] === item.test_name && parseFloat(row[3]) === item.value) {
                    exists = true;
                    break;
                }
            }

            if (exists) {
                console.log(`Skipping dup: ${item.date} ${item.test_name}`);
                continue;
            }

            const rowToInsert = [
                item.date,
                userId,
                item.test_name,
                item.value,
                item.unit,
                "manual", // source
                domain,
                "Diagnostyka", // lab_name
                "" // notes
            ];

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({
                    action: "appendRow",
                    tab: domain,
                    row: rowToInsert
                })
            });

            if (response.ok) {
                success++;
                console.log(`Uploaded ${item.test_name} to ${domain}`);
            } else {
                console.error(`Failed ${item.test_name}`, await response.text());
            }
        }

        console.log(`Completed. Successfully uploaded ${success} items.`);
    } catch (err) {
        console.error("Error:", err);
    }
}

syncAll();
