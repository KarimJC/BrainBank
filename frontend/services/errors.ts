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

//Helper function for readable error messages for the user.


// Returns error message for display based on error type. For ApiError, it uses the message from the backend. 
// For NetworkError and AuthRequiredError, it uses their default messages. For any other error, it returns a generic message.

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

