import { useState } from 'react';
import { useAuth } from '../../model/hooks';
import { authPhrases } from '../../lib';

// Password validation helper
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push(authPhrases.atLeast8CharactersShort);
    }
    if (!/[A-Z]/.test(password)) {
        errors.push(authPhrases.oneUppercaseLetterShort);
    }
    if (!/[a-z]/.test(password)) {
        errors.push(authPhrases.oneLowercaseLetterShort);
    }
    if (!/[0-9]/.test(password)) {
        errors.push(authPhrases.oneNumberShort);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

export function LoginForm() {
    const { signIn, signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validate password for signup
        if (isSignUp) {
            const validation = validatePassword(password);
            if (!validation.valid) {
                setError(`${authPhrases.passwordValidationPrefix} ${validation.errors.join(', ')}`);
                setLoading(false);
                return;
            }
        }

        try {
            const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);

            if (error) {
                setError(error.message);
            }
        } catch {
            setError(authPhrases.unexpectedError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isSignUp ? authPhrases.createAccount : authPhrases.signInToAccount}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder={authPhrases.emailAddress}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder={authPhrases.password}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {isSignUp && (
                        <div className="text-xs text-gray-600 mt-2">
                            <p className="font-semibold mb-1">{authPhrases.passwordMustContain}</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                                    {authPhrases.atLeast8Characters}
                                </li>
                                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                                    {authPhrases.oneUppercaseLetter}
                                </li>
                                <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                                    {authPhrases.oneLowercaseLetter}
                                </li>
                                <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                                    {authPhrases.oneNumber}
                                </li>
                            </ul>
                        </div>
                    )}

                    {error && <div className="text-red-600 text-sm text-center">{error}</div>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {(() => {
                                if (loading) return authPhrases.pleaseWait;
                                return isSignUp ? authPhrases.signUp : authPhrases.signIn;
                            })()}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-500"
                            onClick={() => setIsSignUp(!isSignUp)}
                        >
                            {isSignUp ? authPhrases.alreadyHaveAccount : authPhrases.dontHaveAccount}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
