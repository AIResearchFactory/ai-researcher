import { useEffect, useState } from 'react';
import { WorkflowSchedule } from '@/api/tauri';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface WorkflowScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: WorkflowSchedule;
  isDraft?: boolean;
  onSave: (schedule: WorkflowSchedule) => Promise<void>;
  onClear: () => Promise<void>;
}

export default function WorkflowScheduleDialog({
  open,
  onOpenChange,
  value,
  isDraft = false,
  onSave,
  onClear,
}: WorkflowScheduleDialogProps) {
  const [enabled, setEnabled] = useState(value?.enabled ?? true);
  const [cron, setCron] = useState(value?.cron ?? '*/15 * * * *');
  const [timezone, setTimezone] = useState(value?.timezone ?? 'UTC');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEnabled(value?.enabled ?? true);
    setCron(value?.cron ?? '*/15 * * * *');
    setTimezone(value?.timezone ?? 'UTC');
  }, [open, value?.enabled, value?.cron, value?.timezone]);

  const handleSave = async () => {
    if (!cron.trim()) return;
    setSaving(true);
    try {
      await onSave({
        enabled,
        cron: cron.trim(),
        timezone: timezone.trim() || 'UTC',
        next_run_at: value?.next_run_at,
        last_triggered_at: value?.last_triggered_at,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onClear();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workflow Schedule</DialogTitle>
        </DialogHeader>

        {isDraft ? (
          <div className="text-sm text-muted-foreground">
            Save this workflow first, then you can configure a schedule.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Enable schedule</div>
                <div className="text-xs text-muted-foreground">Run this workflow automatically via cron.</div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wf-cron">Cron expression</Label>
              <Input
                id="wf-cron"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                placeholder="*/15 * * * *"
              />
              <p className="text-[11px] text-muted-foreground">Example: <code>0 * * * *</code> = every hour.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wf-timezone">Timezone (IANA)</Label>
              <Input
                id="wf-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC / Asia/Jerusalem / Europe/Berlin"
              />
            </div>

            {!!value?.next_run_at && (
              <div className="text-xs text-muted-foreground">
                Next run: <span className="font-mono">{value.next_run_at}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {!isDraft && !!value && (
            <Button variant="destructive" onClick={handleClear} disabled={saving}>
              Clear schedule
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          {!isDraft && (
            <Button onClick={handleSave} disabled={saving || !cron.trim()}>
              {saving ? 'Saving...' : 'Save schedule'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
