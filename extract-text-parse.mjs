import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

async function extractText(pdfPath) {
    let dataBuffer = fs.readFileSync(pdfPath);
    try {
        const data = await pdf(dataBuffer);
        console.log(data.text);
    } catch(err) {
        console.error(err);
    }
}

extractText('pdfs/Badanie_lekarskie_582965124.pdf');
