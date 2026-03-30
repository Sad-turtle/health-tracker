import Tesseract from 'tesseract.js';

async function extractOCR(imagePath) {
    console.log(`Starting OCR on ${imagePath}...`);
    try {
        const { data: { text } } = await Tesseract.recognize(
            imagePath,
            'pol', // using Polish language model
            { logger: m => console.log(m) }
        );
        console.log("--- OCR RESULT ---");
        console.log(text);
    } catch(err) {
        console.error(err);
    }
}

extractOCR('test_highres.png');
