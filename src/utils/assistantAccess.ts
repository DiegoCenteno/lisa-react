import type { User } from '../types';

export type AssistantAccessLevel = 'full' | 'limited';

const LIMITED_PERMISSION_CEILING = new Set([
  'dashboard.view',
  'agenda.view',
  'agenda.manage',
  'patients.view',
  'patients.manage',
  'patients.quick_edit',
]);

export function getAssistantAccessLevel(user: User | null | undefined): AssistantAccessLevel | null {
  if (!user || user.role !== 'asistente') {
    return null;
  }

  return user.assistant_access_level === 'full' ? 'full' : 'limited';
}

export function hasAllowedAssistantAccessLevel(
  user: User | null | undefined,
  allowedLevels?: AssistantAccessLevel[],
): boolean {
  if (!allowedLevels || allowedLevels.length === 0) {
    return true;
  }

  const accessLevel = getAssistantAccessLevel(user);
  if (!accessLevel) {
    return true;
  }

  return allowedLevels.includes(accessLevel);
}

export function isPermissionAllowedByAssistantAccessLevel(
  user: User | null | undefined,
  permission: string,
): boolean {
  const accessLevel = getAssistantAccessLevel(user);
  if (!accessLevel) {
    return true;
  }

  if (accessLevel === 'full') {
    return true;
  }

  return LIMITED_PERMISSION_CEILING.has(permission);
}
