// Utility functions for auth handling

/**
 * Clears all auth-related cookies from the browser
 * This acts as a safety net if the server fails to clear cookies
 */
export const clearAuthCookies = (): void => {
  // Clear the JWT cookie
  document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Clear the token cookie used for client-side access
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Clear any other auth-related cookies that might exist
  document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Log cookie clearing
  console.log('Auth cookies cleared on client side');
}; 