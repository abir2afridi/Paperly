declare module 'y-monaco' {
  import { Text } from 'yjs';

  export class MonacoBinding {
    constructor(
      ytext: Text,
      monacoModel: unknown,
      editors?: Set<unknown>,
      awareness?: unknown
    );
    destroy(): void;
  }
}
