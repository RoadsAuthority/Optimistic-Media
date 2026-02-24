
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUsers, useLeaveBalances, useLeaveTypes, updateProfile, sendTwilioMessage } from '@/hooks/useData';
import { User, LeaveBalance, UserRole } from '@/types/leave';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Pencil, Copy, Check, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileModal } from '@/components/employees/UserProfileModal';

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const users = useUsers();
  const { currentUser } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [manualData, setManualData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'EMPLOYEE' as UserRole,
    department: '',
    whatsapp: '',
  });
  const [loading, setLoading] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR';

  const [inviteMethod, setInviteMethod] = useState<'EMAIL' | 'WHATSAPP' | null>(null);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'EMPLOYEE' as UserRole,
    department: '',
    managerId: '',
    whatsapp: '',
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const sendEmailInvite = (link: string) => {
    if (!inviteData.email) return;

    const subject = encodeURIComponent('Invitation to join Optimistic Media Group');
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited to join Optimistic Media Group as a ${inviteData.role} in the ${inviteData.department} department.\n\nPlease click the link below to set up your account:\n\n${link}\n\nBest regards,\nThe Team`,
    );

    window.location.href = `mailto:${inviteData.email}?subject=${subject}&body=${body}`;
  };

  const getWhatsAppMessageBody = (link: string) => {
    const roleName = inviteData.role || 'Team Member';
    const deptName = inviteData.department || 'Our Team';
    return `*Invitation from Optimistic Media Group*\n\nHello! You've been invited to join our team as a *${roleName}* in the *${deptName}* department.\n\nPlease click the link below to set up your account and access the portal:\n\n${link}`;
  };

  const sendWhatsAppInvite = (link: string) => {
    if (!link) return;
    openWhatsAppUrl(link);
    toast.info('Opening WhatsApp to send invitation...');
  };

  const openWhatsAppUrl = (link: string) => {
    const message = getWhatsAppMessageBody(link);
    const text = encodeURIComponent(message);
    const cleanNumber = inviteData.whatsapp?.replace(/\D/g, '');
    const whatsappUrl = cleanNumber
      ? `https://api.whatsapp.com/send/?phone=${cleanNumber}&text=${text}`
      : `https://api.whatsapp.com/send/?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { createInvitation } = await import('@/hooks/useData');

      // Validate required fields
      if (!inviteData.role || !inviteData.department) {
        toast.error('Please fill in all required fields (role and department)');
        return;
      }

      let finalEmail = inviteData.email?.trim() || null;
      let finalWhatsapp = inviteData.whatsapp?.trim() || null;

      if (!finalEmail && !finalWhatsapp) {
        toast.error('Either Email or WhatsApp number is required');
        return;
      }

      console.log('Generating invitation with data:', {
        email: finalEmail,
        role: inviteData.role,
        department: inviteData.department,
        managerId: inviteData.managerId,
        whatsapp: finalWhatsapp
      });

      const invite = await createInvitation(
        finalEmail || '', // Keeping as empty string for DB if null
        inviteData.role,
        inviteData.department,
        currentUser?.id,
        finalWhatsapp || undefined,
        inviteData.managerId || undefined
      );

      if (!invite || !invite.token) {
        throw new Error('Invitation created but token is missing');
      }

      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
      console.log('Generated invitation link:', link);
      setGeneratedLink(link);

      // Automatically open the appropriate channel
      if (inviteMethod === 'EMAIL') {
        sendEmailInvite(link);
      } else if (inviteMethod === 'WHATSAPP') {
        sendWhatsAppInvite(link);
      }

      toast.success('Invitation link generated and ready to send!');
    } catch (error: any) {
      console.error('Failed to generate invite:', error);
      toast.error('Failed to generate invite: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedLink);
      } else {
        // Fallback for non-secure contexts or browsers without clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = generatedLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy link. Please manually copy it.');
    }
  };

  const handleSendEmail = () => {
    if (!generatedLink) return;
    sendEmailInvite(generatedLink);
  };

  const handleSendWhatsApp = () => {
    if (!generatedLink) return;
    sendWhatsAppInvite(generatedLink);
  };

  const resetInviteForm = () => {
    setGeneratedLink('');
    setInviteMethod(null);
    setInviteData({ email: '', role: 'EMPLOYEE', department: '', managerId: '', whatsapp: '' });
    setIsInviteOpen(false);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      department: user.department || '',
      role: user.role,
      whatsapp: user.whatsapp || '',
    });
    setIsEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      await updateProfile(editingUser.id, formData, currentUser?.id);
      toast.success('Employee updated successfully');
      setIsEditOpen(false);
    } catch (error) {
      toast.error('Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { createProfile } = await import('@/hooks/useData');
      await createProfile(manualData as Omit<User, 'id'>, currentUser?.id);
      toast.success('Employee created successfully');
      setIsManualOpen(false);
      setManualData({ name: '', email: '', role: 'EMPLOYEE', department: '', whatsapp: '' });
    } catch (error: any) {
      console.error('handleManualCreate error:', error);
      toast.error(error?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  if (!users) return <div>Loading employees...</div>;

  const filteredEmployees = users.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const EmployeeRow = ({ employee }: { employee: User }) => {
    const balances = useLeaveBalances(employee.id);
    const leaveTypes = useLeaveTypes();

    if (!balances || !leaveTypes) return null;

    return (
      <TableRow key={employee.id}>
        <TableCell
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => {
            setViewingUser(employee);
            setIsProfileOpen(true);
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={employee.avatar} />
              <AvatarFallback>
                {employee.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{employee.name}</p>
              <p className="text-sm text-muted-foreground">{employee.role}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>{employee.department}</TableCell>
        <TableCell className="text-muted-foreground">{employee.email}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-2">
            {balances.slice(0, 3).map((balance: LeaveBalance) => {
              const leaveType = leaveTypes.find(lt => lt.id === balance.leaveTypeId);
              return (
                <Badge
                  key={balance.leaveTypeId}
                  variant="secondary"
                  className="text-xs"
                  title={`${balance.usedDays} days used / ${balance.totalDays} total`}
                >
                  {leaveType?.name.split(' ')[0]}: {balance.remainingDays}/{balance.totalDays}d
                </Badge>
              );
            })}
          </div>
        </TableCell>
        <TableCell className="text-right">
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <DashboardLayout
      title="Employees"
      subtitle="Manage all employees and their leave balances"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsManualOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
              <Button onClick={() => setIsInviteOpen(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Invite Employee
              </Button>
            </div>
          )}
        </div>

        <div className="dashboard-card overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Leave Balances</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <EmployeeRow key={employee.id} employee={employee} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Update employee details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={formData.whatsapp || ''}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="e.g. +264 81..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Invite/Add Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={(open) => !open && resetInviteForm()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Employee</DialogTitle>
              <DialogDescription>
                {inviteMethod === null
                  ? "Choose how you'd like to invite your new team member."
                  : "Fill in the details for the invitation link."}
              </DialogDescription>
            </DialogHeader>

            {!generatedLink ? (
              <div className="space-y-6">
                {inviteMethod === null ? (
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => setInviteMethod('EMAIL')}
                    >
                      <Mail className="h-8 w-8 text-primary" />
                      <div className="text-center">
                        <p className="font-semibold">Via Email</p>
                        <p className="text-xs text-muted-foreground">Send to their inbox</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-32 flex flex-col gap-3 border-2 hover:border-green-500 hover:bg-green-50 transition-all"
                      onClick={() => setInviteMethod('WHATSAPP')}
                    >
                      <MessageSquare className="h-8 w-8 text-green-500" />
                      <div className="text-center">
                        <p className="font-semibold">Via WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Share a quick link</p>
                      </div>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleGenerateInvite} className="space-y-4">
                    {inviteMethod === 'EMAIL' ? (
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          required
                          placeholder="colleague@company.com"
                          value={inviteData.email}
                          onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-whatsapp">WhatsApp Number (with Country Code)</Label>
                          <Input
                            id="invite-whatsapp"
                            required
                            placeholder="e.g. 447123456789"
                            value={inviteData.whatsapp}
                            onChange={(e) => setInviteData({ ...inviteData, whatsapp: e.target.value })}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1 px-1">
                            Include international country code without + (e.g. 264 for Namibia, 44 for UK).
                          </p>
                          {import.meta.env.VITE_TWILIO_SANDBOX_JOIN_CODE && import.meta.env.VITE_TWILIO_SANDBOX_NUMBER && (
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 px-1 rounded bg-amber-50 dark:bg-amber-950/40 p-2 border border-amber-200 dark:border-amber-800">
                              <strong>Twilio Sandbox:</strong> Recipient must send <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded">join {import.meta.env.VITE_TWILIO_SANDBOX_JOIN_CODE}</code> to {import.meta.env.VITE_TWILIO_SANDBOX_NUMBER} in WhatsApp first, then they can receive the invite.
                            </p>
                          )}
                        </div>
                        {/* Email removed for WhatsApp invites per user request */}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={inviteData.role}
                          onValueChange={(val) => setInviteData({ ...inviteData, role: val as UserRole })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EMPLOYEE">Employee</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Input
                          placeholder="e.g. Sales"
                          required
                          value={inviteData.department}
                          onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="ghost" onClick={() => setInviteMethod(null)}>Back</Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Generating...' : 'Generate Link'}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-primary/20 space-y-3">
                  <p className="text-sm font-medium text-center">Your invitation link is ready!</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs p-2 bg-background border rounded truncate hover:text-primary hover:border-primary/50 transition-colors"
                    >
                      {generatedLink}
                    </a>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={copyToClipboard} title="Copy Link">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {inviteMethod === 'EMAIL' ? (
                    <Button className="w-full" onClick={handleSendEmail}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send via Email
                    </Button>
                  ) : (
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleSendWhatsApp}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full" onClick={resetInviteForm}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manual Add Dialog */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee Manually</DialogTitle>
              <DialogDescription>
                Create a profile directly for workers without email or smartphones.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  required
                  value={manualData.name}
                  onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  value={manualData.email}
                  onChange={(e) => setManualData({ ...manualData, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={manualData.role}
                    onValueChange={(val) => setManualData({ ...manualData, role: val as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    required
                    value={manualData.department}
                    onChange={(e) => setManualData({ ...manualData, department: e.target.value })}
                    placeholder="e.g. Cleaning"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager (Optional)</Label>
                <Select
                  value={manualData.managerId || 'none'}
                  onValueChange={(val) => setManualData({ ...manualData, managerId: val === 'none' ? undefined : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {users
                      .filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
                      .map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} ({manager.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={manualData.whatsapp || ''}
                  onChange={(e) => setManualData({ ...manualData, whatsapp: e.target.value })}
                  placeholder="e.g. +264 81..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsManualOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Profile'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <UserProfileModal
          user={viewingUser}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
