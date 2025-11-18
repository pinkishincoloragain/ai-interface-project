/**
 * Auth feature phrases
 * All user-facing text strings for the auth feature
 */

export const authPhrases = {
    // Headers
    createAccount: 'Create an account',
    signInToAccount: 'Sign in to your account',

    // Form fields
    emailAddress: 'Email address',
    password: 'Password',

    // Password validation
    passwordMustContain: 'Password must contain:',
    atLeast8Characters: 'At least 8 characters',
    oneUppercaseLetter: 'One uppercase letter (A-Z)',
    oneLowercaseLetter: 'One lowercase letter (a-z)',
    oneNumber: 'One number (0-9)',

    // Validation messages (used in code)
    atLeast8CharactersShort: 'At least 8 characters',
    oneUppercaseLetterShort: 'One uppercase letter',
    oneLowercaseLetterShort: 'One lowercase letter',
    oneNumberShort: 'One number',

    // Actions
    signIn: 'Sign in',
    signUp: 'Sign up',
    pleaseWait: 'Please wait...',

    // Links
    alreadyHaveAccount: 'Already have an account? Sign in',
    dontHaveAccount: "Don't have an account? Sign up",

    // Errors
    unexpectedError: 'An unexpected error occurred',
    passwordValidationPrefix: 'Password must contain:',
} as const;
