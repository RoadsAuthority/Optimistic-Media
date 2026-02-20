
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useLeaveBalances, useLeaveTypes, createLeaveRequest, useLeaveRequests } from '@/hooks/useData';
import { differenceInBusinessDays, addDays, format, isBefore, isWeekend } from 'date-fns';
import { CalendarIcon, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn, calculateWorkDays } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  userId: z.string().optional(),
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  reason: z.string().optional(),
  isEmergency: z.boolean().default(false),
  attachmentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LeaveRequestForm() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userBalances = useLeaveBalances(currentUser?.id);
  const leaveTypes = useLeaveTypes();
  const allUsers = useUsers();
  const allRequests = useLeaveRequests(currentUser?.id);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: currentUser.id,
      leaveTypeId: '',
      reason: '',
      isEmergency: false,
    },
  });

  const watchUserId = form.watch('userId');
  const watchStartDate = form.watch('startDate');
  const watchEndDate = form.watch('endDate');
  const watchLeaveType = form.watch('leaveTypeId');

  const selectedBalances = useLeaveBalances(watchUserId);

  if (!currentUser || !userBalances || !leaveTypes) return <div>Loading form...</div>;

  const calculateDays = () => {
    if (!watchStartDate || !watchEndDate) return 0;
    return calculateWorkDays(watchStartDate, watchEndDate);
  };

  const daysRequested = calculateDays();

  const selectedBalance = selectedBalances?.find(b => b.leaveTypeId === watchLeaveType);
  const selectedType = leaveTypes.find(lt => lt.id === watchLeaveType);

  const hasInsufficientBalance = selectedBalance && daysRequested > selectedBalance.remainingDays;
  const exceedsAnnualAllowance = selectedType && daysRequested > selectedType.annualAllowance;
  const hasPendingRequest = allRequests?.some(r => r.status === 'PENDING');

  const onSubmit = async (data: FormValues) => {
    if (hasInsufficientBalance) {
      toast.error(`Insufficient balance. You only have ${selectedBalance.remainingDays} days remaining.`);
      return;
    }

    if (exceedsAnnualAllowance) {
      toast.error(`Exceeds limit. Maximum allowed for ${selectedType.name} is ${selectedType.annualAllowance} days.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const targetUserId = data.userId || currentUser.id;
      // If an admin is filing on behalf of someone else, record who filed it
      const filedBy = (isAdmin && targetUserId !== currentUser.id) ? currentUser.id : undefined;

      await createLeaveRequest({
        userId: targetUserId,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        reason: data.reason || '',
        isEmergency: data.isEmergency,
        attachmentUrl: data.attachmentUrl,
      }, daysRequested, filedBy);

      toast.success('Leave request submitted successfully!', {
        description: `${daysRequested} days of ${selectedType?.name} requested`,
      });

      form.reset();
      navigate('/my-leaves');
    } catch (error) {
      console.error("Failed to submit leave request", error);
      toast.error('Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-card max-w-2xl animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-6">Submit Leave Request</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Admin: User Selection */}
          {isAdmin && allUsers && (
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requesting for Employee</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    As an Admin/HR, you can submit leave requests on behalf of other employees.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Leave Type */}
          <FormField
            control={form.control}
            name="leaveTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedLeaveType(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leaveTypes.map((type) => {
                      const balance = userBalances.find(b => b.leaveTypeId === type.id);
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span>{type.name}</span>
                            {balance && (
                              <span className="text-muted-foreground ml-2">
                                ({balance.remainingDays} days left)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Range */}
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          isBefore(date, new Date()) || isWeekend(date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          (watchStartDate && isBefore(date, watchStartDate)) ||
                          isBefore(date, new Date()) ||
                          isWeekend(date)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Days Summary */}
          {daysRequested > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Total business days requested: <span className="font-semibold text-foreground">{daysRequested}</span>
              </p>
            </div>
          )}

          {/* Insufficient Balance or Allowance Warning */}
          {daysRequested > 0 && (
            <div className="space-y-6">
              {hasPendingRequest && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-2">
                    <span className="font-semibold">Pending Request Alert</span>
                    <span>You already have a pending leave request. You must wait for it to be processed or cancel it before submitting a new one.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit mt-1"
                      onClick={() => navigate('/my-leaves')}
                    >
                      View My Requests
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {hasInsufficientBalance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient leave balance. You have {selectedBalance?.remainingDays} days remaining,
                    but you're requesting {daysRequested} days.
                  </AlertDescription>
                </Alert>
              )}

              {exceedsAnnualAllowance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total days requested ({daysRequested}) exceeds the maximum annual allowance
                    for {selectedType?.name} ({selectedType?.annualAllowance} days).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Reason */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reason {selectedType?.requiresAttachment ? '' : '(Optional)'}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide a reason for your leave request..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Attachment (if required) */}
          {selectedType?.requiresAttachment && (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Upload supporting document</p>
                <p className="text-xs text-muted-foreground">
                  {selectedType.name} requires a supporting document (e.g., doctor's note)
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-2">
                  Choose File
                </Button>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || hasInsufficientBalance || exceedsAnnualAllowance || daysRequested === 0 || hasPendingRequest}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

