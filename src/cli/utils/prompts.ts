import { confirm, select, input } from '@inquirer/prompts';
import type { SupportedClient } from '../../types/index.js';

export async function confirmAction(message: string, defaultValue = true): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue,
  });
}

export async function selectClient(
  clients: { id: SupportedClient; name: string }[],
  message = 'Select AI client:'
): Promise<SupportedClient> {
  return select({
    message,
    choices: clients.map((c) => ({ value: c.id, name: c.name })),
  });
}

export async function inputText(
  message: string,
  defaultValue?: string
): Promise<string> {
  return input({
    message,
    default: defaultValue,
  });
}

export async function selectOption<T extends string>(
  message: string,
  choices: { value: T; name: string }[]
): Promise<T> {
  return select({
    message,
    choices,
  });
}
