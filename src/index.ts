/**
 * ngaj - AI-powered social media engagement assistant
 */

export const version = '0.1.0';

export function hello(): string {
  return 'Hello from ngaj!';
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('ngaj v' + version);
  console.log(hello());
}
