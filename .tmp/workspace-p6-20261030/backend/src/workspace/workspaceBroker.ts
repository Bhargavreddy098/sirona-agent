import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DockerRuntime } from '../windows/dockerRuntime.js';

export class WorkspaceBrokerError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
    this.name = 'WorkspaceBrokerError';
  }
}

export interface WorkspaceSnapshotEntry {
  relativePath: string;
  content: Buffer;
  sha256: string;
  size: number;
  mode: number;
}

export interface WorkspaceSnapshot {
  treeDigest: string;
  entries: Map<string, WorkspaceSnapshotEntry>;
  generatedAt: number;
}

export interface FileModification {
  path: string;
  oldSha256: string;
  newSha256: string;
  content: Buffer;
}

export interface FileAddition {
  path: string;
  sha256: string;
  content: Buffer;
}

export interface FileDeletion {
  path: string;
  oldSha256: string;
}

export interface WorkspacePatch {
  added: FileAddition[];
  modified: FileModification[];
  deleted: FileDeletion[];
  patchDigest: string;
}

export class WorkspaceBroker {
  public static readonly DEFAULT_MAX_WORKSPACE_BYTES = 100 * 1024 * 1024; // 100 MB max snapshot
  public static readonly DEFAULT_EXCLUDES = new Set([
    '.git',
    'node_modules',
    '.sirona',
    '.codex',
    '.agents',
    'AppData',
    'storage',
    '.DS_Store',
    'dist',
    'dist-workspace',
  ]);

