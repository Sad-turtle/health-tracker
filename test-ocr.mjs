import { readFileSync } from 'fs';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import Tesseract from "tesseract.js";
import { createCanvas } from "canvas";

async function run() {
    const buf = readFileSync('pdfs/Badanie_lekarskie_582965124.pdf');
    const data = new Uint8Array(buf);
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    const page = await pdf.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    // We don't have node-canvas installed with pdfjs support normally, 
    // so let's just use tesseract on a rendered page if possible, 
    // but pdf.js in Node needs canvas implementation for render().
}
run().catch(console.error);
