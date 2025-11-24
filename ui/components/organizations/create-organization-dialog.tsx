'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiButton } from '@/components/ui/api-button';
import { FormError } from '@/components/ui/form-error';

import { CREATE_ORGANIZATION } from '@/lib/graphql/organizations';

// Validation schema
const createOrganizationSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters').max(100),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  settings: z.object({
    visibility: z.enum(['PUBLIC', 'MEMBERS_ONLY', 'INVITE_ONLY']).default('PUBLIC'),
    requireApproval: z.boolean().default(false),
    allowGuestRSVP: z.boolean().default(false),
  }),
});

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

interface CreateOrganizationDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreateOrganizationDialog({
  trigger,
  onSuccess
}: CreateOrganizationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>('');

  const [createOrganization, { loading }] = useMutation(CREATE_ORGANIZATION, {
    onCompleted: (data) => {
      toast.success('Organization created successfully!');
      setOpen(false);

      // Reset form
      form.reset();
      setError('');

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Navigate to the new organization
      router.push(`/organizations/${data.createOrganization.slug}`);
    },
    onError: (error) => {
      const message = error.message || 'Failed to create organization';
      setError(message);
      toast.error(message);
    },
  });

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      settings: {
        visibility: 'PUBLIC',
        requireApproval: false,
        allowGuestRSVP: false,
      },
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    form.setValue('slug', slug);
  };

  async function onSubmit(data: CreateOrganizationFormData) {
    setError('');

    try {
      await createOrganization({
        variables: {
          input: {
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            settings: {
              visibility: data.settings.visibility,
              requireApproval: data.settings.requireApproval,
              allowGuestRSVP: data.settings.allowGuestRSVP,
            },
          },
        },
      });
    } catch (err) {
      // Error is handled in onError callback
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Set up your new organization. You will automatically become the admin.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && <FormError message={error} />}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="My Awesome Organization"
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    This is your organization's display name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="my-awesome-org"
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used in your organization's URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Tell us about your organization..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Organization Settings</h4>

              <FormField
                control={form.control}
                name="settings.visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PUBLIC">Public</SelectItem>
                        <SelectItem value="MEMBERS_ONLY">Members Only</SelectItem>
                        <SelectItem value="INVITE_ONLY">Invite Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Control who can see your organization and its events.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="settings.requireApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Require Approval
                      </FormLabel>
                      <FormDescription>
                        New members must be approved by an admin before joining.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="settings.allowGuestRSVP"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Allow Guest RSVP
                      </FormLabel>
                      <FormDescription>
                        Non-members can RSVP to public events.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <ApiButton
                type="submit"
                loading={loading}
                loadingText="Creating..."
                className="flex-1"
              >
                Create Organization
              </ApiButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}