import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { type ChannelEvents, changeChannel } from '@/modules/notifications/api/change-channel'
import { type NewChannel, createChannel } from '@/modules/notifications/api/create-channel'
import { deleteChannel } from '@/modules/notifications/api/delete-channel'
import { type NotificationChannel, listChannels } from '@/modules/notifications/api/list-channels'
import { testChannel } from '@/modules/notifications/api/test-channel'

function channelsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'notification-channels']
}

export function useChannelsQuery(projectId: string): UseQueryResult<NotificationChannel[]> {
  return useQuery({
    queryKey: channelsKey(projectId),
    queryFn: ({ signal }) => listChannels(projectId, signal),
  })
}

/** Every change reads the list again, so the panel shows what the API kept. */
function useChannelChange<T, R>(
  projectId: string,
  change: (projectId: string, input: T) => Promise<R>,
): UseMutationResult<R, Error, T> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: T) => change(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: channelsKey(projectId) }),
  })
}

export function useCreateChannelMutation(
  projectId: string,
): UseMutationResult<NotificationChannel, Error, NewChannel> {
  return useChannelChange(projectId, createChannel)
}

export function useChangeChannelMutation(
  projectId: string,
): UseMutationResult<NotificationChannel, Error, ChannelEvents> {
  return useChannelChange(projectId, changeChannel)
}

export function useDeleteChannelMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  return useChannelChange(projectId, deleteChannel)
}

export function useTestChannelMutation(projectId: string): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (channelId: string) => testChannel(projectId, channelId) })
}
