//Error classes

// Thrown when the backend is unreachable (server down, no internet, timeout)
export class NetworkError extends Error {
  constructor(message = 'Unable to connect. Please check your internet connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}


 //Thrown when the backend returns a non-OK response (4xx, 5xx).
 
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}


//Thrown when there is no active auth session.

export class AuthRequiredError extends Error {
  constructor(message = 'No active session. Please log in again.') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

// fetch wrapper with timeouts and error handling 

// Default timeouts by request type
export const TIMEOUTS = {
  FAST: 5000,      // simple GETs (user, course sections, notes list)
  DEFAULT: 10000,  // standard requests
  SLOW: 20000,     //  file uploads, AI chat
};

//replace raw fetch with the following 

export async function apiFetch(
  url: string, 
  options?: RequestInit, 
  timeoutMs: number = TIMEOUTS.DEFAULT
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // Try to parse the backend error detail
      let message = `Request failed (${response.status})`;
      try {
        const errorText = await response.text();
        const parsed = JSON.parse(errorText);
        message = parsed.detail || message;
      } catch {
        // If parsing fails, keep the default message
      }

      throw new ApiError(response.status, message);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);

    // If it's already one of our custom errors, rethrow it
    if (error instanceof ApiError || error instanceof AuthRequiredError) {
      throw error;
    }

    // AbortError means the request timed out
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('Request timed out. Please try again.');
    }

    // Everything else is a network failure (server down, no internet, DNS failure)
    throw new NetworkError();
  }
}

//Helper function for readable error messages for the user.


// Returns error message for display based on error type. For ApiError, it uses the message from the backend. 
// For NetworkError and AuthRequiredError, it uses their default messages. For any other error, it returns a generic message.

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

