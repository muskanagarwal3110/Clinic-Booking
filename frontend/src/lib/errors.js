// Shared reaction to API failures so every screen behaves the same way.
export function handleApiError(err, toast, queryClient) {
  if (err.status === 429) {
    toast.error('Too many requests. Wait a few seconds and try again.');
    return;
  }
  if (err.code === 'SLOT_ALREADY_BOOKED') {
    toast.error('Someone just booked that time. The list has been refreshed.');
  } else if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
    toast.error(err.details.map((d) => d.message).join(' '));
  } else {
    toast.error(err.message);
  }
  // our view of the slots is stale after any conflict, so reload it
  if (err.status === 409) queryClient?.invalidateQueries({ queryKey: ['slots'] });
}

export const fieldError = (err, field) => err?.details?.find((d) => d.field === field)?.message;
