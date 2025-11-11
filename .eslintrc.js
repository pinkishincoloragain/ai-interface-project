module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier', // prettier와 충돌하는 ESLint 규칙을 비활성화
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['react', '@typescript-eslint', 'react-hooks'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        // 오류로 처리할 규칙
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars로 대체
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // 코드 스타일 규칙
        'arrow-body-style': ['error', 'as-needed'],
        'prefer-arrow-callback': 'error',
        'prefer-const': 'error',
        'prefer-destructuring': ['warn', { object: true, array: false }],
        'no-nested-ternary': 'warn',
        'no-unneeded-ternary': 'error',
        'spaced-comment': ['warn', 'always'],
        'no-duplicate-imports': 'error',
    },
    overrides: [
        // 테스트 파일에 대한 규칙 예외 처리
        {
            files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
            env: {
                jest: true,
            },
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
        // Lambda 함수에 대한 규칙 예외 처리
        {
            files: ['packages/lambda/**/*.ts'],
            rules: {
                'no-console': 'off', // Lambda 함수에서는 console 사용 허용
            },
        },
    ],
};
