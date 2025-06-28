export interface Endpoint {
  method: string;
  path: string;
  id: string;
  description: string;
  supportsMultiWallet?: boolean;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}
