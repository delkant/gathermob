import { CreateOrganizationForm } from '@/components/organizations/create-organization-form';

export default function NewOrganizationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Create Organization</h1>
          <p className="text-muted-foreground mt-2">
            Set up your new organization to start hosting events
          </p>
        </div>
        <CreateOrganizationForm />
      </div>
    </div>
  );
}