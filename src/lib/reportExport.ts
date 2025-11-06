import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ChartData {
  time: number;
  [key: string]: number;
}

export async function exportToPDF(reportName: string, sessionName: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Add header
  pdf.setFontSize(20);
  pdf.text(reportName, pageWidth / 2, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(sessionName, pageWidth / 2, 30, { align: 'center' });
  pdf.text(new Date().toLocaleDateString(), pageWidth / 2, 37, { align: 'center' });
  
  // Capture all charts
  const charts = document.querySelectorAll('[data-chart-container]');
  let yPosition = 50;
  
  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i] as HTMLElement;
    
    try {
      const canvas = await html2canvas(chart, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add new page if needed
      if (yPosition + imgHeight > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  }
  
  pdf.save(`${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportToCSV(data: ChartData[], metrics: { key: string; label: string }[], fileName: string) {
  // Create CSV header
  const headers = ['Time', ...metrics.map(m => m.label)];
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      const values = [row.time.toFixed(3)];
      metrics.forEach(m => {
        values.push((row[m.key] ?? '').toString());
      });
      return values.join(',');
    })
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
