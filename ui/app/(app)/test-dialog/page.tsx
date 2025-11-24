'use client';

import { CreateOrganizationDialog } from '@/components/organizations/create-organization-dialog';

export default function TestDialogPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Test Dialog Page</h1>
      <p className="mb-6">Click the button below to test the create organization dialog:</p>

      <CreateOrganizationDialog />

      <div className="mt-8">
        <p>If the button above doesn't work, there's an issue with the dialog component.</p>
      </div>
    </div>
  );
}