'use client';

import { useQuery } from '@apollo/client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GET_MY_ORGANIZATIONS } from '@/lib/graphql/organizations';
import { CreateOrganizationDialog } from '@/components/organizations/create-organization-dialog';

export default function OrganizationsPage() {
  const t = useTranslations();
  const { data, loading, error, refetch } = useQuery(GET_MY_ORGANIZATIONS, {
    variables: { first: 20 },
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Organizations</h1>
            <p className="text-muted-foreground mt-2">Manage your organizations and memberships</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          Error loading organizations: {error.message}
        </div>
      </div>
    );
  }

  const organizations = data?.myOrganizations?.edges?.map((edge: any) => edge.node) || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Organizations</h1>
          <p className="text-muted-foreground mt-2">Manage your organizations and memberships</p>
        </div>
        <CreateOrganizationDialog onSuccess={() => refetch()} />
      </div>

      {organizations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first organization to start hosting events
            </p>
            <CreateOrganizationDialog onSuccess={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org: any) => (
            <Link key={org.id} href={`/organizations/${org.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{org.name}</CardTitle>
                  {org.description && (
                    <CardDescription className="line-clamp-2">
                      {org.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {org.stats?.totalMembers || 0} members
                      </span>
                      <span className="text-muted-foreground">
                        {org.stats?.totalEvents || 0} events
                      </span>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {org.myRole || 'MEMBER'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}