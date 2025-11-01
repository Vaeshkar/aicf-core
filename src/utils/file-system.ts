/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * File System Abstraction - Dependency injection for file operations
 */

import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  appendFile as fsAppendFile,
  mkdir as fsMkdir,
  readdir as fsReaddir,
  stat as fsStat,
  access,
} from "node:fs/promises";
import { constants } from "node:fs";
import type { Result } from "../types/result.js";
import { ok, err, toError } from "../types/result.js";
import type { FileSystem } from "../types/aicf.js";

/**
 * Node.js file system implementation
 */
export class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return await fsReadFile(path, "utf-8");
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fsWriteFile(path, content, "utf-8");
  }

  async appendFile(path: string, content: string): Promise<void> {
    await fsAppendFile(path, content, "utf-8");
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await fsMkdir(path, options);
  }

  async readdir(path: string): Promise<string[]> {
    return await fsReaddir(path);
  }

  async stat(path: string): Promise<{
    isFile(): boolean;
    isDirectory(): boolean;
    size: number;
    mtimeMs?: number;
  }> {
    const stats = await fsStat(path);
    return {
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
      size: stats.size,
      mtimeMs: stats.mtimeMs,
    };
  }
}

/**
 * File system with Result types
 */
export class SafeFileSystem {
  constructor(private fs: FileSystem = new NodeFileSystem()) {}

  async readFile(path: string): Promise<Result<string>> {
    try {
      const content = await this.fs.readFile(path);
      return ok(content);
    } catch (error) {
      return err(toError(error));
    }
  }

  async writeFile(path: string, content: string): Promise<Result<void>> {
    try {
      await this.fs.writeFile(path, content);
      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  async appendFile(path: string, content: string): Promise<Result<void>> {
    try {
      await this.fs.appendFile(path, content);
      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  async exists(path: string): Promise<Result<boolean>> {
    try {
      const exists = await this.fs.exists(path);
      return ok(exists);
    } catch (error) {
      return err(toError(error));
    }
  }

  async mkdir(
    path: string,
    options?: { recursive?: boolean }
  ): Promise<Result<void>> {
    try {
      await this.fs.mkdir(path, options);
      return ok(undefined);
    } catch (error) {
      return err(toError(error));
    }
  }

  async readdir(path: string): Promise<Result<string[]>> {
    try {
      const files = await this.fs.readdir(path);
      return ok(files);
    } catch (error) {
      return err(toError(error));
    }
  }

  async stat(
    path: string
  ): Promise<
    Result<{
      isFile(): boolean;
      isDirectory(): boolean;
      size: number;
      mtimeMs?: number;
    }>
  > {
    try {
      const stats = await this.fs.stat(path);
      return ok(stats);
    } catch (error) {
      return err(toError(error));
    }
  }
}

/**
 * Create default file system
 */
export function createFileSystem(): SafeFileSystem {
  return new SafeFileSystem();
}
