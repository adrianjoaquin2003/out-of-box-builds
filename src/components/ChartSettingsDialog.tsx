import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X } from 'lucide-react';

export interface ReferenceLine {
  value: number;
  label: string;
  color: string;
}

export interface ChartSettings {
  yAxisMode: 'auto' | 'custom';
  yAxisMin?: number;
  yAxisMax?: number;
  showMovingAverage: boolean;
  movingAverageWindow: number;
  referenceLines: ReferenceLine[];
  colors: string[];
}

interface ChartSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ChartSettings;
  onSave: (settings: ChartSettings) => void;
  metricCount: number;
}

export function ChartSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
  metricCount,
}: ChartSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<ChartSettings>(settings);
  const [newRefLine, setNewRefLine] = useState({ value: '', label: '', color: '#3b82f6' });

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  const addReferenceLine = () => {
    if (newRefLine.value && newRefLine.label) {
      setLocalSettings({
        ...localSettings,
        referenceLines: [
          ...localSettings.referenceLines,
          { value: parseFloat(newRefLine.value), label: newRefLine.label, color: newRefLine.color },
        ],
      });
      setNewRefLine({ value: '', label: '', color: '#3b82f6' });
    }
  };

  const removeReferenceLine = (index: number) => {
    setLocalSettings({
      ...localSettings,
      referenceLines: localSettings.referenceLines.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Chart Settings</DialogTitle>
          <DialogDescription>
            Customize Y-axis range, add reference lines, and configure statistical overlays
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="yaxis" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="yaxis">Y-Axis</TabsTrigger>
            <TabsTrigger value="reference">Reference Lines</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="yaxis" className="space-y-4">
            <div className="space-y-2">
              <Label>Y-Axis Range</Label>
              <Select
                value={localSettings.yAxisMode}
                onValueChange={(value: 'auto' | 'custom') =>
                  setLocalSettings({ ...localSettings, yAxisMode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (fit to data)</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {localSettings.yAxisMode === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ymin">Minimum</Label>
                  <Input
                    id="ymin"
                    type="number"
                    placeholder="Auto"
                    value={localSettings.yAxisMin ?? ''}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        yAxisMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ymax">Maximum</Label>
                  <Input
                    id="ymax"
                    type="number"
                    placeholder="Auto"
                    value={localSettings.yAxisMax ?? ''}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        yAxisMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reference" className="space-y-4">
            <div className="space-y-2">
              <Label>Add Reference Line</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Value"
                  value={newRefLine.value}
                  onChange={(e) => setNewRefLine({ ...newRefLine, value: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Label"
                  value={newRefLine.label}
                  onChange={(e) => setNewRefLine({ ...newRefLine, label: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={newRefLine.color}
                  onChange={(e) => setNewRefLine({ ...newRefLine, color: e.target.value })}
                  className="w-20"
                />
                <Button onClick={addReferenceLine} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Reference Lines</Label>
              {localSettings.referenceLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reference lines added</p>
              ) : (
                <div className="space-y-2">
                  {localSettings.referenceLines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="flex-1 text-sm">
                        {line.label}: {line.value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReferenceLine(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Moving Average</Label>
                <p className="text-sm text-muted-foreground">
                  Show smoothed trend line over data
                </p>
              </div>
              <Switch
                checked={localSettings.showMovingAverage}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, showMovingAverage: checked })
                }
              />
            </div>

            {localSettings.showMovingAverage && (
              <div className="space-y-2">
                <Label htmlFor="window">Window Size (data points)</Label>
                <Input
                  id="window"
                  type="number"
                  min="2"
                  max="100"
                  value={localSettings.movingAverageWindow}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      movingAverageWindow: parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Higher values = smoother line (recommended: 5-20)
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSave} className="flex-1">
            Apply Settings
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
