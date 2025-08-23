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
							anyOf: [
								{
									type: 'string'
								},
								{
									type: 'object',
									properties: {
										path: {
											type: 'string',
										},
										allow: {
											type: 'array',
											items: {
												type: 'string',
											},
										},
									},
									required: ['path'],
									additionalProperties: false,
								}
							],
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
		const absoluteModuleDirs = moduleDirectories.map((dir) => {
			if (typeof dir === 'string') {
				return path.resolve(workingDir, dir);
			}
			return path.resolve(workingDir, dir.path);
		});
		const absoluteCurrentFile = path.resolve(workingDir, currentFilePath);
		const currentDir = path.dirname(absoluteCurrentFile);

		/**
		 * Checks if a file path is within a directory
		 * @param {string} filePath - The absolute path to check
		 * @param {string} dirPath - The absolute path of the directory
		 * @returns {boolean} - True if the file is within the directory
		 */
		function isWithinDir(filePath, dirPath) {
			const normalizedPath = path.normalize(filePath);
			const normalizedDirPath = path.normalize(dirPath);
			return normalizedPath.startsWith(normalizedDirPath);
		}

		/**
		 * Finds which module directory a file belongs to
		 * @param {string} filePath - The absolute path of the file
		 * @returns {string|undefined} - The absolute path of the module directory, or undefined if not found
		 */
		function findModuleDir(filePath) {
			return absoluteModuleDirs.find(dir => isWithinDir(filePath, dir));
		}

		/**
		 * Finds which module directory configuration a file belongs to
		 * @param {string} filePath - The absolute path of the file
		 * @returns {Object|undefined} - The module directory configuration, or undefined if not found
		 */
		function findModuleDirConfig(filePath) {
			const index = absoluteModuleDirs.findIndex(dir => isWithinDir(filePath, dir));
			return index !== -1 ? moduleDirectories[index] : undefined;
		}

		/**
		 * Checks if an import path should be ignored based on the current module's allow list
		 * @param {string} resolvedPath - The absolute path of the import
		 * @param {Object} currentModuleConfig - The current module configuration
		 * @returns {boolean} - True if the import should be ignored
		 */
		function shouldIgnoreImport(resolvedPath, currentModuleConfig) {
			if (typeof currentModuleConfig === 'string' || !currentModuleConfig.allow) {
				return false;
			}

			const workingDir = process.cwd();
			return currentModuleConfig.allow.some(allowPath => {
				const absoluteAllowPath = path.resolve(workingDir, allowPath);
				return isWithinDir(resolvedPath, absoluteAllowPath);
			});
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
			const currentModuleConfig = findModuleDirConfig(absoluteCurrentFile);
			const importModuleDir = findModuleDir(resolvedPath);

			// If the current file is in a module
			if (currentModuleDir) {
				// Check if this import should be ignored
				if (shouldIgnoreImport(resolvedPath, currentModuleConfig)) {
					return;
				}

				// If the imported file is not in any module
				if (!importModuleDir) {
					context.report({
						node,
						messageId: 'outsideModuleImport',
						data: {
							importPath,
							moduleDirs: moduleDirectories.map(dir => typeof dir === 'string' ? dir : dir.path).join(', ')
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
							moduleDirs: moduleDirectories.map(dir => typeof dir === 'string' ? dir : dir.path).join(', ')
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
