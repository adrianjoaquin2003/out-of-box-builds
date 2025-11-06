import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportReportAsPDF(reportName: string, sessionName: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  
  // Add title
  pdf.setFontSize(18);
  pdf.text(reportName, margin, margin + 10);
  pdf.setFontSize(12);
  pdf.text(sessionName, margin, margin + 18);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 24);
  
  let yOffset = margin + 35;

  // Find all chart cards
  const charts = document.querySelectorAll('[data-chart-card]');
  
  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i] as HTMLElement;
    
    try {
      // Capture chart as image
      const canvas = await html2canvas(chart, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add new page if needed
      if (yOffset + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yOffset = margin;
      }
      
      pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
      yOffset += imgHeight + 10;
      
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  }
  
  pdf.save(`${reportName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`);
}

export async function exportChartDataAsCSV(
  chartData: { time: number; value: number; movingAvg?: number }[],
  metricLabel: string,
  metricUnit: string
) {
  const headers = metricLabel.includes(',') 
    ? ['Time (s)', ...metricLabel.split(',').map(m => `${m.trim()} (${metricUnit})`)]
    : ['Time (s)', `${metricLabel} (${metricUnit})`, ...(chartData[0]?.movingAvg !== undefined ? ['Moving Average'] : [])];
  
  const rows = chartData.map(point => {
    const values = [point.time.toFixed(3), point.value.toFixed(3)];
    if (point.movingAvg !== undefined) {
      values.push(point.movingAvg.toFixed(3));
    }
    return values.join(',');
  });
  
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${metricLabel.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function copyShareableLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    return true;
  }).catch(() => {
    return false;
  });
}