  /**
   * Strictly normalizes and validates a relative path inside workspace.
   * Throws WorkspaceBrokerError if path attempts traversal, is absolute, or contains forbidden characters.
   */
  public static sanitizeRelativePath(relPath: string): string {
    if (!relPath || typeof relPath !== 'string') {
      throw new WorkspaceBrokerError('INVALID_PATH', 400, 'Relative path cannot be empty');
    }

    if(relPath.includes('\0'))throw new WorkspaceBrokerError('INVALID_PATH',400,'Null bytes forbidden in path');
    const raw=relPath.replace(/\\/g,'/');
    if(/^[A-Za-z]:/.test(raw)||raw.startsWith('/'))throw new WorkspaceBrokerError('PATH_TRAVERSAL_DETECTED',403,'Absolute path or drive letter forbidden');
    const normalized=raw.replace(/^(\.\/)+/,'');if(!normalized||normalized==='.')return '';
    for(const segment of normalized.split('/')){
      if(segment==='..')throw new WorkspaceBrokerError('PATH_TRAVERSAL_DETECTED',403,"Path traversal segment '..' forbidden");
      if(!segment||segment==='.'||/[<>:"|?*]/.test(segment)||[...segment].some(char=>char.charCodeAt(0)<32)||/[ .]$/.test(segment)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))throw new WorkspaceBrokerError('INVALID_PATH',400,'Unsafe Windows path segment');
    }

    return normalized;
  }

  /**
   * Scans a host directory and creates an immutable snapshot with SHA-256 preimages.
   */
  public static async createSnapshotFromHost(
    workspaceRoot: string,
    options: { maxBytes?: number; excludes?: Set<string> } = {}
  ): Promise<WorkspaceSnapshot> {
    const root = path.resolve(workspaceRoot);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      throw new WorkspaceBrokerError('WORKSPACE_NOT_FOUND', 404, `Workspace root not found: ${root}`);
    }

    const maxBytes = options.maxBytes ?? WorkspaceBroker.DEFAULT_MAX_WORKSPACE_BYTES;
    const excludes = new Set([...WorkspaceBroker.DEFAULT_EXCLUDES,...(options.excludes??[])]);
    let ancestor=root;while(ancestor!==path.parse(ancestor).root){if(fs.lstatSync(ancestor).isSymbolicLink())throw new WorkspaceBrokerError('REPARSE_POINT',403,'Snapshot root contains a link');ancestor=path.dirname(ancestor);}
    const entries = new Map<string, WorkspaceSnapshotEntry>();
    let totalBytes = 0;

    function walk(currentDir: string, relPrefix: string) {
      if(relPrefix.split('/').length>100)throw new WorkspaceBrokerError('SNAPSHOT_DEPTH_LIMIT',413,'Snapshot depth limit');
      const dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const dirent of dirEntries) {
        const name = dirent.name;
        if (excludes.has(name)||/^\.env(?:\.|$)/i.test(name)||['.ssh','.aws','.azure','.docker','.npmrc','.gitconfig'].includes(name.toLowerCase())) continue;
        if(dirent.isSymbolicLink())throw new WorkspaceBrokerError('REPARSE_POINT',403,'Snapshot contains a symbolic link');

        const fullPath = path.join(currentDir, name);
        const relPath = relPrefix ? `${relPrefix}/${name}` : name;
        const sanitized = WorkspaceBroker.sanitizeRelativePath(relPath);

        if (dirent.isDirectory()) {
          walk(fullPath, sanitized);
        } else if (dirent.isFile()) {
          const stats = fs.statSync(fullPath);
          totalBytes += stats.size;
          if (totalBytes > maxBytes) {
            throw new WorkspaceBrokerError('WORKSPACE_SIZE_EXCEEDED', 413, `Workspace snapshot exceeded limit of ${maxBytes} bytes`);
          }

          if(stats.nlink!==1)throw new WorkspaceBrokerError('HARDLINK_FORBIDDEN',403,'Snapshot contains a hard link');
          const fd=fs.openSync(fullPath,'r');let content:Buffer;try{const actual=fs.fstatSync(fd);if(actual.ino!==stats.ino||actual.dev!==stats.dev||actual.nlink!==1)throw new WorkspaceBrokerError('SNAPSHOT_CHANGED',409,'Snapshot source changed');content=fs.readFileSync(fd);}finally{fs.closeSync(fd);}
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          if(entries.size>=10000)throw new WorkspaceBrokerError('SNAPSHOT_ENTRY_LIMIT',413,'Snapshot entry limit');
          entries.set(sanitized, {
            relativePath: sanitized,
            content,
            sha256: hash,
            size: stats.size,
            mode: (stats.mode & 0o111) ? 0o755 : 0o644,
          });
        }
      }
    }

    walk(root, '');

    // Compute deterministic tree digest
    const sortedKeys = Array.from(entries.keys()).sort();
    const treeHasher = crypto.createHash('sha256');
    for (const k of sortedKeys) {
      const e = entries.get(k)!;
      treeHasher.update(`${k}:${e.sha256}:${e.size}:${e.mode}\n`);
    }
    const treeDigest = treeHasher.digest('hex');

    return {
      treeDigest,
      entries,
      generatedAt: Date.now(),
    };
  }

  /**
   * Packs a WorkspaceSnapshot into a ustar tar archive buffer.
   */
  public static packSnapshotToTar(snapshot: WorkspaceSnapshot): Buffer {
    const chunks: Buffer[] = [];

    for (const entry of snapshot.entries.values()) {
      const name=this.sanitizeRelativePath(entry.relativePath);
      if(!name||Buffer.byteLength(name)>100)throw new WorkspaceBrokerError('ARCHIVE_PATH_TOO_LONG',400,'Path exceeds supported ustar name field');
      const size = entry.content.length;
      const mode = (entry.mode || 0o644).toString(8).padStart(7, '0');

      const header = Buffer.alloc(512);
      header.write(name, 0, 100, 'utf8');
      header.write(`${mode}\0`, 100, 8);
      header.write('0023421\0', 108, 8); // uid 10001 (octal 023421)
      header.write('0023421\0', 116, 8); // gid 10001
      header.write(size.toString(8).padStart(11, '0') + '\0', 124, 12);
      header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0', 136, 12);
      header.write('        ', 148, 8); // placeholder checksum
      header[156] = '0'.charCodeAt(0); // regular file
      header.write('ustar\0', 257, 6);
      header.write('00', 263, 2);

      let chksum = 0;
      for (let i = 0; i < 512; i++) chksum += header[i];
      header.write(chksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);

      chunks.push(header);
      chunks.push(entry.content);

      const paddingLen = (512 - (size % 512)) % 512;
      if (paddingLen > 0) {
        chunks.push(Buffer.alloc(paddingLen));
      }
    }

    // End-of-archive marker (two 512-byte zero blocks)
    chunks.push(Buffer.alloc(1024));

    return Buffer.concat(chunks);
  }

