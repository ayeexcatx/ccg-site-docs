export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  documenter: 'Documenter',
  client_manager: 'Client Manager',
  client_viewer: 'Client Viewer',
};

export const ROLE_ACCESS = {
  super_admin: { label: ROLE_LABELS.super_admin, company: true, client: false, admin: true, canEdit: true, canPublish: true, canInvite: true, canReview: true },
  company_admin: { label: ROLE_LABELS.company_admin, company: true, client: false, admin: true, canEdit: true, canPublish: true, canInvite: true, canReview: true },
  documenter: { label: ROLE_LABELS.documenter, company: true, client: false, admin: false, canEdit: true, canPublish: false, canInvite: false, canReview: false },
  client_manager: { label: ROLE_LABELS.client_manager, company: false, client: true, admin: false, canEdit: false, canPublish: false, canInvite: true, canReview: true },
  client_viewer: { label: ROLE_LABELS.client_viewer, company: false, client: true, admin: false, canEdit: false, canPublish: false, canInvite: false, canReview: false },
};

export function getRoleLabel(role) {
  return ROLE_ACCESS[role]?.label || role?.replace(/_/g, ' ') || 'Unknown Role';
}

export function getRoleCapabilities(role) {
  return ROLE_ACCESS[role] || { label: getRoleLabel(role), company: false, client: false, admin: false, canEdit: false, canPublish: false, canInvite: false, canReview: false };
}

export function canAccessPath({ role, path }) {
  const capabilities = getRoleCapabilities(role);
  if (!role) return false;

  // Path access is intentionally coarse-grained here: page components still own
  // finer workflow behavior, while this helper guards the major internal-vs-portal split.
  if (capabilities.client) {
    return path === '/' || path.startsWith('/portal');
  }

  if (role === 'documenter') {
    const allowed = ['/', '/projects', '/projects/', '/sessions', '/session-entries', '/field', '/media', '/timeline-review'];
    return allowed.some((prefix) => path === prefix || path.startsWith(prefix));
  }

  return true;
}
