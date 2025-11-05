import { supabase } from '@/integrations/supabase/client';

export interface ParquetColumn {
  name: string;
  type: string;
  unit?: string;
}

export interface ParquetData {
  schema: ParquetColumn[];
  data: Record<string, number[]>;
  rowCount: number;
}

/**
 * Downloads and reads a Parquet file from Supabase storage
 */
export async function readParquetFile(filePath: string): Promise<ParquetData> {
  try {
    // Download the Parquet file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('racing-data')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download Parquet file: ${downloadError.message}`);
    }

    // Decompress the gzipped data
    const decompressed = new DecompressionStream('gzip');
    const decompressedStream = fileData.stream().pipeThrough(decompressed);
    const decompressedBlob = await new Response(decompressedStream).blob();
    const jsonText = await decompressedBlob.text();

    // Parse the JSON (temporary format until we implement true Parquet)
    const parquetData = JSON.parse(jsonText) as ParquetData;

    return parquetData;
  } catch (error) {
    console.error('Error reading Parquet file:', error);
    throw error;
  }
}

/**
 * Queries specific metrics from a Parquet file with sampling
 */
export async function queryParquetMetric(
  filePath: string,
  metricName: string,
  sampleSize: number = 2000
): Promise<{ time: number; value: number }[]> {
  const parquetData = await readParquetFile(filePath);

  // Find time column (usually first column or named 'time')
  const timeColumn = parquetData.data['time'] || Object.values(parquetData.data)[0];
  const valueColumn = parquetData.data[metricName];

  if (!valueColumn) {
    throw new Error(`Metric "${metricName}" not found in Parquet file`);
  }

  // Sample the data evenly
  const totalRows = parquetData.rowCount;
  const step = Math.max(1, Math.floor(totalRows / sampleSize));
  
  const sampledData: { time: number; value: number }[] = [];
  for (let i = 0; i < totalRows; i += step) {
    sampledData.push({
      time: timeColumn[i],
      value: valueColumn[i]
    });
  }

  // Always include the last point
  if (sampledData.length > 0 && sampledData[sampledData.length - 1].time !== timeColumn[totalRows - 1]) {
    sampledData.push({
      time: timeColumn[totalRows - 1],
      value: valueColumn[totalRows - 1]
    });
  }

  return sampledData;
}

/**
 * Gets available metrics from a Parquet file
 */
export async function getParquetMetrics(filePath: string): Promise<ParquetColumn[]> {
  const parquetData = await readParquetFile(filePath);
  return parquetData.schema.filter(col => col.name !== 'time');
}
