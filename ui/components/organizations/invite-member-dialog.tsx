'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiButton } from '@/components/ui/api-button';

import { INVITE_MEMBER } from '@/lib/graphql/organizations';

interface InviteMemberDialogProps {
  organizationId: string;
  open: boolean;
  onClose: () => void;
}

export function InviteMemberDialog({ organizationId, open, onClose }: InviteMemberDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'MODERATOR' | 'ADMIN'>('MEMBER');

  const [inviteMember, { loading }] = useMutation(INVITE_MEMBER, {
    onCompleted: () => {
      toast.success('Member invited successfully');
      onClose();
      setPhoneNumber('');
      setRole('MEMBER');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to invite member');
    },
  });

  const handleInvite = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    // For now, we'll need to look up the user by phone number
    // In a real app, this would be handled by the backend
    toast.info('User lookup by phone number will be implemented in the backend');

    // Temporarily close the dialog
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to your organization by their phone number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <ApiButton
            onClick={handleInvite}
            loading={loading}
            loadingText="Inviting..."
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </ApiButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}