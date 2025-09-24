// Global type declarations for the fish aquarium project

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

// Extend JSX namespace for any custom attributes if needed in the future
declare global {
  namespace preact.JSX {
    interface HTMLAttributes {
      // Add any global custom attributes here if needed
    }
  }
}

export {};
