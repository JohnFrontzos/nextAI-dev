import chalk from 'chalk';

export const logger = {
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  success: (message: string) => console.log(chalk.green('✓'), message),
  warn: (message: string) => console.log(chalk.yellow('⚠'), message),
  error: (message: string) => console.error(chalk.red('✗'), message),
  dim: (message: string) => console.log(chalk.dim(message)),

  // Indented messages for sub-items
  subItem: (message: string) => console.log(chalk.dim('  →'), message),

  // Headers
  header: (message: string) => console.log(chalk.bold.underline(message)),

  // Table-like output
  keyValue: (key: string, value: string) => {
    console.log(`  ${chalk.dim(key.padEnd(14))} ${value}`);
  },

  // Blank line
  blank: () => console.log(),

  // Box for important messages
  box: (title: string, lines: string[]) => {
    console.log();
    console.log(chalk.bold(title));
    lines.forEach((line) => console.log(chalk.dim('  ' + line)));
    console.log();
  },
};
