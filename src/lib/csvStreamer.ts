import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

/**
 * Streams a CSV file and extracts only the requested metric
 * This avoids loading the entire file into memory
 */
export async function streamCsvMetric(
  filePath: string,
  metricName: string,
  sampleSize: number = 2000
): Promise<{ time: number; value: number }[]> {
  console.log(`Streaming CSV metric: ${metricName} from ${filePath}`);
  
  // Download file from storage
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('racing-data')
    .download(filePath);

  if (downloadError) {
    throw new Error(`Download failed: ${downloadError.message}`);
  }

  // Decompress if needed
  let csvBlob = fileBlob;
  if (filePath.endsWith('.deflate')) {
    const decompressed = new DecompressionStream('deflate');
    const decompressedStream = fileBlob.stream().pipeThrough(decompressed);
    csvBlob = await new Response(decompressedStream).blob();
  }

  // Convert to File for Papa Parse
  const csvFile = new File([csvBlob], 'data.csv', { type: 'text/csv' });

  return new Promise((resolve, reject) => {
    const results: { time: number; value: number }[] = [];
    let headers: string[] = [];
    let timeIdx = -1;
    let metricIdx = -1;
    let rowCount = 0;
    let totalRows = 0;

    const sanitize = (name: string): string => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    };

    Papa.parse(csvFile, {
      worker: true,
      step: (result: any, parser: any) => {
        rowCount++;

        // Line 15: Headers (index 14)
        if (rowCount === 15) {
          headers = result.data.map((h: string) => sanitize(h.trim().replace(/"/g, '')));
          timeIdx = headers.indexOf('time');
          metricIdx = headers.indexOf(metricName);

          if (timeIdx === -1) {
            parser.abort();
            reject(new Error('Time column not found'));
            return;
          }

          if (metricIdx === -1) {
            parser.abort();
            reject(new Error(`Metric "${metricName}" not found`));
            return;
          }

          console.log(`Found time at ${timeIdx}, ${metricName} at ${metricIdx}`);
        }

        // Data rows start at line 17 (index 16)
        if (rowCount >= 17 && timeIdx >= 0 && metricIdx >= 0) {
          const time = parseFloat(result.data[timeIdx]);
          const value = parseFloat(result.data[metricIdx]);

          if (!isNaN(time) && !isNaN(value)) {
            totalRows++;
            // Sample evenly
            const step = Math.max(1, Math.floor(totalRows / sampleSize));
            if (totalRows % step === 0 || totalRows === 1) {
              results.push({ time, value });
            }
          }
        }
      },
      complete: () => {
        console.log(`Streamed ${totalRows} rows, sampled ${results.length} points`);
        resolve(results);
      },
      error: (error: any) => {
        console.error('CSV parsing error:', error);
        reject(error);
      }
    });
  });
}
