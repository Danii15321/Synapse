"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTransition } from "react"

import {
  cancelFormationParticipation,
  cancelJeuParticipation,
  createFormationParticipation,
  createJeuParticipation,
  getMyParticipations,
} from "@/lib/api"
import type {
  ParticipationConfirmation,
  ParticipationPage,
  ParticipationState,
} from "@/lib/validators/inscription"

type ActivityType = "FORMATION" | "JEU"
type ParticipationItem = ParticipationPage["items"][number]
type ParticipationRequest = Promise<ParticipationConfirmation | null>

const PARTICIPATIONS_QUERY_KEY = ["account", "participations"] as const

function createParticipation(activityType: ActivityType, slug: string) {
  return activityType === "JEU"
    ? createJeuParticipation(slug)
    : createFormationParticipation(slug)
}

function cancelParticipation(activityType: ActivityType, slug: string) {
  return activityType === "JEU"
    ? cancelJeuParticipation(slug)
    : cancelFormationParticipation(slug)
}

export function useParticipationControl(input: {
  activityType: ActivityType
  initialState: ParticipationState
  slug: string
}) {
  const [transitionPending, startTransition] = useTransition()
  const creation = useMutation({
    mutationFn: (request: ParticipationRequest) => request,
  })
  const cancellation = useMutation({
    mutationFn: (request: ParticipationRequest) => request,
  })

  const participate = () => {
    if (transitionPending || creation.isPending || cancellation.isPending)
      return
    cancellation.reset()
    const request = createParticipation(input.activityType, input.slug)
    const trackedRequest = creation.mutateAsync(request).catch(() => undefined)
    startTransition(async () => {
      await trackedRequest
    })
  }
  const cancel = () => {
    if (transitionPending || creation.isPending || cancellation.isPending)
      return
    creation.reset()
    const request = cancelParticipation(input.activityType, input.slug)
    const trackedRequest = cancellation
      .mutateAsync(request)
      .catch(() => undefined)
    startTransition(async () => {
      await trackedRequest
    })
  }
  const confirmation: ParticipationConfirmation | null = cancellation.isSuccess
    ? null
    : (creation.data ?? null)
  const state: ParticipationState = creation.isSuccess
    ? "ALREADY_REGISTERED"
    : cancellation.isSuccess
      ? "AVAILABLE"
      : input.initialState

  return {
    cancel,
    confirmation,
    error: creation.isError || cancellation.isError,
    participate,
    pending: transitionPending || creation.isPending || cancellation.isPending,
    state,
  }
}

export function useAccountParticipations(
  initialItems: ParticipationItem[],
  userId: string,
) {
  const [transitionPending, startTransition] = useTransition()
  const queryClient = useQueryClient()
  const queryKey = [...PARTICIPATIONS_QUERY_KEY, userId] as const
  const query = useQuery({
    initialData: { items: initialItems, nextCursor: null },
    queryFn: () => getMyParticipations(),
    queryKey,
    staleTime: Infinity,
  })
  const cancellation = useMutation({
    mutationFn: (input: {
      item: ParticipationItem
      request: ParticipationRequest
    }) => input.request,
    onSuccess: (_result, { item: cancelledItem }) => {
      queryClient.setQueryData<ParticipationPage>(
        queryKey,
        (current) => ({
          items:
            current?.items.filter(
              (item) =>
                item.activityType !== cancelledItem.activityType ||
                item.slug !== cancelledItem.slug,
            ) ?? [],
          nextCursor: current?.nextCursor ?? null,
        }),
      )
    },
  })

  return {
    cancel: (item: ParticipationItem) => {
      if (transitionPending || cancellation.isPending) return
      const request = cancelParticipation(item.activityType, item.slug)
      const trackedRequest = cancellation
        .mutateAsync({ item, request })
        .catch(() => undefined)
      startTransition(async () => {
        await trackedRequest
      })
    },
    error: query.isError || cancellation.isError,
    items: query.data.items,
    pending: transitionPending || cancellation.isPending,
  }
}
