const plugin = require('./index');

describe('basic integration test', () => {
    it('should export a valid ESLint plugin', () => {
        expect(plugin).toHaveProperty('meta');
        expect(plugin).toHaveProperty('rules');
        
        // Check that our rule is exported
        expect(plugin.rules).toHaveProperty('no-cross-module-imports');
    });
});
