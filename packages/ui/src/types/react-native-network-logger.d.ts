declare module 'react-native-network-logger' {
  import type * as React from 'react';

  const NetworkLogger: React.ComponentType<Record<string, unknown>>;

  export default NetworkLogger;
  export { NetworkLogger };
}
