import fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

interface WorkspaceInfo {
  workspaceId: string;
  path: string;
  kvStore: string;
  globalState: string;
  lastAccessed: number;
  dataQuality: DataQuality;
  dataSources: string[];
}

interface DataQuality {
  score: number;
  description: string;
}

interface ExtractOptions {
  maxConversations?: number;
  timeframe?: string;
}

interface StatusResult {
  available: boolean;
  message: string;
  workspaces?: WorkspaceInfo[];
}

interface Conversation {
  id: string;
  messages: Message[];
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

/**
 * Augment VSCode Extension Parser
 * Extracts conversation data from LevelDB files in augment-kv-store directories
 */
export class AugmentParser {
  private readonly source: string;
  private readonly augmentWorkspaces: WorkspaceInfo[];

  constructor() {
    this.source = "augment";
    this.augmentWorkspaces = this.findAugmentWorkspaces();
  }

  /**
   * Find all Augment workspace storage directories
   */
  private findAugmentWorkspaces(): WorkspaceInfo[] {
    const homeDir = homedir();
    const vscodeStoragePath = join(
      homeDir,
      "Library/Application Support/Code/User/workspaceStorage"
    );

    try {
      if (!fs.existsSync(vscodeStoragePath)) {
        console.log("📂 VSCode workspace storage not found");
        return [];
      }

      const workspaces = fs.readdirSync(vscodeStoragePath);
      const augmentWorkspaces: WorkspaceInfo[] = [];

      for (const workspace of workspaces) {
        const augmentPath = join(
          vscodeStoragePath,
          workspace,
          "Augment.vscode-augment"
        );

        if (fs.existsSync(augmentPath)) {
          const kvStorePath = join(augmentPath, "augment-kv-store");
          const globalStatePath = join(augmentPath, "augment-global-state");

          if (fs.existsSync(kvStorePath)) {
            const dataQuality = this.assessWorkspaceDataQuality(augmentPath);

            augmentWorkspaces.push({
              workspaceId: workspace,
              path: augmentPath,
              kvStore: kvStorePath,
              globalState: globalStatePath,
              lastAccessed: this.getLastAccessTime(kvStorePath),
              dataQuality,
              dataSources: this.getAvailableDataSources(augmentPath),
            });
          }
        }
      }

      augmentWorkspaces.sort((a, b) => {
        if (a.dataQuality.score !== b.dataQuality.score) {
          return b.dataQuality.score - a.dataQuality.score;
        }
        return b.lastAccessed - a.lastAccessed;
      });

      console.log(`📋 Found ${augmentWorkspaces.length} Augment workspaces`);
      augmentWorkspaces.forEach((w) => {
        console.log(
          `   🎯 Workspace ${w.workspaceId.substring(0, 8)}: Quality ${w.dataQuality.score}/10 (${w.dataQuality.description})`
        );
      });

      return augmentWorkspaces;
    } catch (error: unknown) {
      const err = error as Error;
      console.warn("⚠️  Could not scan Augment workspaces:", err.message);
      return [];
    }
  }

  /**
   * Get the last access time of a directory
   */
  private getLastAccessTime(dirPath: string): number {
    try {
      const stats = fs.statSync(dirPath);
      return stats.mtime.getTime();
    } catch {
      return 0;
    }
  }

  /**
   * Assess workspace data quality
   */
  private assessWorkspaceDataQuality(augmentPath: string): DataQuality {
    let score = 0;
    const checks: string[] = [];

    const kvStorePath = join(augmentPath, "augment-kv-store");
    if (fs.existsSync(kvStorePath)) {
      score += 3;
      checks.push("kv-store");
    }

    const globalStatePath = join(augmentPath, "augment-global-state");
    if (fs.existsSync(globalStatePath)) {
      score += 2;
      checks.push("global-state");
    }

    const conversationsPath = join(augmentPath, "conversations");
    if (fs.existsSync(conversationsPath)) {
      score += 3;
      checks.push("conversations");
    }

    const historyPath = join(augmentPath, "history");
    if (fs.existsSync(historyPath)) {
      score += 2;
      checks.push("history");
    }

    let description = "No data";
    if (score >= 8) description = "Excellent";
    else if (score >= 6) description = "Good";
    else if (score >= 4) description = "Fair";
    else if (score >= 2) description = "Limited";

    return { score, description };
  }

