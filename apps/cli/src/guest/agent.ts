/**
 * Sirona Guest Worker Protocol & Agent
 *
 * Defines the wire protocol between trusted host control plane
 * and isolated guest container worker.
 */

export interface GuestRequest<T = unknown> {
  id: string;
  action: 'exec' | 'read' | 'write' | 'delete' | 'list' | 'health';
  payload: T;
}

export interface GuestResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface GuestExecPayload {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface GuestExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface GuestFilePayload {
  path: string;
  content?: string; // base64 or utf-8
}

export interface GuestFileListResult {
  files: Array<{
    name: string;
    isDirectory: boolean;
    size: number;
  }>;
}

export class GuestAgentProtocol {
  public static encodeRequest(req: GuestRequest): string {
    return JSON.stringify(req);
  }

  public static parseRequest(raw: string): GuestRequest {
    return JSON.parse(raw);
  }

  public static encodeResponse(res: GuestResponse): string {
    return JSON.stringify(res);
  }

  public static parseResponse(raw: string): GuestResponse {
    return JSON.parse(raw);
  }
}
