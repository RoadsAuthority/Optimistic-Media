
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLeaveTypes, createLeaveType, updateLeaveType } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { LeaveType } from '@/types/leave';

export default function LeaveTypesPage() {
  const leaveTypes = useLeaveTypes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<Partial<LeaveType>>({
    name: '',
    color: '#3b82f6',
    annualAllowance: 20,
    requiresAttachment: false,
  });
  const [loading, setLoading] = useState(false);

  const handleEdit = (type: LeaveType) => {
    setEditingType(type);
    setFormData(type);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingType(null);
    setFormData({
      name: '',
      color: '#3b82f6',
      annualAllowance: 20,
      requiresAttachment: false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingType) {
        await updateLeaveType(editingType.id, formData);
        toast.success('Leave type updated');
      } else {
        await createLeaveType(formData as any);
        toast.success('Leave type created');
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error('Failed to save leave type');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!leaveTypes) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout
      title="Leave Types"
      subtitle="Configure leave types and their rules"
    >
      <div className="space-y-6">
        {/* Add Button */}
        <div className="flex justify-end">
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Leave Type
          </Button>
        </div>

        {/* Leave Types Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leaveTypes.map((type) => (
            <Card key={type.id} className="relative overflow-hidden group">
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: type.color }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleEdit(type)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Annual Allowance</Label>
                  <p className="text-2xl font-bold">{type.annualAllowance} days</p>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Requires Attachment</Label>
                  <Switch checked={type.requiresAttachment} disabled />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
              <DialogDescription>
                Configure the rules for this leave category.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowance">Annual Allowance (Days)</Label>
                <Input
                  id="allowance"
                  type="number"
                  value={formData.annualAllowance}
                  onChange={(e) => setFormData({ ...formData, annualAllowance: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color Label</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    className="w-12 h-10 p-1"
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border p-3 rounded-md">
                <Label htmlFor="attachment" className="cursor-pointer">Requires Attachment</Label>
                <Switch
                  id="attachment"
                  checked={formData.requiresAttachment}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresAttachment: checked })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

