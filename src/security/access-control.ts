/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Access Control - Role-based access control (RBAC)
 */

import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

export type Permission =
  | "read"
  | "write"
  | "delete"
  | "admin"
  | "read:conversations"
  | "write:conversations"
  | "delete:conversations"
  | "read:insights"
  | "write:insights"
  | "read:audit"
  | "manage:users"
  | "manage:roles";

export type Role = "admin" | "user" | "readonly" | "auditor";

export interface User {
  id: string;
  username: string;
  roles: Role[];
  permissions: Permission[];
  createdAt: string;
  lastLogin?: string;
}

export interface AccessPolicy {
  resource: string;
  action: Permission;
  allowed: boolean;
  reason?: string;
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "read",
    "write",
    "delete",
    "admin",
    "read:conversations",
    "write:conversations",
    "delete:conversations",
    "read:insights",
    "write:insights",
    "read:audit",
    "manage:users",
    "manage:roles",
  ],
  user: [
    "read",
    "write",
    "read:conversations",
    "write:conversations",
    "read:insights",
    "write:insights",
  ],
  readonly: ["read", "read:conversations", "read:insights"],
  auditor: ["read", "read:conversations", "read:insights", "read:audit"],
};

/**
 * Access Control Manager
 */
export class AccessControl {
  private users: Map<string, User> = new Map();
  private accessLog: AccessPolicy[] = [];

  /**
   * Create user
   */
  createUser(username: string, roles: Role[]): Result<User> {
    if (!username || username.length === 0) {
      return err(new Error("Username is required"));
    }

    if (this.users.has(username)) {
      return err(new Error(`User '${username}' already exists`));
    }

    const permissions = this.getRolePermissions(roles);

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username,
      roles,
      permissions,
      createdAt: new Date().toISOString(),
    };

    this.users.set(username, user);
    return ok(user);
  }

  /**
   * Get user
   */
  getUser(username: string): Result<User> {
    const user = this.users.get(username);
    if (!user) {
      return err(new Error(`User '${username}' not found`));
    }
    return ok(user);
  }

  /**
   * Check if user has permission
   */
  hasPermission(username: string, permission: Permission): Result<boolean> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    const user = userResult.value;
    const hasPermission = user.permissions.includes(permission);

    this.logAccess({
      resource: permission,
      action: permission,
      allowed: hasPermission,
      reason: hasPermission ? "Permission granted" : "Permission denied",
    });

    return ok(hasPermission);
  }

  /**
   * Check if user has role
   */
  hasRole(username: string, role: Role): Result<boolean> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    return ok(userResult.value.roles.includes(role));
  }

  /**
   * Add role to user
   */
  addRole(username: string, role: Role): Result<User> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    const user = userResult.value;

    if (user.roles.includes(role)) {
      return ok(user);
    }

    user.roles.push(role);
    user.permissions = this.getRolePermissions(user.roles);

    return ok(user);
  }

  /**
   * Remove role from user
   */
  removeRole(username: string, role: Role): Result<User> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    const user = userResult.value;
    user.roles = user.roles.filter((r) => r !== role);
    user.permissions = this.getRolePermissions(user.roles);

    return ok(user);
  }

  /**
   * Grant permission to user
   */
  grantPermission(username: string, permission: Permission): Result<User> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    const user = userResult.value;

    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
    }

    return ok(user);
  }

  /**
   * Revoke permission from user
   */
  revokePermission(username: string, permission: Permission): Result<User> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    const user = userResult.value;
    user.permissions = user.permissions.filter((p) => p !== permission);

    return ok(user);
  }

  /**
   * Get role permissions
   */
  private getRolePermissions(roles: Role[]): Permission[] {
    const permissions = new Set<Permission>();

    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      if (rolePerms) {
        rolePerms.forEach((p) => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Log access attempt
   */
  private logAccess(policy: AccessPolicy): void {
    this.accessLog.push(policy);

    // Keep only last 1000 entries
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }
  }

  /**
   * Get access log
   */
  getAccessLog(limit = 100): AccessPolicy[] {
    return this.accessLog.slice(-limit);
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog.length = 0;
  }

  /**
   * List all users
   */
  listUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Delete user
   */
  deleteUser(username: string): Result<true> {
    if (!this.users.has(username)) {
      return err(new Error(`User '${username}' not found`));
    }

    this.users.delete(username);
    return ok(true);
  }

  /**
   * Update last login
   */
  updateLastLogin(username: string): Result<User> {
    const userResult = this.getUser(username);
    if (!userResult.ok) {
      return err(userResult.error);
    }

    const user = userResult.value;
    user.lastLogin = new Date().toISOString();

    return ok(user);
  }
}

/**
 * Create default admin user
 */
export function createDefaultAdmin(): Result<User> {
  const ac = new AccessControl();
  return ac.createUser("admin", ["admin"]);
}

/**
 * Check if action is allowed
 */
export function isActionAllowed(
  user: User,
  action: Permission
): boolean {
  return user.permissions.includes(action);
}

