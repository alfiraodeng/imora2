'use client';

type PdfDocument = any;

const logoDataUrl = (color: string) => new Promise<string | null>((resolve) => { const image = new Image(); image.onload = () => { const canvas = globalThis.document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const context = canvas.getContext('2d'); if (!context) return resolve(null); context.drawImage(image, 0, 0); context.globalCompositeOperation = 'source-in'; context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/png')); }; image.onerror = () => resolve(null); image.src = '/indexim-logo-white.webp'; });

export async function prepareIndeximPdf(document: PdfDocument, title: string, subtitle: string, reportId: string) {
  const [logo, watermark] = await Promise.all([logoDataUrl('#ffffff'), logoDataUrl('#e7f0f5')]); let page = 1;
  const decorate = () => { document.setFillColor(7, 28, 47); document.rect(0, 0, 210, 31, 'F'); document.setFillColor(43, 205, 226); document.rect(0, 30, 210, 1, 'F'); if (logo) document.addImage(logo, 'PNG', 14, 8, 38, 14); document.setFont('helvetica', 'bold'); document.setFontSize(10); document.setTextColor(255, 255, 255); document.text('IMORA 2.0', 164, 13); document.setFont('helvetica', 'normal'); document.setFontSize(6.8); document.setTextColor(183, 216, 229); document.text('INDEXIM WEATHER INTELLIGENCE', 164, 18); if (watermark) document.addImage(watermark, 'PNG', 43, 116, 124, 48); document.setFont('helvetica', 'bold'); document.setFontSize(16); document.setTextColor(13, 42, 63); document.text(title, 14, 43); document.setFont('helvetica', 'normal'); document.setFontSize(8); document.setTextColor(91, 112, 127); document.text(subtitle, 14, 49); document.setDrawColor(210, 221, 229); document.line(14, 285, 196, 285); document.setFontSize(7); document.setTextColor(92, 112, 128); document.text('CONFIDENTIAL · INDEXIM INTERNAL USE', 14, 290); document.text(`Report ID ${reportId} · Page ${page}`, 196, 290, { align: 'right' }); };
  return { decorate, nextPage: () => { document.addPage(); page += 1; decorate(); } };
}
