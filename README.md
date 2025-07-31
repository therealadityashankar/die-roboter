# Die Roboter

A TypeScript project for simulating and running various robots in JavaScript.

## Current Robots

- **SO101** - The first robot implementation

## Project Structure

This project uses npm workspaces to separate the library and examples:

```
die-roboter/
├── packages/
│   ├── die-roboter/            # Main library package
│   │   ├── src/                # Source code
│   │   │   ├── robots/         # Robot implementations
│   │   │   └── index.ts        # Main entry point
│   │   └── dist/               # Compiled JavaScript (generated)
│   └── die-roboter-examples/   # Examples package
│       ├── src/                # Example source code
│       │   └── robots/         # Copy of robot implementations for development
│       └── index.html          # Example HTML page
└── __tests__/                  # Test files (to be added later)
```

## Getting Started

### Prerequisites

- Node.js (v24 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd die-roboter

# Install dependencies for all workspaces
npm install
```

### Development

```bash
# Run the library in development mode with TypeScript watch mode
npm run dev

# Run the browser example with Parcel dev server
npm run start

# Build the library
npm run build
```

### Browser Examples

The project includes browser examples that demonstrate the robots in action:

1. Run the Parcel development server:
   ```bash
   npm run start
   ```

2. Open your browser at the URL shown in the terminal (usually `http://localhost:1234`) to see the SO101 robot demo.

The examples use Parcel for bundling and support hot module reloading for a smooth development experience.

### Working with Workspaces

This project uses npm workspaces to manage the library and examples separately:

```bash
# Run commands in the library package
npm run build --workspace=die-roboter

# Run commands in the examples package
npm run start --workspace=die-roboter-examples

# Install dependencies for a specific workspace
npm install some-package --workspace=die-roboter
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## License

ISC
