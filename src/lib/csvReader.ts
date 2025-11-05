import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

export interface CsvMetric {
  key: string;
  label: string;
  unit: string;
  category: string;
}

/**
 * Downloads and streams a CSV file from storage, extracting specific columns
 */
export async function queryCsvMetric(
  filePath: string,
  metricName: string,
  sampleSize: number = 2000
): Promise<{ time: number; value: number }[]> {
  try {
    console.log(`Downloading CSV from storage: ${filePath}`);
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download CSV: ${downloadError.message}`);
    }

    console.log(`File downloaded, size: ${fileData.size} bytes`);

    // Decompress if needed
    let csvBlob = fileData;
    if (filePath.endsWith('.deflate')) {
      const decompressed = new DecompressionStream('deflate');
      const decompressedStream = fileData.stream().pipeThrough(decompressed);
      csvBlob = await new Response(decompressedStream).blob();
    } else if (filePath.endsWith('.gz')) {
      const decompressed = new DecompressionStream('gzip');
      const decompressedStream = fileData.stream().pipeThrough(decompressed);
      csvBlob = await new Response(decompressedStream).blob();
    }

    console.log(`Decompressed size: ${csvBlob.size} bytes`);

    // Convert Blob to File for Papa Parse
    const csvFile = new File([csvBlob], 'data.csv', { type: 'text/csv' });

    // Parse CSV using Papa Parse (efficient streaming)
    return new Promise((resolve, reject) => {
      const results: { time: number; value: number }[] = [];
      let headers: string[] = [];
      let timeIndex = -1;
      let metricIndex = -1;
      let lineNumber = 0;
      let totalRows = 0;

      const sanitize = (name: string): string => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      };

      Papa.parse(csvFile, {
        worker: true,
        step: (row: any) => {
          lineNumber++;

          // Line 15: Headers (index 14)
          if (lineNumber === 15) {
            headers = row.data.map((h: string) => sanitize(h.trim().replace(/"/g, '')));
            timeIndex = headers.indexOf('time');
            metricIndex = headers.indexOf(metricName);
            
            console.log(`Found time at index ${timeIndex}, ${metricName} at index ${metricIndex}`);
            
            if (timeIndex === -1 || metricIndex === -1) {
              reject(new Error(`Metric "${metricName}" or "time" column not found`));
              return;
            }
          }

          // Data rows start at line 17 (index 16)
          if (lineNumber >= 17 && timeIndex >= 0 && metricIndex >= 0) {
            const time = parseFloat(row.data[timeIndex]);
            const value = parseFloat(row.data[metricIndex]);

            if (!isNaN(time) && !isNaN(value)) {
              totalRows++;
              // Sample evenly
              const step = Math.max(1, Math.floor(totalRows / sampleSize));
              if (totalRows % step === 0) {
                results.push({ time, value });
              }
            }
          }
        },
        complete: () => {
          console.log(`Parsed ${totalRows} rows, sampled ${results.length} points`);
          resolve(results);
        },
        error: (error: any) => {
          console.error('CSV parsing error:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error reading CSV:', error);
    throw error;
  }
}

/**
 * Gets available metrics from a CSV file by reading just the header
 */
export async function getCsvMetrics(filePath: string): Promise<CsvMetric[]> {
  try {
    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download CSV: ${downloadError.message}`);
    }

    // Decompress if needed
    let csvBlob = fileData;
    if (filePath.endsWith('.deflate')) {
      const decompressed = new DecompressionStream('deflate');
      const decompressedStream = fileData.stream().pipeThrough(decompressed);
      csvBlob = await new Response(decompressedStream).blob();
    } else if (filePath.endsWith('.gz')) {
      const decompressed = new DecompressionStream('gzip');
      const decompressedStream = fileData.stream().pipeThrough(decompressed);
      csvBlob = await new Response(decompressedStream).blob();
    }

    // Read just the header lines
    const text = await csvBlob.text();
    const lines = text.split('\n').slice(0, 20); // Just first 20 lines

    const headers = lines[14]?.split(',').map(h => h.trim().replace(/"/g, '')) || [];
    const units = lines[15]?.split(',').map(u => u.trim().replace(/"/g, '')) || [];

    const metricsMap: Record<string, { label: string; category: string }> = {
      'time': { label: 'Time', category: 'Timing' },
      'ground_speed': { label: 'Speed', category: 'Performance' },
      'engine_speed': { label: 'Engine RPM', category: 'Engine' },
      'throttle_position': { label: 'Throttle', category: 'Driver Input' },
    };

    const sanitize = (name: string): string => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    };

    return headers
      .filter(h => h && h !== 'time')
      .map((header, idx) => {
        const key = sanitize(header);
        return {
          key,
          label: metricsMap[key]?.label || header,
          unit: units[idx] || '',
          category: metricsMap[key]?.category || 'Other'
        };
      });
  } catch (error) {
    console.error('Error reading CSV metrics:', error);
    throw error;
  }
}