  /**
   * Unpacks a tar archive buffer into a WorkspaceSnapshot with strict path validation.
   */
  public static parseTarToSnapshot(tarBuffer: Buffer, maxBytes = WorkspaceBroker.DEFAULT_MAX_WORKSPACE_BYTES): WorkspaceSnapshot {
    if(tarBuffer.length>110*1024*1024)throw new WorkspaceBrokerError('ARCHIVE_LIMIT',413,'Archive limit');
    const entries = new Map<string, WorkspaceSnapshotEntry>();
    let ended=false;
    let offset = 0;
    let totalBytes = 0;

    while (offset + 512 <= tarBuffer.length) {
      const header = tarBuffer.subarray(offset, offset + 512);

      // Two zero blocks signify end of archive
      if (header.every((b) => b === 0)) {
        if(offset+1024>tarBuffer.length||!tarBuffer.subarray(offset).every(byte=>byte===0))throw new WorkspaceBrokerError('INVALID_ARCHIVE',400,'Invalid archive terminator');
        ended=true;break;
      }

      const rawName = header.toString('utf8', 0, 100).replace(/\0.*$/, '').trim();
      const modeStr = header.toString('utf8', 100, 108).replace(/\0.*$/, '').trim();
      const headerMode = parseInt(modeStr, 8) || 0o644;
      const sizeStr = header.toString('utf8', 124, 136).replace(/\0.*$/, '').trim();
      const size = parseInt(sizeStr, 8) || 0;
      const typeFlag = String.fromCharCode(header[156]);

      offset += 512;

      // Reject unknown/pax/link types rather than treating link payloads as ordinary files.
      const checksum=parseInt(header.toString('ascii',148,156).replace(/\0/g,'').trim(),8);
      let sum=0;for(let i=0;i<512;i++)sum+=(i>=148&&i<156)?32:header[i];
      if(!Number.isSafeInteger(checksum)||checksum!==sum||!/^0*[0-7]+$/.test(sizeStr)||!Number.isSafeInteger(size)||size<0||offset+size>tarBuffer.length)throw new WorkspaceBrokerError('INVALID_ARCHIVE',400,'Invalid archive header or truncated payload');
      if(typeFlag==='5'){
        if(size!==0)throw new WorkspaceBrokerError('INVALID_ARCHIVE',400,'Invalid directory record');
        const directory=rawName.replace(/\/+$/,'');if(directory&&directory!=='.')this.sanitizeRelativePath(directory);
        continue;
      }
      if(typeFlag!=='0'&&typeFlag!=='\0')throw new WorkspaceBrokerError('ARCHIVE_LINK_FORBIDDEN',403,'Archive links/extensions are not permitted');
      // Check path safety
      const relPath = WorkspaceBroker.sanitizeRelativePath(rawName);
      if (!relPath) {
        const pad = (512 - (size % 512)) % 512;
        offset += size + pad;
        continue;
      }

      totalBytes += size;
      if (totalBytes > maxBytes) {
        throw new WorkspaceBrokerError('WORKSPACE_SIZE_EXCEEDED', 413, `Imported archive exceeded limit of ${maxBytes} bytes`);
      }

      if([...entries.keys()].some(key=>key.toLowerCase()===relPath.toLowerCase()))throw new WorkspaceBrokerError('DUPLICATE_ARCHIVE_PATH',400,'Duplicate or case-aliased archive target');
      const content = tarBuffer.subarray(offset, offset + size);
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      if(entries.size>=10000)throw new WorkspaceBrokerError('ARCHIVE_ENTRY_LIMIT',413,'Archive entry limit');
      entries.set(relPath, {
        relativePath: relPath,
        content: Buffer.from(content),
        sha256: hash,
        size,
        mode: (headerMode & 0o111) ? 0o755 : 0o644,
      });

      const pad = (512 - (size % 512)) % 512;
      offset += size + pad;
    }

    if(!ended)throw new WorkspaceBrokerError('INVALID_ARCHIVE',400,'Missing archive terminator');
    const sortedKeys = Array.from(entries.keys()).sort();
    const treeHasher = crypto.createHash('sha256');
    for (const k of sortedKeys) {
      const e = entries.get(k)!;
      treeHasher.update(`${k}:${e.sha256}:${e.size}:${e.mode}\n`);
    }

    return {
      treeDigest: treeHasher.digest('hex'),
      entries,
      generatedAt: Date.now(),
    };
  }

