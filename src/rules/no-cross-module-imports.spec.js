const { RuleTester } = require('eslint');
const rule = require('./no-cross-module-imports');
const path = require('path');

const ruleTester = new RuleTester({
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
});

// Helper to resolve paths relative to the project root
function resolvePath(relativePath) {
    return path.resolve(process.cwd(), relativePath);
}

ruleTester.run('module-boundaries/no-cross-module-imports', rule, {
    valid: [
        // Relative imports
        {
            code: "import { something } from './local-file';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "import { something } from '../utils/helper';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "import { something } from 'lodash';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "import { something } from '../../payment/services/PaymentService';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/auth',
                ],
            }],
        },
        {
            code: "const something = require('./local-file');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "const helper = require('../utils/helper');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "const lodash = require('lodash');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },

        // Aliased imports
        {
            code: "import { Button } from '@components/Button';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
                aliases: {
                    '@components': 'src/modules/user/components',
                },
            }],
        },
        {
            code: "const Button = require('@components/Button');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
                aliases: {
                    '@components': 'src/modules/user/components',
                },
            }],
        },
        {
            code: "import { Button } from '#components/Button';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
                aliases: {
                    '#components': 'src/modules/user/components',
                },
            }],
        },
        {
            code: "const Button = require('~components/Button');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
                aliases: {
                    '~components': 'src/modules/user/components',
                },
            }],
        },

        // Async/Dynamic imports
        {
            code: "async function loadButton() { const Button = await import('./Button'); }",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "async function loadHelper() { const Button = await import('../utils/helper'); }",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
            }],
        },
        {
            code: "async function loadComponent() { const Button = await import('@components/Button'); }",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: ['src/modules/user'],
                aliases: {
                    '@components': 'src/modules/user/components',
                },
            }],
        },

        // Allow paths for specific modules
        {
            code: "import { something } from '../../other/Component';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    {
                        path: 'src/modules/user',
                        allow: ['src/modules/other'],
                    },
                ],
            }],
        },
    ],
    invalid: [
        {
            code: "import { something } from '../../other/Component';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                ],
            }],
            errors: [{
                messageId: 'outsideModuleImport',
                data: {
                    importPath: '../../other/Component',
                    moduleDirs: 'src/modules/user',
                },
            }],
        },
        {
            code: "import { something } from '../../auth/components/Login';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '../../auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "import { something } from '../../payment/services/PaymentService';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/payment',
                ],
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '../../payment/services/PaymentService',
                    moduleDirs: 'src/modules/user, src/modules/payment',
                },
            }],
        },
        {
            code: "const component = require('../../other/Component');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                ],
            }],
            errors: [{
                messageId: 'outsideModuleImport',
                data: {
                    importPath: '../../other/Component',
                    moduleDirs: 'src/modules/user',
                },
            }],
        },
        {
            code: "const login = require('../../auth/components/Login');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '../../auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "import { Login } from '@auth/components/Login';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
                aliases: {
                    '@auth': 'src/modules/auth',
                },
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '@auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "const Login = require('@auth/components/Login');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
                aliases: {
                    '@auth': 'src/modules/auth',
                },
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '@auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "import { Login } from '#auth/components/Login';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
                aliases: {
                    '#auth': 'src/modules/auth',
                },
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '#auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "const Login = require('~auth/components/Login');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
                aliases: {
                    '~auth': 'src/modules/auth',
                },
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '~auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "import { utils } from '@/utils';",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                ],
                aliases: {
                    '@': 'lib',
                },
            }],
            errors: [{
                messageId: 'outsideModuleImport',
                data: {
                    importPath: '@/utils',
                    moduleDirs: 'src/modules/user',
                },
            }],
        },
        {
            code: "const utils = require('@/utils');",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                ],
                aliases: {
                    '@': 'lib',
                },
            }],
            errors: [{
                messageId: 'outsideModuleImport',
                data: {
                    importPath: '@/utils',
                    moduleDirs: 'src/modules/user',
                },
            }],
        },
        {
            code: "async function loadComponent() { const Button = await import('../../other/Component'); }",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                ],
            }],
            errors: [{
                messageId: 'outsideModuleImport',
                data: {
                    importPath: '../../other/Component',
                    moduleDirs: 'src/modules/user',
                },
            }],
        },
        {
            code: "async function loadLogin() { const Login = await import('../../auth/components/Login'); }",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '../../auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
        {
            code: "async function loadLogin() { const Login = await import('@auth/components/Login'); }",
            filename: resolvePath('src/modules/user/components/UserProfile.js'),
            options: [{
                moduleDirectories: [
                    'src/modules/user',
                    'src/modules/auth',
                ],
                aliases: {
                    '@auth': 'src/modules/auth',
                },
            }],
            errors: [{
                messageId: 'crossModuleImport',
                data: {
                    importPath: '@auth/components/Login',
                    moduleDirs: 'src/modules/user, src/modules/auth',
                },
            }],
        },
    ],
}); 