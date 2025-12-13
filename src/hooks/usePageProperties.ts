import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { PageProperty, PropertyType, PropertyValue } from '@/types/properties';

export interface SetPropertyParams {
  pageId: string;
  propertyName: string;
  propertyType: PropertyType;
  value: PropertyValue;
}

export interface DeletePropertyParams {
  pageId: string;
  propertyName: string;
}

// Stub hook - RPC function not yet created
export function usePageProperties(pageId?: string) {
  return useQuery({
    queryKey: ['page-properties', pageId],
    queryFn: async () => {
      console.warn('Page properties feature requires database migration');
      return [] as PageProperty[];
    },
    enabled: false, // Disabled until RPC is created
  });
}

// Stub hook - RPC function not yet created
export function useWorkspacePropertyNames(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-property-names', workspaceId],
    queryFn: async () => {
      console.warn('Workspace property names feature requires database migration');
      return [] as Array<{
        property_name: string;
        property_type: string;
        usage_count: number;
      }>;
    },
    enabled: false, // Disabled until RPC is created
  });
}

// Stub hook - RPC function not yet created
export function useSetPageProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SetPropertyParams) => {
      console.warn('Page properties feature requires database migration');
      // Silently fail - properties are optional
      return null;
    },
  });
}

// Stub hook - RPC function not yet created
export function useDeletePageProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: DeletePropertyParams) => {
      console.warn('Page properties feature requires database migration');
      // Silently fail - properties are optional
      return null;
    },
  });
}

// Stub hook - RPC function not yet created
export function useBatchSetPageProperties() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (properties: SetPropertyParams[]) => {
      console.warn('Page properties feature requires database migration');
      // Silently fail - properties are optional
      return [];
    },
  });
}
