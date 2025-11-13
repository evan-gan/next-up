---
applyTo: '**'
---

# Comments
Always write comments in your code to explain the purpose of complex logic, the reasoning behind certain decisions, and any assumptions made. This will help others (and your future self) understand the code more easily. The goal is to make your code readable for developers with basic familiarity in the programming language, including junior developers. That said, comments should be concise and to the point, avoiding unnecessary verbosity.

# Variable names
Variable names should be descriptive and meaningful, reflecting the purpose of the variable so they can understand what it is used for with no knowledge of the code. Avoid using single-letter names or abbreviations that may confuse readers. Do try to keep them concise though. Use camelCase for variable names in languages like JavaScript, TypeScript and Java, and snake_case in languages like Python. For constants, use UPPER_SNAKE_CASE.

# Function and method names + docstrings
Function and method names should clearly indicate what the function does. Use verbs or verb phrases to describe the action performed by the function. Docstrings should be used to provide a high-level overview of the function's purpose, its parameters, and its return value.

# Interchangeable programming structure
When doing development, the goal is to make everything componentized functions so that parts can be reused in different contexts. This means that functions should be designed to be as independent as possible, with minimal dependencies on external variables or states. This promotes reusability and makes it easier to test and maintain the code. When doing development in frameworks such as React, Vue, Svelte, Angular, etc., make sure to create components that can be easily reused across different parts of the application as much as possible rather than creating monolithic components that are tightly coupled to specific use cases.

# Minimal code size
Aim to write code that avoids redundancy without sacrificing readability or functionality. Avoid unnecessary lines of code, redundant logic, or overly complex structures. Strive for simplicity and clarity in your code, ensuring that it is easy to understand and maintain. When choosing between clever short code and explicit readable code, choose readability. Readable code is always better than clever code.

# Formatting
Follow the standard formatting conventions for the programming language you are using. This includes proper indentation, spacing, and line breaks. Consistent formatting improves code readability and makes it easier to navigate through the codebase. Use tools like Prettier, ESLint, or Black to automatically format your code according to established standards.

# Error handling
Implement robust error handling mechanisms to gracefully handle unexpected situations or failures. Use try-catch blocks, error codes, or exception handling techniques to manage errors effectively. Provide meaningful error messages that help identify the cause of the error and guide users towards potential solutions.

# Testing
Write comprehensive tests to validate the functionality and correctness of your code. Use unit tests, integration tests, or end-to-end tests to cover different aspects of your codebase. Ensure that tests are easy to understand and maintain, and that they provide clear feedback on the success or failure of the code being tested. Make sure tests are in their own folder and give a clear description of what they are testing. Make sure to run tests after writing code to ensure everything works as expected.

# Documentation
This should be done mainly in docstrings and comments, but if necessary, provide additional documentation to explain complex concepts, usage instructions, or configuration details. Use markdown files or dedicated documentation tools to create clear and organized documentation that is easily accessible to developers and users. Keep it short and info dense.

# When to use TODO lists
Use TODO lists when implementing large features that require multiple steps or have multiple components. Basically, use them when you are implementing things that would require more than 1 unit test to verify that it works as expected.

# Security best practices
Follow security best practices to protect your code and data from vulnerabilities and threats. This includes input validation, secure authentication and authorization mechanisms, data encryption, and regular security audits. Stay updated with the latest security practices and guidelines relevant to the programming language and frameworks you are using. Always check for potential security risks when writing code, especially when dealing with user input or sensitive data.

# Read the docs
Always use the Context7 MCP tool to get documentation about libraries, frameworks, or programming languages you are using. This will help you stay updated with the latest features, best practices, and usage guidelines.

# CSS
Use centralized CSS files for design tokens (colors, spacing, typography) and shared utilities that apply across the project. This keeps styling consistent and makes applications easily re-skinable. For component-specific styles that won't be reused elsewhere, colocate them with the component using CSS modules, styled-components, or similar approaches.

# Package management
When using node/npm, use pnpm.

# .github/copilot-instructions.md
When adding new features, changing code, and more, always update the .github/copilot-instructions.md file to reflect the current state of the project as well as the features and where they are. This will enable quicker development in the future as you and others will have a quick index of where things are and how they work. Make sure this is always up to date and high quality. If it does not exist, let the user know and offer to create it. It is essential that this file exists and is kept up to date. Always make sure you update it at the end of tasks and make sure it reflects the current state of the project.