import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function initGoalModule(options = {}) {
  const targetDir = path.resolve(process.cwd(), options.targetDir || options.target || ".claude/agents/goal");

  console.log(chalk.magenta("🎯 Initializing Claude Flow Goal Module..."));
  console.log(chalk.gray(`  Target: ${targetDir}`));

  try {
    if (await exists(targetDir) && !options.force) {
      console.log(chalk.yellow("⚠️  Goal module already exists. Use --force to overwrite."));
      return;
    }

    await mkdir(targetDir, { recursive: true });

    const plannerContent = `---
name: goal-planner
description: "Goal-Oriented Action Planning (GOAP) specialist"
color: purple
---

You are a GOAP specialist with:
- A* search algorithms
- OODA loop execution
- Adaptive replanning
- Mixed LLM + code execution

## MCP Integration
\`\`\`javascript
mcp__claude-flow__task_orchestrate {
  task: "achieve_goal",
  strategy: "adaptive"
}
\`\`\`
`;

    await writeFile(path.join(targetDir, "goal-planner.md"), plannerContent);

    const config = {
      version: "1.0.0",
      goal: {
        enabled: true,
        algorithm: "astar",
        maxPlanDepth: 100,
        replanning: {
          enabled: true,
          threshold: 0.3,
        },
      },
    };

    await writeFile(path.join(targetDir, "config.json"), JSON.stringify(config, null, 2));

    console.log(chalk.green("✅ Goal module initialized successfully!"));
  } catch (error) {
    console.error(chalk.red("❌ Failed to initialize goal module:"), error instanceof Error ? error.message : error);
    throw error;
  }
}

export default { initGoalModule };
