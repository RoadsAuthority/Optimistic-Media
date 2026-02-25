import { useState } from 'react';
import { LeaveRequest } from '@/types/leave';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, XCircle, MoreVertical, FileText, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { updateLeaveRequestStatus } from '@/hooks/useData';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PendingApprovalsCardProps {
  requests: LeaveRequest[];
}

export function PendingApprovalsCard({ requests }: PendingApprovalsCardProps) {
  const { currentUser } = useAuth();
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [batchAction, setBatchAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);

  const handleApprove = async (id: string) => {
    if (!currentUser) return;
    try {
      await updateLeaveRequestStatus(id, 'APPROVED', currentUser.id);
      toast.success('Leave request approved');
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleBatchAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!currentUser || selectedIds.length === 0) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await updateLeaveRequestStatus(id, status, currentUser.id, status === 'REJECTED' ? reason : undefined);
      }
      toast.success(`Successfully processed ${selectedIds.length} requests`);
      setSelectedIds([]);
      setBatchAction(null);
      setReason('');
    } catch (error) {
      toast.error('Failed to process one or more requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleReject = async () => {
    if (!currentUser || !rejectingId) return;
    setLoading(true);
    try {
      await updateLeaveRequestStatus(rejectingId, 'REJECTED', currentUser.id, reason);
      toast.success('Leave request rejected');
      setRejectingId(null);
      setReason('');
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    // Only select requests the current user is allowed to action
    const actionable = pendingRequests
      .filter(r => currentUser?.id !== r.filedBy && currentUser?.id !== r.userId)
      .map(r => r.id);
    setSelectedIds(prev =>
      prev.length === actionable.length ? [] : actionable
    );
  };

  return (
    <div className="dashboard-card animate-fade-in h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-foreground">Pending Approvals</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="text-xs text-muted-foreground"
          >
            {selectedIds.length === pendingRequests.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-approved hover:bg-approved/90 text-white"
                onClick={() => setBatchAction('APPROVE')}
              >
                Approve ({selectedIds.length})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBatchAction('REJECT')}
              >
                Reject ({selectedIds.length})
              </Button>
            </div>
          )}
          <span className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full">
            {pendingRequests.length} pending
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending approvals
          </div>
        ) : (
          pendingRequests.map((request) => {
            // Prevent self-approval: check if user filed it OR if it's the user's own request
            const filedByCurrentUser = currentUser?.id === request.filedBy;
            const isOwnRequest = currentUser?.id === request.userId;
            const cannotApprove = filedByCurrentUser || isOwnRequest;
            return (
              <div
                key={request.id}
                className={`flex items-center justify-between p-3 rounded-lg border bg-card transition-colors ${selectedIds.includes(request.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={cannotApprove}
                    onClick={() => toggleSelect(request.id)}
                  >
                    {selectedIds.includes(request.id) ? (
                      <CheckSquare className="h-5 w-5 text-primary" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={request.user?.avatar} />
                    <AvatarFallback>
                      {request.user?.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {request.user?.name}
                      {request.isEmergency && (
                        <span className="ml-2 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                      {cannotApprove && (
                        <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          {filedByCurrentUser ? 'Filed by you' : 'Your request'} — another admin must approve
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.leaveType?.name} • {request.daysRequested} days
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-approved hover:text-approved hover:bg-approved/10"
                    disabled={cannotApprove}
                    title={cannotApprove ? 'You cannot approve this request — another admin must approve' : 'Approve'}
                    onClick={() => handleApprove(request.id)}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rejected hover:text-rejected hover:bg-rejected/10"
                    disabled={cannotApprove}
                    title={cannotApprove ? 'You cannot reject this request — another admin must reject' : 'Reject'}
                    onClick={() => setRejectingId(request.id)}
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingRequest(request)}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request. This will be shared with the employee.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Insufficient coverage for the team during this period..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={loading || !reason.trim()}
              onClick={handleSingleReject}
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Action Dialog */}
      <Dialog open={!!batchAction} onOpenChange={(open) => !open && setBatchAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {batchAction === 'APPROVE' ? 'Approve' : 'Reject'} {selectedIds.length} Requests
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {batchAction === 'APPROVE' ? 'approve' : 'reject'} all selected requests?
            </DialogDescription>
          </DialogHeader>
          {batchAction === 'REJECT' && (
            <div className="py-4">
              <Textarea
                placeholder="Reason for rejection (applied to all selected)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAction(null)}>Cancel</Button>
            <Button
              variant={batchAction === 'APPROVE' ? 'default' : 'destructive'}
              disabled={loading || (batchAction === 'REJECT' && !reason.trim())}
              onClick={() => handleBatchAction(batchAction === 'APPROVE' ? 'APPROVED' : 'REJECTED')}
            >
              {loading ? 'Processing...' : `Confirm ${batchAction === 'APPROVE' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog */}
      <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarImage src={viewingRequest.user?.avatar} />
                  <AvatarFallback>{viewingRequest.user?.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{viewingRequest.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{viewingRequest.user?.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{viewingRequest.leaveType?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{viewingRequest.daysRequested} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(viewingRequest.startDate), 'PPPP')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(viewingRequest.endDate), 'PPPP')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <div className="p-3 border rounded-lg bg-card text-sm">
                  {viewingRequest.reason || <span className="italic text-muted-foreground">No reason provided</span>}
                </div>
              </div>
              {viewingRequest.attachmentUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Attachment</p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a href={viewingRequest.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      View Attachment
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingRequest(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
