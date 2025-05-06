const path = require('path');

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow imports from outside the current module directory',
			category: 'Modular Architecture',
		},
		schema: [
			{
				type: 'object',
				properties: {
					moduleDirectories: {
						type: 'array',
						items: {
							type: 'string'
						},
						description: 'List of directory paths that represent modules'
					},
					aliases: {
						type: 'object',
						additionalProperties: {
							type: 'string'
						},
						description: 'Map of import aliases to their actual paths'
					}
				},
				required: ['moduleDirectories']
			}
		],
		messages: {
			crossModuleImport: 'Import from "{{importPath}}" crosses module boundary. Module directories: [{{moduleDirs}}]',
			outsideModuleImport: 'Import from "{{importPath}}" is outside of the defined module directory. Module directories: [{{moduleDirs}}]'
		}
	},
	create: function (context) {
		const options = context.options[0] || {};
		const moduleDirectories = options.moduleDirectories || [];
		const aliases = options.aliases || {};
		const currentFilePath = context.getFilename();
		
		// Convert relative paths to absolute for consistent comparison
		const workingDir = process.cwd();
		const absoluteModuleDirs = moduleDirectories.map(dir => path.resolve(workingDir, dir));
		const absoluteCurrentFile = path.resolve(workingDir, currentFilePath);
		const currentDir = path.dirname(absoluteCurrentFile);

		/**
		 * Checks if a file path is within a module directory
		 * @param {string} filePath - The absolute path to check
		 * @param {string} moduleDir - The absolute path of the module directory
		 * @returns {boolean} - True if the file is within the module directory
		 */
		function isWithinModuleDir(filePath, moduleDir) {
			const normalizedPath = path.normalize(filePath);
			const normalizedModuleDir = path.normalize(moduleDir);
			return normalizedPath.startsWith(normalizedModuleDir);
		}

		/**
		 * Finds which module directory a file belongs to
		 * @param {string} filePath - The absolute path of the file
		 * @returns {string|undefined} - The absolute path of the module directory, or undefined if not found
		 */
		function findModuleDir(filePath) {
			return absoluteModuleDirs.find(dir => isWithinModuleDir(filePath, dir));
		}

		/**
		 * Resolves a relative import path to an absolute path
		 * @param {string} importPath - The relative import path
		 * @returns {string|null} - The absolute path, or null for non-relative imports
		 */
		function resolveImportPath(importPath) {
			// Handle alias imports
			const aliasMatch = Object.entries(aliases).find(([alias]) => 
				importPath.startsWith(alias)
			);
			
			if (aliasMatch) {
				const [alias, aliasPath] = aliasMatch;
				const relativePath = importPath.slice(alias.length);
				const resolvedPath = path.resolve(workingDir, aliasPath, relativePath.replace(/^\//, ''));
				return resolvedPath;
			}
			
			// Handle regular relative imports
			if (importPath.startsWith('.')) {
				return path.resolve(currentDir, importPath);
			}
			
			return null;
		}

		/**
		 * Validates an import and reports an error if it is invalid
		 * @param {Object} node - The AST node to report on
		 * @param {string} importPath - The import path that caused the error
		 */
		function validateAndReport(node, importPath) {
			const resolvedPath = resolveImportPath(importPath);
			if (!resolvedPath) {
				return;
			}

			const currentModuleDir = findModuleDir(absoluteCurrentFile);
			const importModuleDir = findModuleDir(resolvedPath);

			// If the current file is in a module
			if (currentModuleDir) {
				// If the imported file is not in any module
				if (!importModuleDir) {
					context.report({
						node,
						messageId: 'outsideModuleImport',
						data: {
							importPath,
							moduleDirs: moduleDirectories.join(', ')
						}
					});
					return;
				}

				// If both files are in different modules
				if (currentModuleDir !== importModuleDir) {
					context.report({
						node,
						messageId: 'crossModuleImport',
						data: {
							importPath,
							moduleDirs: moduleDirectories.join(', ')
						}
					});
				}
			}
		}

		/**
		 * Checks if an import path should be validated
		 * @param {string} importPath - The import path to check
		 * @returns {boolean} - True if the import should be validated
		 */
		function shouldValidateImport(importPath) {
			return importPath.startsWith('.') || Object.keys(aliases).some(alias => importPath.startsWith(alias));
		}

		return {
			ImportDeclaration(node) {
				const importPath = node.source.value;
				
				// Skip non-relative and non-aliased imports (node_modules, etc.)
				if (!shouldValidateImport(importPath)) {
					return;
				}

				validateAndReport(node, importPath);
			},
			VariableDeclarator(node) {
				// Check for CommonJS require statements
				if (node.init && 
					node.init.type === 'CallExpression' && 
					node.init.callee.name === 'require' && 
					node.init.arguments.length === 1 && 
					node.init.arguments[0].type === 'Literal') {
					
					const importPath = node.init.arguments[0].value;
					
					// Skip non-relative and non-aliased imports (node_modules, etc.)
					if (!shouldValidateImport(importPath)) {
						return;
					}

					validateAndReport(node, importPath);
				}
			},
			ImportExpression(node) {
				// Check for dynamic imports
				if (node.source.type === 'Literal') {
					const importPath = node.source.value;
					
					// Skip non-relative and non-aliased imports (node_modules, etc.)
					if (!shouldValidateImport(importPath)) {
						return;
					}

					validateAndReport(node, importPath);
				}
			}
		};
	},
};
