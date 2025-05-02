# eslint-plugin-module-boundaries

An ESLint plugin to enforce module boundaries by preventing imports from outside module directories.

## Installation

```bash
npm install --save-dev eslint-plugin-module-boundaries
```

## Usage

Add `module-boundaries` to the plugins section of your [ESLint configuration](https://eslint.org/docs/latest/use/configure/):

```json
{
    "plugins": [
        "module-boundaries"
    ]
}
```

Then configure the rules you want to use under the rules section:

```json
{
    "rules": {
        "module-boundaries/no-cross-module-imports": ["error", {
            "moduleDirectories": [
                "src/modules/user",
                "src/modules/auth",
                "src/modules/payment"
            ],
            "aliases": {
                "@components": "src/modules/user/components",
                "@auth": "src/modules/auth",
                "@": "lib"
            }
        }]
    }
}
```

## Rules

### no-cross-module-imports

This rule prevents imports from outside the current module directory. It automatically detects and supports:
- ES Module syntax (`import` statements)
- CommonJS syntax (`require()` calls)
- Dynamic imports (`import()` expressions)

#### Examples of Invalid Imports

```javascript
// File: src/modules/user/components/UserProfile.js
// Module: src/modules/user

import { login } from '../../auth/views/Login';  // Invalid
import { utils } from '@/utils';  // Invalid (resolves to lib/utils)

async function loadLogin() {
  const Player = await import('../../common/VideoPlayer');  // Invalid
}

const component = require('../../auth/views/Login');  // Invalid
```

#### Examples of Valid Imports

```javascript
// File: src/modules/user/components/UserProfile.js
// Module: src/modules/user

/* Relative imports within the same module (allowed) */
import { something } from './local-file';
import { helper } from '../utils/helper';

/* External dependencies (allowed) */
import lodash from 'lodash';

/* Aliased imports within the same module (allowed) */
import { Button } from '@components/Button';
  // resolves to src/modules/user/components/Button

/* Dynamic imports within same module (allowed) */
async function loadButton() {
  const Button = await import('@components/Button');
  // resolves to src/modules/user/components/Button
}
```

#### Options

The rule accepts an object with the following properties:

- `moduleDirectories` (required): An array of directory paths that represent modules. These paths should be relative to your project root. Files within these directories should only be allowed to import from within their own module directory.
- `aliases` (optional): An object mapping import aliases to their actual paths. This is useful for projects using TypeScript or Babel with path aliases configured. Any prefix can be used for aliases (e.g., `@`, `#`, `~`, etc.). The resolved paths must still respect module boundaries.

Example configuration:

```json
{
    "rules": {
        "module-boundaries/no-cross-module-imports": ["error", {
            "moduleDirectories": [
                "src/modules/user",
                "src/modules/auth",
                "src/modules/payment"
            ],
            "aliases": {
                "@components": "src/modules/user/components",
                "@auth": "src/modules/auth",
                "@": "lib"
            }
        }]
    }
}
```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## License

MIT
