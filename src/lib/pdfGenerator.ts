import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { renderAsync } from 'docx-preview';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

export async function generateDOCXBlob(
  templateBase64: string,
  data: any
): Promise<Blob> {
  const binaryString = window.atob(templateBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  
  const zip = new PizZip(bytes.buffer);
  const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
  });

  doc.render(data);

  return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function generateAndDownloadDOCX(
  templateBase64: string,
  data: any,
  fileName: string
) {
  const out = await generateDOCXBlob(templateBase64, data);
  saveAs(out, fileName);
}

export async function generatePDFBlob(
  templateBase64: string,
  data: any,
  convertApiKey?: string | null
): Promise<Blob> {
  // 1. Generate DOCX with docxtemplater
  const docxBlob = await generateDOCXBlob(templateBase64, data);

  // If ConvertAPI key is provided, use it for perfect conversion
  if (convertApiKey) {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(docxBlob);
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });
      const base64data = (reader.result as string).split(',')[1];

      const response = await fetch(`https://v2.convertapi.com/convert/docx/to/pdf?Secret=${convertApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Parameters: [
            {
              Name: 'File',
              FileValue: {
                Name: 'certificat.docx',
                Data: base64data
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Erreur ConvertAPI');
      }

      const result = await response.json();
      const pdfBase64 = result.Files[0].FileData;
      
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], {type: 'application/pdf'});
    } catch (error) {
      console.error("ConvertAPI failed, falling back to local rendering", error);
    }
  }

  // 2. Render DOCX to HTML (Fallback)
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.backgroundColor = 'white';
  container.style.zIndex = '-1000';
  container.style.color = 'black';
  document.body.appendChild(container);

  try {
    await renderAsync(docxBlob, container, null, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      experimental: false,
      trimXmlDeclaration: true,
      debug: false,
    });

    const section = (container.querySelector('section.docx') as HTMLElement) || container;
    
    // 3. Convert HTML to PDF
    const opt = {
      margin:       0,
      image:        { type: 'jpeg' as const, quality: 1 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        scrollY: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    const pdf = await html2pdf().set(opt).from(section).output('blob');
    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateAndDownloadPDF(
  templateBase64: string,
  data: any,
  fileName: string,
  convertApiKey?: string | null
) {
  const pdfBlob = await generatePDFBlob(templateBase64, data, convertApiKey);
  saveAs(pdfBlob, fileName);
}

