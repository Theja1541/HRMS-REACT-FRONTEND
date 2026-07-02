/** User-facing login error messages keyed by API error code. */
export const LOGIN_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials.',
  ACCOUNT_INACTIVE: 'Your account is inactive. Please contact your administrator.',
  PORTAL_DEACTIVATED: 'Your account is inactive. Please contact your administrator.',
};

export function getLoginErrorMessage(error) {
  const code = error?.response?.data?.error?.code;
  const apiMessage = error?.response?.data?.error?.message;

  if (code && LOGIN_ERROR_MESSAGES[code]) {
    return LOGIN_ERROR_MESSAGES[code];
  }

  if (apiMessage) {
    return apiMessage;
  }

  if (!error?.response) {
    return 'Unable to reach the server. Please try again.';
  }

  return 'Login failed. Please try again.';
}