  /**
   * Get available data sources
   */
  private getAvailableDataSources(augmentPath: string): string[] {
    const sources: string[] = [];

    const possibleSources = [
      "augment-kv-store",
      "augment-global-state",
      "conversations",
      "history",
      "sessions",
    ];

    for (const source of possibleSources) {
      const sourcePath = join(augmentPath, source);
      if (fs.existsSync(sourcePath)) {
        sources.push(source);
      }
    }

    return sources;
  }

  /**
   * Check if Augment is available
   */
  isAvailable(): boolean {
    return this.augmentWorkspaces.length > 0;
  }

  /**
   * Get current status
   */
  getStatus(): StatusResult {
    if (!this.isAvailable()) {
      return {
        available: false,
        message: "No Augment workspaces found",
      };
    }

    return {
      available: true,
      message: `Found ${this.augmentWorkspaces.length} Augment workspaces`,
      workspaces: this.augmentWorkspaces,
    };
  }

  /**
   * Extract conversations from Augment workspaces
   */
  async extractConversations(
    _options: ExtractOptions = {}
  ): Promise<Conversation[]> {
    if (!this.isAvailable()) {
      throw new Error("No Augment workspaces available");
    }

    console.log("🔍 Extracting conversations from Augment workspaces...");

    const conversations: Conversation[] = [];

    for (const workspace of this.augmentWorkspaces) {
      try {
        const workspaceConversations =
          await this.extractFromWorkspace(workspace);
        conversations.push(...workspaceConversations);
      } catch (error: unknown) {
        const err = error as Error;
        console.error(
          `⚠️  Error extracting from workspace ${workspace.workspaceId}:`,
          err.message
        );
      }
    }

    console.log(`✅ Extracted ${conversations.length} conversations`);
    return conversations;
  }

  /**
   * Extract conversations from a specific workspace
   */
  private async extractFromWorkspace(
    workspace: WorkspaceInfo
  ): Promise<Conversation[]> {
    const conversations: Conversation[] = [];

    const conversationsPath = join(workspace.path, "conversations");
    if (fs.existsSync(conversationsPath)) {
      const files = fs.readdirSync(conversationsPath);

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = join(conversationsPath, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);

            if (data.messages && Array.isArray(data.messages)) {
              conversations.push({
                id: data.id ?? file.replace(".json", ""),
                messages: data.messages,
                metadata: {
                  source: this.source,
                  workspace: workspace.workspaceId,
                  extractedAt: new Date().toISOString(),
                },
              });
            }
          } catch (error: unknown) {
            const err = error as Error;
            console.error(`⚠️  Error parsing ${file}:`, err.message);
          }
        }
      }
    }

    return conversations;
  }

  /**
   * Convert conversation to AICF format
   */
  convertToAICF(conversation: Conversation): string {
    const lines: string[] = [];

    lines.push("@METADATA");
    lines.push(`source=${conversation.metadata["source"]}`);
    lines.push(`conversation_id=${conversation.id}`);
    lines.push(`workspace=${conversation.metadata["workspace"]}`);
    lines.push(`extracted_at=${conversation.metadata["extractedAt"]}`);
    lines.push("");

    lines.push("@CONVERSATION");
    conversation.messages.forEach((msg, index) => {
      const timestamp = msg.timestamp
        ? new Date(msg.timestamp).toISOString()
        : new Date().toISOString();
      lines.push(`C${index + 1}|${timestamp}|${msg.role}|${msg.content}`);
    });
    lines.push("");

    return lines.join("\n");
  }
}
