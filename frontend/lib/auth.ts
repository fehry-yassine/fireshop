import { ApiError, api } from "@/lib/api";
import type { PublicUser } from "@/types";

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const response = await api.auth.me();
    return response.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }

    return null;
  }
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return "The authentication service is not responding. Please try again.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
