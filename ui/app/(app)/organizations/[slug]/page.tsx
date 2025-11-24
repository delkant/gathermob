'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { Settings, Users, Calendar, Trash2, UserPlus, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  GET_ORGANIZATION,
  DELETE_ORGANIZATION,
  LEAVE_ORGANIZATION,
  GET_ORGANIZATION_MEMBERS
} from '@/lib/graphql/organizations';
import { OrganizationMembersTable } from '@/components/organizations/members-table';
import { InviteMemberDialog } from '@/components/organizations/invite-member-dialog';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const { data, loading, error } = useQuery(GET_ORGANIZATION, {
    variables: { slug: params.slug },
  });

  const [deleteOrganization, { loading: deleting }] = useMutation(DELETE_ORGANIZATION, {
    onCompleted: () => {
      toast.success('Organization deleted successfully');
      router.push('/organizations');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete organization');
    },
  });

  const [leaveOrganization, { loading: leaving }] = useMutation(LEAVE_ORGANIZATION, {
    onCompleted: () => {
      toast.success('You have left the organization');
      router.push('/organizations');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to leave organization');
    },
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !data?.organization) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error?.message || 'Organization not found'}
        </div>
      </div>
    );
  }

  const organization = data.organization;
  const isAdmin = organization.myRole === 'ADMIN';
  const isMember = !!organization.myRole;

  const handleDelete = async () => {
    await deleteOrganization({
      variables: { id: organization.id },
    });
  };

  const handleLeave = async () => {
    await leaveOrganization({
      variables: { organizationId: organization.id },
    });
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
            {organization.description && (
              <p className="text-muted-foreground mt-2">{organization.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {organization.myRole && (
              <Badge variant={isAdmin ? 'default' : 'secondary'}>
                {organization.myRole}
              </Badge>
            )}
            {isAdmin && (
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization.stats?.totalMembers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization.stats?.totalEvents || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization.stats?.upcomingEvents || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Members</CardTitle>
                  <CardDescription>
                    Manage members and their roles in the organization
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <OrganizationMembersTable
                organizationId={organization.id}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Events</CardTitle>
              <CardDescription>
                View and manage events for this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No events yet</p>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Manage organization settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Visibility</h4>
                  <p className="text-sm text-muted-foreground">
                    {organization.settings?.visibility || 'PUBLIC'}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Member Approval</h4>
                  <p className="text-sm text-muted-foreground">
                    {organization.settings?.requireApproval ? 'Required' : 'Not required'}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Guest RSVP</h4>
                  <p className="text-sm text-muted-foreground">
                    {organization.settings?.allowGuestRSVP ? 'Allowed' : 'Not allowed'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAdmin && isMember && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Leave Organization</p>
                      <p className="text-sm text-muted-foreground">
                        Remove yourself from this organization
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive" disabled={leaving}>
                          <LogOut className="mr-2 h-4 w-4" />
                          Leave
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Leave Organization?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to leave this organization? You will need to be
                            invited again to rejoin.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLeave}>
                            Leave Organization
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Organization</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this organization and all its data
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            organization, all its events, and remove all members.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete Organization
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Invite Member Dialog */}
      {showInviteDialog && (
        <InviteMemberDialog
          organizationId={organization.id}
          open={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
        />
      )}
    </div>
  );
}