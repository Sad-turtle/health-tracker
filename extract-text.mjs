import { readFileSync } from 'fs';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

async function extractText(pdfPath) {
    const buf = readFileSync(pdfPath);
    const data = new Uint8Array(buf);
    const doc = await pdfjsLib.getDocument({ data }).promise;
    
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
    }
    
    console.log(fullText);
}

extractText('/Users/yoka/Downloads/Aya/Androstendion_Witamina_D3-_metabolit_25_OH_709422639.pdf').catch(console.error);
