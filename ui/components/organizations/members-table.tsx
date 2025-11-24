'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { MoreHorizontal, Shield, User, UserX } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  GET_ORGANIZATION_MEMBERS,
  UPDATE_MEMBER_ROLE,
  REMOVE_MEMBER,
} from '@/lib/graphql/organizations';

interface OrganizationMembersTableProps {
  organizationId: string;
  isAdmin: boolean;
}

export function OrganizationMembersTable({ organizationId, isAdmin }: OrganizationMembersTableProps) {
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_ORGANIZATION_MEMBERS, {
    variables: { organizationId, first: 50 },
  });

  const [updateRole, { loading: updatingRole }] = useMutation(UPDATE_MEMBER_ROLE, {
    onCompleted: () => {
      toast.success('Member role updated successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update member role');
    },
  });

  const [removeMember, { loading: removingMember }] = useMutation(REMOVE_MEMBER, {
    onCompleted: () => {
      toast.success('Member removed successfully');
      setShowRemoveDialog(false);
      setSelectedMember(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    await updateRole({
      variables: { membershipId, role: newRole },
    });
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    await removeMember({
      variables: { membershipId: selectedMember.id },
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive">
        Error loading members: {error.message}
      </div>
    );
  }

  const members = data?.organization?.members?.edges?.map((edge: any) => edge.node) || [];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'MODERATOR':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-3 w-3 mr-1" />;
      case 'MODERATOR':
        return <User className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground">
                No members found
              </TableCell>
            </TableRow>
          ) : (
            members.map((member: any) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={member.user?.avatar} />
                      <AvatarFallback>
                        {member.user?.name?.charAt(0) || member.user?.phone?.slice(-2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.user?.name || member.user?.phone}</p>
                      <p className="text-sm text-muted-foreground">{member.user?.phone}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleIcon(member.role)}
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={member.status === 'ACTIVE' ? 'outline' : 'secondary'}>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(member.joinedAt).toLocaleDateString()}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {member.role !== 'ADMIN' && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'ADMIN')}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'MODERATOR' && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'MODERATOR')}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Make Moderator
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'MEMBER' && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'MEMBER')}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Make Member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowRemoveDialog(true);
                          }}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.user?.name || selectedMember?.user?.phone} from the organization?
              They will need to be invited again to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removingMember}
              className="bg-destructive text-destructive-foreground"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}