  /**
   * Transfers an authorized snapshot from host project into container.
   */
  public static async exportSnapshotToContainer(containerId: string, workspaceRoot: string): Promise<WorkspaceSnapshot> {
    const snapshot = await this.createSnapshotFromHost(workspaceRoot);
    if (snapshot.entries.size > 0) {
      const tarData = this.packSnapshotToTar(snapshot);
      await DockerRuntime.writeArchive(containerId, tarData, '/workspace');
    }
    return snapshot;
  }

  /**
   * Reads the current guest workspace from container into a verified snapshot.
   */
  public static async importSnapshotFromContainer(containerId: string): Promise<WorkspaceSnapshot> {
    const tarBuffer = await DockerRuntime.readArchive(containerId, '/workspace');
    return this.parseTarToSnapshot(tarBuffer);
  }

  /**
   * Computes a patch between the initial base snapshot and guest snapshot.
   */
  public static computePatch(baseSnapshot: WorkspaceSnapshot, guestSnapshot: WorkspaceSnapshot): WorkspacePatch {
    const added: FileAddition[] = [];
    const modified: FileModification[] = [];
    const deleted: FileDeletion[] = [];

    // Check additions and modifications
    for (const [pathKey, guestEntry] of guestSnapshot.entries.entries()) {
      const baseEntry = baseSnapshot.entries.get(pathKey);
      if (!baseEntry) {
        added.push({
          path: pathKey,
          sha256: guestEntry.sha256,
          content: guestEntry.content,
        });
      } else if (baseEntry.sha256 !== guestEntry.sha256) {
        modified.push({
          path: pathKey,
          oldSha256: baseEntry.sha256,
          newSha256: guestEntry.sha256,
          content: guestEntry.content,
        });
      }
    }

    // Check deletions
    for (const [pathKey, baseEntry] of baseSnapshot.entries.entries()) {
      if (!guestSnapshot.entries.has(pathKey)) {
        deleted.push({
          path: pathKey,
          oldSha256: baseEntry.sha256,
        });
      }
    }

    // Deterministic patch digest
    const patchHasher = crypto.createHash('sha256');
    for (const a of added.sort((x, y) => x.path.localeCompare(y.path))) {
      patchHasher.update(`ADD:${a.path}:${a.sha256}\n`);
    }
    for (const m of modified.sort((x, y) => x.path.localeCompare(y.path))) {
      patchHasher.update(`MOD:${m.path}:${m.oldSha256}->${m.newSha256}\n`);
    }
    for (const d of deleted.sort((x, y) => x.path.localeCompare(y.path))) {
      patchHasher.update(`DEL:${d.path}:${d.oldSha256}\n`);
    }

    return {
      added,
      modified,
      deleted,
      patchDigest: patchHasher.digest('hex'),
    };
  }

  /**
   * Applies an approved patch to the host workspace with optimistic concurrency control.
   */
  public static async applyPatchToHost(
    workspaceRoot: string,
    patch: WorkspacePatch
  ): Promise<{ applied: number; errors: string[] }> {
    for(const entry of [...patch.added,...patch.modified,...patch.deleted])this.sanitizeRelativePath(entry.path);
    // A raw path and a patch are not approval. Native Windows final-handle enforcement,
    // exact-revision approval and a durable apply/preimage journal must own host mutation.
    // Keep preview functionality, but never expose the former unchecked direct write path.
    throw new WorkspaceBrokerError('HOST_PATCH_BROKER_UNQUALIFIED',503,'Approved native patch broker with recovery journal is required');
  }
}
